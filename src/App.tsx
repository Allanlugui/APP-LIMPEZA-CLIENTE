import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CustomerProfile, 
  ServiceRequest, 
  AppTab, 
  ServiceStatus 
} from './types';
import { 
  getStoredProfile, 
  saveStoredProfile, 
  getStoredRequests, 
  saveStoredRequests,
  addServiceRequest, 
  updateServiceRequestStatus 
} from './utils/storage';
import { 
  buscarSolicitacoesSupabase, 
  atualizarStatusSolicitacaoSupabase, 
  inscreverAtualizacoesTempoReal, 
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

export default function App() {
  const [profile, setProfile] = useState<CustomerProfile>(() => getStoredProfile());
  const [requests, setRequests] = useState<ServiceRequest[]>(() => getStoredRequests());
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [receiptRequest, setReceiptRequest] = useState<ServiceRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sincronização em tempo real com Supabase (consultas reais)
  useEffect(() => {
    let isMounted = true;

    async function sincronizarSupabase() {
      setIsLoadingRequests(true);
      try {
        if (isSupabaseConfigured) {
          const dadosRemotos = await buscarSolicitacoesSupabase();
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

    // Inscrição em tempo real via Postgres Changes
    const unsubscribe = inscreverAtualizacoesTempoReal((updated) => {
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

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveProfile = (updated: CustomerProfile) => {
    setProfile(updated);
    saveStoredProfile(updated);
    showToast('Dados cadastrais salvos com sucesso!');
  };

  const handleNewRequestSubmitted = (newRequest: ServiceRequest) => {
    const updated = addServiceRequest(newRequest);
    setRequests(updated);
    setSelectedRequest(newRequest);
    setCurrentTab('orders');
    showToast(`Solicitação #${newRequest.id} aprovada! Código: ${newRequest.securityCode}`);
  };

  const handleUpdateStatus = async (requestId: string, newStatus: ServiceStatus) => {
    const updated = updateServiceRequestStatus(requestId, newStatus);
    setRequests(updated);
    
    // Update selected request if open
    const found = updated.find((r) => r.id === requestId);
    if (found) {
      setSelectedRequest(found);
      const lastTimelineEntry = found.statusTimeline[found.statusTimeline.length - 1];
      // Persistir no Supabase em paralelo
      await atualizarStatusSolicitacaoSupabase(requestId, newStatus, lastTimelineEntry);
    }
  };

  const handleOpenTracking = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setCurrentTab('orders');
  };

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
