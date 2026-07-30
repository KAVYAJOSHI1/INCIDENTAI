import React from 'react';
import {
  ShieldAlert, GitMerge, CheckCircle2, User, Clock,
  AlertTriangle, Layers, BookOpen, FileSearch, Terminal, Sparkles
} from 'lucide-react';
import AIInsightsPanel from './AIInsightsPanel';
import EmptyState from '../Common/EmptyState';

const SEV_BADGE = {
  P0_CRITICAL: 'badge-p0',
  P1_HIGH:     'badge-p1',
  P2_MEDIUM:   'badge-p2',
  P3_LOW:      'badge-p3',
};

function InfoRow({ label, children }) {
  return (
    <div className="flex items-start gap-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="w-40 shrink-0 text-xs font-medium text-muted-color">{label}</span>
      <div className="flex-1 text-sm text-heading">{children}</div>
    </div>
  );
}

export default function JiraTicketView({ ticket, onMergeDuplicate, onAssignDeveloper }) {
  if (!ticket) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No Ticket Selected"
        description="Select an incident from the Triage Feed to view its details."
      />
    );
  }

  const sevClass = SEV_BADGE[ticket.severity] || 'badge-p2';
  const confidence = ticket.ai_confidence != null
    ? `${Math.round(ticket.ai_confidence * 100)}%`
    : '—';

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {/* Duplicate Alert */}
      {ticket.duplicate_check?.is_duplicate && (
        <div className="callout callout-amber flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                Duplicate detected — {Math.round(ticket.duplicate_check.similarity_score * 100)}% similarity
                {' '}with <code className="font-mono font-bold">
                  {ticket.duplicate_check.top_match?.ticket?.ticket_number || 'INC-8840'}
                </code>
                <span className="ml-2 text-xs font-normal opacity-75">
                  via {ticket.duplicate_check.ai_generated ? 'Claude AI' : 'TF-IDF'}
                </span>
              </p>
              {ticket.duplicate_check.reasoning && (
                <p className="text-xs opacity-75 mt-0.5">"{ticket.duplicate_check.reasoning}"</p>
              )}
            </div>
          </div>
          <button
            onClick={() => onMergeDuplicate(ticket.id, ticket.duplicate_check.top_match?.ticket?.id)}
            className="btn-secondary text-xs shrink-0"
            style={{ borderColor: 'var(--amber-border)' }}
          >
            <GitMerge className="w-3.5 h-3.5" />
            Merge Duplicate
          </button>
        </div>
      )}

      {/* Main Ticket Card */}
      <div className="surface">

        {/* Ticket Header */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <code
              className="text-xs font-mono font-bold px-2 py-0.5 rounded"
              style={{
                background: 'var(--accent-subtle-bg)',
                color: 'var(--accent-subtle-text)',
                border: '1px solid var(--accent-subtle-bd)'
              }}
            >
              {ticket.ticket_number || ticket.id}
            </code>
            <span className={sevClass}>{ticket.severity?.replace('_', ' ')}</span>
            <span className="badge-module">{ticket.erp_module}</span>
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {ticket.status}
            </span>
          </div>
          <h2 className="text-base font-semibold text-heading leading-snug">{ticket.title}</h2>
        </div>

        {/* Meta rows */}
        <div className="px-6 py-1">
          <InfoRow label="SLA Remaining">
            <span className="flex items-center gap-1.5 font-mono font-semibold">
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              {ticket.sla_remaining_minutes || 45} min
            </span>
          </InfoRow>
          <InfoRow label="Reporter">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-color" />
              {ticket.reporter}
            </span>
          </InfoRow>
          <InfoRow label="Assigned Developer">
            <strong>{ticket.assigned_dev_name || '—'}</strong>
          </InfoRow>
          <InfoRow label="AI Confidence">
            <span
              className="font-mono text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--green-bg)', color: 'var(--green-text)', border: '1px solid var(--green-border)' }}
            >
              {confidence}
            </span>
          </InfoRow>
        </div>

        {/* User Input vs AI Spec */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-2">User Report</p>
              <div className="surface-muted p-4 rounded-lg">
                <p className="text-sm italic text-body-color leading-relaxed">
                  "{ticket.vague_user_input || 'No description provided.'}"
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                AI-Structured Description
              </p>
              <div className="callout callout-blue p-4 rounded-lg">
                <p className="text-xs leading-relaxed">{ticket.structured_description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Steps to Reproduce */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            Steps to Reproduce
          </p>
          <ol className="surface-muted p-4 rounded-lg list-decimal list-inside space-y-1.5">
            {(ticket.reproduction_steps?.length > 0
              ? ticket.reproduction_steps
              : ['Navigate to the ERP module and trigger the reported action']
            ).map((step, i) => (
              <li key={i} className="text-xs text-body-color font-mono leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>

        {/* Expected vs Actual */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-2">Expected</p>
              <div className="callout callout-green p-3.5 text-xs leading-relaxed">{ticket.expected_behavior}</div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-2">Actual</p>
              <div className="callout callout-rose p-3.5 text-xs leading-relaxed">{ticket.actual_behavior}</div>
            </div>
          </div>
        </div>

        {/* Root Cause & Patch */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" style={{ color: 'var(--purple)' }} />
            AI Root Cause & Proposed Patch
          </p>
          <div className="callout callout-purple space-y-3">
            <p className="text-xs leading-relaxed">{ticket.ai_root_cause}</p>
            <pre
              className="p-4 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--green)'
              }}
            >
              {ticket.ai_suggested_patch}
            </pre>
          </div>
        </div>

        {/* RAG Knowledge Matches */}
        {ticket.rag_kb_matches?.length > 0 && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              Knowledge Base Matches
            </p>
            <div className="space-y-2">
              {ticket.rag_kb_matches.map((item, i) => (
                <div
                  key={i}
                  className="surface-muted p-3.5 rounded-lg flex items-start justify-between gap-3"
                  style={{ transition: 'background 0.1s' }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-heading">{item.article.title}</p>
                    <p className="text-xs text-muted-color mt-0.5 leading-relaxed">{item.article.solution}</p>
                    {item.why_relevant && (
                      <p className="text-xs italic mt-1 text-muted-color opacity-80">"{item.why_relevant}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.ai_generated !== undefined && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.ai_generated ? 'badge-green' : 'badge-p3'}`}>
                        {item.ai_generated ? 'Claude' : 'TF-IDF'}
                      </span>
                    )}
                    <span
                      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded"
                      style={{ background: 'var(--accent-subtle-bg)', color: 'var(--accent-subtle-text)', border: '1px solid var(--accent-subtle-bd)' }}
                    >
                      {item.confidence_percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Insights */}
      <AIInsightsPanel ticket={ticket} />
    </div>
  );
}
