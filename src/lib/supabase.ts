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
