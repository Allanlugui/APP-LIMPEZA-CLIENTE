import { CustomerProfile, ServiceRequest, ServiceStatus } from '../types';

const PROFILE_KEY = 'limpa_organiza_customer_profile';
const REQUESTS_KEY = 'limpa_organiza_service_requests';

export function generate4DigitCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function createBlankProfile(): CustomerProfile {
  return {
    id: `cust_${Math.random().toString(36).substring(2, 9)}`,
    fullName: '',
    documentType: 'CPF',
    documentNumber: '',
    email: '',
    phone: '',
    photoUrl: '',
    address: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      pontoReferencia: '',
    },
    createdAt: new Date().toISOString(),
  };
}

export function getStoredProfile(): CustomerProfile {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return createBlankProfile();
    const parsed = JSON.parse(data);
    // Validação se o perfil é válido
    if (!parsed || typeof parsed !== 'object') {
      return createBlankProfile();
    }
    return {
      ...createBlankProfile(),
      ...parsed,
      address: {
        ...createBlankProfile().address,
        ...(parsed.address || {}),
      },
    };
  } catch {
    return createBlankProfile();
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
      return [];
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Filtra eventuais resquícios de dados mockados legados se existirem
    const filtered = parsed.filter(
      (r) => r && r.id && !['REQ-9842', 'REQ-8731', 'ORD-2026-9842', 'ORD-2026-8731'].includes(r.id)
    );
    return filtered;
  } catch {
    return [];
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
  const updated = [request, ...current.filter((r) => r.id !== request.id)];
  saveStoredRequests(updated);
  return updated;
}

export function updateServiceRequestStatus(requestId: string, newStatus: ServiceStatus): ServiceRequest[] {
  const current = getStoredRequests();
  const updated = current.map((req) => {
    if (req.id !== requestId) return req;
    
    let desc = '';
    if (newStatus === 'aprovado') {
      desc = `Solicitação confirmada e profissional ${req.assignedProfessional?.name || 'designado'} atribuído pela equipe operacional.`;
    } else if (newStatus === 'a_caminho') {
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
