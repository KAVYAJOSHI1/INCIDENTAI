import React from 'react';
import { ShieldAlert, GitMerge, FileText, CheckCircle2, User, Clock, AlertTriangle, Layers, BookOpen, ChevronRight } from 'lucide-react';

export default function JiraTicketView({ ticket, onMergeDuplicate, onAssignDeveloper }) {
  if (!ticket) return null;

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
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 flex flex-wrap items-center justify-between gap-4 shadow-lg shadow-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  pgvector Duplicate Engine Match ({ticket.duplicate_check.similarity_score * 100}%)
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                High similarity detected with existing ticket <code className="text-amber-300 font-mono font-bold">{ticket.duplicate_check.top_match?.ticket?.ticket_number || 'INC-8840'}</code>
              </p>
            </div>
          </div>

          <button
            onClick={() => onMergeDuplicate(ticket.id, ticket.duplicate_check.top_match?.ticket?.id)}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            <GitMerge className="w-4 h-4" /> Merge with Existing Ticket
          </button>
        </div>
      )}

      {/* Main Ticket Jira Card */}
      <div className="glass-panel p-6 border-indigo-500/30 space-y-6">
        {/* Ticket Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                {ticket.ticket_number || ticket.id}
              </span>
              <span className={severityBadgeClass}>
                {ticket.severity?.replace('_', ' ')}
              </span>
              <span className="badge-module">{ticket.erp_module}</span>
              <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-800 border border-white/10">
                STATUS: {ticket.status}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white leading-snug">{ticket.title}</h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>SLA Target: <strong className="text-white font-mono">{ticket.sla_remaining_minutes || 45} mins</strong></span>
          </div>
        </div>

        {/* User Vague Input vs AI Structured Specification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10">
            <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
              Initial Non-Technical User Report:
            </span>
            <p className="text-sm italic text-slate-300 font-sans">
              "{ticket.vague_user_input || 'No description provided.'}"
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <User className="w-3.5 h-3.5 text-slate-500" /> Reported by: <strong className="text-slate-300">{ticket.reporter}</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
            <span className="text-xs font-bold uppercase text-indigo-400 block mb-1">
              AI-Generated Structured Diagnostic (Jira Module 3):
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {ticket.structured_description}
            </p>
          </div>
        </div>

        {/* Steps to Reproduce */}
        <div>
          <h4 className="text-xs font-bold uppercase text-slate-300 mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" /> Steps to Reproduce Issue
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl border border-white/10 font-mono">
            {ticket.reproduction_steps?.map((step, idx) => (
              <li key={idx} className="leading-relaxed">{step}</li>
            )) || <li>Navigate to ERP module and trigger action</li>}
          </ol>
        </div>

        {/* Expected vs Actual Behavior */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <span className="font-bold text-emerald-400 block mb-1">Expected Outcome:</span>
            <p className="text-slate-300">{ticket.expected_behavior}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
            <span className="font-bold text-rose-400 block mb-1">Actual Observed Error:</span>
            <p className="text-slate-300">{ticket.actual_behavior}</p>
          </div>
        </div>

        {/* AI Predicted Root Cause & Suggested Patch */}
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-purple-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-400" /> AI Root Cause & Proposed Resolution Patch
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">
              CONFIDENCE: 96.4%
            </span>
          </div>

          <p className="text-xs text-slate-200 font-sans leading-relaxed">
            {ticket.ai_root_cause}
          </p>

          <pre className="bg-slate-950 p-3 rounded-lg border border-purple-500/30 text-emerald-400 text-xs font-mono overflow-x-auto">
            {ticket.ai_suggested_patch}
          </pre>
        </div>

        {/* RAG Knowledge Base Matching Articles (Module 5) */}
        {ticket.rag_kb_matches && ticket.rag_kb_matches.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-xs font-bold uppercase text-slate-300 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-cyan-400" /> RAG Knowledge Base Resolution Matches
            </h4>
            <div className="space-y-2">
              {ticket.rag_kb_matches.map((item, kIdx) => (
                <div key={kIdx} className="p-3 rounded-lg bg-slate-900/60 border border-white/10 flex items-center justify-between hover:border-cyan-500/30 transition-all text-xs">
                  <div>
                    <span className="font-bold text-cyan-300">{item.article.title}</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">{item.article.solution}</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold shrink-0">
                    {item.confidence_percentage}% Match
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
