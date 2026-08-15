import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  ShieldCheck, 
  Copy, 
  Check, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  Layers, 
  CreditCard,
  Building2,
  Sparkles
} from 'lucide-react';
import { ServiceRequest } from '../types';
import { formatCurrencyBRL } from '../utils/masks';

interface OrderReceiptModalProps {
  request: ServiceRequest;
  onClose: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  request,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    const summaryText = `
*COMPROVANTE DE SOLICITAÇÃO - LIMPA & ORGANIZA*
Solicitação: #${request.id}
Código de Segurança: ${request.securityCode} (Apresentar ao colaborador na chegada)
Cliente: ${request.customer.fullName}
Telefone: ${request.customer.phone}
Endereço: ${request.customer.address.logradouro}, ${request.customer.address.numero} - ${request.customer.address.bairro}, ${request.customer.address.cidade}/${request.customer.address.uf}
Serviço: ${request.serviceType.toUpperCase()}
Formato: ${request.organizationFormat === 'padrao_5s' ? 'Padrão da Empresa (5S)' : request.organizationFormat === 'personalizada' ? 'Personalizada' : 'Limpeza Padrão'}
Data Agendada: ${request.scheduledDate} (${request.timeSlot === 'manha_08h' ? '08:00' : '13:30'})
Valor Estimado: ${formatCurrencyBRL(request.estimatedPrice)}
*Pagamento: 100% no local diretamente ao prestador (Dinheiro, Cartão ou PIX)*
    `.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-scaleUp">
        {/* Header do Voucher */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Comprovante Digital
              </h3>
              <p className="text-[11px] text-emerald-400 font-mono">
                Solicitação #{request.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Comprovante */}
        <div className="p-5 space-y-4 text-xs text-slate-700 print:text-black">
          {/* Caixa de Destaque do Código de 4 Dígitos */}
          <div className="bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-2xl p-3 text-center space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider block">
              Código de Validação no Imóvel
            </span>
            <div className="font-mono text-3xl font-black text-emerald-950 tracking-widest">
              {request.securityCode}
            </div>
            <p className="text-[10px] text-emerald-800">
              Apresente este código ao colaborador ao chegar no endereço.
            </p>
          </div>

          {/* Dados do Cliente */}
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wider">
              Identificação do Cliente
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Nome:</span>
                <strong className="text-slate-900">{request.customer.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Documento:</span>
                <strong className="text-slate-900 font-mono">{request.customer.documentNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">WhatsApp:</span>
                <strong className="text-slate-900 font-mono">{request.customer.phone}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">E-mail:</span>
                <strong className="text-slate-900 truncate block">{request.customer.email}</strong>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wider">
              Endereço do Imóvel
            </span>
            <p className="font-medium text-slate-800">
              {request.customer.address.logradouro}, {request.customer.address.numero}
              {request.customer.address.complemento && ` (${request.customer.address.complemento})`}
            </p>
            <p className="text-slate-500 text-[11px]">
              {request.customer.address.bairro}, {request.customer.address.cidade} - {request.customer.address.uf} • CEP: {request.customer.address.cep}
            </p>
            {request.customer.address.pontoReferencia && (
              <p className="text-[11px] text-slate-600 italic mt-0.5">
                Ref: {request.customer.address.pontoReferencia}
              </p>
            )}
          </div>

          {/* Detalhes do Serviço & Formato 5S / Personalizado */}
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wider">
              Especificações do Serviço
            </span>
            <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo:</span>
                <strong className="text-slate-900 capitalize">{request.serviceType}</strong>
              </div>
              {request.organizationFormat && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Metodologia:</span>
                  <strong className="text-emerald-800">
                    {request.organizationFormat === 'padrao_5s' ? 'Padrão da Empresa (5S)' : 'Personalizada'}
                  </strong>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Data e Turno:</span>
                <strong className="text-slate-900 font-mono">
                  {request.scheduledDate} às {request.timeSlot === 'manha_08h' ? '08:00' : '13:30'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Imóvel:</span>
                <span className="text-slate-700">
                  {request.property.bedrooms} Qts, {request.property.bathrooms} Banh ({request.property.approxAreaM2}m²)
                </span>
              </div>
            </div>
          </div>

          {/* Total & Termos de Pagamento */}
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Valor Estimado Total:</span>
              <span className="font-mono text-base font-black text-emerald-400">
                {formatCurrencyBRL(request.estimatedPrice)}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-snug border-t border-slate-800 pt-1.5">
              💳 <strong>Pagamento no Local:</strong> Aceitamos Dinheiro, Máquina de Cartão (Débito/Crédito) ou PIX após o término ou início da execução.
            </p>
          </div>
        </div>

        {/* Ações do Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="flex-1 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};
