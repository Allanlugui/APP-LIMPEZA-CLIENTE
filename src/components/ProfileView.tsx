import React, { useState, useRef } from 'react';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  ShieldCheck, 
  Sparkles,
  Loader2,
  RefreshCw,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  KeyRound,
  Copy,
  Check,
  LogOut
} from 'lucide-react';
import { CustomerProfile, DocumentType } from '../types';
import { maskCPF, maskRG, maskPhone, maskCEP, unmaskDigits } from '../utils/masks';
import { isValidCPF, isValidRG, isValidEmail, isValidPhone, isValidCEP } from '../utils/validators';
import { fetchAddressByCep } from '../utils/viaCep';
import { uploadFotoPerfilSupabase, atualizarPerfilClienteSupabase } from '../lib/supabase';

interface ProfileViewProps {
  profile: CustomerProfile;
  onSaveProfile: (profile: CustomerProfile) => void;
  isMandatoryRegistration?: boolean;
  onContinueAfterRegistration?: () => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  isMandatoryRegistration = false,
  onContinueAfterRegistration,
  onLogout,
}) => {
  const [formData, setFormData] = useState<CustomerProfile>(profile);
  const [docType, setDocType] = useState<DocumentType>(profile.documentType || 'CPF');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isCopiedCode, setIsCopiedCode] = useState(false);

  // Estados para foto de perfil e upload nativo
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setFormData(profile);
    setDocType(profile.documentType || 'CPF');
  }, [profile]);

  const handlePhotoFileSelected = async (file: File) => {
    if (!file) return;

    // Validação inicial do arquivo
    if (!file.type.startsWith('image/')) {
      setPhotoError('Selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('A imagem não pode ultrapassar 15MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError(null);
    setPhotoSuccessMsg(null);

    try {
      const result = await uploadFotoPerfilSupabase(formData.id || 'cliente', file);
      if (result.success && result.url) {
        setFormData((prev) => ({
          ...prev,
          photoUrl: result.url,
        }));
        setPhotoSuccessMsg('Foto processada e salva com sucesso!');
        setTimeout(() => setPhotoSuccessMsg(null), 3000);
      } else {
        setPhotoError(result.error || 'Não foi possível salvar a imagem.');
      }
    } catch (err: any) {
      setPhotoError(err?.message || 'Erro ao processar imagem.');
    } finally {
      setIsUploadingPhoto(false);
      // Reset inputs para permitir selecionar a mesma imagem se desejar
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      photoUrl: '',
    }));
    setPhotoError(null);
  };

  // Field validation checks
  const errors = {
    fullName: !formData.fullName.trim() 
      ? 'Nome completo é obrigatório' 
      : formData.fullName.trim().split(' ').length < 2 
      ? 'Informe nome e sobrenome' 
      : '',
    documentNumber: docType === 'CPF'
      ? (!isValidCPF(formData.documentNumber) ? 'CPF inválido (11 dígitos verificado)' : '')
      : (!isValidRG(formData.documentNumber) ? 'RG inválido (mínimo 5 dígitos)' : ''),
    email: !isValidEmail(formData.email) ? 'E-mail inválido' : '',
    phone: !isValidPhone(formData.phone) ? 'Telefone/WhatsApp inválido (com DDD)' : '',
    cep: !isValidCEP(formData.address.cep) ? 'CEP inválido (8 dígitos)' : '',
    logradouro: !formData.address.logradouro.trim() ? 'Logradouro é obrigatório' : '',
    numero: !formData.address.numero.trim() ? 'Número é obrigatório' : '',
    bairro: !formData.address.bairro.trim() ? 'Bairro é obrigatório' : '',
    cidade: !formData.address.cidade.trim() ? 'Cidade é obrigatória' : '',
    uf: !formData.address.uf.trim() ? 'UF é obrigatória' : '',
  };

  const isFormValid = Object.values(errors).every((err) => err === '');

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleDocTypeChange = (type: DocumentType) => {
    setDocType(type);
    setFormData((prev) => ({
      ...prev,
      documentType: type,
      documentNumber: '',
    }));
  };

  const handleDocumentChange = (val: string) => {
    const formatted = docType === 'CPF' ? maskCPF(val) : maskRG(val);
    setFormData((prev) => ({
      ...prev,
      documentNumber: formatted,
    }));
  };

  const handlePhoneChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      phone: maskPhone(val),
    }));
  };

  const handleCepChange = async (val: string) => {
    const formatted = maskCEP(val);
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        cep: formatted,
      },
    }));

    const clean = unmaskDigits(formatted);
    if (clean.length === 8) {
      await searchCep(clean);
    }
  };

  const searchCep = async (cleanCep?: string) => {
    const targetCep = cleanCep || unmaskDigits(formData.address.cep);
    if (targetCep.length !== 8) {
      setCepError('Digite um CEP válido com 8 números');
      return;
    }

    setIsLoadingCep(true);
    setCepError(null);

    const res = await fetchAddressByCep(targetCep);
    setIsLoadingCep(false);

    if (res.success && res.data) {
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          logradouro: res.data!.logradouro || prev.address.logradouro,
          bairro: res.data!.bairro || prev.address.bairro,
          cidade: res.data!.cidade || prev.address.cidade,
          uf: res.data!.uf || prev.address.uf,
        },
      }));
    } else {
      setCepError(res.error || 'CEP não encontrado');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all as touched
    setTouched({
      fullName: true,
      documentNumber: true,
      email: true,
      phone: true,
      cep: true,
      logradouro: true,
      numero: true,
      bairro: true,
      cidade: true,
      uf: true,
    });

    if (!isFormValid) return;

    const updatedProfile: CustomerProfile = {
      ...formData,
      documentType: docType,
      updatedAt: new Date().toISOString(),
    };

    onSaveProfile(updatedProfile);
    atualizarPerfilClienteSupabase(updatedProfile).then();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    if (isMandatoryRegistration && onContinueAfterRegistration) {
      onContinueAfterRegistration();
    }
  };

  const copyRecoveryCode = () => {
    if (formData.recoveryCode) {
      navigator.clipboard.writeText(formData.recoveryCode);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 3000);
    }
  };

  return (
    <div className="content-bottom-clearance pt-2 px-4 max-w-md mx-auto select-none space-y-4">
      {/* Registration Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 shadow-lg border border-slate-700">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Identificação & Segurança
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              {isMandatoryRegistration ? 'Cadastro Obrigatório' : 'Meu Perfil do Cliente'}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Coleta rigorosa e protegida conforme LGPD para liberação do atendimento e geração do código de segurança.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* CÓDIGO ÚNICO DE RECUPERAÇÃO DO CLIENTE */}
      {formData.recoveryCode && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-md space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Chave de Segurança
            </span>
            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
              6 Dígitos
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80">
            <div>
              <p className="text-[11px] text-slate-400">Código Único de Recuperação:</p>
              <p className="text-xl font-black font-mono tracking-widest text-emerald-400">
                {formData.recoveryCode}
              </p>
            </div>

            <button
              type="button"
              id="btn-profile-copy-recovery-code"
              onClick={copyRecoveryCode}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              {isCopiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 leading-tight">
            Guarde este código em local seguro. Ele permite redefinir sua senha a qualquer momento.
          </p>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3.5 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs font-medium">
            <p className="font-bold text-emerald-950">Cadastro atualizado com sucesso!</p>
            <p>Seus dados de identificação e endereço estão salvos com segurança.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Dados Pessoais, Foto & Documento */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">1. Foto & Identificação do Cliente</h2>
          </div>

          {/* FOTO DE PERFIL COM SELEÇÃO NATIVA DE ARQUIVO E CÂMERA */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  Foto de Perfil do Cliente
                </span>
                <p className="text-[11px] text-slate-500">
                  Para identificação de segurança junto aos prestadores e no aplicativo
                </p>
              </div>
              {formData.photoUrl && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Foto Ativa
                </span>
              )}
            </div>

            {/* Avatar Centralizado e Controles Nativos */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              {/* Círculo do Avatar com Feedback Visual */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-md flex items-center justify-center relative">
                  {formData.photoUrl ? (
                    <img 
                      src={formData.photoUrl} 
                      alt="Foto de Perfil" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <User className="w-10 h-10" />
                    </div>
                  )}

                  {/* Overlay de Carregamento / Upload */}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-1">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-1" />
                      <span className="text-[9px] font-bold tracking-tight text-center">Processando</span>
                    </div>
                  )}
                </div>

                {/* Badge de Ação Rápida */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  title="Tirar foto com a câmera"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg border-2 border-white transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Botões de Ação para Dispositivo e Câmera */}
              <div className="flex-1 w-full space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Botão Câmera Nativa */}
                  <button
                    type="button"
                    id="btn-camera-upload"
                    disabled={isUploadingPhoto}
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 shrink-0" />
                    <span className="truncate">Câmera</span>
                  </button>

                  {/* Botão Galeria / Arquivos do Dispositivo */}
                  <button
                    type="button"
                    id="btn-gallery-upload"
                    disabled={isUploadingPhoto}
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-2.5 px-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="truncate">Galeria / Arquivo</span>
                  </button>
                </div>

                {/* Inputs Nativos Ocultos para Acesso Direto aos Recursos do Sistema Operacional */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  id="native-camera-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePhotoFileSelected(e.target.files[0]);
                    }
                  }}
                />

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  id="native-gallery-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePhotoFileSelected(e.target.files[0]);
                    }
                  }}
                />

                {/* Ação de Remoção de Foto */}
                {formData.photoUrl && (
                  <button
                    type="button"
                    id="btn-remove-photo"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors pt-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remover foto de perfil
                  </button>
                )}

                <p className="text-[10px] text-slate-400 leading-tight">
                  Formatos aceitos: JPG, PNG, WebP. A foto é comprimida no dispositivo e enviada com segurança para o Supabase Storage.
                </p>
              </div>
            </div>

            {/* Mensagens de Sucesso ou Erro no Upload */}
            {photoSuccessMsg && (
              <div className="p-2.5 bg-emerald-100/90 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{photoSuccessMsg}</span>
              </div>
            )}

            {photoError && (
              <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}
          </div>

          {/* Nome Completo */}
          <div>
            <label htmlFor="input-fullName" className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Completo <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              onBlur={() => handleBlur('fullName')}
              placeholder="Ex: Juliana Ferreira Santos"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden ${
                touched.fullName && errors.fullName
                  ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500 text-rose-900'
                  : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
              }`}
            />
            {touched.fullName && errors.fullName && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.fullName}
              </p>
            )}
          </div>

          {/* Document Type Selector & Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-documentNumber" className="block text-xs font-semibold text-slate-700">
                Documento Oficial <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  id="btn-doc-cpf"
                  onClick={() => handleDocTypeChange('CPF')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    docType === 'CPF' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  CPF
                </button>
                <button
                  type="button"
                  id="btn-doc-rg"
                  onClick={() => handleDocTypeChange('RG')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    docType === 'RG' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  RG
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                id="input-documentNumber"
                type="text"
                value={formData.documentNumber}
                onChange={(e) => handleDocumentChange(e.target.value)}
                onBlur={() => handleBlur('documentNumber')}
                placeholder={docType === 'CPF' ? '000.000.000-00' : '00.000.000-0'}
                maxLength={docType === 'CPF' ? 14 : 15}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-colors focus:outline-hidden ${
                  touched.documentNumber && errors.documentNumber
                    ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500 text-rose-900'
                    : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                }`}
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            {touched.documentNumber && errors.documentNumber && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.documentNumber}
              </p>
            )}
            {docType === 'CPF' && !errors.documentNumber && formData.documentNumber && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> CPF com dígitos verificadores válidos
              </p>
            )}
          </div>

          {/* E-mail e Telefone / WhatsApp em Grid */}
          <div className="grid grid-cols-1 gap-3.5 pt-1">
            <div>
              <label htmlFor="input-email" className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail para Notificações <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => handleBlur('email')}
                  placeholder="exemplo@email.com"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden ${
                    touched.email && errors.email
                      ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500 text-rose-900'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                  }`}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {touched.email && errors.email && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="input-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm font-mono transition-colors focus:outline-hidden ${
                    touched.phone && errors.phone
                      ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500 text-rose-900'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                  }`}
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {touched.phone && errors.phone && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Endereço Completo com ViaCEP */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">2. Endereço do Atendimento</h2>
            </div>
            <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
              Busca Automática ViaCEP
            </span>
          </div>

          {/* CEP com Busca */}
          <div>
            <label htmlFor="input-cep" className="block text-xs font-semibold text-slate-700 mb-1">
              CEP <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="input-cep"
                  type="text"
                  value={formData.address.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={() => handleBlur('cep')}
                  placeholder="00000-000"
                  maxLength={9}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-colors focus:outline-hidden ${
                    touched.cep && errors.cep
                      ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500'
                      : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                  }`}
                />
              </div>
              <button
                type="button"
                id="btn-search-cep"
                onClick={() => searchCep()}
                disabled={isLoadingCep}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
              >
                {isLoadingCep ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Buscar CEP
              </button>
            </div>
            {cepError && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {cepError}
              </p>
            )}
            {touched.cep && errors.cep && !cepError && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.cep}
              </p>
            )}
          </div>

          {/* Logradouro e Número */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label htmlFor="input-logradouro" className="block text-xs font-semibold text-slate-700 mb-1">
                Logradouro (Rua/Av) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-logradouro"
                type="text"
                value={formData.address.logradouro}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, logradouro: e.target.value },
                  })
                }
                onBlur={() => handleBlur('logradouro')}
                placeholder="Rua, Avenida..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
              {touched.logradouro && errors.logradouro && (
                <p className="text-[11px] text-rose-600 mt-0.5">{errors.logradouro}</p>
              )}
            </div>

            <div>
              <label htmlFor="input-numero" className="block text-xs font-semibold text-slate-700 mb-1">
                Número <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-numero"
                type="text"
                value={formData.address.numero}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, numero: e.target.value },
                  })
                }
                onBlur={() => handleBlur('numero')}
                placeholder="Ex: 466"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
              {touched.numero && errors.numero && (
                <p className="text-[11px] text-rose-600 mt-0.5">{errors.numero}</p>
              )}
            </div>
          </div>

          {/* Complemento & Bairro */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="input-complemento" className="block text-xs font-semibold text-slate-700 mb-1">
                Complemento
              </label>
              <input
                id="input-complemento"
                type="text"
                value={formData.address.complemento || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, complemento: e.target.value },
                  })
                }
                placeholder="Apto 82, Bloco B"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="input-bairro" className="block text-xs font-semibold text-slate-700 mb-1">
                Bairro <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-bairro"
                type="text"
                value={formData.address.bairro}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, bairro: e.target.value },
                  })
                }
                onBlur={() => handleBlur('bairro')}
                placeholder="Bairro"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
              {touched.bairro && errors.bairro && (
                <p className="text-[11px] text-rose-600 mt-0.5">{errors.bairro}</p>
              )}
            </div>
          </div>

          {/* Cidade e UF */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label htmlFor="input-cidade" className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-cidade"
                type="text"
                value={formData.address.cidade}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, cidade: e.target.value },
                  })
                }
                onBlur={() => handleBlur('cidade')}
                placeholder="São Paulo"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="input-uf" className="block text-xs font-semibold text-slate-700 mb-1">
                UF <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-uf"
                type="text"
                value={formData.address.uf}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, uf: e.target.value.toUpperCase().slice(0, 2) },
                  })
                }
                onBlur={() => handleBlur('uf')}
                placeholder="SP"
                maxLength={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm uppercase text-center font-bold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Ponto de Referência */}
          <div>
            <label htmlFor="input-pontoReferencia" className="block text-xs font-semibold text-slate-700 mb-1">
              Ponto de Referência ou Instrução de Acesso
            </label>
            <textarea
              id="input-pontoReferencia"
              rows={2}
              value={formData.address.pontoReferencia || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, pontoReferencia: e.target.value },
                })
              }
              placeholder="Ex: Próximo à padaria central, portão verde, interfone 82..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden resize-none"
            />
          </div>
        </div>

        {/* Security & Privacy Notice */}
        <div className="bg-slate-100 rounded-xl p-3.5 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-800">Privacidade & Proteção de Dados:</strong> Seus dados são utilizados exclusivamente para identificação do prestador de serviços e emissão do código seguro de 4 dígitos.
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          id="btn-save-profile"
          disabled={!isFormValid}
          className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 ${
            isFormValid
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 cursor-pointer'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {isMandatoryRegistration ? 'Confirmar Cadastro e Continuar' : 'Salvar Dados do Cadastro'}
        </button>

        {/* Botão Sair da Conta */}
        {onLogout && (
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              id="btn-profile-logout"
              onClick={() => {
                if (window.confirm('Deseja realmente sair da sua conta?')) {
                  onLogout();
                }
              }}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200 hover:border-rose-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair da Minha Conta / Trocar de Usuário
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
