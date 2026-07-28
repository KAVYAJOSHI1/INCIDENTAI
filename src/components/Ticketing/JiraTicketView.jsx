import React from 'react';
import { ShieldAlert, GitMerge, FileText, CheckCircle2, User, Clock, AlertTriangle, Layers, BookOpen, ChevronRight, FileSearch } from 'lucide-react';
import AIInsightsPanel from './AIInsightsPanel';
import EmptyState from '../Common/EmptyState';

export default function JiraTicketView({ ticket, onMergeDuplicate, onAssignDeveloper }) {
  if (!ticket) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No Ticket Selected"
        description="Select an incident from the Triage Feed Queue on the left, or submit a new one from the End-User Reporter."
      />
    );
  }

  const severityBadgeClass = {
    P0_CRITICAL: 'badge-p0',
    P1_HIGH: 'badge-p1',
    P2_MEDIUM: 'badge-p2',
    P3_LOW: 'badge-p3'
  }[ticket.severity] || 'badge-p2';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Duplicate Detection Alert Banner (Module 4) */}
      {ticket.duplicate_check?.is_duplicate && (
        <div className="callout callout-amber p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Duplicate Engine Match ({Math.round(ticket.duplicate_check.similarity_score * 100)}%)
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ticket.duplicate_check.ai_generated ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : 'surface-muted text-muted-color'}`}>
                  {ticket.duplicate_check.ai_generated ? 'CLAUDE' : 'TF-IDF'}
                </span>
              </div>
              <p className="text-sm font-semibold text-heading mt-0.5">
                High similarity detected with existing ticket <code className="font-mono font-bold">{ticket.duplicate_check.top_match?.ticket?.ticket_number || 'INC-8840'}</code>
              </p>
              {ticket.duplicate_check.reasoning && (
                <p className="text-xs italic mt-1 opacity-80">"{ticket.duplicate_check.reasoning}"</p>
              )}
            </div>
          </div>

          <button
            onClick={() => onMergeDuplicate(ticket.id, ticket.duplicate_check.top_match?.ticket?.id)}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <GitMerge className="w-4 h-4" /> Merge with Existing Ticket
          </button>
        </div>
      )}

      {/* Main Ticket Jira Card */}
      <div className="surface p-6 space-y-6">
        {/* Ticket Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono font-bold text-accent-color bg-[var(--accent-soft-bg)] px-2 py-0.5 rounded border" style={{ borderColor: 'var(--accent-soft-border)' }}>
                {ticket.ticket_number || ticket.id}
              </span>
              <span className={severityBadgeClass}>
                {ticket.severity?.replace('_', ' ')}
              </span>
              <span className="badge-module">{ticket.erp_module}</span>
              <span className="text-xs text-body-color font-medium px-2 py-0.5 rounded surface-muted">
                STATUS: {ticket.status}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-heading leading-snug">{ticket.title}</h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-color">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span>SLA Target: <strong className="text-heading font-mono">{ticket.sla_remaining_minutes || 45} mins</strong></span>
          </div>
        </div>

        {/* User Vague Input vs AI Structured Specification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface-muted p-4">
            <span className="text-xs font-bold uppercase text-muted-color block mb-1">
              Initial Non-Technical User Report:
            </span>
            <p className="text-sm italic text-body-color font-sans">
              "{ticket.vague_user_input || 'No description provided.'}"
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-color">
              <User className="w-3.5 h-3.5" /> Reported by: <strong className="text-body-color">{ticket.reporter}</strong>
            </div>
          </div>

          <div className="callout callout-blue p-4">
            <span className="text-xs font-bold uppercase block mb-1">
              AI-Generated Structured Diagnostic (Jira Module 3):
            </span>
            <p className="text-xs leading-relaxed font-sans opacity-90">
              {ticket.structured_description}
            </p>
          </div>
        </div>

        {/* Steps to Reproduce */}
        <div>
          <h4 className="text-xs font-bold uppercase text-body-color mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[var(--accent)]" /> Steps to Reproduce Issue
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-xs text-body-color surface-muted p-3.5 font-mono">
            {ticket.reproduction_steps?.map((step, idx) => (
              <li key={idx} className="leading-relaxed">{step}</li>
            )) || <li>Navigate to ERP module and trigger action</li>}
          </ol>
        </div>

        {/* Expected vs Actual Behavior */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="callout callout-emerald p-3.5">
            <span className="font-bold block mb-1">Expected Outcome:</span>
            <p className="opacity-90">{ticket.expected_behavior}</p>
          </div>

          <div className="callout callout-rose p-3.5">
            <span className="font-bold block mb-1">Actual Observed Error:</span>
            <p className="opacity-90">{ticket.actual_behavior}</p>
          </div>
        </div>

        {/* AI Predicted Root Cause & Suggested Patch */}
        <div className="callout callout-purple p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> AI Root Cause & Proposed Resolution Patch
            </span>
            <span className="text-[10px] bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded font-mono font-bold">
              CONFIDENCE: 96.4%
            </span>
          </div>

          <p className="text-xs font-sans leading-relaxed opacity-90">
            {ticket.ai_root_cause}
          </p>

          <pre className="bg-[var(--bg-surface)] p-3 rounded-lg border text-emerald-600 dark:text-emerald-400 text-xs font-mono overflow-x-auto" style={{ borderColor: 'var(--border-default)' }}>
            {ticket.ai_suggested_patch}
          </pre>
        </div>

        {/* RAG Knowledge Base Matching Articles (Module 5) */}
        {ticket.rag_kb_matches && ticket.rag_kb_matches.length > 0 && (
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <h4 className="text-xs font-bold uppercase text-body-color mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> RAG Knowledge Base Resolution Matches
            </h4>
            <div className="space-y-2">
              {ticket.rag_kb_matches.map((item, kIdx) => (
                <div key={kIdx} className="surface-muted p-3 text-xs hover:border-cyan-300 dark:hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-cyan-700 dark:text-cyan-300">{item.article.title}</span>
                      <p className="text-muted-color text-[11px] mt-0.5">{item.article.solution}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.ai_generated ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : 'text-muted-color'}`}>
                        {item.ai_generated ? 'CLAUDE' : 'TF-IDF'}
                      </span>
                      <span className="px-2 py-1 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 font-mono font-bold">
                        {item.confidence_percentage}% Match
                      </span>
                    </div>
                  </div>
                  {item.why_relevant && (
                    <p className="text-cyan-700/70 dark:text-cyan-200/70 text-[11px] italic mt-1.5 pt-1.5 border-t" style={{ borderColor: 'var(--border-default)' }}>"{item.why_relevant}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enterprise 10-Feature Roadmap: AI Insights Panel */}
      <AIInsightsPanel ticket={ticket} />
    </div>
  );
}
