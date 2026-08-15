import React from 'react';
import { ShieldCheck, Sparkles, User, Bell } from 'lucide-react';
import { CustomerProfile, ServiceRequest } from '../types';

interface HeaderProps {
  profile: CustomerProfile | null;
  activeRequest?: ServiceRequest;
  onOpenProfile: () => void;
  onOpenOrders: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeRequest,
  onOpenProfile,
  onOpenOrders,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 pb-3 shadow-xs header-safe-top transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-base leading-none">Limpa & Organiza</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Cliente PWA
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
              Atendimento Seguro & 5S
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeRequest && (
            <button
              onClick={onOpenOrders}
              id="header-active-order-btn"
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Acompanhar pedido em andamento"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
              <span>Cód: <strong className="font-mono">{activeRequest.securityCode}</strong></span>
            </button>
          )}

          <button
            onClick={onOpenProfile}
            id="header-profile-btn"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 relative border border-slate-200 cursor-pointer shadow-2xs focus:outline-none"
            title="Meu Perfil e Cadastro"
            aria-label="Perfil do Cliente"
          >
            <User className="w-4 h-4" />
            {profile?.fullName && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
