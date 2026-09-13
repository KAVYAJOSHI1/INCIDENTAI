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
import { ShieldAlert, Loader2, Inbox, RefreshCw, X, Bell } from 'lucide-react';
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
  const [currentSubpage, setCurrentSubpage] = useState('overview');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [filterModule, setFilterModule] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [incidentToast, setIncidentToast] = useState(null); // { id, ticket_number, erp_module }
  const knownTicketIdsRef = React.useRef(null);

  const showError = (msg) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(null), 5000); };

  // Parse path for /incident/:ticketId/:subpage or hash #/incident/:ticketId/:subpage
  const parseRouteFromUrl = React.useCallback(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/incident\/([^\/]+)(?:\/([^\/]+))?/);
    if (match) {
      return { ticketId: match[1], subpage: match[2] || 'overview' };
    }
    const hash = window.location.hash;
    const hashMatch = hash.match(/^#\/incident\/([^\/]+)(?:\/([^\/]+))?/);
    if (hashMatch) {
      return { ticketId: hashMatch[1], subpage: hashMatch[2] || 'overview' };
    }
    return null;
  }, []);

  const navigateToSubpage = (ticketId, subpage = 'overview') => {
    if (!ticketId) return;
    const newPath = `/incident/${ticketId}/${subpage}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ ticketId, subpage }, '', newPath);
    }
    setSelectedTicketId(ticketId);
    setCurrentSubpage(subpage);
    setIsWorkspaceOpen(true);
    setCurrentView('TRIAGE');
  };

  const closeWorkspaceAndReturnToQueue = () => {
    setIsWorkspaceOpen(false);
    if (window.location.pathname.startsWith('/incident/')) {
      window.history.pushState({}, '', '/triage');
    }
  };

  // Sync route on popstate (browser back/forward) & initial render
  useEffect(() => {
    const route = parseRouteFromUrl();
    if (route) {
      if (route.ticketId) setSelectedTicketId(route.ticketId);
      if (route.subpage) setCurrentSubpage(route.subpage);
      setIsWorkspaceOpen(true);
      setCurrentView('TRIAGE');
    }

    const handlePopState = () => {
      const r = parseRouteFromUrl();
      if (r) {
        if (r.ticketId) setSelectedTicketId(r.ticketId);
        if (r.subpage) setCurrentSubpage(r.subpage);
        setIsWorkspaceOpen(true);
        setCurrentView('TRIAGE');
      } else {
        setIsWorkspaceOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseRouteFromUrl]);

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

      // Live incident notification: on a background poll, surface any incident that
      // wasn't in the queue a moment ago (e.g. just triggered from the Digital Twin).
      const currentIds = new Set(ticketsData.map((t) => t.id));
      if (knownTicketIdsRef.current && !isInitial) {
        const fresh = ticketsData.filter((t) => !knownTicketIdsRef.current.has(t.id));
        if (fresh.length > 0) {
          const t = fresh[0];
          setIncidentToast({ id: t.id, ticket_number: t.ticket_number || t.id, erp_module: t.erp_module });
        }
      }
      knownTicketIdsRef.current = currentIds;

      setTickets(ticketsData);
      setDevelopers(developersData);
      setKnowledgeBase(kbData);

      // Preserve route ticketId if user loaded /incident/:id/:subpage directly
      const route = parseRouteFromUrl();
      const initialId = route?.ticketId || ticketsData[0]?.id || null;
      setSelectedTicketId((prev) => prev || initialId);
      if (route?.subpage) setCurrentSubpage(route.subpage);
      if (route?.ticketId) setIsWorkspaceOpen(true);
      setLoadError(null);
    } catch (err) {
      if (!signal?.cancelled) setLoadError(err.message);
    } finally {
      if (isInitial && !signal?.cancelled) setIsLoading(false);
    }
  }, [user?.role, parseRouteFromUrl]);

  useEffect(() => {
    if (!user) return undefined;
    const signal = { cancelled: false };
    loadInitialData({ signal, isInitial: true });

    // Poll for real-time sync — faster while the presenter is on the queue or the ERP
    // console so a freshly-triggered incident shows up almost immediately.
    const pollMs = (currentView === 'TRIAGE' || currentView === 'DIGITALTWIN') ? 5000 : 10000;
    const interval = setInterval(() => {
      loadInitialData({ signal, isInitial: false });
    }, pollMs);

    return () => {
      signal.cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id, loadInitialData, currentView]);

  useEffect(() => {
    if (!incidentToast) return undefined;
    const t = setTimeout(() => setIncidentToast(null), 9000);
    return () => clearTimeout(t);
  }, [incidentToast]);

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
        setCurrentView={(view) => {
          if (view === 'TRIAGE') {
            closeWorkspaceAndReturnToQueue();
            setCurrentView('TRIAGE');
          } else {
            setCurrentView(view);
          }
          setIsMobileNavOpen(false);
        }}
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

        {/* Live incident notification — a new incident just landed in the queue */}
        {incidentToast && (
          <button
            onClick={() => {
              navigateToSubpage(incidentToast.id, 'overview');
              setIncidentToast(null);
            }}
            className="fixed bottom-5 right-5 z-50 max-w-sm text-left rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 fade-in"
            style={{ background: 'var(--bg-surface)', borderColor: 'rgba(239,68,68,0.35)' }}
          >
            <span className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-rose-500" />
            </span>
            <span className="min-w-0">
              <span className="text-xs font-bold text-heading block">New incident from {incidentToast.erp_module}</span>
              <span className="text-[11px] text-muted-color font-mono">{incidentToast.ticket_number} · click to open workspace</span>
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); setIncidentToast(null); }}
              className="text-muted-color hover:text-heading shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        {/* ── TRIAGE VIEW: Queue List vs Dedicated Workspace ── */}
        {isTriage && (
          <div className="flex-1 min-w-0 overflow-y-auto p-6" style={{ background: 'var(--bg-page)' }}>
            {!isWorkspaceOpen ? (
              /* ── INCIDENT QUEUE FULL-PAGE LIST ── */
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="surface p-6 rounded-2xl border border-[var(--border)] shadow-md flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-subtle-bg border border-accent-subtle-bd flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-accent-color" />
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-heading flex items-center gap-2">
                        Incident Queue
                        <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {filteredTicketsList.length} Active
                        </span>
                      </h1>
                      <p className="text-xs text-muted-color mt-0.5">
                        Select an operational incident below to open its dedicated Incident Workspace.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-color">Filter Module:</span>
                    <select
                      value={filterModule}
                      onChange={(e) => setFilterModule(e.target.value)}
                      className="input-field text-xs py-1.5 px-3 font-semibold text-heading bg-surface border border-[var(--border)] rounded-xl"
                    >
                      <option value="ALL">All Modules</option>
                      <option value="INVOICING">Invoicing</option>
                      <option value="PAYROLL">Payroll</option>
                      <option value="INVENTORY">Inventory</option>
                      <option value="GENERAL_LEDGER">General Ledger</option>
                    </select>
                  </div>
                </div>

                {filteredTicketsList.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title={tickets.length === 0 ? 'No Incidents Yet' : 'No Matches'}
                    description={
                      tickets.length === 0
                        ? 'Trigger an ERP transaction from the Digital Twin console to create one.'
                        : `No tickets for module "${filterModule}".`
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTicketsList.map((t) => {
                      const isP0 = t.severity === 'P0_CRITICAL';
                      const isP1 = t.severity === 'P1_HIGH';
                      const sevBadge = isP0 ? 'badge-p0' : isP1 ? 'badge-p1' : t.severity === 'P2_MEDIUM' ? 'badge-p2' : 'badge-p3';

                      return (
                        <button
                          key={t.id}
                          onClick={() => navigateToSubpage(t.id, 'overview')}
                          className="surface p-5 rounded-2xl border border-[var(--border)] shadow-sm hover:border-[var(--accent)] hover:shadow-md transition-all text-left group flex flex-col justify-between space-y-4 cursor-pointer"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg bg-accent-subtle-bg text-accent-subtle-text border border-accent-subtle-bd group-hover:bg-accent-color group-hover:text-white transition-colors">
                                {t.ticket_number || t.id}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  t.status === 'RESOLVED' || t.status === 'VERIFIED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : t.status === 'VERIFICATION_FAILED'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {STATUS_LABELS[t.remediation_status || t.status] || t.status}
                                </span>
                                <span className={`${sevBadge} text-[10px] font-mono px-2 py-0.5 rounded`}>
                                  {t.severity?.split('_')[0]}
                                </span>
                              </div>
                            </div>

                            <h3 className="text-sm font-bold text-heading leading-snug group-hover:text-accent-color transition-colors line-clamp-2">
                              {t.title}
                            </h3>
                          </div>

                          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-muted-color">
                            <span className="truncate">
                              Dev: <strong className="text-heading">{t.assigned_dev_name || 'UNASSIGNED'}</strong>
                            </span>
                            <span className="badge-module text-[10px]">
                              {t.erp_module}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ── DEDICATED INCIDENT WORKSPACE (FULL WIDTH, NO QUEUE COLUMN) ── */
              <JiraTicketView
                ticket={selectedTicket}
                userRole={user?.role}
                currentUser={user}
                currentView={currentView}
                developers={developers}
                currentSubpage={currentSubpage}
                onNavigateSubpage={(subpage) => navigateToSubpage(selectedTicket?.id || selectedTicketId, subpage)}
                onBackToQueue={closeWorkspaceAndReturnToQueue}
                onMergeDuplicate={handleMergeDuplicate}
                onAssignDeveloper={handleAssignDeveloper}
                onNavigateToErp={() => setCurrentView('DIGITALTWIN')}
                onTicketUpdated={async (updatedTicket) => {
                  if (updatedTicket && typeof updatedTicket === 'object' && updatedTicket.id) {
                    setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
                    setSelectedTicketId(updatedTicket.id);
                  }
                  const refreshed = await api.fetchTickets().catch(() => null);
                  if (refreshed) setTickets(refreshed);
                }}
              />
            )}
          </div>
        )}

        {/* ── All other views: standard padded container ── */}
        {!isTriage && (
          <main className="flex-1 px-6 py-6 pb-16 overflow-y-auto">

            {/* Developer Workbench & Copilot */}
            {currentView === 'DEVELOPER' && (
              <DeveloperWorkbench
                ticket={selectedTicket}
                currentUser={user}
                developers={developers}
                onAssignDeveloper={handleAssignDeveloper}
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

            {/* View: Dedicated Knowledge Hub */}
            {currentView === 'KNOWLEDGE' && (
              <KnowledgeHub
                knowledgeBase={knowledgeBase}
                onAddArticle={handleAddKnowledgeArticle}
              />
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
                  if (ticketId) navigateToSubpage(ticketId, 'overview');
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
