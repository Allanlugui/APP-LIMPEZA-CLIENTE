export type DocumentType = 'CPF' | 'RG';

export interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  pontoReferencia?: string;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string;
  photoUrl?: string;
  address: Address;
  createdAt: string;
  updatedAt?: string;
}

export type ServiceType = 'limpeza' | 'organizacao' | 'ambos';

export type OrganizationFormat = 'personalizada' | 'padrao_5s';

export type CleaningDetailLevel = 'padrao' | 'pesada' | 'pos_obra';

export type PropertyType = 'apartamento' | 'casa' | 'comercial';

export interface PropertyDetails {
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  approxAreaM2: number;
  hasPets: boolean;
  petDetails?: string;
}

export interface CustomOrgPreferences {
  priorityRooms: string[];
  specificPreferences: string;
  fragileItemsNotes: string;
  foldingStyle: 'padrao' | 'arquivamento' | 'vertical_gavetas';
  routineNotes?: string;
}

export interface Standard5SPreferences {
  focusAreas: string[];
  discardApprovalAlways: boolean; // Se o cliente quer aprovar cada descarte
  labelingIncluded: boolean;      // Padronização e identificação com etiquetas
  maintenanceGuide: boolean;     // Guia 5S de manutenção da rotina
}

export type TimeSlot = 'manha_08h' | 'tarde_13h30' | 'integral_08h30';

export type ServiceStatus = 
  | 'solicitado' 
  | 'aprovado' 
  | 'a_caminho' 
  | 'em_andamento' 
  | 'concluido' 
  | 'cancelado';

export interface ProfessionalInfo {
  id: string;
  name: string;
  photoUrl: string;
  rating: number;
  servicesCount: number;
  badgeVerified: boolean;
  phone: string;
  documentMasked: string;
  vehicle?: string;
}

export interface ServiceRequest {
  id: string;
  securityCode: string; // 4-digit code e.g. "4829"
  customer: CustomerProfile;
  serviceType: ServiceType;
  cleaningDetail?: CleaningDetailLevel;
  organizationFormat?: OrganizationFormat;
  customOrgPreferences?: CustomOrgPreferences;
  standard5SPreferences?: Standard5SPreferences;
  property: PropertyDetails;
  scheduledDate: string;
  timeSlot: TimeSlot;
  specialNotes?: string;
  status: ServiceStatus;
  estimatedPrice: number;
  estimatedHours: number;
  assignedProfessional?: ProfessionalInfo;
  createdAt: string;
  statusTimeline: {
    status: ServiceStatus;
    timestamp: string;
    description: string;
  }[];
  paymentTerms: {
    payOnSite: boolean;
    acceptedMethods: string[];
    note: string;
  };
}

export type AppTab = 'home' | 'new-service' | 'orders' | 'profile';
