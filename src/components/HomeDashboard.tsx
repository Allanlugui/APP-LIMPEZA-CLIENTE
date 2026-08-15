import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  PlusCircle, 
  Layers, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Star, 
  Banknote, 
  QrCode, 
  Home, 
  FileText,
  UserCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { CustomerProfile, ServiceRequest } from '../types';
import { formatCurrencyBRL } from '../utils/masks';

interface HomeDashboardProps {
  profile: CustomerProfile;
  activeRequest?: ServiceRequest;
  allRequests: ServiceRequest[];
  onNewService: () => void;
  onOpenTracking: (request: ServiceRequest) => void;
  onOpenOrders: () => void;
  onOpenProfile: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  profile,
  activeRequest,
  allRequests,
  onNewService,
  onOpenTracking,
  onOpenOrders,
  onOpenProfile,
}) => {
  const firstName = profile?.fullName?.split(' ')[0] || 'Cliente';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="content-bottom-clearance pt-2 px-4 max-w-md mx-auto space-y-4 select-none"
    >
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="bg-white/20 backdrop-blur-xs text-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
              Ambiente Seguro
            </span>
            <span className="text-xs text-emerald-200 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-4 h-4" /> Cliente Verificado
            </span>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Olá, {firstName}! ✨
            </h1>
            <p className="text-xs text-emerald-100/90 leading-relaxed mt-0.5">
              Pronto para transformar sua residência com limpeza detalhada e organização com metodologia 5S?
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.01 }}
            onClick={onNewService}
            id="home-btn-request-service"
            className="w-full py-3 px-4 bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer focus:outline-none"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700" />
            Solicitar Novo Atendimento Agora
          </motion.button>
        </div>
      </div>

      {/* ACTIVE ORDER CARD COM CÓDIGO DE SEGURANÇA EM DESTAQUE */}
      {activeRequest && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-3xl p-4.5 border-2 border-emerald-500/50 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Atendimento em Acompanhamento
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              #{activeRequest.id}
            </span>
          </div>

          {/* Código de Segurança em destaque */}
          <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Código de Segurança (Apresente na chegada)
              </span>
              <span className="font-mono text-2xl font-black text-emerald-400 tracking-widest">
                {activeRequest.securityCode}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold">Valor no Local</span>
              <span className="font-mono text-sm font-bold text-white">
                {formatCurrencyBRL(activeRequest.estimatedPrice)}
              </span>
            </div>
          </div>

          {/* Detalhes rápidos */}
          <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeRequest.scheduledDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeRequest.timeSlot === 'manha_08h' ? '08:00' : '13:30'}</span>
            </div>
            <div className="capitalize text-emerald-300 font-semibold truncate max-w-[120px]">
              {activeRequest.serviceType}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onOpenTracking(activeRequest)}
            id="home-btn-track-active"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer focus:outline-none"
          >
            Abrir Painel de Acompanhamento & Código
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </motion.div>
      )}

      {/* 3 Pilares de Confiança para o Cliente */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs text-center space-y-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-extrabold text-slate-900">Código 4 Dígitos</p>
          <p className="text-[10px] text-slate-600 leading-tight">Validação presencial na chegada</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs text-center space-y-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <Layers className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-extrabold text-slate-900">Metodologia 5S</p>
          <p className="text-[10px] text-slate-600 leading-tight">Organização com padrão técnico</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs text-center space-y-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <Banknote className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-extrabold text-slate-900">Pague no Local</p>
          <p className="text-[10px] text-slate-600 leading-tight">Dinheiro, Cartão ou PIX</p>
        </div>
      </div>

      {/* Card: Como Funciona o Nosso Padrão 5S */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
              5S
            </div>
            <h3 className="font-extrabold text-xs text-slate-900">
              Metodologia de Organização 5S
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
            Exclusivo
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">1. Seiri (Triagem & Descarte Consciente):</strong> Separação com aprovação prévia do cliente.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">2. Seiton (Ordenação & Setorização):</strong> Facilidade de acesso ao que você mais usa.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">3. Seiketsu (Padronização & Etiquetas):</strong> Identificação visual duradoura.
            </div>
          </div>
        </div>
      </div>

      {/* Informações Cadastrais Rápidas */}
      <div className="bg-slate-100 rounded-2xl p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate pr-2">
          <Home className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="truncate text-slate-600">
            <span className="font-bold text-slate-800 block truncate">
              {profile.address.logradouro ? `${profile.address.logradouro}, ${profile.address.numero}` : 'Endereço não cadastrado'}
            </span>
            <span className="text-[11px] block truncate">
              {profile.address.bairro ? `${profile.address.bairro} - ${profile.address.cidade}/${profile.address.uf}` : 'Complete seu cadastro no perfil'}
            </span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onOpenProfile}
          className="text-emerald-700 hover:text-emerald-800 font-bold text-xs shrink-0 underline cursor-pointer"
        >
          Editar
        </motion.button>
      </div>
    </motion.div>
  );
};
