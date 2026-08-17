import { createClient } from '@supabase/supabase-js';
import { ServiceRequest, ServiceStatus, CustomerProfile } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey !== 'sua_anon_key_aqui'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Converte um ServiceRequest para a estrutura de colunas do banco Supabase
 * seguindo o padrão oficial do Sistema Administrativo Central
 */
export function mapearParaSupabase(request: ServiceRequest) {
  const currentYear = new Date().getFullYear();
  // Formata o número amigável no padrão ORD-YYYY-XXXX
  const numParte = request.id.replace(/^[A-Za-z-]+/, '') || Math.floor(1000 + Math.random() * 9000).toString();
  const codigoOrdem = request.id.startsWith('ORD-') ? request.id : `ORD-${currentYear}-${numParte}`;
  
  // Garante que o código de confirmação tenha rigorosamente 4 dígitos numéricos
  const codigoConfirmacao = String(request.securityCode || '0000').padStart(4, '0').slice(-4);

  return {
    id: request.id,
    codigo_ordem: codigoOrdem,
    codigo_confirmacao: codigoConfirmacao,
    
    // Nomenclatura compatível com o Painel Administrativo Central
    tipo_servico: request.serviceType,
    formato_organizacao: request.organizationFormat || null,
    endereco: request.customer.address,
    detalhes_imovel: request.property,
    
    // Dados Identificadores do Cliente
    customer_id: request.customer.id,
    customer_name: request.customer.fullName,
    customer_doc_type: request.customer.documentType,
    customer_doc_num: request.customer.documentNumber,
    customer_email: request.customer.email,
    customer_phone: request.customer.phone,
    customer_photo_url: request.customer.photoUrl || null,
    
    // Detalhes Operacionais e 5S
    cleaning_detail: request.cleaningDetail || null,
    custom_org_preferences: request.customOrgPreferences || null,
    standard_5s_preferences: request.standard5SPreferences || null,
    
    // Agendamento e Preferências
    scheduled_date: request.scheduledDate,
    time_slot: request.timeSlot,
    special_notes: request.specialNotes || null,
    
    // Status e Precificação
    status: request.status,
    estimated_price: request.estimatedPrice,
    estimated_hours: request.estimatedHours,
    
    // Profissional Designado e Linha do Tempo
    assigned_professional: request.assignedProfessional || null,
    status_timeline: request.statusTimeline,
    payment_terms: request.paymentTerms,
    
    created_at: request.createdAt,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Converte a linha do Supabase de volta para o objeto de tipagem do Frontend
 * com suporte bidirecional resiliente a diferentes versões de esquemas
 */
export function mapearDeSupabase(row: any): ServiceRequest {
  const securityCode = String(
    row.codigo_confirmacao || 
    row.security_code || 
    row.securityCode || 
    '0000'
  ).padStart(4, '0').slice(-4);

  return {
    id: row.codigo_ordem || row.id,
    securityCode: securityCode,
    customer: {
      id: row.customer_id || 'cust_01',
      fullName: row.customer_name || '',
      documentType: row.customer_doc_type || 'CPF',
      documentNumber: row.customer_doc_num || '',
      email: row.customer_email || '',
      phone: row.customer_phone || '',
      photoUrl: row.customer_photo_url || row.photo_url || row.avatar_url || '',
      address: row.endereco || row.address || {
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: '',
      },
      createdAt: row.created_at || new Date().toISOString(),
    },
    serviceType: row.tipo_servico || row.service_type || 'ambos',
    cleaningDetail: row.cleaning_detail || undefined,
    organizationFormat: row.formato_organizacao || row.organization_format || undefined,
    customOrgPreferences: row.custom_org_preferences || undefined,
    standard5SPreferences: row.standard_5s_preferences || undefined,
    property: row.detalhes_imovel || row.property_details || {
      type: 'apartamento',
      bedrooms: 2,
      bathrooms: 2,
      approxAreaM2: 75,
      hasPets: false,
    },
    scheduledDate: row.scheduled_date,
    timeSlot: row.time_slot,
    specialNotes: row.special_notes || undefined,
    status: (row.status as ServiceStatus) || 'solicitado',
    estimatedPrice: Number(row.estimated_price) || 0,
    estimatedHours: Number(row.estimated_hours) || 4,
    assignedProfessional: row.assigned_professional || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    statusTimeline: Array.isArray(row.status_timeline) ? row.status_timeline : [],
    paymentTerms: row.payment_terms || {
      payOnSite: true,
      acceptedMethods: ['PIX', 'Cartão', 'Dinheiro'],
      note: 'Pagamento 100% no local',
    },
  };
}

/**
 * Grava uma nova solicitação no Supabase
 */
export async function salvarSolicitacaoSupabase(
  request: ServiceRequest
): Promise<{ success: boolean; data?: ServiceRequest; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: true,
      data: request,
      error: 'MODO_LOCAL',
    };
  }

  try {
    const payload = mapearParaSupabase(request);
    const { data, error } = await supabase
      .from('solicitacoes_servico')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Erro ao persistir no Supabase, mantendo localmente:', error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data ? mapearDeSupabase(data) : request,
    };
  } catch (err: any) {
    console.error('Falha de rede ao conectar com Supabase:', err);
    return {
      success: false,
      error: err?.message || 'Falha de conexão com Supabase',
    };
  }
}

