import { CustomerProfile, ServiceRequest, ServiceStatus, AuthSession } from '../types';

const PROFILE_KEY = 'limpa_organiza_customer_profile';
const REQUESTS_KEY = 'limpa_organiza_service_requests';
const AUTH_SESSION_KEY = 'limpa_organiza_auth_session';
const SAVED_ACCOUNTS_KEY = 'limpa_organiza_registered_accounts';

export function generate4DigitCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createBlankProfile(): CustomerProfile {
  return {
    id: generateUUID(),
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
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      pontoReferencia: '',
    },
    createdAt: new Date().toISOString(),
  };
}

export function getStoredAuthSession(): AuthSession | null {
  try {
    // 1. Tenta recuperar sessão persistente do localStorage (quando "Lembrar minhas credenciais" está ativo)
    const localData = localStorage.getItem(AUTH_SESSION_KEY);
    if (localData) {
      const parsed = JSON.parse(localData);
      if (parsed?.customer?.id) {
        return parsed as AuthSession;
      }
    }

    // 2. Tenta recuperar sessão da aba atual no sessionStorage (quando não optou por lembrar permanentemente)
    const sessionData = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (parsed?.customer?.id) {
        return parsed as AuthSession;
      }
    }

    return null;
  } catch (err) {
    console.error('Erro ao ler sessão de autenticação:', err);
    return null;
  }
}

export function saveStoredAuthSession(session: AuthSession): void {
  try {
    const sessionStr = JSON.stringify(session);
    if (session.rememberMe) {
      localStorage.setItem(AUTH_SESSION_KEY, sessionStr);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, sessionStr);
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    // Mantém o perfil atualizado
    saveStoredProfile(session.customer);
  } catch (err) {
    console.error('Erro ao salvar sessão de autenticação:', err);
  }
}

export function clearStoredAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch (err) {
    console.error('Erro ao limpar sessão de autenticação:', err);
  }
}

export interface LocalRegisteredAccount {
  profile: CustomerProfile;
  passwordHash: string;
  recoveryCode: string;
}

export function getLocalRegisteredAccounts(): LocalRegisteredAccount[] {
  try {
    const data = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalRegisteredAccount(account: LocalRegisteredAccount): void {
  try {
    const current = getLocalRegisteredAccounts();
    const updated = [
      account,
      ...current.filter(
        (a) =>
          a.profile.id !== account.profile.id &&
          a.profile.documentNumber.replace(/\D/g, '') !== account.profile.documentNumber.replace(/\D/g, '') &&
          a.profile.email.toLowerCase() !== account.profile.email.toLowerCase()
      ),
    ];
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao salvar conta localmente:', err);
  }
}

export function updateLocalAccountPassword(
  identifier: string,
  newPasswordHash: string
): boolean {
  try {
    const accounts = getLocalRegisteredAccounts();
    const cleanId = identifier.trim().toLowerCase();
    const digitsOnly = identifier.replace(/\D/g, '');

    const index = accounts.findIndex((acc) => {
      const accDigits = acc.profile.documentNumber.replace(/\D/g, '');
      const accEmail = acc.profile.email.toLowerCase();
      return (
        accEmail === cleanId ||
        (digitsOnly.length > 0 && accDigits === digitsOnly) ||
        acc.profile.documentNumber.toLowerCase() === cleanId
      );
    });

    if (index >= 0) {
      accounts[index].passwordHash = newPasswordHash;
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
      return true;
    }
    return false;
  } catch {
    return false;
  }
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
