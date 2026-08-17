import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ShieldCheck, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Check, 
  ArrowLeft, 
  Search, 
  MapPin, 
  Building2,
  FileText
} from 'lucide-react';
import { CustomerProfile, DocumentType, AuthSession } from '../types';
import { 
  hashPassword, 
  generate6DigitRecoveryCode 
} from '../utils/security';
import { 
  autenticarClienteSupabase, 
  cadastrarClienteSupabase, 
  recuperarSenhaClienteSupabase,
  isSupabaseConfigured
} from '../lib/supabase';
import { 
  saveStoredAuthSession, 
  saveLocalRegisteredAccount, 
  getLocalRegisteredAccounts,
  updateLocalAccountPassword
} from '../utils/storage';

type AuthMode = 'login' | 'register' | 'recover' | 'recovery_success_view';

interface AuthViewProps {
  onAuthenticated: (session: AuthSession) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regDocType, setRegDocType] = useState<DocumentType>('CPF');
  const [regDocNum, setRegDocNum] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Address in Register
  const [regCep, setRegCep] = useState('');
  const [regLogradouro, setRegLogradouro] = useState('');
  const [regNumero, setRegNumero] = useState('');
  const [regComplemento, setRegComplemento] = useState('');
  const [regBairro, setRegBairro] = useState('');
  const [regCidade, setRegCidade] = useState('');
  const [regUf, setRegUf] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const [regError, setRegError] = useState<string | null>(null);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<CustomerProfile | null>(null);
  const [createdRecoveryCode, setCreatedRecoveryCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Recover Password State
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [recoverConfirmPassword, setRecoverConfirmPassword] = useState('');
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recoverSuccessMsg, setRecoverSuccessMsg] = useState<string | null>(null);
  const [isSubmittingRecover, setIsSubmittingRecover] = useState(false);

  // Formatter helpers
  const formatCpf = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const formatPhone = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const formatCep = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  };

  const searchCep = async (cepToSearch = regCep) => {
    const clean = cepToSearch.replace(/\D/g, '');
    if (clean.length !== 8) {
      setCepError('Informe um CEP válido com 8 dígitos.');
      return;
    }
    setIsLoadingCep(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado na base dos Correios.');
      } else {
        setRegLogradouro(data.logradouro || '');
        setRegBairro(data.bairro || '');
        setRegCidade(data.localidade || '');
        setRegUf(data.uf || '');
      }
    } catch {
      setCepError('Não foi possível consultar o CEP automaticamente.');
    } finally {
      setIsLoadingCep(false);
    }
  };

  // 1. HANDLER DE LOGIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const identifier = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!identifier) {
      setLoginError('Por favor, informe seu CPF ou E-mail cadastrado.');
      return;
    }
    if (!password) {
      setLoginError('Por favor, informe sua senha.');
      return;
    }

    setIsSubmittingLogin(true);

    try {
      const passHash = await hashPassword(password);

      // 1. Tenta autenticar via Supabase
      if (isSupabaseConfigured) {
        const res = await autenticarClienteSupabase(identifier, passHash);
        if (res.success && res.profile) {
          const session: AuthSession = {
            customer: res.profile,
            rememberMe,
            lastLogin: new Date().toISOString(),
          };
          saveStoredAuthSession(session);
          onAuthenticated(session);
          return;
        } else if (res.error) {
          setLoginError(res.error);
          setIsSubmittingLogin(false);
          return;
        }
      }

      // 2. Fallback / Validação local
      const localAccounts = getLocalRegisteredAccounts();
      const cleanId = identifier.toLowerCase();
      const digitsOnly = identifier.replace(/\D/g, '');

      const matchedAccount = localAccounts.find((acc) => {
        const accDigits = acc.profile.documentNumber.replace(/\D/g, '');
        const accEmail = acc.profile.email.toLowerCase();
        return (
          accEmail === cleanId ||
          (digitsOnly.length > 0 && accDigits === digitsOnly) ||
          acc.profile.documentNumber.toLowerCase() === cleanId
        );
      });

      if (matchedAccount) {
        if (matchedAccount.passwordHash === passHash) {
          const session: AuthSession = {
            customer: matchedAccount.profile,
            rememberMe,
            lastLogin: new Date().toISOString(),
          };
          saveStoredAuthSession(session);
          onAuthenticated(session);
          return;
        } else {
          setLoginError('Senha incorreta. Verifique a senha digitada ou utilize a Recuperação de Acesso.');
          setIsSubmittingLogin(false);
          return;
        }
      }

      // Se não encontrou nem no Supabase nem local
      setLoginError('Conta não localizada com o CPF ou E-mail informado. Faça o Primeiro Acesso para se cadastrar.');
    } catch (err: any) {
      setLoginError(err?.message || 'Falha ao autenticar. Tente novamente.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // 2. HANDLER DE CADASTRO
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Validações básicas
    if (!regFullName.trim()) {
      setRegError('Por favor, informe seu Nome Completo.');
      return;
    }
    const cleanDoc = regDocNum.replace(/\D/g, '');
    if (regDocType === 'CPF' && cleanDoc.length !== 11) {
      setRegError('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!regPhone.trim() || regPhone.replace(/\D/g, '').length < 10) {
      setRegError('Por favor, informe um telefone/WhatsApp válido com DDD.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Por favor, informe um e-mail válido.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('A senha deve ter no mínimo 6 caracteres para garantir sua segurança.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('A confirmação de senha não confere com a senha digitada.');
      return;
    }
    if (!regCep.trim() || !regLogradouro.trim() || !regNumero.trim()) {
      setRegError('Por favor, preencha o CEP, logradouro e número do seu endereço.');
      return;
    }

    setIsSubmittingReg(true);

    try {
      const passHash = await hashPassword(regPassword);
      const recoveryCode = generate6DigitRecoveryCode();
      const customerId = `cust_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      const newProfile: CustomerProfile = {
        id: customerId,
        fullName: regFullName.trim(),
        documentType: regDocType,
        documentNumber: regDocNum.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        photoUrl: '',
        recoveryCode,
        address: {
          cep: regCep.trim(),
          logradouro: regLogradouro.trim(),
          numero: regNumero.trim(),
          complemento: regComplemento.trim(),
          bairro: regBairro.trim(),
          cidade: regCidade.trim(),
          uf: regUf.trim().toUpperCase(),
        },
        createdAt: new Date().toISOString(),
      };

      // 1. Salva no Supabase
      const supabaseRes = await cadastrarClienteSupabase(newProfile, passHash, recoveryCode);
      if (!supabaseRes.success) {
        setRegError(supabaseRes.error || 'Erro ao registrar no banco de dados.');
        setIsSubmittingReg(false);
        return;
      }

      const finalizedProfile = supabaseRes.profile || newProfile;

      // 2. Salva no registro local para acesso offline resiliente
      saveLocalRegisteredAccount({
        profile: finalizedProfile,
        passwordHash: passHash,
        recoveryCode,
      });

      // 3. Apresenta o Código de Recuperação ao cliente
      setCreatedProfile(finalizedProfile);
      setCreatedRecoveryCode(recoveryCode);
      setMode('recovery_success_view');
    } catch (err: any) {
      setRegError(err?.message || 'Falha ao cadastrar cliente. Tente novamente.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // 3. FINALIZAR PRIMEIRO ACESSO E LOGAR
  const handleProceedAfterRegistration = () => {
    if (!createdProfile) return;
    const session: AuthSession = {
      customer: createdProfile,
      rememberMe: true,
      lastLogin: new Date().toISOString(),
    };
    saveStoredAuthSession(session);
    onAuthenticated(session);
  };

  // 4. HANDLER DE RECUPERAÇÃO DE ACESSO
  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError(null);
    setRecoverSuccessMsg(null);

    const identifier = recoverIdentifier.trim();
    const code = recoverCode.trim().replace(/\D/g, '');
    const newPass = recoverNewPassword.trim();
    const confirmPass = recoverConfirmPassword.trim();

    if (!identifier) {
      setRecoverError('Informe seu CPF ou E-mail cadastrado.');
      return;
    }
    if (code.length !== 6) {
      setRecoverError('Informe o código único de recuperação de 6 dígitos numéricos.');
      return;
    }
    if (newPass.length < 6) {
      setRecoverError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPass !== confirmPass) {
      setRecoverError('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    setIsSubmittingRecover(true);

    try {
      const passHash = await hashPassword(newPass);

      // 1. Tenta recuperar via Supabase
      if (isSupabaseConfigured) {
        const res = await recuperarSenhaClienteSupabase(identifier, code, passHash);
        if (res.success && res.profile) {
          updateLocalAccountPassword(identifier, passHash);
          setRecoverSuccessMsg('Senha redefinida com sucesso! Redirecionando para o aplicativo...');
          setTimeout(() => {
            const session: AuthSession = {
              customer: res.profile!,
              rememberMe: true,
              lastLogin: new Date().toISOString(),
            };
            saveStoredAuthSession(session);
            onAuthenticated(session);
          }, 1200);
          return;
        } else if (res.error) {
          setRecoverError(res.error);
          setIsSubmittingRecover(false);
          return;
        }
      }

      // 2. Fallback local
      const localAccounts = getLocalRegisteredAccounts();
      const cleanId = identifier.toLowerCase();
      const digitsOnly = identifier.replace(/\D/g, '');

      const matchedAccount = localAccounts.find((acc) => {
        const accDigits = acc.profile.documentNumber.replace(/\D/g, '');
        const accEmail = acc.profile.email.toLowerCase();
        return (
          accEmail === cleanId ||
          (digitsOnly.length > 0 && accDigits === digitsOnly) ||
          acc.profile.documentNumber.toLowerCase() === cleanId
        );
      });

      if (!matchedAccount) {
        setRecoverError('Conta não encontrada com os dados informados.');
        setIsSubmittingRecover(false);
        return;
      }

      if (matchedAccount.recoveryCode !== code) {
        setRecoverError('Código de recuperação inválido para esta conta.');
        setIsSubmittingRecover(false);
        return;
      }

      // Atualiza senha localmente
      updateLocalAccountPassword(identifier, passHash);
      setRecoverSuccessMsg('Senha redefinida com sucesso! Acessando...');
      setTimeout(() => {
        const session: AuthSession = {
          customer: matchedAccount.profile,
          rememberMe: true,
          lastLogin: new Date().toISOString(),
        };
        saveStoredAuthSession(session);
        onAuthenticated(session);
      }, 1000);
    } catch (err: any) {
      setRecoverError(err?.message || 'Erro ao recuperar senha.');
    } finally {
      setIsSubmittingRecover(false);
    }
  };

  const copyRecoveryCode = () => {
    if (createdRecoveryCode) {
      navigator.clipboard.writeText(createdRecoveryCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4 text-slate-900 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden relative">
        
        {/* BRAND HEADER BANNER */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg mb-3">
              <Sparkles className="w-7 h-7 text-emerald-200" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              Limpa & Organiza
            </h1>
            <p className="text-xs text-emerald-100/90 flex items-center gap-1 mt-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Acesso Seguro do Cliente • Metodologia 5S
            </p>
          </div>
        </div>

        {/* CONTAINER DINÂMICO DE TELAS */}
        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            
            {/* ================================================================= */}
            {/* 1. TELA DE LOGIN                                                 */}
            {/* ================================================================= */}
            {mode === 'login' && (
              <motion.div
                key="login-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="text-center pb-1">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Acessar Minha Conta
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Digite suas credenciais para solicitar e acompanhar serviços
                  </p>
                </div>

                {loginError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  {/* Identificador: CPF ou E-mail */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CPF ou E-mail <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="login-input-identifier"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Ex: 000.000.000-00 ou seu@email.com"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Senha */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Senha <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginError(null);
                          setMode('recover');
                        }}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        id="login-input-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Sua senha de acesso"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Lembrar minhas credenciais */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="login-remember-me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Lembrar minhas credenciais
                      </span>
                    </label>
                  </div>

                  {/* Botão Entrar */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    id="btn-submit-login"
                    disabled={isSubmittingLogin}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingLogin ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando Acesso...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        Entrar no Aplicativo
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Divisor */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
                    Novo por aqui?
                  </span>
                </div>

                {/* Botão Primeiro Acesso / Cadastro */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  id="btn-goto-register"
                  onClick={() => {
                    setLoginError(null);
                    setMode('register');
                  }}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <User className="w-4 h-4 text-emerald-700" />
                  Primeiro Acesso • Criar Minha Conta
                </motion.button>
              </motion.div>
            )}

            {/* ================================================================= */}
            {/* 2. TELA DE PRIMEIRO ACESSO / CADASTRO                             */}
            {/* ================================================================= */}
            {mode === 'register' && (
              <motion.div
                key="register-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 max-h-[75vh] overflow-y-auto pr-1"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRegError(null);
                      setMode('login');
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Voltar ao Login"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Primeiro Acesso / Criar Conta
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Cadastre seus dados e receba seu Código Único de Segurança
                    </p>
                  </div>
                </div>

                {regError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="reg-input-name"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Ex: Maria Aparecida Santos"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      required
                    />
                  </div>

                  {/* Documento: Tipo + Número */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo
                      </label>
                      <select
                        id="reg-select-doctype"
                        value={regDocType}
                        onChange={(e) => {
                          setRegDocType(e.target.value as DocumentType);
                          setRegDocNum('');
                        }}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      >
                        <option value="CPF">CPF</option>
                        <option value="RG">RG</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Número do Documento <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="reg-input-docnum"
                        value={regDocNum}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRegDocNum(regDocType === 'CPF' ? formatCpf(val) : val);
                        }}
                        placeholder={regDocType === 'CPF' ? '000.000.000-00' : '00.000.000-0'}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  {/* Telefone e E-mail */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Telefone / WhatsApp <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          id="reg-input-phone"
                          value={regPhone}
                          onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        E-mail de Contato <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="email"
                          id="reg-input-email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="cliente@email.com"
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Senha e Confirmação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Definir Senha (mín. 6) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          id="reg-input-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Crie uma senha"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirmar Senha <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          id="reg-input-confirm-password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* ENDEREÇO COM BUSCA DE CEP */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Endereço Principal do Imóvel
                    </div>

                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="reg-input-cep"
                          value={regCep}
                          onChange={(e) => {
                            const val = formatCep(e.target.value);
                            setRegCep(val);
                            if (val.replace(/\D/g, '').length === 8) {
                              searchCep(val);
                            }
                          }}
                          placeholder="CEP: 00000-000"
                          maxLength={9}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => searchCep()}
                          disabled={isLoadingCep}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {isLoadingCep ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                          Buscar
                        </button>
                      </div>
                      {cepError && <p className="text-[11px] text-rose-600 mt-1">{cepError}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          id="reg-input-logradouro"
                          value={regLogradouro}
                          onChange={(e) => setRegLogradouro(e.target.value)}
                          placeholder="Rua, Avenida..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          id="reg-input-numero"
                          value={regNumero}
                          onChange={(e) => setRegNumero(e.target.value)}
                          placeholder="Número *"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        id="reg-input-complemento"
                        value={regComplemento}
                        onChange={(e) => setRegComplemento(e.target.value)}
                        placeholder="Apto / Bloco (Opcional)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        id="reg-input-bairro"
                        value={regBairro}
                        onChange={(e) => setRegBairro(e.target.value)}
                        placeholder="Bairro"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        id="reg-input-cidade"
                        value={regCidade ? `${regCidade}/${regUf}` : ''}
                        onChange={(e) => setRegCidade(e.target.value)}
                        placeholder="Cidade/UF"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Botão de Envio de Cadastro */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    id="btn-submit-register"
                    disabled={isSubmittingReg}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 mt-3"
                  >
                    {isSubmittingReg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando Conta & Gerando Chave...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Concluir Cadastro & Obter Código Único
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    Já tem conta? <strong className="text-emerald-700 underline">Fazer login</strong>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================================================================= */}
            {/* 3. TELA DE SUCESSO DO CADASTRO (CÓDIGO ÚNICO DE 6 DÍGITOS)        */}
            {/* ================================================================= */}
            {mode === 'recovery_success_view' && (
              <motion.div
                key="recovery-success-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4 text-center py-2"
              >
                <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Conta Criada com Sucesso!
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                    Seu cadastro foi salvo com sucesso. Guarde o seu <strong>Código Único de Recuperação</strong>:
                  </p>
                </div>

                {/* DISPLAY DO CÓDIGO ÚNICO DE 6 DÍGITOS */}
                <div className="bg-slate-900 p-4 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block">
                    Código Único de Recuperação (6 Dígitos)
                  </span>

                  <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-black font-mono tracking-widest text-white py-1">
                    {createdRecoveryCode.split('').map((char, idx) => (
                      <span
                        key={idx}
                        className="w-10 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-emerald-400 shadow-inner"
                      >
                        {char}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    Use este código para redefinir sua senha caso a esqueça ou para autenticação com a equipe operacional.
                  </p>

                  <button
                    type="button"
                    id="btn-copy-recovery-code"
                    onClick={copyRecoveryCode}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer active:scale-98"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Código Copiado com Sucesso!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Código de 6 Dígitos
                      </>
                    )}
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  id="btn-proceed-to-app"
                  onClick={handleProceedAfterRegistration}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Acessar o Aplicativo
                </motion.button>
              </motion.div>
            )}

            {/* ================================================================= */}
            {/* 4. TELA DE RECUPERAÇÃO DE SENHA COM CÓDIGO DE 6 DÍGITOS            */}
            {/* ================================================================= */}
            {mode === 'recover' && (
              <motion.div
                key="recover-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverError(null);
                      setMode('login');
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Voltar ao Login"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Recuperação de Acesso
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Informe seu Código de 6 Dígitos para redefinir sua senha
                    </p>
                  </div>
                </div>

                {recoverError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{recoverError}</span>
                  </div>
                )}

                {recoverSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{recoverSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleRecoverSubmit} className="space-y-3.5">
                  {/* Identificador: CPF ou E-mail */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Seu CPF ou E-mail Cadastrado <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="recover-input-identifier"
                        value={recoverIdentifier}
                        onChange={(e) => setRecoverIdentifier(e.target.value)}
                        placeholder="Ex: 000.000.000-00 ou seu@email.com"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  {/* Código Único de 6 Dígitos */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Código Único de Recuperação (6 Dígitos) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4 text-emerald-600" />
                      </div>
                      <input
                        type="text"
                        id="recover-input-code"
                        value={recoverCode}
                        onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold tracking-widest text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Código de 6 dígitos gerado durante o cadastro ou fornecido pelo suporte.
                    </p>
                  </div>

                  {/* Nova Senha e Confirmação */}
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nova Senha (mín. 6) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type={showRecoverPassword ? 'text' : 'password'}
                        id="recover-input-new-password"
                        value={recoverNewPassword}
                        onChange={(e) => setRecoverNewPassword(e.target.value)}
                        placeholder="Digite a nova senha"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirmar Nova Senha <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type={showRecoverPassword ? 'text' : 'password'}
                        id="recover-input-confirm-password"
                        value={recoverConfirmPassword}
                        onChange={(e) => setRecoverConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  {/* Botão Redefinir */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    id="btn-submit-recover"
                    disabled={isSubmittingRecover}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingRecover ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando Código e Redefinindo...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        Redefinir Senha e Entrar
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    Lembrou a senha? <strong className="text-emerald-700 underline">Voltar para o Login</strong>
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* FOOTER DE SEGURANÇA E SUPORTE */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Criptografia de Ponta a Ponta
          </span>
          <span className="text-slate-400 font-medium">
            Supabase DB Sincronizado
          </span>
        </div>
      </div>
    </div>
  );
};
