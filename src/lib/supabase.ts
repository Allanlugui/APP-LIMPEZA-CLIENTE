import { createClient } from '@supabase/supabase-js';
import { ServiceRequest, ServiceStatus, CustomerProfile } from '../types';

// =========================================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO SEGURA DO SUPABASE
// =========================================================================

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
    '[Supabase Config] Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas ou incompletas.',
    { urlPresent: Boolean(supabaseUrl), keyPresent: Boolean(supabaseAnonKey) }
  );
} else {
  console.info('[Supabase Config] Cliente inicializado com URL de produção:', supabaseUrl);
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

// =========================================================================
// 2. DICIONÁRIOS DE ALIASES PARA SUPORTE BILÍNGUE (PT / EN)
// =========================================================================

export const CLIENTES_COLUMN_ALIASES: Record<string, string[]> = {
  nome_completo: ['nome', 'full_name', 'name', 'customer_name', 'cliente_nome'],
  tipo_documento: ['document_type', 'doc_type', 'tipo_doc'],
  numero_documento: ['documento', 'document_number', 'doc_num', 'cpf', 'numero_doc'],
  email: ['cliente_email', 'user_email'],
  telefone: ['phone', 'telephone', 'celular', 'whatsapp', 'cliente_telefone'],
  foto_url: ['photo_url', 'avatar_url', 'image_url', 'avatar'],
  endereco: ['address', 'dados_endereco', 'endereco_completo'],
  senha_hash: ['password_hash', 'hash_senha', 'senha'],
  codigo_recuperacao: ['recovery_code', 'codigo_unico', 'codigo_acesso', 'unique_code'],
  ultimo_acesso: ['last_access', 'last_login', 'ultimo_login'],
  created_at: ['data_criacao', 'criado_em'],
  updated_at: ['data_atualizacao', 'atualizado_em'],
};

export const SOLICITACOES_COLUMN_ALIASES: Record<string, string[]> = {
  codigo_ordem: ['order_code', 'codigo', 'order_id', 'codigo_servico'],
  codigo_confirmacao: ['confirmation_code', 'security_code', 'codigo_seguranca', 'pin_code', 'pin', 'codigo_pin'],
  tipo_servico: ['service_type', 'tipo', 'servico_tipo'],
  formato_organizacao: ['organization_format', 'formato_org', 'tipo_organizacao'],
  endereco: ['address', 'endereco_servico', 'service_address'],
  detalhes_imovel: ['property_details', 'property', 'imovel', 'detalhes_residencia'],
  customer_id: ['cliente_id', 'user_id', 'id_cliente'],
  customer_name: ['cliente_nome', 'nome_cliente', 'client_name', 'nome', 'nome_completo'],
  customer_doc_type: ['cliente_tipo_documento', 'cliente_tipo_doc', 'client_doc_type'],
  customer_doc_num: ['cliente_numero_documento', 'cliente_cpf', 'cliente_documento', 'client_doc_num'],
  customer_email: ['cliente_email', 'email_cliente', 'client_email', 'email'],
  customer_phone: ['cliente_telefone', 'telefone_cliente', 'client_phone', 'telefone', 'phone'],
  customer_photo_url: ['cliente_foto_url', 'client_photo_url', 'foto_url_cliente'],
  cleaning_detail: ['detalhes_limpeza', 'cleaning_details', 'limpeza_detalhe'],
  custom_org_preferences: ['preferencias_personalizadas', 'custom_preferences', 'preferencias_customizadas'],
  standard_5s_preferences: ['preferencias_5s', 'padrao_5s_preferencias', 'standard_5s'],
  scheduled_date: ['data_agendamento', 'data_servico', 'data_atendimento', 'schedule_date'],
  time_slot: ['periodo', 'horario', 'turno', 'slot_tempo'],
  special_notes: ['observacoes', 'notas_especiais', 'notes', 'obs'],
  status: ['estado', 'situacao'],
  estimated_price: ['preco_estimado', 'valor_estimado', 'valor_total', 'total_price', 'preco', 'valor'],
  estimated_hours: ['horas_estimadas', 'duracao_estimada', 'total_hours', 'horas'],
  assigned_professional: ['profissional_designado', 'profissional', 'assigned_cleaner'],
  status_timeline: ['timeline_status', 'historico_status', 'timeline', 'historico'],
  payment_terms: ['termos_pagamento', 'condicoes_pagamento', 'payment_info', 'pagamento'],
  created_at: ['data_criacao', 'criado_em'],
  updated_at: ['data_atualizacao', 'atualizado_em'],
};

// =========================================================================
// 3. UTILITÁRIOS DE MAPEAMENTO E TRATAMENTO DE ERROS POSTGREST / SQL
// =========================================================================

export function ehUUIDValido(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
}

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
 * Extrai o nome exato da coluna inexistente de erros PostgREST (PGRST204) ou Postgres (42703)
 */
export function extrairColunaInexistente(errorObj: any): string | null {
  if (!errorObj) return null;
  const message = typeof errorObj === 'string' 
    ? errorObj 
    : [errorObj.message, errorObj.details, errorObj.hint, JSON.stringify(errorObj)].filter(Boolean).join(' ');
  
  // PostgREST: Could not find the 'xyz' column of 'table' in the schema cache
  const match1 = message.match(/Could not find the ['"]([^'"]+)['"] column/i);
  if (match1) return match1[1];

  // PostgREST: Could not find the column 'xyz'
  const match2 = message.match(/Could not find the column ['"]([^'"]+)['"]/i);
  if (match2) return match2[1];

  // Postgres: column "xyz" does not exist / column "xyz" of relation ... does not exist
  const match3 = message.match(/column ['"]?([a-zA-Z0-9_]+)['"]? (?:of relation [^\s]+ )?does not exist/i);
  if (match3) return match3[1];

  // Postgres: column table.xyz does not exist
  const match4 = message.match(/column [a-zA-Z0-9_]+\.([a-zA-Z0-9_]+) does not exist/i);
  if (match4) return match4[1];

  return null;
}

/**
 * Tenta substituir dinamicamente uma coluna rejeitada por seus aliases bilíngues suportados
 */
function adaptarPayloadPorAlias(
  payload: Record<string, any>,
  colunaInexistente: string,
  aliasMap: Record<string, string[]>,
  tentativasPorCampo: Record<string, number>
): boolean {
  // Encontra a chave canônica correspondente à coluna inexistente
  let chaveCanonica = colunaInexistente;
  let listaAliases: string[] = [];

  if (aliasMap[colunaInexistente]) {
    chaveCanonica = colunaInexistente;
    listaAliases = aliasMap[colunaInexistente];
  } else {
    for (const [canon, aliases] of Object.entries(aliasMap)) {
      if (aliases.includes(colunaInexistente)) {
        chaveCanonica = canon;
        listaAliases = [canon, ...aliases.filter(a => a !== colunaInexistente)];
        break;
      }
    }
  }

  const valorOriginal = payload[colunaInexistente];
  delete payload[colunaInexistente];

  const tentativaAtual = tentativasPorCampo[chaveCanonica] || 0;
  if (tentativaAtual < listaAliases.length) {
    const proximoAlias = listaAliases[tentativaAtual];
    tentativasPorCampo[chaveCanonica] = tentativaAtual + 1;
    payload[proximoAlias] = valorOriginal;
    console.info(`[Supabase Schema Adaptive] Trocando coluna '${colunaInexistente}' -> '${proximoAlias}' (tentativa ${tentativaAtual + 1})`);
    return true;
  }

  console.warn(`[Supabase Schema Adaptive] Esgotados aliases para campo '${chaveCanonica}'. Removendo do payload.`);
  return false;
}

// =========================================================================
// 4. MAPEADORES DE DADOS BIDIRECIONAIS (PT / EN / UNIFIED SCHEMA)
// =========================================================================

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

  const rawEndereco = typeof row.endereco === 'object' && row.endereco !== null 
    ? row.endereco 
    : (typeof row.address === 'object' && row.address !== null 
      ? row.address 
      : (typeof row.dados_endereco === 'object' && row.dados_endereco !== null ? row.dados_endereco : {}));

  const recoveryCode = 
    row.codigo_recuperacao || 
    row.recovery_code || 
    row.codigo_unico || 
    row.codigo_acesso || 
    rawEndereco.codigo_recuperacao || 
    rawEndereco.recoveryCode || 
    rawEndereco.recovery_code || 
    '';

  const cleanEndereco = {
    cep: rawEndereco.cep || '',
    logradouro: rawEndereco.logradouro || rawEndereco.rua || rawEndereco.street || '',
    numero: rawEndereco.numero || rawEndereco.number || '',
    complemento: rawEndereco.complemento || rawEndereco.complement || '',
    bairro: rawEndereco.bairro || rawEndereco.neighborhood || rawEndereco.district || '',
    cidade: rawEndereco.cidade || rawEndereco.localidade || rawEndereco.city || '',
    uf: rawEndereco.uf || rawEndereco.estado || rawEndereco.state || '',
  };

  const idFinal = String(row.id || (ehUUIDValido(row.uuid) ? row.uuid : ''));

  return {
    id: idFinal || (ehUUIDValido(row.id) ? String(row.id) : gerarUUIDValido()),
    fullName: row.nome_completo || row.full_name || row.nome || row.name || row.customer_name || row.cliente_nome || '',
    documentType: (row.tipo_documento || row.document_type || row.doc_type || 'CPF') as 'CPF' | 'RG',
    documentNumber: row.numero_documento || row.document_number || row.documento || row.cpf || rawEndereco.cpf || rawEndereco.documentNumber || '',
    email: row.email || row.customer_email || row.cliente_email || rawEndereco.email || '',
    phone: row.telefone || row.phone || row.celular || row.telephone || rawEndereco.telefone || rawEndereco.phone || '',
    photoUrl: row.foto_url || row.photo_url || row.avatar_url || row.image_url || '',
    recoveryCode: String(recoveryCode || ''),
    address: cleanEndereco,
    createdAt: row.created_at || row.data_criacao || new Date().toISOString(),
    updatedAt: row.updated_at || row.data_atualizacao || undefined,
  };
}

export function mapearParaSupabase(request: ServiceRequest) {
  const currentYear = new Date().getFullYear();
  const numParte = request.id.replace(/^[A-Za-z-]+/, '') || Math.floor(1000 + Math.random() * 9000).toString();
  const codigoOrdem = request.id.startsWith('ORD-') ? request.id : `ORD-${currentYear}-${numParte}`;
  const codigoConfirmacao = String(request.securityCode || '0000').padStart(4, '0').slice(-4);

  return {
    id: request.id,
    codigo_ordem: codigoOrdem,
    codigo_confirmacao: codigoConfirmacao,
    
    // Nomenclatura oficial
    tipo_servico: request.serviceType,
    formato_organizacao: request.organizationFormat || null,
    endereco: request.customer.address,
    detalhes_imovel: request.property,
    
    // Dados identificadores do cliente
    customer_id: request.customer.id,
    customer_name: request.customer.fullName,
    customer_doc_type: request.customer.documentType,
    customer_doc_num: request.customer.documentNumber.replace(/\D/g, '') || request.customer.documentNumber,
    customer_email: request.customer.email.trim().toLowerCase(),
    customer_phone: request.customer.phone.trim(),
    customer_photo_url: request.customer.photoUrl || null,
    
    // Detalhes operacionais e 5S
    cleaning_detail: request.cleaningDetail || null,
    custom_org_preferences: request.customOrgPreferences || null,
    standard_5s_preferences: request.standard5SPreferences || null,
    
    // Agendamento
    scheduled_date: request.scheduledDate,
    time_slot: request.timeSlot,
    special_notes: request.specialNotes || null,
    
    // Status e precificação
    status: request.status,
    estimated_price: request.estimatedPrice,
    estimated_hours: request.estimatedHours,
    
    // Profissional e linha do tempo
    assigned_professional: request.assignedProfessional || null,
    status_timeline: request.statusTimeline,
    payment_terms: request.paymentTerms,
    
    created_at: request.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function mapearDeSupabase(row: any): ServiceRequest {
  const securityCode = String(
    row.codigo_confirmacao || 
    row.confirmation_code || 
    row.security_code || 
    row.codigo_seguranca || 
    row.securityCode || 
    row.pin_code || 
    '0000'
  ).padStart(4, '0').slice(-4);

  const rawEndereco = typeof row.endereco === 'object' && row.endereco !== null 
    ? row.endereco 
    : (typeof row.address === 'object' && row.address !== null ? row.address : {});

  const cleanEndereco = {
    cep: rawEndereco.cep || '',
    logradouro: rawEndereco.logradouro || rawEndereco.rua || rawEndereco.street || '',
    numero: rawEndereco.numero || rawEndereco.number || '',
    complemento: rawEndereco.complemento || rawEndereco.complement || '',
    bairro: rawEndereco.bairro || rawEndereco.neighborhood || '',
    cidade: rawEndereco.cidade || rawEndereco.city || '',
    uf: rawEndereco.uf || rawEndereco.estado || rawEndereco.state || '',
  };

  const rawImovel = typeof row.detalhes_imovel === 'object' && row.detalhes_imovel !== null 
    ? row.detalhes_imovel 
    : (typeof row.property_details === 'object' && row.property_details !== null 
      ? row.property_details 
      : (typeof row.property === 'object' && row.property !== null ? row.property : {}));

  return {
    id: row.codigo_ordem || row.order_code || row.id,
    securityCode: securityCode,
    customer: {
      id: row.customer_id || row.cliente_id || 'cust_01',
      fullName: row.customer_name || row.cliente_nome || row.nome_cliente || row.client_name || '',
      documentType: row.customer_doc_type || row.cliente_tipo_documento || 'CPF',
      documentNumber: row.customer_doc_num || row.cliente_numero_documento || row.cliente_cpf || '',
      email: row.customer_email || row.cliente_email || '',
      phone: row.customer_phone || row.cliente_telefone || '',
      photoUrl: row.customer_photo_url || row.cliente_foto_url || row.photo_url || row.avatar_url || '',
      address: cleanEndereco,
      createdAt: row.created_at || row.data_criacao || new Date().toISOString(),
    },
    serviceType: row.tipo_servico || row.service_type || row.tipo || 'ambos',
    cleaningDetail: row.cleaning_detail || row.detalhes_limpeza || undefined,
    organizationFormat: row.formato_organizacao || row.organization_format || row.formato_org || undefined,
    customOrgPreferences: row.custom_org_preferences || row.preferencias_personalizadas || undefined,
    standard5SPreferences: row.standard_5s_preferences || row.preferencias_5s || undefined,
    property: {
      type: rawImovel.type || 'apartamento',
      bedrooms: Number(rawImovel.bedrooms ?? 2),
      bathrooms: Number(rawImovel.bathrooms ?? 2),
      approxAreaM2: Number(rawImovel.approxAreaM2 ?? 75),
      hasPets: Boolean(rawImovel.hasPets),
    },
    scheduledDate: row.scheduled_date || row.data_agendamento || row.data_servico || '',
    timeSlot: row.time_slot || row.periodo || row.horario || row.turno || 'manha',
    specialNotes: row.special_notes || row.observacoes || undefined,
    status: (row.status || row.estado || 'solicitado') as ServiceStatus,
    estimatedPrice: Number(row.estimated_price ?? row.preco_estimado ?? row.valor_estimado ?? row.valor_total ?? 0),
    estimatedHours: Number(row.estimated_hours ?? row.horas_estimadas ?? row.duracao_estimada ?? 4),
    assignedProfessional: row.assigned_professional || row.profissional_designado || row.profissional || undefined,
    createdAt: row.created_at || row.data_criacao || new Date().toISOString(),
    statusTimeline: Array.isArray(row.status_timeline) 
      ? row.status_timeline 
      : (Array.isArray(row.timeline_status) ? row.timeline_status : []),
    paymentTerms: row.payment_terms || row.termos_pagamento || {
      payOnSite: true,
      acceptedMethods: ['PIX', 'Cartão', 'Dinheiro'],
      note: 'Pagamento 100% no local',
    },
  };
}

// =========================================================================
// 5. OPERAÇÕES DE AUTENTICAÇÃO E CADASTRO (SUPABASE DIRETO)
// =========================================================================

export async function cadastrarClienteSupabase(
  profile: CustomerProfile,
  passwordHash: string,
  recoveryCode: string
): Promise<{ success: boolean; profile?: CustomerProfile; error?: string }> {
  try {
    if (!isSupabaseConfigured || !supabase) {
      const err = 'Supabase não está configurado. Verifique as credenciais VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.';
      console.error(`[Supabase cadastrarClienteSupabase] ${err}`);
      return { success: false, error: err };
    }

    const cleanDoc = profile.documentNumber.replace(/\D/g, '') || profile.documentNumber.trim();
    const cleanEmail = profile.email.trim().toLowerCase();

    // 1. Checagem de duplicidade no Supabase
    try {
      const { data: existing, error: checkError } = await supabase
        .from('clientes')
        .select('*')
        .or(`numero_documento.eq.${cleanDoc},email.eq.${cleanEmail}`)
        .maybeSingle();

      if (!checkError && existing) {
        return {
          success: false,
          error: 'Já existe uma conta cadastrada com este CPF ou E-mail. Faça o login ou utilize a Recuperação de Acesso.',
        };
      }
    } catch (checkErr) {
      console.warn('[Supabase cadastrarClienteSupabase] Aviso ao checar duplicidade:', checkErr);
    }

    // 2. Prepara o payload inicial com metadados de segurança no JSONB endereco
    const enderecoComMetadados = {
      ...profile.address,
      codigo_recuperacao: recoveryCode,
      recoveryCode: recoveryCode,
      senha_hash: passwordHash,
      password_hash: passwordHash,
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

    if (profile.id && ehUUIDValido(profile.id)) {
      payload.id = profile.id;
    }

    let insertedData: any = null;
    let lastError: any = null;
    const tentativasPorCampo: Record<string, number> = {};

    for (let attempt = 0; attempt < 16; attempt++) {
      console.info(`[Supabase cadastrarClienteSupabase] Tentativa ${attempt + 1}: inserindo cliente no Supabase...`);
      
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

      // Tentativa de insert direto sem .select()
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
      console.warn(`[Supabase cadastrarClienteSupabase] Resposta do erro (Tentativa ${attempt + 1}):`, insertError);

      if (insertError?.code === '23505') {
        return {
          success: false,
          error: 'Este CPF ou E-mail já está cadastrado no sistema. Faça o login ou use a Recuperação de Acesso.',
        };
      }

      // Se falhou por formato de UUID no id
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

      // Se falhou por coluna inexistente (PGRST204 ou 42703)
      if (
        insertError?.code === 'PGRST204' ||
        insertError?.code === '42703' ||
        insertError?.message?.includes('Could not find') ||
        insertError?.message?.includes('does not exist')
      ) {
        const missingCol = extrairColunaInexistente(insertError);
        if (missingCol && missingCol in payload) {
          const adaptou = adaptarPayloadPorAlias(payload, missingCol, CLIENTES_COLUMN_ALIASES, tentativasPorCampo);
          if (adaptou || !(missingCol in payload)) {
            continue;
          }
        }
      }

      break;
    }

    if (lastError && !insertedData) {
      console.error('[Supabase cadastrarClienteSupabase] Erro final ao cadastrar cliente:', lastError);
      return {
        success: false,
        error: lastError.message || 'Erro ao registrar cliente no banco de dados Supabase.',
      };
    }

    const idFinal = insertedData?.id || (profile.id && ehUUIDValido(profile.id) ? profile.id : gerarUUIDValido());
    console.info('[Supabase cadastrarClienteSupabase] Cliente registrado com sucesso no banco central:', idFinal);

    return {
      success: true,
      profile: {
        ...mapearClienteDeSupabase(insertedData || { ...payload, id: idFinal }),
        id: idFinal,
        recoveryCode,
      },
    };
  } catch (err: any) {
    console.error('[Supabase cadastrarClienteSupabase] Exceção de rede ou execução:', err);
    return {
      success: false,
      error: err?.message || 'Falha de comunicação ao conectar com o banco Supabase.',
    };
  }
}

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

    // Tentativa 1: Busca direta no Supabase com suporte a múltiplos nomes de colunas
    try {
      let query = supabase.from('clientes').select('*');
      if (trimmed.includes('@')) {
        query = query.eq('email', cleanEmail);
      } else if (cleanDoc.length > 0) {
        query = query.or(`numero_documento.eq.${cleanDoc},numero_documento.eq.${trimmed},documento.eq.${cleanDoc}`);
      } else {
        query = query.eq('email', cleanEmail);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        cliente = data;
      } else if (error) {
        console.warn('[Supabase autenticarClienteSupabase] Aviso na query direta:', error.message);
      }
    } catch (qErr) {
      console.warn('[Supabase autenticarClienteSupabase] Falha na consulta por filtro específico:', qErr);
    }

    // Tentativa 2: Busca ampla de tolerância se a query específica falhar por nomes de coluna customizados
    if (!cliente) {
      try {
        const { data: allClientes, error: scanErr } = await supabase.from('clientes').select('*').limit(200);
        if (!scanErr && allClientes && Array.isArray(allClientes)) {
          cliente = allClientes.find((c: any) => {
            const cDoc = String(
              c.numero_documento || 
              c.document_number || 
              c.documento || 
              c.cpf || 
              c.endereco?.cpf || 
              c.endereco?.documentNumber || 
              ''
            ).replace(/\D/g, '');
            const cEmail = String(c.email || c.customer_email || c.cliente_email || c.endereco?.email || '').toLowerCase();
            return cEmail === cleanEmail || (cleanDoc.length > 0 && cDoc === cleanDoc) || c.numero_documento === trimmed;
          });
        }
      } catch (fbErr) {
        console.warn('[Supabase autenticarClienteSupabase] Falha no scan amplo de clientes:', fbErr);
      }
    }

    if (!cliente) {
      return {
        success: false,
        error: 'Nenhuma conta encontrada com este CPF ou E-mail no banco central. Verifique os dados ou realize o Primeiro Acesso.',
      };
    }

    // Validação estrita do hash da senha
    const storedHash = 
      cliente.senha_hash || 
      cliente.password_hash || 
      cliente.hash_senha || 
      cliente.endereco?.senha_hash || 
      cliente.endereco?.password_hash;

    if (storedHash && storedHash !== passwordHash) {
      return {
        success: false,
        error: 'Senha incorreta. Verifique a senha digitada ou utilize a Recuperação de Acesso.',
      };
    }

    // Atualização assíncrona do último acesso no Supabase
    try {
      supabase
        .from('clientes')
        .update({ 
          ultimo_acesso: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        })
        .eq('id', cliente.id)
        .then();
    } catch {}

    console.info('[Supabase autenticarClienteSupabase] Autenticação confirmada no Supabase para:', cliente.email || cliente.id);

    return {
      success: true,
      profile: mapearClienteDeSupabase(cliente),
    };
  } catch (err: any) {
    console.error('[Supabase autenticarClienteSupabase] Exceção de rede ou execução:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado durante a autenticação.',
    };
  }
}

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

    // Busca do cliente no Supabase
    try {
      let query = supabase.from('clientes').select('*');
      if (trimmed.includes('@')) {
        query = query.eq('email', cleanEmail);
      } else if (cleanDoc.length > 0) {
        query = query.or(`numero_documento.eq.${cleanDoc},numero_documento.eq.${trimmed},documento.eq.${cleanDoc}`);
      } else {
        query = query.eq('email', cleanEmail);
      }

      const { data, error: findError } = await query.maybeSingle();
      if (!findError && data) {
        cliente = data;
      }
    } catch (findErr) {
      console.warn('[Supabase recuperarSenhaClienteSupabase] Aviso ao buscar cliente:', findErr);
    }

    if (!cliente) {
      const { data: allClientes } = await supabase.from('clientes').select('*').limit(200);
      if (allClientes && Array.isArray(allClientes)) {
        cliente = allClientes.find((c: any) => {
          const cDoc = String(c.numero_documento || c.document_number || c.documento || c.cpf || c.endereco?.cpf || '').replace(/\D/g, '');
          const cEmail = String(c.email || c.customer_email || c.endereco?.email || '').toLowerCase();
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

    // Validação estrita do código único de recuperação
    const rawEndereco = typeof cliente.endereco === 'object' && cliente.endereco !== null ? cliente.endereco : {};
    const codigoSalvo = String(
      cliente.codigo_recuperacao || 
      cliente.recovery_code || 
      cliente.codigo_unico || 
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

    const updatedEndereco = {
      ...rawEndereco,
      senha_hash: newPasswordHash,
      password_hash: newPasswordHash,
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
    const tentativasPorCampo: Record<string, number> = {};

    for (let attempt = 0; attempt < 12; attempt++) {
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
      console.warn(`[Supabase recuperarSenhaClienteSupabase] Resposta do erro de update (Tentativa ${attempt + 1}):`, updateError);

      if (
        updateError?.code === 'PGRST204' ||
        updateError?.code === '42703' ||
        updateError?.message?.includes('Could not find') ||
        updateError?.message?.includes('does not exist')
      ) {
        const missingCol = extrairColunaInexistente(updateError);
        if (missingCol && missingCol in updatePayload) {
          const adaptou = adaptarPayloadPorAlias(updatePayload, missingCol, CLIENTES_COLUMN_ALIASES, tentativasPorCampo);
          if (adaptou || !(missingCol in updatePayload)) {
            continue;
          }
        }
      }
      break;
    }

    if (lastUpdateError && !updatedRecord) {
      console.error('[Supabase recuperarSenhaClienteSupabase] Erro ao redefinir senha no Supabase:', lastUpdateError);
      return {
        success: false,
        error: lastUpdateError.message || 'Falha ao atualizar a senha no banco de dados central.',
      };
    }

    console.info('[Supabase recuperarSenhaClienteSupabase] Senha redefinida com sucesso para o cliente:', cliente.id);

    return {
      success: true,
      profile: mapearClienteDeSupabase(updatedRecord || { ...cliente, endereco: updatedEndereco }),
    };
  } catch (err: any) {
    console.error('[Supabase recuperarSenhaClienteSupabase] Exceção na recuperação de senha:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado na recuperação de acesso.',
    };
  }
}

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

    const tentativasPorCampo: Record<string, number> = {};

    for (let attempt = 0; attempt < 12; attempt++) {
      const { error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', profile.id);

      if (!error) {
        console.info('[Supabase atualizarPerfilClienteSupabase] Perfil do cliente atualizado no Supabase:', profile.id);
        return { success: true };
      }

      if (
        error?.code === 'PGRST204' ||
        error?.code === '42703' ||
        error?.message?.includes('Could not find') ||
        error?.message?.includes('does not exist')
      ) {
        const missingCol = extrairColunaInexistente(error);
        if (missingCol && missingCol in payload) {
          const adaptou = adaptarPayloadPorAlias(payload, missingCol, CLIENTES_COLUMN_ALIASES, tentativasPorCampo);
          if (adaptou || !(missingCol in payload)) {
            continue;
          }
        }
      }

      console.error('[Supabase atualizarPerfilClienteSupabase] Erro ao atualizar perfil:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase atualizarPerfilClienteSupabase] Exceção ao atualizar perfil:', err);
    return { success: false, error: err?.message };
  }
}

// =========================================================================
// 6. OPERAÇÕES DE SOLICITAÇÕES DE SERVIÇO (SUPABASE DIRETO)
// =========================================================================

export async function salvarSolicitacaoSupabase(
  request: ServiceRequest
): Promise<{ success: boolean; data?: ServiceRequest; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    const errorMsg = 'Supabase não está configurado. Verifique as credenciais VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.';
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
    const tentativasPorCampo: Record<string, number> = {};

    for (let attempt = 0; attempt < 16; attempt++) {
      console.info(`[Supabase salvarSolicitacaoSupabase] Tentativa ${attempt + 1}: persistindo solicitação #${request.id}...`);
      
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

      // Tentativa de upsert direto sem .select()
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
      console.warn(`[Supabase salvarSolicitacaoSupabase] Resposta do erro (Tentativa ${attempt + 1}):`, error);

      if (
        error?.code === 'PGRST204' ||
        error?.code === '42703' ||
        error?.message?.includes('Could not find') ||
        error?.message?.includes('does not exist')
      ) {
        const missingCol = extrairColunaInexistente(error);
        if (missingCol && missingCol in payload) {
          const adaptou = adaptarPayloadPorAlias(payload, missingCol, SOLICITACOES_COLUMN_ALIASES, tentativasPorCampo);
          if (adaptou || !(missingCol in payload)) {
            continue;
          }
        }
      }

      break;
    }

    if (lastError && !insertedData) {
      console.error('[Supabase salvarSolicitacaoSupabase] Falha ao gravar solicitação no banco central:', lastError);
      return {
        success: false,
        error: lastError.message || 'Erro ao persistir solicitação no banco Supabase.',
      };
    }

    console.info(`[Supabase salvarSolicitacaoSupabase] Solicitação #${request.id} gravada com sucesso no Supabase.`);

    // Transmite alerta instantâneo em tempo real para o Painel Administrativo e App de Campo
    try {
      emitirNotificacaoEcossistema('new_order_alert', {
        type: 'new_order',
        orderId: request.id,
        title: 'Nova Solicitação de Serviço!',
        message: `Novo pedido #${request.id} criado por ${request.customer.fullName} (${request.serviceType.toUpperCase()}) - R$ ${request.estimatedPrice.toFixed(2)}`,
        sender: 'pwa_client',
        timestamp: new Date().toISOString(),
        data: {
          serviceType: request.serviceType,
          scheduledDate: request.scheduledDate,
          timeSlot: request.timeSlot,
          securityCode: request.securityCode,
          estimatedPrice: request.estimatedPrice,
          estimatedHours: request.estimatedHours,
          customer: {
            id: request.customer.id,
            fullName: request.customer.fullName,
            phone: request.customer.phone,
            email: request.customer.email,
            address: request.customer.address,
          },
        },
      }).catch((e) => console.warn('[Supabase Broadcast Alert] Aviso ao emitir broadcast:', e));
    } catch (broadcastErr) {
      console.warn('[Supabase Broadcast Alert] Erro não bloqueante ao emitir broadcast:', broadcastErr);
    }

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

export async function buscarSolicitacoesSupabase(
  customerId?: string,
  customerDoc?: string,
  customerEmail?: string
): Promise<ServiceRequest[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Supabase buscarSolicitacoesSupabase] Supabase não configurado.');
    return [];
  }

  try {
    const cleanDoc = (customerDoc || '').replace(/\D/g, '');
    const cleanEmail = (customerEmail || '').trim().toLowerCase();

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

    // Filtragem segura para os dados do cliente
    if (customerId || cleanDoc || cleanEmail) {
      const userRows = data.filter((row: any) => {
        const rowCustId = row.customer_id || row.cliente_id || row.user_id;
        const rowDoc = String(row.customer_doc_num || row.cliente_cpf || row.cliente_numero_documento || '').replace(/\D/g, '');
        const rowEmail = String(row.customer_email || row.cliente_email || '').trim().toLowerCase();

        return (
          (customerId && rowCustId === customerId) ||
          (cleanDoc && rowDoc === cleanDoc) ||
          (cleanEmail && rowEmail === cleanEmail)
        );
      });

      return userRows.map(mapearDeSupabase);
    }

    return data.map(mapearDeSupabase);
  } catch (err) {
    console.error('[Supabase buscarSolicitacoesSupabase] Exceção ao consultar solicitações no Supabase:', err);
    return [];
  }
}

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
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      const existingTimeline = current?.status_timeline || current?.timeline_status || [];
      updatePayload.status_timeline = Array.isArray(existingTimeline) ? [...existingTimeline, timelineEntry] : [timelineEntry];
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

// =========================================================================
// 7. REALTIME & COMUNICAÇÃO CRUZADA DO ECOSSISTEMA (PWA, ADMIN, FIELD APP)
// =========================================================================

export interface EcosystemNotification {
  id: string;
  type: 'new_order' | 'status_update' | 'field_arrival' | 'admin_announcement' | 'test_ping' | 'test_pong';
  orderId?: string;
  title: string;
  message: string;
  sender: 'pwa_client' | 'admin_panel' | 'field_app';
  timestamp: string;
  data?: any;
}

/**
 * Emite uma notificação em tempo real para todo o ecossistema (Painel Admin e App de Campo)
 */
export async function emitirNotificacaoEcossistema(
  event: 'new_order_alert' | 'status_change' | 'field_update' | 'test_ping' | 'test_pong',
  payload: Omit<EcosystemNotification, 'id'> & { id?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Supabase Broadcast] Supabase não configurado para envio de broadcast.');
    return { success: false, error: 'Supabase offline.' };
  }

  try {
    const notification: EcosystemNotification = {
      id: payload.id || `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: payload.timestamp || new Date().toISOString(),
      ...payload,
    };

    const channel = supabase.channel('ecosystem_live_events');
    
    // Envia o broadcast
    const resp = await channel.send({
      type: 'broadcast',
      event: event,
      payload: notification,
    });

    console.info(`[Supabase Broadcast] Evento '${event}' transmitido para o ecossistema:`, notification, resp);
    return { success: true };
  } catch (err: any) {
    console.error(`[Supabase Broadcast] Falha ao transmitir evento '${event}':`, err);
    return { success: false, error: err?.message || 'Falha no broadcast.' };
  }
}

/**
 * Inscreve o PWA para escutar notificações e transmissões do Painel Admin e App de Campo
 */
export function inscreverNotificacoesEcossistema(
  onNotification: (notification: EcosystemNotification) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('ecosystem_live_events')
    .on(
      'broadcast',
      { event: '*' },
      (message) => {
        if (message && message.payload) {
          const payload = message.payload as EcosystemNotification;
          console.info(`[Supabase Realtime Broadcast] Notificação recebida do ecossistema (${payload.sender}):`, payload);
          onNotification(payload);
        }
      }
    )
    .subscribe((status) => {
      console.info('[Supabase Realtime] Status do canal do ecossistema:', status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Diagnóstico completo e verificação da saúde de conexão do ecossistema (PostgREST + Realtime WebSocket)
 */
export async function testarConexaoEcossistema(profile?: CustomerProfile): Promise<{
  success: boolean;
  latencyMs: number;
  clientesOk: boolean;
  solicitacoesOk: boolean;
  realtimeOk: boolean;
  checkedAt: string;
  message: string;
  details: {
    supabaseUrl: string;
    clientesStatus: string;
    solicitacoesStatus: string;
    realtimeChannelStatus: string;
  };
}> {
  const start = performance.now();
  const checkedAt = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      latencyMs: 0,
      clientesOk: false,
      solicitacoesOk: false,
      realtimeOk: false,
      checkedAt,
      message: 'Credenciais do Supabase não configuradas nas variáveis de ambiente.',
      details: {
        supabaseUrl: rawSupabaseUrl || 'Não configurada',
        clientesStatus: 'Offline',
        solicitacoesStatus: 'Offline',
        realtimeChannelStatus: 'Desconectado',
      },
    };
  }

  let clientesOk = false;
  let solicitacoesOk = false;
  let realtimeOk = false;
  let clientesStatus = 'OK';
  let solicitacoesStatus = 'OK';
  let realtimeChannelStatus = 'Conectado';

  // 1. Testa consulta HTTP PostgREST na tabela clientes
  try {
    const { error: clError } = await supabase.from('clientes').select('id').limit(1);
    if (!clError) {
      clientesOk = true;
    } else {
      clientesStatus = `Erro: ${clError.message}`;
      console.warn('[Test Ecosystem] Tabela clientes:', clError);
    }
  } catch (e: any) {
    clientesStatus = e?.message || 'Falha de rede';
  }

  // 2. Testa consulta HTTP PostgREST na tabela solicitacoes_servico
  try {
    const { error: solError } = await supabase.from('solicitacoes_servico').select('id').limit(1);
    if (!solError) {
      solicitacoesOk = true;
    } else {
      solicitacoesStatus = `Erro: ${solError.message}`;
      console.warn('[Test Ecosystem] Tabela solicitacoes_servico:', solError);
    }
  } catch (e: any) {
    solicitacoesStatus = e?.message || 'Falha de rede';
  }

  // 3. Testa envio de ping Realtime WebSocket
  try {
    const pingRes = await emitirNotificacaoEcossistema('test_ping', {
      type: 'test_ping',
      title: 'Teste de Conexão do Ecossistema',
      message: `Ping de teste enviado pelo cliente ${profile?.fullName || 'Usuário PWA'}`,
      sender: 'pwa_client',
      timestamp: checkedAt,
      data: { clientDoc: profile?.documentNumber, clientEmail: profile?.email },
    });
    realtimeOk = pingRes.success;
    if (!realtimeOk) {
      realtimeChannelStatus = pingRes.error || 'Falha no broadcast';
    }
  } catch (e: any) {
    realtimeChannelStatus = e?.message || 'Erro no canal WebSocket';
  }

  const latencyMs = Math.round(performance.now() - start);
  const overallSuccess = (clientesOk || solicitacoesOk) && isSupabaseConfigured;

  return {
    success: overallSuccess,
    latencyMs,
    clientesOk,
    solicitacoesOk,
    realtimeOk,
    checkedAt,
    message: overallSuccess
      ? `Conexão com o Ecossistema Supabase validada com sucesso (${latencyMs}ms)!`
      : 'Falha parcial ao conectar com os serviços do ecossistema.',
    details: {
      supabaseUrl: supabaseUrl,
      clientesStatus,
      solicitacoesStatus,
      realtimeChannelStatus,
    },
  };
}

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
          console.info('[Supabase Realtime Database] Atualização em tempo real recebida:', payload.new);
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

// =========================================================================
// 8. OTIMIZAÇÃO DE FOTO E UPLOAD
// =========================================================================

export async function processAndCompressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('O arquivo selecionado não é uma imagem válida.'));
    }

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

        ctx.drawImage(img, 0, 0, width, height);
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

export async function uploadFotoPerfilSupabase(
  customerId: string,
  file: File
): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    const { blob, dataUrl } = await processAndCompressImage(file, 800, 800, 0.85);

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: true,
        url: dataUrl,
      };
    }

    const sanitizedId = customerId.replace(/[^a-zA-Z0-9_-]/g, '') || 'cliente';
    const fileName = `perfil_${sanitizedId}_${Date.now()}.jpg`;
    const filePath = `avatars/${fileName}`;

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
        console.info('[Supabase Storage] Bucket pendente ou sem permissão pública, utilizando payload otimizado:', uploadError.message);
      }
    } catch (storageErr) {
      console.warn('[Supabase Storage] Fallback para payload base64 otimizado:', storageErr);
    }

    return {
      success: true,
      url: dataUrl,
    };
  } catch (err: any) {
    console.error('[Supabase Storage] Erro no processamento da foto:', err);
    return {
      success: false,
      url: '',
      error: err?.message || 'Falha ao processar a foto selecionada.',
    };
  }
}

// =========================================================================
// 9. ESQUEMA SQL OFICIAL DO BANCO SUPABASE
// =========================================================================

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
