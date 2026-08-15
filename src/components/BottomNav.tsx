import React from 'react';
import { Home, PlusCircle, ClipboardList, User } from 'lucide-react';
import { motion } from 'motion/react';
import { AppTab } from '../types';

interface BottomNavProps {
  currentTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  activeOrdersCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  activeOrdersCount,
}) => {
  const navItems = [
    {
      id: 'home' as AppTab,
      label: 'Início',
      icon: Home,
      btnId: 'nav-tab-home',
    },
    {
      id: 'new-service' as AppTab,
      label: 'Solicitar',
      icon: PlusCircle,
      btnId: 'nav-tab-new-service',
    },
    {
      id: 'orders' as AppTab,
      label: 'Acompanhar',
      icon: ClipboardList,
      btnId: 'nav-tab-orders',
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
    {
      id: 'profile' as AppTab,
      label: 'Meu Perfil',
      icon: User,
      btnId: 'nav-tab-profile',
    },
  ];

  const handleTabClick = (tabId: AppTab) => {
    // Feedback háptico tátil para dispositivos móveis
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignorar se não suportado
      }
    }
    onChangeTab(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-6px_25px_rgba(0,0,0,0.06)] bottom-nav-safe select-none">
      <div className="max-w-md mx-auto px-2 pt-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <motion.button
              key={item.id}
              id={item.btnId}
              onClick={() => handleTabClick(item.id)}
              whileTap={{ scale: 0.90 }}
              className={`relative flex flex-col items-center justify-center py-2 px-3 flex-1 min-h-[48px] rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none ${
                isActive
                  ? 'text-emerald-800 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {/* Background capsule for active tab */}
              {isActive && (
                <motion.div
                  layoutId="activeNavBackground"
                  className="absolute inset-0 bg-emerald-50/90 rounded-2xl border border-emerald-200/50 -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5px] scale-110 text-emerald-700' : 'stroke-[1.8px] text-slate-500'
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3 min-w-[17px] h-[17px] bg-emerald-600 text-white text-[9.5px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow-xs animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] mt-1 tracking-tight leading-none ${isActive ? 'text-emerald-800 font-extrabold' : 'text-slate-500'}`}>
                {item.label}
              </span>

              {/* Indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="activeNavDot"
                  className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-1"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