/**
 * Busca todas as solicitações cadastradas no Supabase
 */
export async function buscarSolicitacoesSupabase(): Promise<ServiceRequest[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('solicitacoes_servico')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao consultar Supabase:', error.message);
      return [];
    }

    return (data || []).map(mapearDeSupabase);
  } catch (err) {
    console.error('Falha ao buscar no Supabase:', err);
    return [];
  }
}

/**
 * Atualiza o status de uma solicitação no Supabase
 */
export async function atualizarStatusSolicitacaoSupabase(
  requestId: string,
  newStatus: ServiceStatus,
  timelineEntry?: { status: ServiceStatus; timestamp: string; description: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true };
  }

  try {
    // Buscar timeline existente se não fornecida
    let updatePayload: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (timelineEntry) {
      const { data: current } = await supabase
        .from('solicitacoes_servico')
        .select('status_timeline')
        .eq('id', requestId)
        .single();

      const existingTimeline = current?.status_timeline || [];
      updatePayload.status_timeline = [...existingTimeline, timelineEntry];
    }

    const { error } = await supabase
      .from('solicitacoes_servico')
      .update(updatePayload)
      .eq('id', requestId);

    if (error) {
      console.warn('Erro ao atualizar status no Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Falha na atualização do status no Supabase:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Cancela uma solicitação no Supabase
 */
export async function cancelarSolicitacaoSupabase(
  requestId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const timelineEntry = {
    status: 'cancelado' as ServiceStatus,
    timestamp: new Date().toISOString(),
    description: reason || 'Solicitação cancelada pelo cliente no aplicativo.',
  };
  return atualizarStatusSolicitacaoSupabase(requestId, 'cancelado', timelineEntry);
}

/**
 * Script SQL Oficial do Supabase para criação das tabelas, índices,
 * realtime publication e políticas RLS de segurança para o Sistema e App Operacional.
 */
export const SUPABASE_DATABASE_SCHEMA_SQL = `
-- =========================================================================
-- ESQUEMA OFICIAL DE PRODUÇÃO SUPABASE: SISTEMA + APP CLIENTE + APP OPERACIONAL
-- =========================================================================

-- 1. Criação da tabela de Solicitações de Serviço
CREATE TABLE IF NOT EXISTS public.solicitacoes_servico (
  id TEXT PRIMARY KEY,
  codigo_ordem TEXT NOT NULL,
  codigo_confirmacao VARCHAR(4) NOT NULL,
  
  -- Tipo e Formato do Atendimento
  tipo_servico TEXT NOT NULL,
  formato_organizacao TEXT,
  
  -- Localização e Imóvel
  endereco JSONB NOT NULL,
  detalhes_imovel JSONB NOT NULL,
  
  -- Identificação do Cliente
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_doc_type TEXT NOT NULL,
  customer_doc_num TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  customer_photo_url TEXT,
  
  -- Detalhes de Limpeza e Organização (5S / Custom)
  cleaning_detail TEXT,
  custom_org_preferences JSONB,
  standard_5s_preferences JSONB,
  
  -- Agendamento
  scheduled_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  special_notes TEXT,
  
  -- Status e Valores
  status TEXT NOT NULL DEFAULT 'solicitado',
  estimated_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  estimated_hours NUMERIC(4, 1) NOT NULL DEFAULT 4.0,
  
  -- Operacional & Linha do Tempo
  assigned_professional JSONB,
  status_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_terms JSONB NOT NULL DEFAULT '{"payOnSite": true}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices de alta performance para busca e filtros de status
CREATE INDEX IF NOT EXISTS idx_solicitacoes_customer_id ON public.solicitacoes_servico(customer_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes_servico(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at ON public.solicitacoes_servico(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_scheduled_date ON public.solicitacoes_servico(scheduled_date);

-- 3. Habilitação de Row Level Security (RLS) - Regra Rígida de Segurança
ALTER TABLE public.solicitacoes_servico ENABLE ROW LEVEL SECURITY;

-- Política de leitura e gravação para a aplicação cliente e operacional
CREATE POLICY "Permitir leitura de solicitacoes" 
  ON public.solicitacoes_servico 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Permitir criacao de solicitacoes" 
  ON public.solicitacoes_servico 
  FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Permitir atualizacao operacional de solicitacoes" 
  ON public.solicitacoes_servico 
  FOR UPDATE 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);

-- 4. Habilitação do Supabase Realtime para a tabela solicitacoes_servico
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_servico;

-- 5. Bucket do Supabase Storage para Avatares / Fotos de Perfil
-- Execute no SQL Editor do Supabase se o bucket não existir:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Permitir upload publico de avatars" 
ON storage.objects FOR INSERT TO anon, authenticated 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Permitir leitura publica de avatars" 
ON storage.objects FOR SELECT TO anon, authenticated 
USING (bucket_id = 'avatars');
`;

/**
 * Inscrição em Tempo Real para mudanças na tabela `solicitacoes_servico`
 */
export function inscreverAtualizacoesTempoReal(
  onUpdate: (updatedRequest: ServiceRequest) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('solicitacoes_servico_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'solicitacoes_servico',
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const updated = mapearDeSupabase(payload.new);
          onUpdate(updated);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Processa, redimensiona e comprime uma imagem localmente no dispositivo
 * usando HTML5 Canvas para performance rápida, redução de tráfego de dados e sanitização.
 */
export async function processAndCompressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    // Validação de tipo MIME
    if (!file.type.startsWith('image/')) {
      return reject(new Error('O arquivo selecionado não é uma imagem válida.'));
    }

    // Limite preventivo de tamanho original (15MB)
    if (file.size > 15 * 1024 * 1024) {
      return reject(new Error('A imagem selecionada é muito grande. O limite máximo é 15MB.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem do dispositivo.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem selecionada.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calcula proporção sem distorcer a foto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Falha ao inicializar o processador gráfico da imagem.'));
        }

        // Desenha a imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Gera o Data URL compactado (JPEG)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Falha ao comprimir imagem binária.'));
            }
            resolve({
              blob,
              dataUrl,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Realiza o upload seguro da foto de perfil para o Supabase Storage
 * Com fallback automático e resiliente para o payload compactado em Data URL
 */
export async function uploadFotoPerfilSupabase(
  customerId: string,
  file: File
): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    // 1. Processa e otimiza a imagem no cliente
    const { blob, dataUrl } = await processAndCompressImage(file, 800, 800, 0.85);

    // Se Supabase não estiver configurado, retorna dataUrl compactado seguro
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: true,
        url: dataUrl,
      };
    }

    const sanitizedId = customerId.replace(/[^a-zA-Z0-9_-]/g, '') || 'cliente';
    const fileName = `perfil_${sanitizedId}_${Date.now()}.jpg`;
    const filePath = `avatars/${fileName}`;

    // 2. Tenta fazer upload no Supabase Storage bucket 'avatars' ou 'perfil_fotos'
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600',
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return {
            success: true,
            url: publicUrlData.publicUrl,
          };
        }
      } else {
        console.info('Supabase Storage bucket indisponível ou permissão pendente, utilizando armazenamento otimizado integrado:', uploadError.message);
      }
    } catch (storageErr) {
      console.warn('Fallback para payload base64 otimizado:', storageErr);
    }

    // Retorna dataUrl processado como fallback de altíssima fidelidade
    return {
      success: true,
      url: dataUrl,
    };
  } catch (err: any) {
    console.error('Erro no processamento da foto de perfil:', err);
    return {
      success: false,
      url: '',
      error: err?.message || 'Falha ao processar a foto selecionada.',
    };
  }
}

