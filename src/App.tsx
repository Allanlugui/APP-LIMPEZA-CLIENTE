import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CustomerProfile, 
  ServiceRequest, 
  AppTab, 
  ServiceStatus,
  AuthSession
} from './types';
import { 
  getStoredProfile, 
  saveStoredProfile, 
  getStoredRequests, 
  saveStoredRequests,
  addServiceRequest, 
  updateServiceRequestStatus,
  getStoredAuthSession,
  saveStoredAuthSession,
  clearStoredAuthSession
} from './utils/storage';
import { 
  buscarSolicitacoesSupabase, 
  salvarSolicitacaoSupabase,
  atualizarStatusSolicitacaoSupabase, 
  atualizarPerfilClienteSupabase,
  inscreverAtualizacoesTempoReal, 
  inscreverNotificacoesEcossistema,
  EcosystemNotification,
  isSupabaseConfigured 
} from './lib/supabase';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeDashboard } from './components/HomeDashboard';
import { NewServiceWizard } from './components/NewServiceRequest/NewServiceWizard';
import { ActiveOrderTracking } from './components/ActiveOrderTracking';
import { OrdersListView } from './components/OrdersListView';
import { ProfileView } from './components/ProfileView';
import { OrderReceiptModal } from './components/OrderReceiptModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { AuthView } from './components/AuthView';
import { Radio, BellRing, Activity, Sparkles } from 'lucide-react';

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [profile, setProfile] = useState<CustomerProfile>(() => {
    const session = getStoredAuthSession();
    return session?.customer || getStoredProfile();
  });
  const [requests, setRequests] = useState<ServiceRequest[]>(() => getStoredRequests());
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [receiptRequest, setReceiptRequest] = useState<ServiceRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [ecosystemAlert, setEcosystemAlert] = useState<EcosystemNotification | null>(null);

  // Helper de Toast global com escopo seguro
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handler para quando o usuário se autentica com sucesso
  const handleAuthenticated = (session: AuthSession) => {
    setAuthSession(session);
    setProfile(session.customer);
    setCurrentTab('home');
    showToast(`Bem-vindo(a), ${session.customer.fullName.split(' ')[0]}!`);
  };

  // Handler de Logout
  const handleLogout = () => {
    clearStoredAuthSession();
    setAuthSession(null);
    setSelectedRequest(null);
    setCurrentTab('home');
    showToast('Sessão encerrada com segurança.');
  };

  // Sincronização em tempo real com Supabase (consultas reais)
  useEffect(() => {
    if (!authSession) {
      setIsLoadingRequests(false);
      return;
    }

    let isMounted = true;

    async function sincronizarSupabase() {
      setIsLoadingRequests(true);
      try {
        if (isSupabaseConfigured) {
          const dadosRemotos = await buscarSolicitacoesSupabase(
            authSession?.customer?.id,
            authSession?.customer?.documentNumber,
            authSession?.customer?.email
          );
          if (isMounted) {
            setRequests(dadosRemotos);
            saveStoredRequests(dadosRemotos);
          }
        } else {
          // Modo local
          const localRequests = getStoredRequests();
          if (isMounted) {
            setRequests(localRequests);
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar com banco de dados:', err);
      } finally {
        if (isMounted) {
          setIsLoadingRequests(false);
        }
      }
    }

    sincronizarSupabase();

    // Inscrição em tempo real via Postgres Changes (tabela solicitacoes_servico)
    const unsubscribeDb = inscreverAtualizacoesTempoReal((updated) => {
      setRequests((prev) => {
        const index = prev.findIndex((r) => r.id === updated.id);
        let novoArray: ServiceRequest[];
        if (index >= 0) {
          novoArray = [...prev];
          novoArray[index] = updated;
        } else {
          novoArray = [updated, ...prev];
        }
        saveStoredRequests(novoArray);
        return novoArray;
      });

      setSelectedRequest((prev) => (prev && prev.id === updated.id ? updated : prev));
      showToast(`Status atualizado em tempo real: #${updated.id} (${updated.status})`);
    });

    // Inscrição em transmissões ao vivo do Ecossistema (Painel Admin & App de Campo)
    const unsubscribeBroadcast = inscreverNotificacoesEcossistema((notif) => {
      console.info('[App Ecossistema] Notificação ao vivo recebida:', notif);
      setEcosystemAlert(notif);
      
      // Auto-remover após 7 segundos
      setTimeout(() => {
        setEcosystemAlert((current) => (current?.id === notif.id ? null : current));
      }, 7000);

      // Se for atualização de solicitação, sincroniza dados
      if (notif.orderId || notif.type === 'status_update' || notif.type === 'new_order') {
        buscarSolicitacoesSupabase(
          authSession?.customer?.id,
          authSession?.customer?.documentNumber,
          authSession?.customer?.email
        ).then((dadosAtualizados) => {
          if (dadosAtualizados && dadosAtualizados.length > 0) {
            setRequests(dadosAtualizados);
            saveStoredRequests(dadosAtualizados);
          }
        }).catch((err) => console.warn('[App Ecossistema] Erro ao sincronizar pedidos após broadcast:', err));
      }
    });

    return () => {
      isMounted = false;
      unsubscribeDb();
      unsubscribeBroadcast();
    };
  }, [authSession]);

  const handleSaveProfile = async (updated: CustomerProfile) => {
    setProfile(updated);
    saveStoredProfile(updated);
    if (authSession) {
      const updatedSession: AuthSession = {
        ...authSession,
        customer: updated,
      };
      saveStoredAuthSession(updatedSession);
      setAuthSession(updatedSession);
    }
    await atualizarPerfilClienteSupabase(updated);
    showToast('Dados cadastrais salvos com sucesso!');
  };

  const handleNewRequestSubmitted = async (newRequest: ServiceRequest) => {
    const updated = addServiceRequest(newRequest);
    setRequests(updated);
    setSelectedRequest(newRequest);
    setCurrentTab('orders');
    showToast(`Solicitação #${newRequest.id} registrada! Código: ${newRequest.securityCode}`);
    
    // Persistência imediata no Supabase
    await salvarSolicitacaoSupabase(newRequest);
  };

  const handleUpdateStatus = async (requestId: string, newStatus: ServiceStatus) => {
    const updated = updateServiceRequestStatus(requestId, newStatus);
    setRequests(updated);
    
    // Update selected request if open
    const found = updated.find((r) => r.id === requestId);
    if (found) {
      setSelectedRequest(found);
      const lastTimelineEntry = found.statusTimeline[found.statusTimeline.length - 1];
      // Persistir no Supabase em tempo real
      await atualizarStatusSolicitacaoSupabase(requestId, newStatus, lastTimelineEntry);
    }
  };

  const handleOpenTracking = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setCurrentTab('orders');
  };

  // Se não houver sessão ativa, renderiza a tela de login/cadastro
  if (!authSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center text-slate-900 font-sans">
        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-6 inset-x-4 z-50 max-w-sm mx-auto bg-slate-900 text-emerald-400 text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center justify-between"
            >
              <span>{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-white text-sm ml-2 font-mono p-1 cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AuthView onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  // Active requests (solicitado, aprovado, a_caminho, em_andamento)
  const activeRequests = requests.filter((r) =>
    ['solicitado', 'aprovado', 'a_caminho', 'em_andamento'].includes(r.status)
  );
  const primaryActiveRequest = activeRequests[0];

  const isProfileIncomplete =
    !profile.fullName?.trim() ||
    !profile.documentNumber?.trim() ||
    !profile.phone?.trim() ||
    !profile.address?.logradouro?.trim();

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Mobile-first app container */}
      <div className="w-full max-w-md bg-slate-50 min-h-screen relative flex flex-col shadow-2xl border-x border-slate-200/80">
        {/* Header */}
        <Header
          profile={profile}
          activeRequest={primaryActiveRequest}
          onOpenProfile={() => setCurrentTab('profile')}
          onOpenOrders={() => {
            if (primaryActiveRequest) {
              setSelectedRequest(primaryActiveRequest);
            }
            setCurrentTab('orders');
          }}
        />

        {/* PWA Install Banner */}
        <PwaInstallBanner />

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-16 inset-x-4 z-50 max-w-sm mx-auto bg-slate-900 text-emerald-400 text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center justify-between"
            >
              <span>{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-white text-sm ml-2 font-mono p-1 cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}

          {/* Live Ecosystem Broadcast Alert (Painel Admin & App de Campo) */}
          {ecosystemAlert && (
            <motion.div
              key={ecosystemAlert.id}
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.92 }}
              className="fixed top-20 inset-x-4 z-50 max-w-sm mx-auto bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-2xl border border-emerald-500/60 p-3.5 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-100">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>{ecosystemAlert.title || 'Alerta do Ecossistema'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    ecosystemAlert.sender === 'admin_panel'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                      : ecosystemAlert.sender === 'field_app'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                  }`}>
                    {ecosystemAlert.sender === 'admin_panel'
                      ? 'Painel Admin'
                      : ecosystemAlert.sender === 'field_app'
                      ? 'App de Campo'
                      : 'Ecossistema'}
                  </span>
                  <button
                    onClick={() => setEcosystemAlert(null)}
                    className="text-slate-400 hover:text-white text-sm font-mono cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {ecosystemAlert.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content by Tab with Smooth Transitions */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* TAB 1: INÍCIO */}
            {currentTab === 'home' && (
              <motion.div
                key="home-tab"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.18 }}
              >
                <HomeDashboard
                  profile={profile}
                  activeRequest={primaryActiveRequest}
                  allRequests={requests}
                  onNewService={() => setCurrentTab('new-service')}
                  onOpenTracking={handleOpenTracking}
                  onOpenOrders={() => {
                    setSelectedRequest(null);
                    setCurrentTab('orders');
                  }}
                  onOpenProfile={() => setCurrentTab('profile')}
                />
              </motion.div>
            )}

            {/* TAB 2: SOLICITAR NOVO SERVIÇO */}
            {currentTab === 'new-service' && (
              <motion.div
                key="new-service-tab"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
              >
                <NewServiceWizard
                  customer={profile}
                  onRequestSubmitted={handleNewRequestSubmitted}
                  onCancel={() => setCurrentTab('home')}
                  onOpenProfile={() => setCurrentTab('profile')}
                />
              </motion.div>
            )}

            {/* TAB 3: ACOMPANHAR / PEDIDOS */}
            {currentTab === 'orders' && (
              <motion.div
                key="orders-tab"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
              >
                {selectedRequest ? (
                  <div>
                    <div className="px-4 pt-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedRequest(null)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mb-2 py-1 px-2 rounded-lg hover:bg-emerald-50 cursor-pointer"
                      >
                        ← Ver todas as solicitações
                      </motion.button>
                    </div>
                    <ActiveOrderTracking
                      request={selectedRequest}
                      onUpdateStatus={handleUpdateStatus}
                      onViewReceipt={(req) => setReceiptRequest(req)}
                      onNewOrder={() => {
                        setSelectedRequest(null);
                        setCurrentTab('new-service');
                      }}
                    />
                  </div>
                ) : (
                  <OrdersListView
                    requests={requests}
                    isLoading={isLoadingRequests}
                    onSelectRequest={(req) => setSelectedRequest(req)}
                    onNewRequest={() => setCurrentTab('new-service')}
                    onViewReceipt={(req) => setReceiptRequest(req)}
                  />
                )}
              </motion.div>
            )}

            {/* TAB 4: MEU PERFIL / CADASTRO */}
            {currentTab === 'profile' && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
              >
                <ProfileView
                  profile={profile}
                  onSaveProfile={handleSaveProfile}
                  onLogout={handleLogout}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          isProfileIncomplete={isProfileIncomplete}
          onChangeTab={(tab) => {
            if (tab === 'orders' && !selectedRequest && primaryActiveRequest) {
              setSelectedRequest(primaryActiveRequest);
            }
            setCurrentTab(tab);
          }}
          activeOrdersCount={activeRequests.length}
        />

        {/* Modal de Comprovante Digital */}
        {receiptRequest && (
          <OrderReceiptModal
            request={receiptRequest}
            onClose={() => setReceiptRequest(null)}
          />
        )}
      </div>
    </div>
  );
}
