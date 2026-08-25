import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Clock, FileText, Search, UserCheck, AlertCircle, Sparkles, ChevronRight, Inbox, HelpCircle } from 'lucide-react';
import EmptyState from '../Common/EmptyState';

export default function EndUserPortal({ tickets = [] }) {
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id || null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = filterStatus === 'ALL' ||
      (filterStatus === 'OPEN' && t.status !== 'RESOLVED') ||
      (filterStatus === 'RESOLVED' && t.status === 'RESOLVED');
    const matchesSearch = !searchQuery ||
      t.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.erp_module?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="surface p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="badge-module">
                <UserCheck className="w-3 h-3 inline mr-1" /> Self-Service & Incident Status
              </span>
            </div>
            <h1 className="text-xl font-bold text-heading">My Incidents & Resolution Center</h1>
            <p className="text-sm text-muted-color mt-1">
              Track incidents submitted from Smart Manufacturing ERP, view live investigation progress, and access self-service fix guidance.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="surface-muted px-3 py-2 rounded-lg text-center">
              <p className="text-xs text-muted-color">Open Incidents</p>
              <p className="text-lg font-bold text-heading">
                {tickets.filter((t) => t.status !== 'RESOLVED').length}
              </p>
            </div>
            <div className="surface-muted px-3 py-2 rounded-lg text-center">
              <p className="text-xs text-muted-color">Resolved</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {tickets.filter((t) => t.status === 'RESOLVED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ticket List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Controls */}
          <div className="surface p-3 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-color" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter my incidents..."
                className="input-field pl-9 pr-3 text-xs w-full"
                style={{ height: '32px' }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              {['ALL', 'OPEN', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition-all ${
                    filterStatus === st
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  style={{ height: '28px' }}
                >
                  {st === 'ALL' ? 'All Incidents' : st === 'OPEN' ? 'In Progress' : 'Resolved'}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No Incidents Found"
                description={
                  tickets.length === 0
                    ? 'No incidents submitted yet from ERP.'
                    : 'No tickets match the current filter.'
                }
                compact
              />
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const isResolved = t.status === 'RESOLVED';
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="w-full text-left surface p-3 transition-all cursor-pointer block rounded-lg border"
                    style={{
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                      background: isSelected ? 'var(--accent-subtle-bg)' : 'var(--bg-surface)'
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>
                          {t.ticket_number}
                        </code>
                        <span className="badge-module text-[10px] py-0.5 px-1.5">
                          {t.erp_module?.replace('_', ' ')}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {isResolved ? 'RESOLVED' : t.status || 'OPEN'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-heading line-clamp-1 mb-1">
                      {t.title}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-color mt-2">
                      <span>Assigned: {t.assigned_dev_name || 'Triage Engine'}</span>
                      <span>{t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Incident Guidance & Status */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="surface p-6 space-y-6">
              {/* Header Details */}
              <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono font-bold" style={{ color: 'var(--accent)' }}>
                      {selectedTicket.ticket_number}
                    </code>
                    <span className="badge-module">{selectedTicket.erp_module}</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        selectedTicket.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {selectedTicket.status === 'RESOLVED' ? 'Resolution Verified' : 'Under Investigation'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-heading mt-2">{selectedTicket.title}</h2>
                </div>
              </div>

              {/* Status Tracker */}
              <div className="surface-muted p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-color flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent-color" /> Incident Progress Timeline
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                    ✓ Ingested from ERP
                  </div>
                  <div className={`p-2 rounded font-semibold border ${
                    selectedTicket.assigned_dev_name
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                  }`}>
                    {selectedTicket.assigned_dev_name ? `Assigned to ${selectedTicket.assigned_dev_name}` : 'AI Triage Processing'}
                  </div>
                  <div className={`p-2 rounded font-semibold border ${
                    selectedTicket.status === 'RESOLVED'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-slate-500/10 text-muted-color border-slate-500/20'
                  }`}>
                    {selectedTicket.status === 'RESOLVED' ? '✓ Resolution Complete' : 'Resolution Pending'}
                  </div>
                </div>
              </div>

              {/* Problem Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-color">Reported Problem Text</h3>
                <div className="p-3 surface-muted rounded-md text-xs text-body-color leading-relaxed font-sans">
                  {selectedTicket.raw_text || selectedTicket.title}
                </div>
              </div>

              {/* Self-Service & AI Resolution Guidance */}
              <div className="callout callout-blue p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-color" />
                  <h3 className="text-sm font-bold text-heading">Self-Service Resolution Guidance</h3>
                </div>
                <p className="text-xs text-body-color leading-relaxed">
                  {selectedTicket.ai_root_cause
                    ? `AI Diagnosis: ${selectedTicket.ai_root_cause}`
                    : 'AI engine has triaged this incident and generated self-service fix steps for ERP operators below.'}
                </p>

                {selectedTicket.suggested_self_fix ? (
                  <div className="surface p-4 rounded-md space-y-2 border" style={{ borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold text-heading">
                      {selectedTicket.suggested_self_fix.title || 'Recommended Action'}
                    </h4>
                    <p className="text-xs text-muted-color">
                      {selectedTicket.suggested_self_fix.description}
                    </p>
                    {selectedTicket.suggested_self_fix.steps && (
                      <ol className="list-decimal list-inside text-xs space-y-1 mt-2 text-body-color">
                        {selectedTicket.suggested_self_fix.steps.map((st, idx) => (
                          <li key={idx}>{st}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                ) : (
                  <div className="surface p-4 rounded-md space-y-2 border" style={{ borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold text-heading">Standard Recovery Guidance</h4>
                    <ul className="list-disc list-inside text-xs text-muted-color space-y-1">
                      <li>Verify customer/SKU record values in ERP before re-submitting transaction.</li>
                      <li>Contact assigned developer <span className="font-semibold text-heading">{selectedTicket.assigned_dev_name || 'Support Engineer'}</span> for patch deployment status.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Backend Resolution Note if Resolved */}
              {selectedTicket.status === 'RESOLVED' && (
                <div className="callout callout-emerald p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Incident Resolved & Verified
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                      This incident has been resolved by the engineering team and verified against ERP facts.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="surface p-8 text-center text-muted-color">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select an incident from the left to view resolution guidance.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
