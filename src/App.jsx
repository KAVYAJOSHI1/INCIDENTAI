import React, { useEffect, useState } from 'react';
import Sidebar from './components/Common/Sidebar';
import Header from './components/Common/Header';
import SmartReporter from './components/Reporter/SmartReporter';
import JiraTicketView from './components/Ticketing/JiraTicketView';
import DeveloperLoadBalancer from './components/LoadBalancer/DeveloperLoadBalancer';
import DeveloperWorkbench from './components/Workbench/DeveloperWorkbench';
import KnowledgeHub from './components/Knowledge/KnowledgeHub';
import ExecutiveDashboard from './components/Analytics/ExecutiveDashboard';
import AIPipelineVisualizer from './components/Pipeline/AIPipelineVisualizer';
import WarRoom from './components/Operations/WarRoom';
import DigitalTwin from './components/Operations/DigitalTwin';
import MissionControl from './components/Operations/MissionControl';

import * as api from './services/apiClient';
import { ShieldAlert, Loader2, Inbox, RefreshCw } from 'lucide-react';
import EmptyState from './components/Common/EmptyState';
import LoginScreen from './components/Auth/LoginScreen';
import { useAuth } from './context/AuthContext';
import { useTheme } from './hooks/useTheme';
import { VIEWS_BY_ROLE } from './constants/roles';

export default function App() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState('REPORTER');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [filterModule, setFilterModule] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const loadInitialData = React.useCallback(async ({ signal } = {}) => {
    setIsLoading(true);
    try {
      const [ticketsData, developersData, kbData] = await Promise.all([
        api.fetchTickets(),
        api.fetchDevelopers(),
        api.fetchKnowledgeBase()
      ]);
      if (signal?.cancelled) return;
      setTickets(ticketsData);
      setDevelopers(developersData);
      setKnowledgeBase(kbData);
      setSelectedTicketId(ticketsData[0]?.id ?? null);
      setLoadError(null);
    } catch (err) {
      if (!signal?.cancelled) setLoadError(err.message);
    } finally {
      if (!signal?.cancelled) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const signal = { cancelled: false };
    loadInitialData({ signal });
    return () => { signal.cancelled = true; };
  }, [user, loadInitialData]);

  const allowedViews = user ? VIEWS_BY_ROLE[user.role] : [];

  const handleSubmitIncident = async (inputPayload) => {
    try {
      const newTicket = await api.ingestIncident(inputPayload);
      setTickets((prev) => [newTicket, ...prev]);
      setSelectedTicketId(newTicket.id);
      if (allowedViews.includes('TRIAGE')) setCurrentView('TRIAGE');
      const refreshedDevelopers = await api.fetchDevelopers();
      setDevelopers(refreshedDevelopers);
    } catch (err) {
      alert(`Failed to ingest incident: ${err.message}`);
    }
  };

  const handleTriggerPreset = (moduleName) => {
    let text = "The billing button turned red when posting invoice for Customer #904 with ERR_TAX_VAL_402.";
    if (moduleName === 'PAYROLL') {
      text = "Payroll batch processing frozen at employee 450 with ERR_PAYROLL_DEADLOCK timeout!";
    } else if (moduleName === 'INVENTORY') {
      text = "Negative quantity violation ERR_STOCK_NEG when transferring SKU SK-902 in warehouse bin B4.";
    }
    handleSubmitIncident({ text, reporter: "Sample Scenario" });
  };

  const handleMergeDuplicate = async (sourceTicketId, targetTicketId) => {
    try {
      const updated = await api.patchTicket(sourceTicketId, { status: 'RESOLVED_DUPLICATE_MERGED' });
      setTickets((prev) => prev.map((t) => (t.id === sourceTicketId ? updated : t)));
      alert(`Ticket ${sourceTicketId} merged into parent ticket ${targetTicketId || 'INC-8840'}!`);
    } catch (err) {
      alert(`Failed to merge ticket: ${err.message}`);
    }
  };

  const handleAssignDeveloper = async (ticketId, devId) => {
    try {
      const updated = await api.patchTicket(ticketId, { assigned_dev_id: devId, status: 'ASSIGNED' });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      const refreshedDevelopers = await api.fetchDevelopers();
      setDevelopers(refreshedDevelopers);
    } catch (err) {
      alert(`Failed to assign developer: ${err.message}`);
    }
  };

  // Returns { reassignments, count } so DeveloperLoadBalancer can animate the result
  // in-panel instead of a blocking browser alert(); throws on failure so the caller
  // can surface that itself.
  const handleRebalanceLoad = async () => {
    const { reassignments, count } = await api.rebalanceLoad();
    const [refreshedTickets, refreshedDevelopers] = await Promise.all([api.fetchTickets(), api.fetchDevelopers()]);
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
      alert(`Failed to resolve ticket: ${err.message}`);
    }
  };

  const handleAddKnowledgeArticle = async (article) => {
    try {
      const saved = await api.addKnowledgeArticle(article);
      setKnowledgeBase((prev) => [saved, ...prev]);
    } catch (err) {
      alert(`Failed to save knowledge article: ${err.message}`);
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
          onTriggerPreset={handleTriggerPreset}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

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
                        ? 'Submit one from the Reporter to get started.'
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
                            {t.ticket_number}
                          </code>
                        </div>
                        <span
                          className={isP0 ? 'badge-p0' : isP1 ? 'badge-p1' : t.severity === 'P2_MEDIUM' ? 'badge-p2' : 'badge-p3'}
                          style={{ fontSize: '10px', padding: '1px 6px', flexShrink: 0 }}
                        >
                          {t.severity?.split('_')[0]}
                        </span>
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

                      {/* Row 3: dev name + module */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {t.assigned_dev_name || 'Unassigned'}
                        </span>
                        <span className="badge-module shrink-0" style={{ fontSize: '9px', padding: '1px 5px' }}>
                          {t.erp_module?.replace('_', ' ')}
                        </span>
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
              />
            </div>
          </div>
        )}

        {/* ── All other views: standard padded container ── */}
        {!isTriage && (
          <main className="flex-1 px-6 py-6 pb-16 overflow-y-auto">

            {/* View 1: End User Reporter */}
            {currentView === 'REPORTER' && (
              <SmartReporter onSubmitIncident={handleSubmitIncident} />
            )}

            {/* View 3: Developer Workbench & Copilot */}
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
            {currentView === 'DIGITALTWIN' && <DigitalTwin />}

            {/* View 8: Mission Control Command Center */}
            {currentView === 'MISSIONCONTROL' && <MissionControl />}
          </main>
        )}
      </div>
    </div>
  );
}
