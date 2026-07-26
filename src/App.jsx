import React, { useEffect, useState } from 'react';
import Navbar from './components/Common/Navbar';
import SmartReporter from './components/Reporter/SmartReporter';
import JiraTicketView from './components/Ticketing/JiraTicketView';
import DeveloperLoadBalancer from './components/LoadBalancer/DeveloperLoadBalancer';
import DeveloperWorkbench from './components/Workbench/DeveloperWorkbench';
import KnowledgeHub from './components/Knowledge/KnowledgeHub';
import ExecutiveDashboard from './components/Analytics/ExecutiveDashboard';
import AIPipelineVisualizer from './components/Pipeline/AIPipelineVisualizer';

import * as api from './services/apiClient';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('REPORTER');
  const [tickets, setTickets] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [filterModule, setFilterModule] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [ticketsData, developersData, kbData] = await Promise.all([
          api.fetchTickets(),
          api.fetchDevelopers(),
          api.fetchKnowledgeBase()
        ]);
        if (cancelled) return;
        setTickets(ticketsData);
        setDevelopers(developersData);
        setKnowledgeBase(kbData);
        setSelectedTicketId(ticketsData[0]?.id ?? null);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // Submit New Multimodal Incident — runs the full AI pipeline on the backend
  const handleSubmitIncident = async (inputPayload) => {
    try {
      const newTicket = await api.ingestIncident(inputPayload);
      setTickets((prev) => [newTicket, ...prev]);
      setSelectedTicketId(newTicket.id);
      setCurrentRole('TRIAGE');
      const refreshedDevelopers = await api.fetchDevelopers();
      setDevelopers(refreshedDevelopers);
    } catch (err) {
      alert(`Failed to ingest incident: ${err.message}`);
    }
  };

  // Trigger Hackathon Demo Preset
  const handleTriggerPreset = (moduleName) => {
    let text = "The billing button turned red when posting invoice for Customer #904 with ERR_TAX_VAL_402.";
    if (moduleName === 'PAYROLL') {
      text = "Payroll batch processing frozen at employee 450 with ERR_PAYROLL_DEADLOCK timeout!";
    } else if (moduleName === 'INVENTORY') {
      text = "Negative quantity violation ERR_STOCK_NEG when transferring SKU SK-902 in warehouse bin B4.";
    }

    handleSubmitIncident({ text, reporter: "Hackathon Judge Demo" });
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm">Connecting to IncidentAI backend...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
        <ShieldAlert className="w-10 h-10 text-rose-400" />
        <h2 className="text-lg font-bold text-white">Cannot reach the IncidentAI backend</h2>
        <p className="text-sm text-slate-400 max-w-md">{loadError}</p>
        <p className="text-xs text-slate-500">Make sure it's running with <code className="text-indigo-300">npm run server</code>, then reload this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-12">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        activeIncidentsCount={tickets.filter((t) => t.status !== 'RESOLVED').length}
        onTriggerPreset={handleTriggerPreset}
      />

      {/* Main Role Content Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6">
        {/* Role 1: End User Reporter */}
        {currentRole === 'REPORTER' && (
          <SmartReporter onSubmitIncident={handleSubmitIncident} />
        )}

        {/* Role 2: Support Triage Feed & Jira View */}
        {currentRole === 'TRIAGE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Tickets Queue Feed (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-panel p-4 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" /> Triage Feed Queue ({filteredTicketsList.length})
                </h3>

                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="bg-slate-900 border border-white/10 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="ALL">All Modules</option>
                  <option value="INVOICING">Invoicing</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="INVENTORY">Inventory</option>
                  <option value="GENERAL_LEDGER">General Ledger</option>
                </select>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[680px] pr-1">
                {filteredTicketsList.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  const isP0 = t.severity === 'P0_CRITICAL';

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`glass-card-interactive p-4 border transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10'
                          : isP0
                          ? 'border-rose-500/50 bg-rose-950/10'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-mono font-bold text-indigo-400">{t.ticket_number}</span>
                        <span className={t.severity === 'P0_CRITICAL' ? 'badge-p0' : t.severity === 'P1_HIGH' ? 'badge-p1' : 'badge-p2'}>
                          {t.severity}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">{t.title}</h4>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Dev: <strong className="text-slate-300">{t.assigned_dev_name || 'Unassigned'}</strong></span>
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

        {/* Role 3: Developer Workbench & Copilot */}
        {currentRole === 'DEVELOPER' && (
          <DeveloperWorkbench
            ticket={selectedTicket}
            onResolveTicket={handleResolveTicket}
          />
        )}

        {/* Role 4: Executive Analytics & Workload Matrix */}
        {currentRole === 'ADMIN' && (
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

        {/* Role 5: React Flow AI Execution Pipeline Visualizer */}
        {currentRole === 'PIPELINE' && (
          <AIPipelineVisualizer ticket={selectedTicket} />
        )}
      </main>
    </div>
  );
}
