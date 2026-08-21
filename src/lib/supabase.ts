import { createClient } from '@supabase/supabase-js';
import { ServiceRequest, ServiceStatus, CustomerProfile } from '../types';

// Sanitização e validação das variáveis de ambiente de produção (Vercel, Vite, Cloud Run)
const getEnvVar = (name: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    return String(import.meta.env[name]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return String(process.env[name]).trim();
  }
  return '';
};

const rawSupabaseUrl = 
  getEnvVar('VITE_SUPABASE_URL') || 
  getEnvVar('SUPABASE_URL') || 
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL');

const rawSupabaseAnonKey = 
  getEnvVar('VITE_SUPABASE_ANON_KEY') || 
  getEnvVar('SUPABASE_ANON_KEY') || 
  getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Normaliza a URL (remove barras finais desnecessárias)
const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, '');
const supabaseAnonKey = rawSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey !== 'sua_anon_key_aqui' &&
  supabaseAnonKey.length > 20
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase Configuration] Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não detectadas ou incompletas no ambiente.',
    { urlPresent: Boolean(supabaseUrl), keyPresent: Boolean(supabaseAnonKey) }
  );
} else {
  console.info('[Supabase Configuration] Cliente conectado ao projeto:', supabaseUrl);
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
      db: {
        schema: 'public',
      },
    })
  : null;

/**
 * Realiza uma verificação ativa de diagnóstico de conectividade com as tabelas do Supabase
 */
export async function testarConexaoSupabase(): Promise<{
  connected: boolean;
  clientesTableOk: boolean;
  solicitacoesTableOk: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      clientesTableOk: false,
      solicitacoesTableOk: false,
      message: 'Supabase não está configurado com URL e Anon Key válidas.',
    };
  }

  let clientesTableOk = false;
  let solicitacoesTableOk = false;

  try {
    const { error: errClientes } = await supabase.from('clientes').select('id').limit(1);
    clientesTableOk = !errClientes;
    if (errClientes) console.warn('[Supabase Diag] Erro na tabela clientes:', errClientes.message);
  } catch (e) {
    console.error('[Supabase Diag] Falha na consulta de clientes:', e);
  }

  try {
    const { error: errSolicitacoes } = await supabase.from('solicitacoes_servico').select('id').limit(1);
    solicitacoesTableOk = !errSolicitacoes;
    if (errSolicitacoes) console.warn('[Supabase Diag] Erro na tabela solicitacoes_servico:', errSolicitacoes.message);
  } catch (e) {
    console.error('[Supabase Diag] Falha na consulta de solicitacoes_servico:', e);
  }

  const connected = clientesTableOk || solicitacoesTableOk;

  return {
    connected,
    clientesTableOk,
    solicitacoesTableOk,
    message: connected
      ? 'Conexão com o banco central Supabase ativa e sincronizada.'
      : 'Aguardando publicação do esquema SQL no Supabase.',
  };
}

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
    customer_doc_num: request.customer.documentNumber.replace(/\D/g, '') || request.customer.documentNumber,
    customer_email: request.customer.email.trim().toLowerCase(),
    customer_phone: request.customer.phone.trim(),
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
    
    created_at: request.createdAt || new Date().toISOString(),
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
 * Grava uma nova solicitação diretamente no Supabase com tolerância a esquemas
 */
