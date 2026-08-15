import { CustomerProfile, ServiceRequest, ServiceStatus } from '../types';

const PROFILE_KEY = 'limpa_organiza_customer_profile';
const REQUESTS_KEY = 'limpa_organiza_service_requests';

export function generate4DigitCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export const DEFAULT_PROFILE: CustomerProfile = {
  id: 'cust_01',
  fullName: 'Juliana Ferreira Santos',
  documentType: 'CPF',
  documentNumber: '349.812.908-45',
  email: 'juliana.santos@exemplo.com.br',
  phone: '(11) 98452-9134',
  address: {
    cep: '04538-133',
    logradouro: 'Rua Joaquim Floriano',
    numero: '466',
    complemento: 'Apto 82 - Bloco B',
    bairro: 'Itaim Bibi',
    cidade: 'São Paulo',
    uf: 'SP',
    pontoReferencia: 'Próximo ao Hospital São Luiz e Parque do Povo',
  },
  createdAt: '2026-08-01T10:00:00.000Z',
};

export const INITIAL_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'ORD-2026-9842',
    securityCode: '7492',
    customer: DEFAULT_PROFILE,
    serviceType: 'ambos',
    cleaningDetail: 'padrao',
    organizationFormat: 'padrao_5s',
    standard5SPreferences: {
      focusAreas: ['Cozinha e Despensa', 'Closet / Roupas', 'Área de Serviço'],
      discardApprovalAlways: true,
      labelingIncluded: true,
      maintenanceGuide: true,
    },
    property: {
      type: 'apartamento',
      bedrooms: 2,
      bathrooms: 2,
      approxAreaM2: 75,
      hasPets: true,
      petDetails: '1 cão de pequeno porte (dócil e vacinado)',
    },
    scheduledDate: '2026-08-16',
    timeSlot: 'manha_08h',
    specialNotes: 'Interfone tocar no 82B. Trazer aspirador de pó e produtos neutros (alergia a cloro). Chaves na portaria caso atrase 5min.',
    status: 'aprovado',
    estimatedPrice: 280.0,
    estimatedHours: 6,
    assignedProfessional: {
      id: 'prof_01',
      name: 'Maria Cristina Silva',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
      rating: 4.95,
      servicesCount: 142,
      badgeVerified: true,
      phone: '(11) 97123-8890',
      documentMasked: 'RG 42.***.***-8 (Verificado)',
      vehicle: 'Identificação oficial da empresa com uniforme',
    },
    createdAt: '2026-08-15T09:30:00.000Z',
    statusTimeline: [
      {
        status: 'solicitado',
        timestamp: '2026-08-15T09:30:00.000Z',
        description: 'Solicitação recebida no sistema com sucesso.',
      },
      {
        status: 'aprovado',
        timestamp: '2026-08-15T10:15:00.000Z',
        description: 'Atendimento aprovado! Profissional Maria Cristina designada e Código de Segurança 7492 gerado.',
      },
    ],
    paymentTerms: {
      payOnSite: true,
      acceptedMethods: ['PIX', 'Cartão de Crédito/Débito (Máquina)', 'Dinheiro em Espécie'],
      note: 'Pagamento realizado 100% no local diretamente ao colaborador no início ou término do serviço.',
    },
  },
  {
    id: 'ORD-2026-8731',
    securityCode: '3185',
    customer: DEFAULT_PROFILE,
    serviceType: 'organizacao',
    organizationFormat: 'personalizada',
    customOrgPreferences: {
      priorityRooms: ['Closet Principal', 'Gaveteiros do Home Office'],
      specificPreferences: 'Organização por paleta de cores no closet e etiquetagem dos cabos do escritório.',
      fragileItemsNotes: 'Caixas de relógios e perfumes na prateleira superior.',
      foldingStyle: 'vertical_gavetas',
      routineNotes: 'Roupas de treino na primeira gaveta da esquerda.',
    },
    property: {
      type: 'apartamento',
      bedrooms: 2,
      bathrooms: 2,
      approxAreaM2: 75,
      hasPets: true,
    },
    scheduledDate: '2026-08-05',
    timeSlot: 'tarde_13h30',
    specialNotes: 'Serviço focado em otimização de espaço.',
    status: 'concluido',
    estimatedPrice: 220.0,
    estimatedHours: 4,
    assignedProfessional: {
      id: 'prof_02',
      name: 'Carla Beatriz Mendes',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300',
      rating: 5.0,
      servicesCount: 98,
      badgeVerified: true,
      phone: '(11) 98844-3321',
      documentMasked: 'RG 38.***.***-2 (Verificado)',
    },
    createdAt: '2026-08-04T14:00:00.000Z',
    statusTimeline: [
      {
        status: 'solicitado',
        timestamp: '2026-08-04T14:00:00.000Z',
        description: 'Solicitação registrada.',
      },
      {
        status: 'aprovado',
        timestamp: '2026-08-04T14:40:00.000Z',
        description: 'Código de Segurança 3185 gerado.',
      },
      {
        status: 'a_caminho',
        timestamp: '2026-08-05T13:00:00.000Z',
        description: 'Profissional a caminho do endereço.',
      },
      {
        status: 'em_andamento',
        timestamp: '2026-08-05T13:35:00.000Z',
        description: 'Código 3185 validado no local com sucesso. Atendimento iniciado.',
      },
      {
        status: 'concluido',
        timestamp: '2026-08-05T17:40:00.000Z',
        description: 'Organização concluída e pagamento efetuado no local via PIX.',
      },
    ],
    paymentTerms: {
      payOnSite: true,
      acceptedMethods: ['PIX', 'Cartão', 'Dinheiro'],
      note: 'Pago no local com sucesso via PIX.',
    },
  },
];

