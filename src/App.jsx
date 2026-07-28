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

  // Submit New Multimodal Incident — runs the full AI pipeline on the backend
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

  // Trigger a quick-fill sample incident
  const handleTriggerPreset = (moduleName) => {
    let text = "The billing button turned red when posting invoice for Customer #904 with ERR_TAX_VAL_402.";
    if (moduleName === 'PAYROLL') {
      text = "Payroll batch processing frozen at employee 450 with ERR_PAYROLL_DEADLOCK timeout!";
    } else if (moduleName === 'INVENTORY') {
      text = "Negative quantity violation ERR_STOCK_NEG when transferring SKU SK-902 in warehouse bin B4.";
    }

    handleSubmitIncident({ text, reporter: "Sample Scenario" });
  };

  // Merge Duplicate Ticket
  const handleMergeDuplicate = async (sourceTicketId, targetTicketId) => {
    try {
      const updated = await api.patchTicket(sourceTicketId, { status: 'RESOLVED_DUPLICATE_MERGED' });
      setTickets((prev) => prev.map((t) => (t.id === sourceTicketId ? updated : t)));
      alert(`Ticket ${sourceTicketId} merged into parent ticket ${targetTicketId || 'INC-8840'}!`);
    } catch (err) {
      alert(`Failed to merge ticket: ${err.message}`);
    }
  };

  // Re-assign Developer
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

  // Auto Re-balance Team Load — reassigns lower-priority tickets away from devs overloaded by a P0
  const handleRebalanceLoad = async () => {
    try {
      const { reassignments, count } = await api.rebalanceLoad();
      const [refreshedTickets, refreshedDevelopers] = await Promise.all([api.fetchTickets(), api.fetchDevelopers()]);
      setTickets(refreshedTickets);
      setDevelopers(refreshedDevelopers);
      alert(
        count > 0
          ? `Re-balanced ${count} ticket(s):\n${reassignments.map((r) => `${r.ticket_number}: ${r.from_dev_name} -> ${r.to_dev_name}`).join('\n')}`
          : 'No re-balancing needed — no developer is currently overloaded by a P0 incident.'
      );
    } catch (err) {
      alert(`Failed to re-balance load: ${err.message}`);
    }
  };

  // Resolve Ticket
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        <p className="text-sm">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-color app-bg">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
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
        <p className="text-xs text-faint-color">Make sure it's running with <code className="text-accent-color">npm run server</code>.</p>
        <button onClick={() => loadInitialData()} className="btn-primary text-xs mt-1">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

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

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          user={user}
          onLogout={logout}
          theme={theme}
          onToggleTheme={toggleTheme}
          activeIncidentsCount={tickets.filter((t) => t.status !== 'RESOLVED').length}
          onTriggerPreset={handleTriggerPreset}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        {/* Main View Content Container */}
        <main className="flex-1 w-full px-4 sm:px-6 py-6 pb-16">
          {/* View 1: End User Reporter */}
          {currentView === 'REPORTER' && (
            <SmartReporter onSubmitIncident={handleSubmitIncident} />
          )}

          {/* View 2: Support Triage Feed & Jira View */}
          {currentView === 'TRIAGE' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Tickets Queue Feed (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="surface p-4 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-body-color flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[var(--accent)]" /> Triage Feed Queue ({filteredTicketsList.length})
                  </h3>

                  <select
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="input-field text-[11px] px-2 py-1"
                  >
                    <option value="ALL">All Modules</option>
                    <option value="INVOICING">Invoicing</option>
                    <option value="PAYROLL">Payroll</option>
                    <option value="INVENTORY">Inventory</option>
                    <option value="GENERAL_LEDGER">General Ledger</option>
                  </select>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[680px] pr-1">
                  {filteredTicketsList.length === 0 && (
                    <EmptyState
                      icon={Inbox}
                      title={tickets.length === 0 ? 'No Incidents Yet' : 'No Matching Incidents'}
                      description={tickets.length === 0 ? 'Submit one from the End-User Reporter to get started.' : `No tickets found for module "${filterModule}".`}
                      compact
                    />
                  )}
                  {filteredTicketsList.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    const isP0 = t.severity === 'P0_CRITICAL';

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`surface surface-interactive p-4 ${
                          isSelected
                            ? 'is-selected'
                            : isP0
                            ? 'border-rose-300 dark:border-rose-500/40'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono font-bold text-accent-color">{t.ticket_number}</span>
                          <span className={t.severity === 'P0_CRITICAL' ? 'badge-p0' : t.severity === 'P1_HIGH' ? 'badge-p1' : 'badge-p2'}>
                            {t.severity}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-heading line-clamp-2 leading-snug">{t.title}</h4>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-color">
                          <span>Dev: <strong className="text-body-color">{t.assigned_dev_name || 'Unassigned'}</strong></span>
                          <span className="badge-module text-[9px]">{t.erp_module}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Jira Ticket Detail (8 cols) */}
              <div className="lg:col-span-8">
                <JiraTicketView
                  ticket={selectedTicket}
                  onMergeDuplicate={handleMergeDuplicate}
                  onAssignDeveloper={handleAssignDeveloper}
                />
              </div>
            </div>
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
      </div>
    </div>
  );
}