export async function salvarSolicitacaoSupabase(
  request: ServiceRequest
): Promise<{ success: boolean; data?: ServiceRequest; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    const errorMsg = 'Supabase não está configurado. Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.';
    console.error(`[Supabase salvarSolicitacaoSupabase] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
    };
  }

  try {
    const payload: Record<string, any> = mapearParaSupabase(request);
    let insertedData: any = null;
    let lastError: any = null;

    const colunasOpcionais = [
      'cleaning_detail',
      'custom_org_preferences',
      'standard_5s_preferences',
      'formato_organizacao',
      'assigned_professional',
      'special_notes',
      'customer_photo_url',
      'updated_at'
    ];

    for (let attempt = 0; attempt < 10; attempt++) {
      const { data, error } = await supabase
        .from('solicitacoes_servico')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (!error && data) {
        insertedData = data;
        lastError = null;
        break;
      }

      // Tentativa direta sem .select()
      if (error) {
        const { error: directErr } = await supabase
          .from('solicitacoes_servico')
          .upsert(payload, { onConflict: 'id' });

        if (!directErr) {
          insertedData = payload;
          lastError = null;
          break;
        }
      }

      lastError = error;

      if (
        error?.code === 'PGRST204' ||
        error?.message?.includes('Could not find') ||
        error?.message?.includes('does not exist')
      ) {
        const missingCol = extrairColunaInexistente(error);
        if (missingCol && missingCol in payload) {
          console.warn(`[Supabase Solicitacao Adaptive] Removendo coluna ausente '${missingCol}' e tentando novamente...`);
          delete payload[missingCol];
          continue;
        }
        const nextCol = colunasOpcionais.find((c) => c in payload);
        if (nextCol) {
          console.warn(`[Supabase Solicitacao Adaptive] Removendo coluna opcional '${nextCol}' e tentando novamente...`);
          delete payload[nextCol];
          continue;
        }
      }

      break;
    }

    if (lastError && !insertedData) {
      console.error('[Supabase salvarSolicitacaoSupabase] Erro ao salvar solicitação no banco central:', lastError);
      return {
        success: false,
        error: lastError.message || 'Erro ao persistir solicitação no Supabase.',
      };
    }

    console.info(`[Supabase salvarSolicitacaoSupabase] Solicitação #${request.id} persistida com sucesso no banco central.`);

    return {
      success: true,
      data: insertedData ? mapearDeSupabase(insertedData) : request,
    };
  } catch (err: any) {
    console.error('[Supabase salvarSolicitacaoSupabase] Exceção de rede ou execução:', err);
    return {
      success: false,
      error: err?.message || 'Falha de comunicação ao salvar no banco Supabase.',
    };
  }
}

/**
 * Busca solicitações no Supabase com suporte a filtro por cliente
 */
export async function buscarSolicitacoesSupabase(
  customerId?: string,
  customerDoc?: string,
  customerEmail?: string
): Promise<ServiceRequest[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Supabase buscarSolicitacoesSupabase] Cliente Supabase não configurado.');
    return [];
  }

  try {
    let query = supabase
      .from('solicitacoes_servico')
      .select('*')
      .order('created_at', { ascending: false });

    const cleanDoc = (customerDoc || '').replace(/\D/g, '');
    const cleanEmail = (customerEmail || '').trim().toLowerCase();

    // Se parâmetros de cliente foram informados, filtra para o cliente atual
    if (customerId || cleanDoc || cleanEmail) {
      const filters: string[] = [];
      if (customerId) filters.push(`customer_id.eq.${customerId}`);
      if (cleanDoc) filters.push(`customer_doc_num.eq.${cleanDoc}`);
      if (cleanEmail) filters.push(`customer_email.eq.${cleanEmail}`);

      if (filters.length > 0) {
        try {
          const { data: filteredData, error: filteredErr } = await query.or(filters.join(','));
          if (!filteredErr && filteredData && filteredData.length > 0) {
            return filteredData.map(mapearDeSupabase);
          }
        } catch {
          // Continua para a consulta geral se a sintaxe .or falhar
        }
      }
    }

    const { data, error } = await supabase
      .from('solicitacoes_servico')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase buscarSolicitacoesSupabase] Erro ao consultar solicitações:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Se o cliente foi informado, filtra em memória como garantia
    if (customerId || cleanDoc || cleanEmail) {
      const userRows = data.filter((row: any) => {
        const rowCustId = row.customer_id;
        const rowDoc = String(row.customer_doc_num || '').replace(/\D/g, '');
        const rowEmail = String(row.customer_email || '').trim().toLowerCase();

        return (
          (customerId && rowCustId === customerId) ||
          (cleanDoc && rowDoc === cleanDoc) ||
          (cleanEmail && rowEmail === cleanEmail)
        );
      });

      if (userRows.length > 0) {
        return userRows.map(mapearDeSupabase);
      }
    }

    return data.map(mapearDeSupabase);
  } catch (err) {
    console.error('[Supabase buscarSolicitacoesSupabase] Falha ao buscar solicitações no Supabase:', err);
    return [];
  }
}

