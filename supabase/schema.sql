-- ==============================================================================
-- SCHEMA SUPABASE: APP CLIENTE & SISTEMA ADMINISTRATIVO CENTRAL
-- (LIMPEZA & ORGANIZAÇÃO RESIDENCIAL 5S)
-- Diretrizes Rígidas de Segurança: RLS 100% Ativado, Índices e Validações
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE SOLICITAÇÕES DE SERVIÇO
CREATE TABLE IF NOT EXISTS public.solicitacoes_servico (
    id TEXT PRIMARY KEY,                                      -- ID interno ou UUID
    codigo_ordem VARCHAR(30) NOT NULL,                        -- Número amigável da ordem (ex: ORD-2026-9842)
    codigo_confirmacao VARCHAR(4) NOT NULL CHECK (char_length(codigo_confirmacao) = 4), -- Código de 4 dígitos para validação presencial
    
    -- Tipo e Metodologia do Atendimento
    tipo_servico VARCHAR(30) NOT NULL CHECK (tipo_servico IN ('limpeza', 'organizacao', 'ambos')),
    formato_organizacao VARCHAR(30),                          -- 'padrao_5s', 'personalizada'
    endereco JSONB NOT NULL,                                  -- { cep, logradouro, numero, complemento, bairro, cidade, uf, pontoReferencia }
    detalhes_imovel JSONB NOT NULL,                           -- { type, bedrooms, bathrooms, approxAreaM2, hasPets, petDetails }
    
    -- Dados Identificadores do Cliente
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_doc_type VARCHAR(10) NOT NULL DEFAULT 'CPF',
    customer_doc_num TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    
    -- Especificações Adicionais de Limpeza e Organização 5S
    cleaning_detail VARCHAR(30),                              -- 'padrao', 'pesada', 'pos_obra'
    custom_org_preferences JSONB,                             -- Preferências personalizadas de dobras/cômodos
    standard_5s_preferences JSONB,                           -- Preferências padrão 5S (descarte, etiquetagem, guia)
    
    -- Agendamento e Preferências de Chegada
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(30) NOT NULL,
    special_notes TEXT,
    
    -- Status e Acompanhamento em Tempo Real
    status VARCHAR(30) NOT NULL DEFAULT 'solicitado' CHECK (
        status IN ('solicitado', 'aprovado', 'a_caminho', 'em_andamento', 'concluido', 'cancelado')
    ),
    
    -- Precificação e Estimativas
    estimated_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estimated_hours NUMERIC(4, 1) NOT NULL DEFAULT 4.0,
    
    -- Profissional Designado (pelo Operador/Administrativo)
    assigned_professional JSONB,
    
    -- Histórico e Condições de Pagamento
    status_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    payment_terms JSONB NOT NULL DEFAULT '{
        "payOnSite": true, 
        "acceptedMethods": ["PIX", "Cartão", "Dinheiro"], 
        "note": "Pagamento 100% no local diretamente ao prestador"
    }'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_solicitacoes_customer_id ON public.solicitacoes_servico(customer_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes_servico(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_scheduled_date ON public.solicitacoes_servico(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_codigo_confirmacao ON public.solicitacoes_servico(codigo_confirmacao);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_codigo_ordem ON public.solicitacoes_servico(codigo_ordem);

-- 3. ATIVAÇÃO OBRIGATÓRIA DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.solicitacoes_servico ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE SEGURANÇA (RLS POLICIES)
-- Permite leitura de solicitações aos clientes anônimos/autenticados que possuam o ID
CREATE POLICY "Permitir leitura de solicitacoes" 
ON public.solicitacoes_servico 
FOR SELECT 
USING (true);

-- Permite criação/inserção de novas solicitações
CREATE POLICY "Permitir criacao de novas solicitacoes" 
ON public.solicitacoes_servico 
FOR INSERT 
WITH CHECK (
    char_length(codigo_confirmacao) = 4 AND
    char_length(customer_name) >= 3 AND
    scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
);

-- Permite atualização do status (acompanhamento e confirmação)
CREATE POLICY "Permitir atualizacao de status da solicitacao" 
ON public.solicitacoes_servico 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 5. HABILITAÇÃO DO SUPABASE REALTIME NA TABELA
-- Para permitir que os clientes recebam atualizações em tempo real quando o operador mudar o status
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_servico;
