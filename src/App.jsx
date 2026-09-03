import React, { useEffect, useState } from 'react';
import Sidebar from './components/Common/Sidebar';
import Header from './components/Common/Header';
import JiraTicketView from './components/Ticketing/JiraTicketView';
import DeveloperLoadBalancer from './components/LoadBalancer/DeveloperLoadBalancer';
import DeveloperWorkbench from './components/Workbench/DeveloperWorkbench';
import KnowledgeHub from './components/Knowledge/KnowledgeHub';
import ExecutiveDashboard from './components/Analytics/ExecutiveDashboard';
import AIPipelineVisualizer from './components/Pipeline/AIPipelineVisualizer';
import WarRoom from './components/Operations/WarRoom';
import DigitalTwin from './components/Operations/DigitalTwin';
import MissionControl from './components/Operations/MissionControl';
import IntegrationHub from './components/Integrations/IntegrationHub';

import * as api from './services/apiClient';
import { ShieldAlert, Loader2, Inbox, RefreshCw, X } from 'lucide-react';
import EmptyState from './components/Common/EmptyState';
import LoginScreen from './components/Auth/LoginScreen';
import { useAuth } from './context/AuthContext';
import { useTheme } from './hooks/useTheme';
import { VIEWS_BY_ROLE, DEFAULT_VIEW_BY_ROLE } from './constants/roles';

// Human-readable labels for ticket status values
const STATUS_LABELS = {
  NEW: 'New',
  TRIAGED: 'Triaged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  REMEDIATION_PENDING: 'Awaiting Approval',
  VERIFICATION: 'Verifying',
  VERIFICATION_FAILED: 'Verify Failed',
  ROLLBACK_REQUIRED: 'Rollback Needed',
  ROLLED_BACK: 'Rolled Back',
  RESOLVED: 'Resolved',
  SELF_SERVICE_RESOLVED: 'Self-Resolved',
  VERIFIED: 'Verified',
  KNOWLEDGE_CAPTURED: 'Resolved + KB',
  ESCALATED: 'Escalated',
  BLOCKED: 'Blocked',
  REOPENED: 'Reopened',
  RESOLVED_DUPLICATE_MERGED: 'Duplicate',
  APPROVED: 'Approved',
};

