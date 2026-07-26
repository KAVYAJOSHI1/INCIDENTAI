import React, { useState } from 'react';
import Navbar from './components/Common/Navbar';
import SmartReporter from './components/Reporter/SmartReporter';
import JiraTicketView from './components/Ticketing/JiraTicketView';
import DeveloperLoadBalancer from './components/LoadBalancer/DeveloperLoadBalancer';
import DeveloperWorkbench from './components/Workbench/DeveloperWorkbench';
import KnowledgeHub from './components/Knowledge/KnowledgeHub';
import ExecutiveDashboard from './components/Analytics/ExecutiveDashboard';
import AIPipelineVisualizer from './components/Pipeline/AIPipelineVisualizer';

import { initialTickets, initialDevelopers, initialKnowledgeBase } from './store/mockDatabase';
import { processFullAIPipeline } from './services/aiService';
import { ShieldAlert, Sparkles, Filter, CheckCircle2, ArrowRight, Layers } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('REPORTER');
  const [tickets, setTickets] = useState(initialTickets);
  const [developers, setDevelopers] = useState(initialDevelopers);
  const [knowledgeBase, setKnowledgeBase] = useState(initialKnowledgeBase);
  const [selectedTicketId, setSelectedTicketId] = useState(initialTickets[0]?.id);
  const [filterModule, setFilterModule] = useState('ALL');

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  // Submit New Multimodal Incident
  const handleSubmitIncident = async (inputPayload) => {
    const newTicket = await processFullAIPipeline(inputPayload, { tickets, developers, knowledgeBase });
    
    // Add ticket to state
    setTickets((prev) => [newTicket, ...prev]);
    setSelectedTicketId(newTicket.id);

    // Update Developer Active Load
    if (newTicket.assigned_dev_id) {
      setDevelopers((prevDevs) =>
        prevDevs.map((dev) =>
          dev.id === newTicket.assigned_dev_id
            ? { ...dev, active_tickets: dev.active_tickets + 1 }
            : dev
        )
      );
    }

    // Switch to Support Triage Feed
    setCurrentRole('TRIAGE');
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
  const handleMergeDuplicate = (sourceTicketId, targetTicketId) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === sourceTicketId ? { ...t, status: 'RESOLVED (DUPLICATE MERGED)' } : t))
    );
    alert(`Ticket ${sourceTicketId} merged into parent ticket ${targetTicketId || 'INC-8840'}!`);
  };

  // Re-assign Developer
  const handleAssignDeveloper = (ticketId, devId) => {
    const targetDev = developers.find((d) => d.id === devId);
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, assigned_dev_id: devId, assigned_dev_name: targetDev ? targetDev.name : t.assigned_dev_name, status: 'ASSIGNED' }
          : t
      )
    );
  };

  // Auto Re-balance Team Load
  const handleRebalanceLoad = () => {
    setDevelopers((prev) =>
      prev.map((dev) => ({
        ...dev,
        active_tickets: Math.max(1, Math.floor(Math.random() * 4))
      }))
    );
    alert("Developer workload re-balanced across engineering team!");
  };

  // Resolve Ticket
  const handleResolveTicket = (ticketId) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'RESOLVED' } : t))
    );

    if (targetTicket && targetTicket.assigned_dev_id) {
      setDevelopers((prevDevs) =>
        prevDevs.map((dev) =>
          dev.id === targetTicket.assigned_dev_id
            ? { ...dev, active_tickets: Math.max(0, dev.active_tickets - 1) }
            : dev
        )
      );
    }
  };

  const filteredTicketsList = tickets.filter((t) => {
    if (filterModule === 'ALL') return true;
    return t.erp_module === filterModule;
  });

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
              onAddArticle={(art) => setKnowledgeBase((prev) => [art, ...prev])}
            />
          </div>
        )}

        {/* Role 5: React Flow AI Execution Pipeline Visualizer */}
        {currentRole === 'PIPELINE' && (
          <AIPipelineVisualizer />
        )}
      </main>
    </div>
  );
}
