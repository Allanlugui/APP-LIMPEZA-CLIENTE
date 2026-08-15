import React, { useState } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  PlusCircle, 
  Copy, 
  Check 
} from 'lucide-react';
import { motion } from 'motion/react';
import { ServiceRequest, ServiceStatus } from '../types';
import { formatCurrencyBRL } from '../utils/masks';

interface OrdersListViewProps {
  requests: ServiceRequest[];
  onSelectRequest: (request: ServiceRequest) => void;
  onNewRequest: () => void;
  onViewReceipt: (request: ServiceRequest) => void;
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({
  requests,
  onSelectRequest,
  onNewRequest,
}) => {
  const [filter, setFilter] = useState<'todos' | 'em_andamento' | 'concluidos'>('todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRequests = requests.filter((req) => {
    if (filter === 'em_andamento') {
      return ['solicitado', 'aprovado', 'a_caminho', 'em_andamento'].includes(req.status);
    }
    if (filter === 'concluidos') {
      return req.status === 'concluido' || req.status === 'cancelado';
    }
    return true;
  });

  const getStatusLabel = (status: ServiceStatus) => {
    switch (status) {
      case 'solicitado':
        return { label: 'Solicitado', class: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'aprovado':
        return { label: 'Aprovado (Cód. Ativo)', class: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
      case 'a_caminho':
        return { label: 'A Caminho', class: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'em_andamento':
        return { label: 'Em Andamento', class: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
      case 'concluido':
        return { label: 'Concluído', class: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'cancelado':
        return { label: 'Cancelado', class: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
  };

  const handleCopy = (code: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try { navigator.vibrate(10); } catch {}
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="content-bottom-clearance pt-2 px-4 max-w-md mx-auto space-y-4 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Minhas Solicitações
          </h1>
          <p className="text-xs text-slate-500">
            Acompanhe o status e recupere o Código de Segurança
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onNewRequest}
          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1 border border-emerald-200 cursor-pointer focus:outline-none"
        >
          <PlusCircle className="w-4 h-4" />
          Novo
        </motion.button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setFilter('todos')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
            filter === 'todos' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Todos ({requests.length})
        </button>
        <button
          onClick={() => setFilter('em_andamento')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
            filter === 'em_andamento' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Em Andamento
        </button>
        <button
          onClick={() => setFilter('concluidos')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
            filter === 'concluidos' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Concluídos
        </button>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">Nenhuma solicitação encontrada</p>
          <p className="text-xs text-slate-500">
            Você não possui atendimentos nesta categoria no momento.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onNewRequest}
            className="mt-2 py-2 px-4 bg-emerald-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Solicitar Serviço
          </motion.button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const status = getStatusLabel(req.status);
            const isActive = ['solicitado', 'aprovado', 'a_caminho', 'em_andamento'].includes(req.status);

            return (
              <motion.div
                key={req.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectRequest(req)}
                className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                  isActive ? 'border-emerald-300 ring-1 ring-emerald-200/60' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{req.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.class}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-emerald-800">
                    {formatCurrencyBRL(req.estimatedPrice)}
                  </span>
                </div>

                <div className="pt-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 capitalize">
                      {req.serviceType === 'ambos'
                        ? 'Limpeza + Organização 5S'
                        : req.serviceType === 'limpeza'
                        ? `Limpeza Residencial (${req.cleaningDetail || 'Padrão'})`
                        : `Organização (${req.organizationFormat === 'padrao_5s' ? 'Padrão 5S' : 'Personalizada'})`}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.scheduledDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.timeSlot === 'manha_08h' ? '08:00' : '13:30'}</span>
                    </div>
                  </div>

                  {/* CÓDIGO DE SEGURANÇA EM DESTAQUE SE ESTIVER ATIVO */}
                  {isActive && (
                    <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-2.5 flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <div>
                          <span className="text-[10px] text-emerald-900 font-bold block uppercase">
                            Código de Segurança (Na Chegada)
                          </span>
                          <span className="font-mono text-base font-black text-emerald-950 tracking-wider">
                            {req.securityCode}
                          </span>
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.90 }}
                        onClick={(e) => handleCopy(req.securityCode, req.id, e)}
                        className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer focus:outline-none"
                      >
                        {copiedId === req.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === req.id ? 'Copiado' : 'Copiar'}
                      </motion.button>
                    </div>
                  )}

                  {/* Informação sobre pagamento */}
                  <p className="text-[11px] text-slate-500 pt-1">
                    📍 {req.customer.address.logradouro}, {req.customer.address.numero} • Pagamento no local
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