export default function App() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [filterModule, setFilterModule] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const showError = (msg) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(null), 5000); };

  // Derive the selected incident strictly from the id — never silently fall back to
  // another incident's record (that would leak cross-incident data into every panel).
  const selectedTicket = selectedTicketId
    ? tickets.find((t) => t.id === selectedTicketId || t.ticket_number === selectedTicketId) || null
    : tickets[0] || null;

  const loadInitialData = React.useCallback(async ({ signal, isInitial = false } = {}) => {
    if (isInitial) setIsLoading(true);
    try {
      const [ticketsData, developersData, kbData] = await Promise.all([
        api.fetchTickets(),
        api.fetchDevelopers().catch(() => []),
        api.fetchKnowledgeBase().catch(() => [])
      ]);
      if (signal?.cancelled) return;
      setTickets(ticketsData);
      setDevelopers(developersData);
      setKnowledgeBase(kbData);
      setSelectedTicketId((prev) => prev || (ticketsData[0]?.id ?? null));
      setLoadError(null);
    } catch (err) {
      if (!signal?.cancelled) setLoadError(err.message);
    } finally {
      if (isInitial && !signal?.cancelled) setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (!user) return undefined;
    const signal = { cancelled: false };
    loadInitialData({ signal, isInitial: true });

    // Poll every 10 seconds for real-time multi-user synchronization
    const interval = setInterval(() => {
      loadInitialData({ signal, isInitial: false });
    }, 10000);

    return () => {
      signal.cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id, loadInitialData]);

  const allowedViews = user ? (VIEWS_BY_ROLE[user.role] || []) : [];

  useEffect(() => {
    if (!user) return;
    const allowed = VIEWS_BY_ROLE[user.role] || [];
    const defaultView = DEFAULT_VIEW_BY_ROLE[user.role] || 'TRIAGE';
    if (!currentView || !allowed.includes(currentView)) {
      setCurrentView(defaultView);
    }
  }, [user, currentView]);

  const handleMergeDuplicate = async (sourceTicketId, targetTicketId) => {
    try {
      const updated = await api.patchTicket(sourceTicketId, { status: 'RESOLVED_DUPLICATE_MERGED' });
      setTickets((prev) => prev.map((t) => (t.id === sourceTicketId ? updated : t)));
      const targetLabel = targetTicketId || 'parent incident';
      showError(`✓ Ticket ${sourceTicketId} merged into ${targetLabel}.`);
    } catch (err) {
      showError(`Failed to merge ticket: ${err.message}`);
    }
  };

  const handleAssignDeveloper = async (ticketId, devId) => {
    try {
      const updated = await api.patchTicket(ticketId, { assigned_dev_id: devId, status: 'ASSIGNED' });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      const refreshedDevelopers = await api.fetchDevelopers();
      setDevelopers(refreshedDevelopers);
    } catch (err) {
      showError(`Failed to assign developer: ${err.message}`);
    }
  };

  // Returns { reassignments, count } so DeveloperLoadBalancer can animate the result
  // in-panel instead of a blocking browser alert(); throws on failure so the caller
  // can surface that itself.
  const handleRebalanceLoad = async () => {
    const { reassignments, count } = await api.rebalanceLoad();
    const [refreshedTickets, refreshedDevelopers] = await Promise.all([
      api.fetchTickets(),
      api.fetchDevelopers()
    ]);
    setTickets(refreshedTickets);
    setDevelopers(refreshedDevelopers);
    return { reassignments, count };
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const updated = await api.patchTicket(ticketId, { status: 'RESOLVED' });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      const refreshedDevelopers = await api.fetchDevelopers();
      setDevelopers(refreshedDevelopers);
    } catch (err) {
      showError(`Failed to resolve ticket: ${err.message}`);
    }
  };

  const handleAddKnowledgeArticle = async (article) => {
    try {
      const saved = await api.addKnowledgeArticle(article);
      setKnowledgeBase((prev) => [saved, ...prev]);
    } catch (err) {
      showError(`Failed to save knowledge article: ${err.message}`);
    }
  };

  const filteredTicketsList = tickets.filter((t) => {
    if (filterModule === 'ALL') return true;
    return t.erp_module === filterModule;
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-color app-bg">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm">Checking session...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-color app-bg">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm">Connecting to IncidentAI backend...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6 app-bg">
        <ShieldAlert className="w-10 h-10 text-rose-500" />
        <h2 className="text-lg font-bold text-heading">Cannot reach the IncidentAI backend</h2>
        <p className="text-sm text-muted-color max-w-md">{loadError}</p>
        <p className="text-xs text-faint-color">
          Make sure it is running with <code className="text-accent-color">npm run server</code>.
        </p>
        <button onClick={() => loadInitialData()} className="btn-primary text-xs mt-1">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  /* ─────────── TRIAGE: full-height split-panel ─────────── */
  const isTriage = currentView === 'TRIAGE';

  return (
    <div className="min-h-screen flex app-bg">
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => { setCurrentView(view); setIsMobileNavOpen(false); }}
        allowedViews={allowedViews}
        activeIncidentsCount={tickets.filter((t) => t.status !== 'RESOLVED').length}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col" style={{ minHeight: '100vh' }}>
        <Header
          user={user}
          onLogout={logout}
          theme={theme}
          onToggleTheme={toggleTheme}
          activeIncidentsCount={tickets.filter((t) => t.status !== 'RESOLVED').length}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        {/* Error Toast Banner */}
        {errorMessage && (
          <div
            className="mx-4 mt-2 px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3"
            style={{
              background: errorMessage.startsWith('✓') ? 'var(--bg-surface)' : 'rgba(239,68,68,0.08)',
              borderColor: errorMessage.startsWith('✓') ? 'var(--border)' : 'rgba(239,68,68,0.3)',
              color: errorMessage.startsWith('✓') ? 'var(--text-body)' : '#f87171'
            }}
          >
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} style={{ color: 'inherit', opacity: 0.6 }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── TRIAGE: edge-to-edge split panel, no outer padding ── */}
        {isTriage && (
          <div
            className="flex flex-1 overflow-hidden"
            style={{ height: 'calc(100vh - var(--header-height))' }}
          >
            {/* LEFT — ticket queue */}
            <div
              className="flex flex-col shrink-0 overflow-hidden"
              style={{
                width: '300px',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border)',
              }}
            >
              {/* Queue header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-semibold text-heading">Incidents</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: filteredTicketsList.length > 0 ? 'var(--red-bg)' : 'var(--bg-muted)',
                      color:      filteredTicketsList.length > 0 ? 'var(--red-text)' : 'var(--text-muted)',
                      border:     filteredTicketsList.length > 0 ? '1px solid var(--red-border)' : '1px solid var(--border)',
                    }}
                  >
                    {filteredTicketsList.length}
                  </span>
                </div>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="input-field"
                  style={{ height: '28px', fontSize: '11px', padding: '0 6px', width: 'auto' }}
                >
                  <option value="ALL">All</option>
                  <option value="INVOICING">Invoicing</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="INVENTORY">Inventory</option>
                  <option value="GENERAL_LEDGER">General Ledger</option>
                </select>
              </div>

              {/* Scrollable ticket list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filteredTicketsList.length === 0 && (
                  <EmptyState
                    icon={Inbox}
                    title={tickets.length === 0 ? 'No Incidents Yet' : 'No Matches'}
                    description={
                      tickets.length === 0
                        ? 'Trigger an ERP transaction from the Digital Twin console to create one.'
                        : `No tickets for module "${filterModule}".`
                    }
                    compact
                  />
                )}

                {filteredTicketsList.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  const isP0 = t.severity === 'P0_CRITICAL';
                  const isP1 = t.severity === 'P1_HIGH';
                  const sevDot = isP0 ? 'var(--red)' : isP1 ? 'var(--amber)' : 'var(--accent)';

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid var(--accent-subtle-bd)' : '1px solid transparent',
                        background: isSelected ? 'var(--accent-subtle-bg)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.1s, border-color 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-muted)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Row 1: ticket # + severity pill */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: sevDot }}
                          />
                          <code
                            className="text-[11px] font-mono font-bold truncate"
                            style={{ color: 'var(--accent-subtle-text)' }}
                          >
                            {t.ticket_number || t.id}
                          </code>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {t.status && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              t.status === 'RESOLVED' || t.status === 'VERIFIED' || t.status === 'KNOWLEDGE_CAPTURED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : t.status === 'VERIFICATION_FAILED'
                                ? 'bg-rose-500/10 text-rose-400'
                                : t.status === 'ROLLED_BACK'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {STATUS_LABELS[t.remediation_status || t.status] || t.status}
                            </span>
                          )}
                          <span
                            className={isP0 ? 'badge-p0' : isP1 ? 'badge-p1' : t.severity === 'P2_MEDIUM' ? 'badge-p2' : 'badge-p3'}
                            style={{ fontSize: '10px', padding: '1px 6px' }}
                          >
                            {t.severity?.split('_')[0]}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: title */}
                      <p
                        className="text-xs font-medium leading-snug line-clamp-2"
                        style={{
                          color: isSelected ? 'var(--text-heading)' : 'var(--text-body)',
                          marginBottom: '6px',
                        }}
                      >
                        {t.title}
                      </p>

                      {/* Row 3: dev name + AI confidence + SLA + module */}
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                          Dev: <strong className="text-heading">{t.assigned_dev_name || 'UNASSIGNED'}</strong>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {t.ai_confidence != null && (
                            <span className="text-amber-400 font-bold">
                              {Math.round(t.ai_confidence * 100)}%
                            </span>
                          )}
                          <span className="badge-module" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            {t.erp_module?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — ticket detail (fills rest, independently scrollable) */}
            <div
              className="flex-1 min-w-0 overflow-y-auto p-6"
              style={{ background: 'var(--bg-page)' }}
            >
              <JiraTicketView
                ticket={selectedTicket}
                onMergeDuplicate={handleMergeDuplicate}
                onAssignDeveloper={handleAssignDeveloper}
                onNavigateToErp={() => setCurrentView('DIGITALTWIN')}
                onTicketUpdated={async (updatedTicket) => {
                  // Optimistically merge the fresh incident the action returned, then
                  // re-fetch the authoritative list so every panel re-renders from the
                  // backend's current state (action -> backend -> refresh -> UI).
                  if (updatedTicket && typeof updatedTicket === 'object' && updatedTicket.id) {
                    setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
                    setSelectedTicketId(updatedTicket.id);
                  }
                  const refreshed = await api.fetchTickets().catch(() => null);
                  if (refreshed) setTickets(refreshed);
                }}
              />
            </div>
          </div>
        )}

        {/* ── All other views: standard padded container ── */}
        {!isTriage && (
          <main className="flex-1 px-6 py-6 pb-16 overflow-y-auto">

            {/* Developer Workbench & Copilot */}
            {currentView === 'DEVELOPER' && (
              <DeveloperWorkbench
                ticket={selectedTicket}
                onResolveTicket={handleResolveTicket}
              />
            )}

            {/* View 4: Executive Analytics & Workload Matrix */}
            {currentView === 'ADMIN' && (
              <div className="space-y-8">
                <ExecutiveDashboard tickets={tickets} developers={developers} />
                <DeveloperLoadBalancer
                  currentTicket={selectedTicket}
                  developers={developers}
                  onAssignDeveloper={handleAssignDeveloper}
                  onRebalanceLoad={handleRebalanceLoad}
                />
                <KnowledgeHub
                  knowledgeBase={knowledgeBase}
                  onAddArticle={handleAddKnowledgeArticle}
                />
              </div>
            )}

            {/* View 5: React Flow AI Execution Pipeline Visualizer */}
            {currentView === 'PIPELINE' && (
              <AIPipelineVisualizer ticket={selectedTicket} />
            )}

            {/* View 6: Enterprise War Room */}
            {currentView === 'WARROOM' && <WarRoom />}

            {/* View 7: ERP Digital Twin */}
            {currentView === 'DIGITALTWIN' && (
              <DigitalTwin
                onSelectTicket={(ticketId) => {
                  setSelectedTicketId(ticketId);
                  setCurrentView('TRIAGE');
                }}
              />
            )}

            {/* View 8: Mission Control Command Center */}
            {currentView === 'MISSIONCONTROL' && <MissionControl />}

            {/* View 9: Integration Hub */}
            {currentView === 'INTEGRATIONS' && <IntegrationHub />}
          </main>
        )}
      </div>
    </div>
  );
}
