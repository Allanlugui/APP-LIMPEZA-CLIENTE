import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Home, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Info, 
  HeartHandshake, 
  ListChecks, 
  Building2, 
  PawPrint,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CustomerProfile, 
  ServiceType, 
  OrganizationFormat, 
  CleaningDetailLevel, 
  PropertyType, 
  PropertyDetails, 
  CustomOrgPreferences, 
  Standard5SPreferences, 
  TimeSlot, 
  ServiceRequest 
} from '../../types';
import { generate4DigitCode } from '../../utils/storage';
import { formatCurrencyBRL } from '../../utils/masks';
import { salvarSolicitacaoSupabase } from '../../lib/supabase';

interface NewServiceWizardProps {
  customer: CustomerProfile;
  onRequestSubmitted: (newRequest: ServiceRequest) => void;
  onCancel: () => void;
  onOpenProfile: () => void;
}

export const NewServiceWizard: React.FC<NewServiceWizardProps> = ({
  customer,
  onRequestSubmitted,
  onCancel,
  onOpenProfile,
}) => {
  // Step navigation (1: Tipo, 2: Imóvel, 3: Formato Org, 4: Agendamento, 5: Resumo)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states
  const [serviceType, setServiceType] = useState<ServiceType>('ambos');
  const [cleaningDetail, setCleaningDetail] = useState<CleaningDetailLevel>('padrao');
  
  // Property details
  const [propertyType, setPropertyType] = useState<PropertyType>('apartamento');
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [approxAreaM2, setApproxAreaM2] = useState<number>(75);
  const [hasPets, setHasPets] = useState<boolean>(false);
  const [petDetails, setPetDetails] = useState<string>('');

  // Organization format & preferences
  const [orgFormat, setOrgFormat] = useState<OrganizationFormat>('padrao_5s');
  
  // Custom Org state
  const [customPriorityRooms, setCustomPriorityRooms] = useState<string[]>([
    'Closet / Guarda-Roupas',
    'Cozinha & Despensa',
  ]);
  const [customPreferences, setCustomPreferences] = useState<string>('');
  const [customFragileItems, setCustomFragileItems] = useState<string>('');
  const [customFoldingStyle, setCustomFoldingStyle] = useState<'padrao' | 'arquivamento' | 'vertical_gavetas'>('vertical_gavetas');
  const [customRoutineNotes, setCustomRoutineNotes] = useState<string>('');

  // Standard 5S state
  const [fiveSFocusAreas, setFiveSFocusAreas] = useState<string[]>([
    'Cozinha e Armários',
    'Closet e Gaveteiros',
    'Área de Serviço e Despensa',
  ]);
  const [discardApprovalAlways, setDiscardApprovalAlways] = useState<boolean>(true);
  const [labelingIncluded, setLabelingIncluded] = useState<boolean>(true);
  const [maintenanceGuide, setMaintenanceGuide] = useState<boolean>(true);

  // Schedule state
  // Default to tomorrow's date formatted as YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [scheduledDate, setScheduledDate] = useState<string>(tomorrowStr);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('manha_08h');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // Dynamic calculations for price and duration
  const calculateEstimates = () => {
    let basePrice = 0;
    let baseHours = 0;

    // Service Type base
    if (serviceType === 'limpeza') {
      basePrice = 160;
      baseHours = 4;
    } else if (serviceType === 'organizacao') {
      basePrice = 200;
      baseHours = 4.5;
    } else {
      // Ambos
      basePrice = 290;
      baseHours = 6.5;
    }

    // Cleaning detail level modifier
    if (serviceType !== 'organizacao') {
      if (cleaningDetail === 'pesada') {
        basePrice += 60;
        baseHours += 1.5;
      } else if (cleaningDetail === 'pos_obra') {
        basePrice += 120;
        baseHours += 2.5;
      }
    }

    // Property size modifier
    const extraBedrooms = Math.max(0, bedrooms - 2) * 25;
    const extraBathrooms = Math.max(0, bathrooms - 1) * 20;
    const areaModifier = approxAreaM2 > 100 ? Math.floor((approxAreaM2 - 100) / 25) * 30 : 0;

    const totalPrice = basePrice + extraBedrooms + extraBathrooms + areaModifier;
    const totalHours = Math.min(10, Math.round((baseHours + (extraBedrooms + extraBathrooms) / 50) * 10) / 10);

    return { totalPrice, totalHours };
  };

  const { totalPrice, totalHours } = calculateEstimates();

  const handleNext = () => {
    // If service is cleaning only, skip step 3 (Organization Format)
    if (currentStep === 2 && serviceType === 'limpeza') {
      setCurrentStep(4);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    // If service is cleaning only and on step 4, skip step 3
    if (currentStep === 4 && serviceType === 'limpeza') {
      setCurrentStep(2);
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const togglePriorityRoom = (room: string) => {
    setCustomPriorityRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  };

  const toggle5SArea = (area: string) => {
    setFiveSFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSubmit = async () => {
    const securityCode = generate4DigitCode();
    const currentYear = new Date().getFullYear();
    const newId = `ORD-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRequest: ServiceRequest = {
      id: newId,
      securityCode: securityCode,
      customer: customer,
      serviceType: serviceType,
      cleaningDetail: serviceType !== 'organizacao' ? cleaningDetail : undefined,
      organizationFormat: serviceType !== 'limpeza' ? orgFormat : undefined,
      customOrgPreferences:
        serviceType !== 'limpeza' && orgFormat === 'personalizada'
          ? {
              priorityRooms: customPriorityRooms,
              specificPreferences: customPreferences,
              fragileItemsNotes: customFragileItems,
              foldingStyle: customFoldingStyle,
              routineNotes: customRoutineNotes,
            }
          : undefined,
      standard5SPreferences:
        serviceType !== 'limpeza' && orgFormat === 'padrao_5s'
          ? {
              focusAreas: fiveSFocusAreas,
              discardApprovalAlways: discardApprovalAlways,
              labelingIncluded: labelingIncluded,
              maintenanceGuide: maintenanceGuide,
            }
          : undefined,
      property: {
        type: propertyType,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        approxAreaM2: approxAreaM2,
        hasPets: hasPets,
        petDetails: hasPets ? petDetails : undefined,
      },
      scheduledDate: scheduledDate,
      timeSlot: timeSlot,
      specialNotes: specialNotes,
      status: 'solicitado',
      estimatedPrice: totalPrice,
      estimatedHours: totalHours,
      assignedProfessional: undefined,
      createdAt: new Date().toISOString(),
      statusTimeline: [
        {
          status: 'solicitado',
          timestamp: new Date().toISOString(),
          description: `Solicitação registrada com sucesso no sistema. Código de Segurança ${securityCode} gerado para validação com a equipe operacional.`,
        },
      ],
      paymentTerms: {
        payOnSite: true,
        acceptedMethods: ['PIX', 'Cartão de Crédito/Débito (Máquina)', 'Dinheiro em Espécie'],
        note: 'Pagamento 100% no local. O pagamento é realizado diretamente ao colaborador no imóvel após o atendimento.',
      },
    };

    setIsSubmitting(true);
    try {
      // Grava no Supabase (com fallback resiliente local)
      const res = await salvarSolicitacaoSupabase(newRequest);
      if (res.data) {
        onRequestSubmitted(res.data);
      } else {
        onRequestSubmitted(newRequest);
      }
    } catch (e) {
      console.error('Erro ao submeter solicitação:', e);
      onRequestSubmitted(newRequest);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Tipo de Atendimento';
      case 2:
        return 'Detalhes do Imóvel';
      case 3:
        return 'Formato de Organização';
      case 4:
        return 'Data & Horário';
      case 5:
        return 'Resumo & Confirmação';
      default:
        return '';
    }
  };

  return (
    <div className="content-bottom-clearance pt-2 px-4 max-w-md mx-auto select-none">
      {/* Step Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-semibold">
          <span>Passo {currentStep} de {serviceType === 'limpeza' ? 4 : 5}</span>
          <span className="text-emerald-700 font-bold">{getStepTitle()}</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 h-2">
          {[1, 2, 3, 4, 5].map((s) => {
            const isSkipped = serviceType === 'limpeza' && s === 3;
            const isCompleted = currentStep > s;
            const isCurrent = currentStep === s;
            return (
              <div
                key={s}
                className={`rounded-full transition-all duration-300 ${
                  isSkipped
                    ? 'bg-slate-100 opacity-40'
                    : isCompleted
                    ? 'bg-emerald-600'
                    : isCurrent
                    ? 'bg-emerald-500 ring-2 ring-emerald-200'
                    : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Address Quick Check Badge */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 mb-4 flex items-center justify-between text-xs shadow-xs">
        <div className="flex items-center gap-2 truncate pr-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Home className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            {customer.address.logradouro ? (
              <>
                <p className="font-bold text-slate-800 truncate">
                  {customer.address.logradouro}, {customer.address.numero}
                </p>
                <p className="text-[11px] text-slate-500">
                  {customer.address.bairro} - {customer.address.cidade}/{customer.address.uf}
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-amber-700 truncate">
                  Endereço não cadastrado
                </p>
                <p className="text-[11px] text-slate-500">
                  Informe o local no seu perfil para atendimento
                </p>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenProfile}
          className="text-emerald-700 font-bold text-[11px] underline shrink-0 hover:text-emerald-800 cursor-pointer"
        >
          {customer.address.logradouro ? 'Alterar' : 'Cadastrar'}
        </button>
      </div>

      {/* STEP 1: Tipo de Atendimento */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Selecione o tipo de atendimento
            </h2>
            <p className="text-xs text-slate-500">
              Escolha se deseja apenas limpeza, apenas organização de ambientes ou a experiência completa.
            </p>
          </div>

          <div className="space-y-3">
            {/* Opção 1: Apenas Limpeza */}
            <div
              onClick={() => setServiceType('limpeza')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                serviceType === 'limpeza'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-sm">Apenas Limpeza</h3>
                    <span className="text-xs font-extrabold text-emerald-700">A partir de R$ 160</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Higienização minuciosa de pisos, banheiros, cozinha, vidros e áreas comuns.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Pisos & Janelas
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Desinfecção
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Cozinha & Banheiros
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Opção 2: Apenas Organização */}
            <div
              onClick={() => setServiceType('organizacao')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                serviceType === 'organizacao'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-sm">Apenas Organização</h3>
                    <span className="text-xs font-extrabold text-emerald-700">A partir de R$ 200</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Arrumação especializada com metodologia (Personalizada ou 5S), dobras, gavetas, armários e closets.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="bg-purple-50 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Closets & Armários
                    </span>
                    <span className="bg-purple-50 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Triagem & Dobras
                    </span>
                    <span className="bg-purple-50 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Despensa & Gaveteiros
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Opção 3: Ambos (Limpeza + Organização) - Combo Mais Recomendado */}
            <div
              onClick={() => setServiceType('ambos')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                serviceType === 'ambos'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
                Mais Solicitado ★
              </div>
              <div className="flex items-start gap-3.5 pt-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-sm">Limpeza + Organização</h3>
                    <span className="text-xs font-extrabold text-emerald-700">A partir de R$ 290</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Solução integrada completa: casa 100% higienizada e todos os ambientes organizados estrategicamente.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Economia de 15%
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Higienização Total
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Metodologia 5S
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Detalhes do Imóvel */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Informações do Imóvel
            </h2>
            <p className="text-xs text-slate-500">
              Esses dados garantem a estimativa precisa de tempo, insumos e profissional ideal.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
            {/* Tipo de Imóvel */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Tipo de Imóvel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'apartamento' as PropertyType, label: 'Apartamento', icon: Building2 },
                  { id: 'casa' as PropertyType, label: 'Casa', icon: Home },
                  { id: 'comercial' as PropertyType, label: 'Comercial', icon: ListChecks },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = propertyType === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setPropertyType(item.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                        isSel
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quartos e Banheiros */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Número de Quartos
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBedrooms((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-slate-900 text-sm font-mono">
                    {bedrooms} {bedrooms === 1 ? 'quarto' : 'quartos'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBedrooms((prev) => Math.min(8, prev + 1))}
                    className="w-10 h-10 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Número de Banheiros
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBathrooms((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-slate-900 text-sm font-mono">
                    {bathrooms} {bathrooms === 1 ? 'banheiro' : 'banheiros'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBathrooms((prev) => Math.min(6, prev + 1))}
                    className="w-10 h-10 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Metragem aproximada */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Área Aproximada do Imóvel</span>
                <span className="font-bold text-emerald-700 font-mono">{approxAreaM2} m²</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                step="5"
                value={approxAreaM2}
                onChange={(e) => setApproxAreaM2(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
                <span>Até 30m²</span>
                <span>150m²</span>
                <span>300m²+</span>
              </div>
            </div>

            {/* Nível de detalhe da limpeza (se aplicável) */}
            {serviceType !== 'organizacao' && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Nível de Limpeza Desejado
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'padrao' as CleaningDetailLevel, label: 'Padrão', desc: 'Manutenção periódica' },
                    { id: 'pesada' as CleaningDetailLevel, label: 'Pesada', desc: 'Gordura & azulejos (+R$60)' },
                    { id: 'pos_obra' as CleaningDetailLevel, label: 'Pós-Obra', desc: 'Poeira & rejuntes (+R$120)' },
                  ].map((lvl) => (
                    <button
                      type="button"
                      key={lvl.id}
                      onClick={() => setCleaningDetail(lvl.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        cleaningDetail === lvl.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold">{lvl.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Presença de Pets */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PawPrint className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Possui animais de estimação (Pets)?</p>
                    <p className="text-[11px] text-slate-500">Para trazermos produtos hipoalergênicos e seguros</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hasPets}
                  onChange={(e) => setHasPets(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded-md cursor-pointer"
                />
              </div>

              {hasPets && (
                <div className="mt-3 animate-fadeIn">
                  <input
                    type="text"
                    value={petDetails}
                    onChange={(e) => setPetDetails(e.target.value)}
                    placeholder="Ex: 1 cão pequeno, dócil / 2 gatos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Formato de Organização (Personalizada vs Padrão 5S) */}
      {currentStep === 3 && serviceType !== 'limpeza' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Escolha o Formato de Organização
            </h2>
            <p className="text-xs text-slate-500">
              Defina como você deseja que os ambientes, gavetas e armários sejam estruturados.
            </p>
          </div>

          {/* Selector 5S vs Personalizada */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              id="btn-format-5s"
              onClick={() => setOrgFormat('padrao_5s')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all relative ${
                orgFormat === 'padrao_5s'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Metodologia
                </span>
                {orgFormat === 'padrao_5s' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Padrão da Empresa (5S)</h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Triagem, ordenação por uso, etiquetagem e guia prático para manter a ordem.
              </p>
            </button>

            <button
              type="button"
              id="btn-format-custom"
              onClick={() => setOrgFormat('personalizada')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all relative ${
                orgFormat === 'personalizada'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Sob Medida
                </span>
                {orgFormat === 'personalizada' && (
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Personalizada</h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Você define cada detalhe, cômodos prioritários, estilo de dobras e rotinas.
              </p>
            </button>
          </div>

          {/* Detalhes do Padrão 5S */}
          {orgFormat === 'padrao_5s' && (
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs space-y-4 animate-fadeIn">
              <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-100">
                <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Os 5 Sensos Aplicados à sua Residência:
                </h4>
                <div className="grid grid-cols-1 gap-2 mt-2.5 text-[11px] text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px]">
                      1. Seiri
                    </span>
                    <span><strong>Triagem & Utilização:</strong> Separação do que é útil e descarte/doação aprovado.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px]">
                      2. Seiton
                    </span>
                    <span><strong>Ordenação & Acesso:</strong> Cada item em seu lugar por frequência de uso.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px]">
                      3. Seiso
                    </span>
                    <span><strong>Limpeza Minuciosa:</strong> Higienização de gavetas, nichos e prateleiras.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px]">
                      4. Seiketsu
                    </span>
                    <span><strong>Padronização:</strong> Etiquetagem térmica e categorização visual clara.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded text-[10px]">
                      5. Shitsuke
                    </span>
                    <span><strong>Manutenção Fácil:</strong> Guia de sustentação para sua rotina diária.</span>
                  </div>
                </div>
              </div>

              {/* Áreas de Foco 5S */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Selecione as Áreas Principais para o 5S
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Cozinha e Armários',
                    'Closet e Gaveteiros',
                    'Área de Serviço e Despensa',
                    'Home Office e Cabos',
                    'Banheiros e Gabinetes',
                    'Quarto Infantil / Brinquedos',
                  ].map((area) => {
                    const isSelected = fiveSFocusAreas.includes(area);
                    return (
                      <button
                        type="button"
                        key={area}
                        onClick={() => toggle5SArea(area)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{area}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opções extras 5S */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700">Aprovação obrigatória do cliente antes de descartar qualquer item</span>
                  <input
                    type="checkbox"
                    checked={discardApprovalAlways}
                    onChange={(e) => setDiscardApprovalAlways(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700">Identificação com etiquetas padronizadas</span>
                  <input
                    type="checkbox"
                    checked={labelingIncluded}
                    onChange={(e) => setLabelingIncluded(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Detalhes da Organização Personalizada */}
          {orgFormat === 'personalizada' && (
            <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs space-y-4 animate-fadeIn">
              {/* Cômodos prioritários */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Cômodos Prioritários para Organizar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Closet / Guarda-Roupas',
                    'Cozinha & Despensa',
                    'Home Office',
                    'Armários de Banheiro',
                    'Lavanderia & Utensílios',
                    'Quarto de Hóspedes',
                  ].map((room) => {
                    const isSelected = customPriorityRooms.includes(room);
                    return (
                      <button
                        type="button"
                        key={room}
                        onClick={() => togglePriorityRoom(room)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{room}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estilo de Dobras */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Estilo de Dobra Preferido para Roupas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'vertical_gavetas', label: 'Vertical (Gavetas)', desc: 'Fácil visualização' },
                    { id: 'arquivamento', label: 'Colmeias / Arquivo', desc: 'Organizador colmeia' },
                    { id: 'padrao', label: 'Padrão em Pilhas', desc: 'Pilhas clássicas' },
                  ].map((style) => (
                    <button
                      type="button"
                      key={style.id}
                      onClick={() => setCustomFoldingStyle(style.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        customFoldingStyle === style.id
                          ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold">{style.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferências e Itens Frágeis */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Suas Preferências e Hábitos da Casa
                  </label>
                  <textarea
                    rows={2}
                    value={customPreferences}
                    onChange={(e) => setCustomPreferences(e.target.value)}
                    placeholder="Ex: Roupas de academia na primeira gaveta, sapatos separados por cor, temperos em potes transparentes..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-purple-600 focus:outline-hidden resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Itens Frágeis, Valiosos ou Restrições
                  </label>
                  <input
                    type="text"
                    value={customFragileItems}
                    onChange={(e) => setCustomFragileItems(e.target.value)}
                    placeholder="Ex: Coleção de relógios, louças antigas no armário superior"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Agendamento & Observações */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Data e Horário Preferencial
            </h2>
            <p className="text-xs text-slate-500">
              Selecione o dia e o turno que melhor se ajustam à sua rotina.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
            {/* Escolha de Data */}
            <div>
              <label htmlFor="input-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data do Atendimento <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-date"
                  type="date"
                  min={tomorrowStr}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Turno / Horário */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Turno de Início
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'manha_08h' as TimeSlot, label: 'Manhã', time: '08:00', desc: 'Mais popular' },
                  { id: 'tarde_13h30' as TimeSlot, label: 'Tarde', time: '13:30', desc: 'Período vespertino' },
                  { id: 'integral_08h30' as TimeSlot, label: 'Integral', time: '08:30', desc: 'Dia completo' },
                ].map((slot) => {
                  const isSel = timeSlot === slot.id;
                  return (
                    <button
                      type="button"
                      key={slot.id}
                      onClick={() => setTimeSlot(slot.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSel
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-extrabold">{slot.label}</p>
                      <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">{slot.time}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{slot.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observações Especiais */}
            <div>
              <label htmlFor="input-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Observações Especiais para a Equipe
              </label>
              <textarea
                id="input-notes"
                rows={3}
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Ex: Deixar a chave na portaria, avisar que interfone toca baixo, alergia a produtos com cheiro forte, estacionamento disponível para o profissional..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-600 focus:outline-hidden resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Resumo, Estimativa e Confirmação */}
      {currentStep === 5 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Revise sua Solicitação
            </h2>
            <p className="text-xs text-slate-500">
              Confirme os detalhes do serviço. O Código de Segurança será gerado imediatamente.
            </p>
          </div>

          {/* Resumo Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Serviço Selecionado
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 capitalize">
                  {serviceType === 'ambos'
                    ? 'Limpeza + Organização Completa'
                    : serviceType === 'limpeza'
                    ? `Apenas Limpeza (${cleaningDetail})`
                    : 'Apenas Organização'}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Estimativa
                </span>
                <p className="text-base font-black text-emerald-700 font-mono">
                  {formatCurrencyBRL(totalPrice)}
                </p>
              </div>
            </div>

            {/* Metodologia de Organização (se aplicável) */}
            {serviceType !== 'limpeza' && (
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 text-xs">
                <span className="font-bold text-slate-700">Formato de Organização: </span>
                <span className="font-extrabold text-emerald-800">
                  {orgFormat === 'padrao_5s' ? 'Padrão da Empresa (Metodologia 5S)' : 'Personalizada Sob Medida'}
                </span>
              </div>
            )}

            {/* Grid de Detalhes */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-600 block text-[10px]">Data Agendada:</span>
                <strong className="font-mono text-slate-900">{scheduledDate}</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-600 block text-[10px]">Horário / Duração:</span>
                <strong className="font-mono text-slate-900">
                  {timeSlot === 'manha_08h' ? '08:00' : timeSlot === 'tarde_13h30' ? '13:30' : '08:30'} (~{totalHours}h)
                </strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-600 block text-[10px]">Imóvel:</span>
                <strong className="text-slate-900">
                  {bedrooms} Qts, {bathrooms} Banh, {approxAreaM2}m²
                </strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-600 block text-[10px]">Cliente:</span>
                <strong className="text-slate-900 truncate block">
                  {customer.fullName ? customer.fullName.split(' ')[0] : 'Não preenchido'} {customer.phone ? `(${customer.phone})` : ''}
                </strong>
              </div>
            </div>

            {/* Endereço */}
            <div className="p-2.5 bg-slate-50 rounded-xl text-xs">
              <span className="text-slate-600 block text-[10px]">Local do Atendimento:</span>
              {customer.address.logradouro ? (
                <>
                  <p className="font-semibold text-slate-900">
                    {customer.address.logradouro}, {customer.address.numero} {customer.address.complemento && `- ${customer.address.complemento}`}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {customer.address.bairro}, {customer.address.cidade} - {customer.address.uf} (CEP: {customer.address.cep})
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <p className="font-semibold text-amber-700">Endereço ainda não informado</p>
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="text-emerald-700 font-bold text-xs underline cursor-pointer"
                  >
                    Preencher agora
                  </button>
                </div>
              )}
            </div>

            {(!customer.fullName.trim() || !customer.address.logradouro.trim()) && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Cadastro Incompleto</p>
                  <p className="text-slate-700 text-[11px]">
                    Para salvar sua solicitação no Supabase e gerar o código de 4 dígitos, é necessário informar seu nome e endereço.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="mt-1 px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-lg text-xs hover:bg-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    Completar Cadastro no Perfil
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transparência e Pagamento no Local (Requisito 3) */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-4 border border-emerald-800 shadow-md space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-emerald-300">
                  Pagamento 100% no Local
                </h4>
                <p className="text-[11px] text-slate-300">
                  Sem cobrança antecipada no aplicativo.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed border-t border-emerald-800/80 pt-2">
              O valor de <strong>{formatCurrencyBRL(totalPrice)}</strong> será pago diretamente ao colaborador no imóvel após a validação do serviço.
            </p>

            <div className="flex items-center gap-3 text-[11px] text-emerald-200 font-semibold pt-1">
              <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> Dinheiro</span>
              <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Cartão (Máquina)</span>
              <span className="flex items-center gap-1"><QrCode className="w-3.5 h-3.5" /> PIX</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center gap-2.5 pt-4">
        {currentStep > 1 ? (
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            id="wizard-btn-back"
            onClick={handleBack}
            disabled={isSubmitting}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer focus:outline-none"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            id="wizard-btn-cancel"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer focus:outline-none"
          >
            Cancelar
          </motion.button>
        )}

        {currentStep < 5 ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            id="wizard-btn-next"
            onClick={handleNext}
            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer focus:outline-none"
          >
            Avançar
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: isSubmitting ? 1 : 0.96 }}
            type="button"
            id="wizard-btn-submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/40 transition-all cursor-pointer focus:outline-none disabled:opacity-75"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Registrando no Supabase...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Confirmar e Gerar Código Seguro
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};