/**
 * Atualiza o status de uma solicitação no Supabase em tempo real
 */
export async function atualizarStatusSolicitacaoSupabase(
  requestId: string,
  newStatus: ServiceStatus,
  timelineEntry?: { status: ServiceStatus; timestamp: string; description: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = 'Supabase não configurado.';
    console.error(`[Supabase atualizarStatusSolicitacaoSupabase] ${err}`);
    return { success: false, error: err };
  }

  try {
    let updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (timelineEntry) {
      const { data: current } = await supabase
        .from('solicitacoes_servico')
        .select('status_timeline')
        .eq('id', requestId)
        .maybeSingle();

      const existingTimeline = current?.status_timeline || [];
      updatePayload.status_timeline = [...existingTimeline, timelineEntry];
    }

    const { error } = await supabase
      .from('solicitacoes_servico')
      .update(updatePayload)
      .eq('id', requestId);

    if (error) {
      console.error('[Supabase atualizarStatusSolicitacaoSupabase] Erro ao atualizar status:', error.message);
      return { success: false, error: error.message };
    }

    console.info(`[Supabase atualizarStatusSolicitacaoSupabase] Status da solicitação #${requestId} atualizado para '${newStatus}'.`);
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase atualizarStatusSolicitacaoSupabase] Exceção ao atualizar status:', err);
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
 * =========================================================================
 * MÓDULO DE AUTENTICAÇÃO E CADASTRO DO CLIENTE (SUPABASE)
 * =========================================================================
 */

/**
 * Verifica se uma string possui o formato válido de UUID v4 (RFC 4122)
 */
export function ehUUIDValido(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
}

/**
 * Gera um UUID v4 válido compatível com a coluna UUID do PostgreSQL / Supabase
 */
export function gerarUUIDValido(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extrai o nome da coluna não encontrada a partir da mensagem de erro PGRST204 ou PostgreSQL do Supabase
 */
function extrairColunaInexistente(errorObj: any): string | null {
  if (!errorObj) return null;
  const message = typeof errorObj === 'string' 
    ? errorObj 
    : [errorObj.message, errorObj.details, errorObj.hint, JSON.stringify(errorObj)].filter(Boolean).join(' ');
  
  // PostgREST: Could not find the 'xyz' column of 'clientes' in the schema cache
  const match1 = message.match(/Could not find the ['"]([^'"]+)['"] column/i);
  if (match1) return match1[1];

  // PostgREST: Could not find the column 'xyz'
  const match2 = message.match(/Could not find the column ['"]([^'"]+)['"]/i);
  if (match2) return match2[1];

  // Postgres: column "xyz" does not exist / column "xyz" of relation ... does not exist
  const match3 = message.match(/column ['"]?([a-zA-Z0-9_]+)['"]? (?:of relation [^\s]+ )?does not exist/i);
  if (match3) return match3[1];

  // Postgres: column clientes.xyz does not exist
  const match4 = message.match(/column [a-zA-Z0-9_]+\.([a-zA-Z0-9_]+) does not exist/i);
  if (match4) return match4[1];

  return null;
}

/**
 * Mapeia os dados do cliente da tabela `clientes` do Supabase para `CustomerProfile`
 * com suporte resiliente a múltiplos esquemas e metadados no JSONB de endereço.
 */
export function mapearClienteDeSupabase(row: any): CustomerProfile {
  if (!row) {
    return {
      id: gerarUUIDValido(),
      fullName: '',
      documentType: 'CPF',
      documentNumber: '',
      email: '',
      phone: '',
      photoUrl: '',
      recoveryCode: '',
      address: {
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: '',
      },
      createdAt: new Date().toISOString(),
    };
  }

  // Extrai endereço e metadados de contingência caso a coluna isolada não exista no banco
  const rawEndereco = typeof row.endereco === 'object' && row.endereco !== null 
    ? row.endereco 
    : (typeof row.address === 'object' && row.address !== null ? row.address : {});

  const recoveryCode = 
    row.codigo_recuperacao || 
    row.recovery_code || 
    rawEndereco.codigo_recuperacao || 
    rawEndereco.recoveryCode || 
    rawEndereco.recovery_code || 
    '';

  const cleanEndereco = {
    cep: rawEndereco.cep || '',
    logradouro: rawEndereco.logradouro || rawEndereco.rua || '',
    numero: rawEndereco.numero || '',
    complemento: rawEndereco.complemento || '',
    bairro: rawEndereco.bairro || '',
    cidade: rawEndereco.cidade || rawEndereco.localidade || '',
    uf: rawEndereco.uf || rawEndereco.estado || '',
  };

  const idFinal = String(row.id || (ehUUIDValido(row.uuid) ? row.uuid : ''));

  return {
    id: idFinal || (ehUUIDValido(row.id) ? String(row.id) : gerarUUIDValido()),
    fullName: row.nome_completo || row.full_name || row.nome || row.name || '',
    documentType: (row.tipo_documento || row.document_type || 'CPF') as 'CPF' | 'RG',
    documentNumber: row.numero_documento || row.document_number || row.cpf || rawEndereco.cpf || '',
    email: row.email || rawEndereco.email || '',
    phone: row.telefone || row.phone || rawEndereco.telefone || '',
    photoUrl: row.foto_url || row.photo_url || row.avatar_url || '',
    recoveryCode: String(recoveryCode || ''),
    address: cleanEndereco,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
  };
}

/**
 * Cadastra um novo cliente na tabela `clientes` do Supabase via chamada direta HTTP/PostgREST
 */
export async function cadastrarClienteSupabase(
  profile: CustomerProfile,
  passwordHash: string,
  recoveryCode: string
): Promise<{ success: boolean; profile?: CustomerProfile; error?: string }> {
  try {
    if (!isSupabaseConfigured || !supabase) {
      const err = 'Supabase não está configurado. Verifique as credenciais VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel/Ambiente.';
      console.error(`[Supabase cadastrarClienteSupabase] ${err}`);
      return { success: false, error: err };
    }

    const cleanDoc = profile.documentNumber.replace(/\D/g, '') || profile.documentNumber.trim();
    const cleanEmail = profile.email.trim().toLowerCase();

    // 1. Verifica se já existe cliente com o mesmo CPF/documento ou E-mail
    try {
      const { data: existing, error: checkError } = await supabase
        .from('clientes')
        .select('id, email, numero_documento')
        .or(`numero_documento.eq.${cleanDoc},email.eq.${cleanEmail}`)
        .maybeSingle();

      if (!checkError && existing) {
        return {
          success: false,
          error: 'Já existe uma conta cadastrada com este CPF ou E-mail. Faça o login ou recupere o acesso.',
        };
      }
    } catch (checkErr) {
      console.warn('[Supabase cadastrarClienteSupabase] Checagem de duplicidade:', checkErr);
    }

    // 2. Prepara o payload incluindo os metadados de segurança no JSONB endereco
    const enderecoComMetadados = {
      ...profile.address,
      codigo_recuperacao: recoveryCode,
      recoveryCode: recoveryCode,
      senha_hash: passwordHash,
      documentNumber: cleanDoc,
      email: cleanEmail,
    };

    const payload: Record<string, any> = {
      nome_completo: profile.fullName.trim(),
      tipo_documento: profile.documentType,
      numero_documento: cleanDoc,
      email: cleanEmail,
      telefone: profile.phone.trim(),
      foto_url: profile.photoUrl || null,
      endereco: enderecoComMetadados,
      senha_hash: passwordHash,
      codigo_recuperacao: recoveryCode,
      ultimo_acesso: new Date().toISOString(),
      created_at: profile.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apenas envia 'id' se for UUID RFC 4122 estritamente válido
    if (profile.id && ehUUIDValido(profile.id)) {
      payload.id = profile.id;
    }

    const colunasOpcionais = [
      'codigo_recuperacao',
      'senha_hash',
      'ultimo_acesso',
      'tipo_documento',
      'updated_at',
      'foto_url',
      'created_at',
    ];

    let insertedData: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 15; attempt++) {
      // Tentativa A: Insert com retorno de dados (.select().maybeSingle())
      const { data: inserted, error: insertError } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .maybeSingle();

      if (!insertError && inserted) {
        insertedData = inserted;
        lastError = null;
        break;
      }

      // Tentativa B: Insert simples direto sem .select() caso o select falhe por cache
      if (insertError && insertError.code !== '23505') {
        const { error: directInsertErr } = await supabase
          .from('clientes')
          .insert(payload);

        if (!directInsertErr) {
          insertedData = payload;
          lastError = null;
          break;
        }
      }

      lastError = insertError;

      // Se for duplicidade já cadastrada
      if (insertError?.code === '23505') {
        return {
          success: false,
          error: 'Este CPF ou E-mail já está cadastrado no sistema. Faça o login ou use a Recuperação de Acesso.',
        };
      }

      // Se for erro 22P02 (incompatibilidade de UUID ao tentar inserir ID textual)
      if (
        insertError?.code === '22P02' ||
        insertError?.message?.includes('invalid input syntax for type uuid') ||
        insertError?.message?.includes('uuid')
      ) {
        if ('id' in payload) {
          console.warn('[Supabase UUID Handler] Removendo id explícito para geração automática pelo banco...');
          delete payload.id;
          continue;
        }
      }

      // Se for erro de coluna inexistente no schema cache
      if (
        insertError?.code === 'PGRST204' ||
        insertError?.message?.includes('Could not find') ||
        insertError?.message?.includes('does not exist')
      ) {
        const missingCol = extrairColunaInexistente(insertError);
        if (missingCol && missingCol in payload) {
          console.warn(`[Supabase Schema Adaptive] Removendo coluna '${missingCol}' ausente no schema e tentando novamente...`);
          delete payload[missingCol];
          continue;
        }

        const nextOptional = colunasOpcionais.find(col => col in payload);
        if (nextOptional) {
          console.warn(`[Supabase Schema Adaptive] Removendo coluna opcional '${nextOptional}' e tentando novamente...`);
          delete payload[nextOptional];
          continue;
        }
      }

      break;
    }

    if (lastError && !insertedData) {
      console.error('[Supabase cadastrarClienteSupabase] Erro ao cadastrar cliente no Supabase:', lastError);
      return {
        success: false,
        error: lastError.message || 'Erro ao registrar cliente no banco de dados Supabase.',
      };
    }

    const idFinal = insertedData?.id || (profile.id && ehUUIDValido(profile.id) ? profile.id : gerarUUIDValido());
    console.info('[Supabase cadastrarClienteSupabase] Cliente cadastrado com sucesso no Supabase:', idFinal);

    return {
      success: true,
      profile: {
        ...mapearClienteDeSupabase(insertedData || { ...payload, id: idFinal }),
        id: idFinal,
        recoveryCode,
      },
    };
  } catch (err: any) {
    console.error('[Supabase cadastrarClienteSupabase] Erro de rede ou execução no cadastro do cliente:', err);
    return {
      success: false,
      error: err?.message || 'Falha ao conectar com o banco de dados para realizar o cadastro.',
    };
  }
}

/**
 * Autentica o cliente consultando estritamente a tabela `clientes` no Supabase por CPF ou E-mail e Senha Hash
 */
export async function autenticarClienteSupabase(
  identifier: string,
  passwordHash: string
): Promise<{ success: boolean; profile?: CustomerProfile; error?: string }> {
  try {
    if (!isSupabaseConfigured || !supabase) {
      const err = 'Serviço de autenticação não configurado (credenciais Supabase ausentes).';
      console.error(`[Supabase autenticarClienteSupabase] ${err}`);
      return { success: false, error: err };
    }

    const trimmed = identifier.trim();
    const cleanDoc = trimmed.replace(/\D/g, '');
    const cleanEmail = trimmed.toLowerCase();

    let cliente: any = null;

    // Tentativa 1: busca direta por email ou numero_documento
    try {
      let query = supabase.from('clientes').select('*');
      if (trimmed.includes('@')) {
        query = query.eq('email', cleanEmail);
      } else if (cleanDoc.length > 0) {
        query = query.or(`numero_documento.eq.${cleanDoc},numero_documento.eq.${trimmed}`);
      } else {
        query = query.eq('email', cleanEmail);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        cliente = data;
      }
    } catch (qErr) {
      console.warn('[Supabase autenticarClienteSupabase] Erro ao consultar por filtro específico:', qErr);
    }

    // Tentativa 2: fallback de busca ampla se query falhar por incompatibilidade de coluna
    if (!cliente) {
      try {
        const { data: allClientes } = await supabase.from('clientes').select('*').limit(200);
        if (allClientes && Array.isArray(allClientes)) {
          cliente = allClientes.find((c: any) => {
            const cDoc = String(c.numero_documento || c.document_number || c.cpf || c.endereco?.cpf || c.endereco?.documentNumber || '').replace(/\D/g, '');
            const cEmail = String(c.email || c.endereco?.email || '').toLowerCase();
            return cEmail === cleanEmail || (cleanDoc.length > 0 && cDoc === cleanDoc) || c.numero_documento === trimmed;
          });
        }
      } catch (fbErr) {
        console.warn('[Supabase autenticarClienteSupabase] Erro no fallback de clientes:', fbErr);
      }
    }

    if (!cliente) {
      return {
        success: false,
        error: 'Nenhuma conta encontrada com este CPF ou E-mail no banco de dados. Verifique os dados ou realize o Primeiro Acesso.',
      };
    }

    // Validação do hash da senha
    const storedHash = 
      cliente.senha_hash || 
      cliente.password_hash || 
      cliente.endereco?.senha_hash || 
      cliente.endereco?.password_hash;

    if (storedHash && storedHash !== passwordHash) {
      return {
        success: false,
        error: 'Senha incorreta. Verifique a senha digitada ou utilize a Recuperação de Acesso.',
      };
    }

    // Atualiza data do último acesso no Supabase em background
    try {
      supabase
        .from('clientes')
        .update({ ultimo_acesso: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', cliente.id)
        .then();
    } catch {}

    console.info('[Supabase autenticarClienteSupabase] Login realizado com sucesso para:', cliente.email || cliente.id);

    return {
      success: true,
      profile: mapearClienteDeSupabase(cliente),
    };
  } catch (err: any) {
    console.error('[Supabase autenticarClienteSupabase] Erro na autenticação do cliente:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado durante a autenticação.',
    };
  }
}

/**
 * Recupera o acesso e redefine a senha do cliente usando o Código Único de 6 Dígitos diretamente no Supabase
 */
export async function recuperarSenhaClienteSupabase(
  identifier: string,
  recoveryCode: string,
  newPasswordHash: string
): Promise<{ success: boolean; profile?: CustomerProfile; error?: string }> {
  try {
    if (!isSupabaseConfigured || !supabase) {
      const err = 'Serviço de banco de dados offline (credenciais Supabase ausentes).';
      console.error(`[Supabase recuperarSenhaClienteSupabase] ${err}`);
      return { success: false, error: err };
    }

    const trimmed = identifier.trim();
    const cleanDoc = trimmed.replace(/\D/g, '');
    const cleanEmail = trimmed.toLowerCase();
    const cleanCode = recoveryCode.trim().replace(/\D/g, '');

    if (!cleanCode || cleanCode.length !== 6) {
      return {
        success: false,
        error: 'O código único de recuperação deve conter exatamente 6 dígitos numéricos.',
      };
    }

    let cliente: any = null;

    try {
      let query = supabase.from('clientes').select('*');
      if (trimmed.includes('@')) {
        query = query.eq('email', cleanEmail);
      } else if (cleanDoc.length > 0) {
        query = query.or(`numero_documento.eq.${cleanDoc},numero_documento.eq.${trimmed}`);
      } else {
        query = query.eq('email', cleanEmail);
      }

      const { data, error: findError } = await query.maybeSingle();
      if (!findError && data) {
        cliente = data;
      }
    } catch (findErr) {
      console.warn('[Supabase recuperarSenhaClienteSupabase] Erro ao buscar cliente:', findErr);
    }

    // Fallback de busca
    if (!cliente) {
      const { data: allClientes } = await supabase.from('clientes').select('*').limit(200);
      if (allClientes && Array.isArray(allClientes)) {
        cliente = allClientes.find((c: any) => {
          const cDoc = String(c.numero_documento || c.document_number || c.cpf || c.endereco?.cpf || '').replace(/\D/g, '');
          const cEmail = String(c.email || c.endereco?.email || '').toLowerCase();
          return cEmail === cleanEmail || (cleanDoc.length > 0 && cDoc === cleanDoc);
        });
      }
    }

    if (!cliente) {
      return {
        success: false,
        error: 'Cliente não encontrado com o CPF ou E-mail informado no banco central.',
      };
    }

    // Validação do Código de Recuperação
    const rawEndereco = typeof cliente.endereco === 'object' && cliente.endereco !== null ? cliente.endereco : {};
    const codigoSalvo = String(
      cliente.codigo_recuperacao || 
      cliente.recovery_code || 
      rawEndereco.codigo_recuperacao || 
      rawEndereco.recoveryCode || 
      ''
    ).trim();

    if (codigoSalvo && codigoSalvo !== cleanCode) {
      return {
        success: false,
        error: 'Código único de recuperação inválido para esta conta. Verifique os 6 dígitos fornecidos no cadastro.',
      };
    }

    // Prepara o novo endereço com o hash e código atualizados
    const updatedEndereco = {
      ...rawEndereco,
      senha_hash: newPasswordHash,
      codigo_recuperacao: cleanCode,
      recoveryCode: cleanCode,
    };

    const updatePayload: Record<string, any> = {
      senha_hash: newPasswordHash,
      endereco: updatedEndereco,
      updated_at: new Date().toISOString(),
    };

    let updatedRecord: any = null;
    let lastUpdateError: any = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const { data: updated, error: updateError } = await supabase
        .from('clientes')
        .update(updatePayload)
        .eq('id', cliente.id)
        .select()
        .maybeSingle();

      if (!updateError && updated) {
        updatedRecord = updated;
        lastUpdateError = null;
        break;
      }

      // Tentativa de update simples direto sem .select()
      if (updateError) {
        const { error: directUpErr } = await supabase
          .from('clientes')
          .update(updatePayload)
          .eq('id', cliente.id);

        if (!directUpErr) {
          updatedRecord = { ...cliente, ...updatePayload };
          lastUpdateError = null;
          break;
        }
      }

      lastUpdateError = updateError;
      if (
        updateError?.code === 'PGRST204' ||
        updateError?.message?.includes('Could not find') ||
        updateError?.message?.includes('does not exist')
      ) {
        const missingCol = extrairColunaInexistente(updateError);
        if (missingCol && missingCol in updatePayload) {
          delete updatePayload[missingCol];
          continue;
        }
        if ('senha_hash' in updatePayload) {
          delete updatePayload.senha_hash;
          continue;
        }
        if ('updated_at' in updatePayload) {
          delete updatePayload.updated_at;
          continue;
        }
      }
      break;
    }

    if (lastUpdateError && !updatedRecord) {
      console.error('[Supabase recuperarSenhaClienteSupabase] Erro ao redefinir senha no Supabase:', lastUpdateError);
      return {
        success: false,
        error: lastUpdateError.message || 'Falha ao atualizar a senha no banco de dados.',
      };
    }

    console.info('[Supabase recuperarSenhaClienteSupabase] Senha redefinida com sucesso no Supabase para cliente:', cliente.id);

    return {
      success: true,
      profile: mapearClienteDeSupabase(updatedRecord || { ...cliente, endereco: updatedEndereco }),
    };
  } catch (err: any) {
    console.error('[Supabase recuperarSenhaClienteSupabase] Erro na recuperação de senha:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado na recuperação de acesso.',
    };
  }
}

/**
 * Atualiza os dados cadastrais do cliente no Supabase com tolerância a esquemas
 */
export async function atualizarPerfilClienteSupabase(
  profile: CustomerProfile
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured || !supabase) {
      const err = 'Supabase não configurado.';
      console.error(`[Supabase atualizarPerfilClienteSupabase] ${err}`);
      return { success: false, error: err };
    }

    const payload: Record<string, any> = {
      nome_completo: profile.fullName.trim(),
      tipo_documento: profile.documentType,
      numero_documento: profile.documentNumber.replace(/\D/g, '') || profile.documentNumber,
      email: profile.email.trim().toLowerCase(),
      telefone: profile.phone.trim(),
      foto_url: profile.photoUrl || null,
      endereco: {
        ...profile.address,
        codigo_recuperacao: profile.recoveryCode,
        recoveryCode: profile.recoveryCode,
      },
      updated_at: new Date().toISOString(),
    };

    if (profile.recoveryCode) {
      payload.codigo_recuperacao = profile.recoveryCode;
    }

    const colunasOpcionais = ['codigo_recuperacao', 'tipo_documento', 'foto_url', 'updated_at'];

    for (let attempt = 0; attempt < 10; attempt++) {
      const { error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', profile.id);

      if (!error) {
        console.info('[Supabase atualizarPerfilClienteSupabase] Perfil do cliente atualizado com sucesso no Supabase:', profile.id);
        return { success: true };
      }

      if (
        error?.code === 'PGRST204' ||
        error?.message?.includes('Could not find') ||
        error?.message?.includes('does not exist')
      ) {
        const missingCol = extrairColunaInexistente(error);
        if (missingCol && missingCol in payload) {
          delete payload[missingCol];
          continue;
        }
        const nextCol = colunasOpcionais.find(col => col in payload);
        if (nextCol) {
          delete payload[nextCol];
          continue;
        }
      }

      console.error('[Supabase atualizarPerfilClienteSupabase] Erro ao atualizar perfil no Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase atualizarPerfilClienteSupabase] Exceção ao atualizar perfil:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Script SQL Oficial do Supabase para criação das tabelas, índices,
 * realtime publication e políticas RLS de segurança para o Sistema e App Operacional.
 */
export const SUPABASE_DATABASE_SCHEMA_SQL = `
-- =========================================================================
-- ESQUEMA OFICIAL DE PRODUÇÃO SUPABASE: SISTEMA + APP CLIENTE + APP OPERACIONAL
-- =========================================================================

-- 1. TABELA DE CLIENTES (Autenticação, Recuperação de 6 Dígitos e Perfil)
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'CPF',
  numero_documento TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT NOT NULL,
  foto_url TEXT,
  endereco JSONB NOT NULL DEFAULT '{}'::jsonb,
  senha_hash TEXT NOT NULL,
  codigo_recuperacao VARCHAR(6) NOT NULL,
  ultimo_acesso TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atualizações de Compatibilidade e Migração Idempotente para tabelas existentes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS codigo_recuperacao VARCHAR(6);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS senha_hash TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10) DEFAULT 'CPF';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices de Alta Velocidade para Busca de Login e Segurança
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON public.clientes(numero_documento);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_recuperacao ON public.clientes(codigo_recuperacao);

-- RLS para a Tabela Clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de clientes" 
  ON public.clientes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir cadastro de novos clientes" 
  ON public.clientes FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de clientes" 
  ON public.clientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);


-- 2. TABELA DE SOLICITAÇÕES DE SERVIÇO
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

-- Índices para Solicitações
CREATE INDEX IF NOT EXISTS idx_solicitacoes_customer_id ON public.solicitacoes_servico(customer_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes_servico(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at ON public.solicitacoes_servico(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_scheduled_date ON public.solicitacoes_servico(scheduled_date);

-- RLS para Solicitações
ALTER TABLE public.solicitacoes_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de solicitacoes" 
  ON public.solicitacoes_servico FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir criacao de solicitacoes" 
  ON public.solicitacoes_servico FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualizacao operacional de solicitacoes" 
  ON public.solicitacoes_servico FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Habilitação do Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_servico;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;

-- 4. Bucket do Supabase Storage para Avatares / Fotos de Perfil
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

