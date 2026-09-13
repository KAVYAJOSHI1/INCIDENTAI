import React from 'react';
import { Database, BookOpen, Sparkles, Stethoscope, UserCheck, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Compact "AI Investigation Pipeline" shown at the top of the incident workspace on every
 * tab. Plain-language labels sit alongside the technical ones so a first-time viewer can
 * follow the flow. The current stage is derived from the incident's persisted status.
 */

const STAGES = [
  { key: 'ERP',      tech: 'ERP FAILURE',              plain: 'What broke',                 icon: AlertTriangle },
  { key: 'MCP',      tech: 'CURRENT ERP FACTS (MCP)',  plain: 'Reads live ERP data now',    icon: Database },
  { key: 'RAG',      tech: 'PAST KNOWLEDGE (RAG)',     plain: 'Searches previous incidents', icon: BookOpen },
  { key: 'LLM',      tech: 'AI REASONING (LLM)',       plain: 'Combines facts + history',    icon: Sparkles },
  { key: 'DIAG',     tech: 'DIAGNOSIS',                plain: 'Likely cause + fix',          icon: Stethoscope },
  { key: 'APPROVE',  tech: 'HUMAN APPROVAL',           plain: 'Developer signs off',         icon: UserCheck },
  { key: 'VERIFY',   tech: 'VERIFICATION',             plain: 'Did the fix work?',           icon: ShieldCheck },
  { key: 'DONE',     tech: 'RESOLVED',                 plain: 'Applied & closed',            icon: CheckCircle2 }
];

// status -> index of the *current* (in-progress) stage
function currentStageIndex(status) {
  const s = (status || '').toUpperCase();
  if (['RESOLVED', 'VERIFIED', 'KNOWLEDGE_CAPTURED', 'APPLIED'].includes(s)) return 7;
  if (['VERIFICATION', 'VERIFICATION_FAILED', 'ROLLED_BACK', 'ROLLBACK_REQUIRED'].includes(s)) return 6;
  if (s === 'APPROVED') return 5;
  if (['TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'REMEDIATION_PENDING', 'NEW', 'REOPENED'].includes(s)) return 4;
  return 4;
}

export default function PipelineStrip({ ticket }) {
  if (!ticket) return null;
  const status = ticket.status || 'NEW';
  const isFailure = ['VERIFICATION_FAILED', 'ROLLED_BACK', 'ROLLBACK_REQUIRED'].includes((status || '').toUpperCase());
  const cur = currentStageIndex(status);

  return (
    <div className="surface p-4 rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-heading flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Investigation Pipeline
        </h3>
        <span className="text-[10px] font-mono text-muted-color">
          MCP = live ERP data · RAG = past incidents · LLM = AI reasoning
        </span>
      </div>

      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {STAGES.map((st, i) => {
          const Icon = st.icon;
          const done = i < cur;
          const active = i === cur;
          const failed = isFailure && (i === 6);
          return (
            <React.Fragment key={st.key}>
              <div
                className={`flex-1 min-w-[104px] p-2.5 rounded-lg border text-center flex flex-col items-center gap-1 ${
                  failed
                    ? 'bg-rose-500/10 border-rose-500/40'
                    : active
                    ? 'bg-accent-subtle-bg border-accent-color ring-1 ring-accent-color/30'
                    : done
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-subtle border-[var(--border)] opacity-70'
                }`}
              >
                <Icon className={`w-4 h-4 ${failed ? 'text-rose-500' : active ? 'text-accent-color' : done ? 'text-emerald-500' : 'text-muted-color'}`} />
                <span className="text-[9.5px] font-bold leading-tight text-heading">{st.tech}</span>
                <span className="text-[8.5px] leading-tight text-muted-color">{st.plain}</span>
              </div>
              {i < STAGES.length - 1 && (
                <span className="self-center text-muted-color/50 text-xs shrink-0">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
