import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  QrCode, 
  Phone, 
  MessageCircle, 
  Clock, 
  Sparkles, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  Car, 
  CreditCard, 
  Banknote, 
  ChevronDown,
  ChevronUp,
  Radio,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceRequest, ServiceStatus } from '../types';
import { formatCurrencyBRL } from '../utils/masks';
import { isSupabaseConfigured } from '../lib/supabase';

interface ActiveOrderTrackingProps {
  request: ServiceRequest;
  onUpdateStatus: (requestId: string, newStatus: ServiceStatus) => void;
  onViewReceipt: (request: ServiceRequest) => void;
  onNewOrder: () => void;
}

export const ActiveOrderTracking: React.FC<ActiveOrderTrackingProps> = ({
  request,
  onUpdateStatus,
  onViewReceipt,
  onNewOrder,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showTimelineDetails, setShowTimelineDetails] = useState(true);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(request.securityCode);
    setCopied(true);
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try { navigator.vibrate(15); } catch {}
    }
    setTimeout(() => setCopied(false), 2500);
  };

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'solicitado':
        return { label: 'Solicitação Enviada', color: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'aprovado':
        return { label: 'Aprovado • Código Ativo', color: 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse' };
      case 'a_caminho':
        return { label: 'Profissional a Caminho', color: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'em_andamento':
        return { label: 'Atendimento em Andamento', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      case 'concluido':
        return { label: 'Concluído com Sucesso', color: 'bg-emerald-200 text-emerald-950 border-emerald-400' };
      case 'cancelado':
        return { label: 'Cancelado', color: 'bg-rose-100 text-rose-900 border-rose-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const statusInfo = getStatusBadge(request.status);

  // Status steps mapping
  const steps: { key: ServiceStatus; label: string; desc: string }[] = [
    { key: 'solicitado', label: 'Solicitação', desc: 'Registrada no sistema' },
    { key: 'aprovado', label: 'Aprovada', desc: 'Código 4 dígitos gerado' },
    { key: 'a_caminho', label: 'A Caminho', desc: 'Profissional deslocando' },
    { key: 'em_andamento', label: 'Em Andamento', desc: 'Código validado no local' },
    { key: 'concluido', label: 'Concluído', desc: 'Serviço e pagamento finalizados' },
  ];

  const getStepIndex = (status: ServiceStatus) => {
    const idx = steps.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIdx = getStepIndex(request.status);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="content-bottom-clearance pt-2 px-4 max-w-md mx-auto space-y-4 select-none"
    >
      {/* Header com ID, Status e Badge de Sincronização Supabase */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              Solicitação #{request.id}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
              {isSupabaseConfigured ? (
                <>
                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                  Supabase Realtime
                </>
              ) : (
                <>
                  <Database className="w-2.5 h-2.5 text-emerald-600" />
                  Local Seguro
                </>
              )}
            </span>
          </div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Acompanhamento em Tempo Real
          </h1>
        </div>
        <span
          className={`text-xs font-black px-2.5 py-1 rounded-full border shadow-2xs ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* DESTAQUE MÁXIMO: CÓDIGO DE SEGURANÇA DE 4 DÍGITOS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 shadow-xl border border-emerald-500/30 animate-pulse-glow">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            CÓDIGO DE SEGURANÇA
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            Autenticação Segura
          </span>
        </div>

        {/* Números gigantes do código */}
        <div className="my-3 text-center">
          <div className="inline-flex items-center justify-center gap-2 bg-black/40 px-6 py-3 rounded-2xl border border-emerald-500/40 backdrop-blur-xs">
            {request.securityCode.split('').map((digit, idx) => (
              <motion.span
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="w-11 h-13 bg-slate-900/90 text-emerald-400 font-mono text-3xl font-black rounded-xl flex items-center justify-center shadow-inner border border-emerald-400/30 tracking-wider"
              >
                {digit}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Ações do Código: Copiar & QR Code */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleCopyCode}
            id="btn-copy-security-code"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer focus:outline-none"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Código Copiado!' : 'Copiar Código'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowQrModal(true)}
            id="btn-show-qrcode"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-white/20 cursor-pointer focus:outline-none"
          >
            <QrCode className="w-4 h-4 text-emerald-300" />
            QR Code
          </motion.button>
        </div>

        {/* INSTRUÇÃO CLARA OBRIGATÓRIA */}
        <div className="mt-4 bg-emerald-950/80 rounded-2xl p-3 border border-emerald-500/40 text-xs text-emerald-100 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="text-white block font-bold mb-0.5">
              Instrução Importante de Chegada:
            </strong>
            Apresente este código de <strong>4 dígitos</strong> ao colaborador no momento exato em que ele chegar ao seu imóvel. O colaborador digitará o código para autenticação mútua e início do serviço.
          </div>
        </div>
      </div>

      {/* TRANSPARÊNCIA DE PAGAMENTO NO LOCAL */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              R$
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">
                Pagamento no Local do Atendimento
              </h3>
              <p className="text-[11px] text-slate-500">
                Transparência total: pague somente ao prestador
              </p>
            </div>
          </div>
          <span className="font-mono text-sm font-black text-emerald-700">
            {formatCurrencyBRL(request.estimatedPrice)}
          </span>
        </div>

        <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 space-y-1.5">
          <p className="font-medium">
            O valor de <strong>{formatCurrencyBRL(request.estimatedPrice)}</strong> é pago <strong>diretamente no local</strong> no início ou conclusão do atendimento.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-slate-700">
            <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
              <Banknote className="w-3 h-3 text-emerald-600" /> Dinheiro
            </span>
            <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-emerald-600" /> Cartão (Máquina)
            </span>
            <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
              <QrCode className="w-3 h-3 text-emerald-600" /> PIX
            </span>
          </div>
        </div>
      </div>

      {/* PROFISSIONAL DESIGNADO OU AGUARDANDO DESIGNAÇÃO */}
      {request.assignedProfessional ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Profissional Designado
            </span>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
              <UserCheck className="w-3 h-3" /> Verificado pela Empresa
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <img
              src={request.assignedProfessional.photoUrl}
              alt={request.assignedProfessional.name}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-slate-900 text-sm truncate">
                {request.assignedProfessional.name}
              </h4>
              <p className="text-[11px] text-slate-500 font-mono">
                {request.assignedProfessional.documentMasked}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="font-bold text-amber-500 flex items-center gap-0.5">
                  ★ {request.assignedProfessional.rating.toFixed(2)}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 text-[11px]">
                  {request.assignedProfessional.servicesCount} atendimentos
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Contato Rápido */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <motion.a
              whileTap={{ scale: 0.95 }}
              href={`tel:${request.assignedProfessional.phone.replace(/\D/g, '')}`}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors focus:outline-none"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              Ligar
            </motion.a>
            <motion.a
              whileTap={{ scale: 0.95 }}
              href={`https://wa.me/55${request.assignedProfessional.phone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(request.assignedProfessional.name)},%20sou%20o%20cliente%20da%20solicitação%20${request.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs focus:outline-none"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </motion.a>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">
                  Aguardando Equipe Operacional
                </h4>
                <p className="text-[11px] text-slate-500">
                  Triagem e designação pelo Sistema
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
              <Radio className="w-2.5 h-2.5 animate-pulse text-amber-600" />
              Ao Vivo
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Sua solicitação foi registrada no banco de dados e enviada para o <strong>App Operacional</strong>. Assim que um colaborador qualificado for designado, os dados e contatos serão sincronizados instantaneamente nesta tela.
          </p>

          {request.status === 'solicitado' && (
            <div className="pt-1">
              <button
                type="button"
                id="btn-cancel-request"
                onClick={() => {
                  if (window.confirm('Tem certeza de que deseja cancelar esta solicitação de atendimento?')) {
                    onUpdateStatus(request.id, 'cancelado');
                  }
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
              >
                Cancelar esta solicitação
              </button>
            </div>
          )}
        </div>
      )}

      {/* LINHA DO TEMPO EM TEMPO REAL */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowTimelineDetails(!showTimelineDetails)}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-extrabold text-slate-900">
              Linha do Tempo do Atendimento
            </h3>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1">
            {showTimelineDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Stepper Visual */}
        <div className="grid grid-cols-5 gap-1 pt-1 pb-2">
          {steps.map((step, idx) => {
            const isDone = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div key={step.key} className="flex flex-col items-center text-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all mb-1 ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span className={`text-[9px] font-bold truncate max-w-[60px] ${isCurrent ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Timeline Histórico Detalhado */}
        <AnimatePresence>
          {showTimelineDetails && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2.5 pt-2 border-t border-slate-100 overflow-hidden"
            >
              {request.statusTimeline.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 leading-snug">
                      {item.description}
                    </p>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AÇÕES FINAIS: Ver Comprovante & Novo Pedido */}
      <div className="flex items-center gap-2.5 pt-1">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onViewReceipt(request)}
          id="btn-view-receipt"
          className="flex-1 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer focus:outline-none"
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          Ver Comprovante / Detalhes
        </motion.button>

        {request.status === 'concluido' && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onNewOrder}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-colors cursor-pointer focus:outline-none"
          >
            <Sparkles className="w-4 h-4" />
            Nova Solicitação
          </motion.button>
        )}
      </div>

      {/* Modal QR Code */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <QrCode className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Código de Validação Rápida
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Apresente a tela para o colaborador escanear no local
                </p>
              </div>

              {/* QR Code Vector Visual para Leitura Óptica */}
              <div className="bg-slate-900 p-5 rounded-2xl inline-block border-4 border-emerald-500 shadow-inner">
                <div className="w-44 h-44 bg-white rounded-xl p-2 flex flex-col items-center justify-center relative overflow-hidden">
                  <QrCode className="w-36 h-36 text-slate-900" />
                  <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-md animate-scan" />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                  Código Numérico
                </span>
                <span className="font-mono text-2xl font-black text-emerald-950 tracking-widest">
                  {request.securityCode}
                </span>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowQrModal(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar QR Code
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