export function getStoredProfile(): CustomerProfile | null {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return DEFAULT_PROFILE;
    return JSON.parse(data);
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveStoredProfile(profile: CustomerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving profile to localStorage', e);
  }
}

export function getStoredRequests(): ServiceRequest[] {
  try {
    const data = localStorage.getItem(REQUESTS_KEY);
    if (!data) {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(INITIAL_SERVICE_REQUESTS));
      return INITIAL_SERVICE_REQUESTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_SERVICE_REQUESTS;
  }
}

export function saveStoredRequests(requests: ServiceRequest[]): void {
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error('Error saving requests to localStorage', e);
  }
}

export function addServiceRequest(request: ServiceRequest): ServiceRequest[] {
  const current = getStoredRequests();
  const updated = [request, ...current];
  saveStoredRequests(updated);
  return updated;
}

export function updateServiceRequestStatus(requestId: string, newStatus: ServiceStatus): ServiceRequest[] {
  const current = getStoredRequests();
  const updated = current.map((req) => {
    if (req.id !== requestId) return req;
    
    let desc = '';
    if (newStatus === 'a_caminho') {
      desc = `Profissional ${req.assignedProfessional?.name || 'designado'} está a caminho do seu endereço. Tenha o código ${req.securityCode} em mãos.`;
    } else if (newStatus === 'em_andamento') {
      desc = `Código de Segurança ${req.securityCode} confirmado no local! Atendimento em andamento.`;
    } else if (newStatus === 'concluido') {
      desc = 'Atendimento concluído com sucesso! Pagamento finalizado no local.';
    } else if (newStatus === 'cancelado') {
      desc = 'Solicitação cancelada pelo cliente.';
    }

    const newTimeline = [
      ...req.statusTimeline,
      {
        status: newStatus,
        timestamp: new Date().toISOString(),
        description: desc,
      },
    ];

    return {
      ...req,
      status: newStatus,
      statusTimeline: newTimeline,
    };
  });

  saveStoredRequests(updated);
  return updated;
}
