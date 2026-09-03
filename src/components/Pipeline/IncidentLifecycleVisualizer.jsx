import React, { useState } from 'react';
import {
  CheckCircle2, Sparkles, Terminal, ShieldCheck,
  AlertTriangle, RotateCcw, ArrowRight, ChevronDown, ChevronUp,
  Cpu, AlertOctagon, RefreshCw, XCircle, Activity, GitFork, Loader2
} from 'lucide-react';

import {
  normalizeIncidentWorkflowState,
  getStepStatus,
  isAiDiagnosisAvailable
} from '../../utils/workflowState';

// The 8 canonical lifecycle stages. `id` values match getStepStatus() keys.
const LIFECYCLE_STEPS = [
  { id: 'ERP_SOURCE',       name: 'ERP / SOURCE',      subLabel: 'Where did it originate?' },
  { id: 'INCIDENT_CREATED', name: 'INCIDENT CREATED',  subLabel: 'Ingested into platform' },
  { id: 'TRIAGE_ASSIGN',    name: 'TRIAGE & ASSIGN',   subLabel: 'Owner & priority set' },
  { id: 'AI_DIAGNOSIS',     name: 'AI DIAGNOSIS',      subLabel: 'Root cause inferred', isAiStep: true },
  { id: 'REMEDIATION_PLAN', name: 'REMEDIATION PLAN',  subLabel: 'Proposed fix' },
  { id: 'HUMAN_APPROVAL',   name: 'HUMAN APPROVAL',    subLabel: 'Developer sign-off' },
  { id: 'VERIFICATION',     name: 'VERIFICATION',      subLabel: 'Did the fix work?' },
  { id: 'RESOLVED',         name: 'RESOLVED',          subLabel: 'Applied & closed' }
];

const CTA_ICON = {
  APPROVE_REMEDIATION: ShieldCheck,
  RETURN_TO_REMEDIATION: RefreshCw,
  START_VERIFICATION: Terminal,
  APPLY_PATCH: CheckCircle2,
  ROLLBACK: RotateCcw
};

export default function IncidentLifecycleVisualizer({
  ticket,
  verificationResult,
  actionInFlight = null,
  onApprove,
  onRunVerification,
  onApplyPatch,
  onRollback,
  onReturnToRemediation,
  onOpenRemediationTab
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!ticket) {
    return (
      <div className="surface p-6 rounded-2xl border border-[var(--border)] text-center space-y-2">
        <Sparkles className="w-6 h-6 text-muted-color mx-auto" />
        <h3 className="text-sm font-extrabold text-heading">No Active Incident Selected</h3>
        <p className="text-xs text-muted-color">Select an incident from the Incident Queue to visualize its lifecycle.</p>
      </div>
    );
  }

  // ── Authoritative state — derived ONLY from the persisted backend record ──
  const normState = normalizeIncidentWorkflowState(ticket, null, verificationResult);
  const verifObj = verificationResult || ticket.verification_result || null;
  const verifExecuted = Boolean(verifObj?.executed || verifObj?.checks?.length);

  // ── Incident-specific fields (honest empty states, no cross-incident fallbacks) ──
  const ticketId = ticket.ticket_number || ticket.id;
  const correlationId = ticket.correlation_id || '—';
  const erpModule = ticket.erp_module || 'Unknown module';
  const isAssigned = Boolean(ticket.assigned_dev_name || ticket.assigned_dev_id);
  const assignedDev = ticket.assigned_dev_name || 'Assignment pending';
  const errorCode = ticket.ocr_findings?.extracted_error_code || ticket.error_code || '—';
  const diagnosisAvailable = isAiDiagnosisAvailable(ticket);

  const rootCause = ticket?.ai_diagnosis?.root_cause || ticket?.ai_root_cause || (diagnosisAvailable ? '—' : 'Diagnosis pending');
  const recommendation = ticket?.ai_diagnosis?.recommended_resolution || ticket?.ai_suggested_patch || 'No remediation proposed yet';
  const patchVersion = ticket.patch_version
    || ((['APPROVED', 'VERIFIED_READY', 'RESOLVED'].includes(normState.stateKey)) ? '(pending apply)' : '—');

  const topKb = ticket.rag_kb_matches?.[0];
  const topKbTitle = topKb?.article?.title || ticket.rag_evidence?.[0]?.title || null;
  const topKbModule = topKb?.article?.erp_module || null;
  const liveFact = ticket.mcp_evidence?.[0]?.fact || ticket.mcp_evidence?.[0]?.summary || null;
  const isKbMismatch = Boolean(topKbModule && topKbModule !== erpModule);

  const checksTotal = verifObj?.checks_total ?? verifObj?.checks?.length ?? 5;
  const checksPassed = verifObj?.checks_passed ?? verifObj?.checks?.filter((c) => c.status === 'PASS').length ?? 0;

  const { confidencePercent } = normState;
  const CtaIcon = normState.nextActionKey ? (CTA_ICON[normState.nextActionKey] || ArrowRight) : ArrowRight;

  const ctaHandler = {
    APPROVE_REMEDIATION: onApprove || onOpenRemediationTab,
    RETURN_TO_REMEDIATION: onReturnToRemediation,
    START_VERIFICATION: onRunVerification,
    APPLY_PATCH: onApplyPatch,
    ROLLBACK: onRollback
  }[normState.nextActionKey];

  const isFailure = normState.isFailurePath;

  return (
    <div className="surface p-6 rounded-2xl border border-[var(--border)] shadow-md space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="badge-module text-xs font-mono font-extrabold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> INCIDENT RESOLUTION LIFECYCLE
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isFailure
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : normState.stateKey === 'RESOLVED'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
            }`}>
              CURRENT STATE: {normState.label}
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-heading">
            Lifecycle Progress for <span className="font-mono text-accent-color">{ticketId}</span>
          </h2>
          <p className="text-xs text-muted-color mt-0.5">
            Module: <strong className="text-heading">{erpModule}</strong> · Ref: <code className="font-mono text-accent-color">{correlationId}</code> · Developer: <strong className={isAssigned ? 'text-heading' : 'text-amber-500'}>{assignedDev}</strong>
          </p>
        </div>

        <button onClick={() => setShowTechnicalDetails(!showTechnicalDetails)} className="btn-secondary text-xs font-semibold">
          <GitFork className="w-3.5 h-3.5 text-accent-color" />
          {showTechnicalDetails ? 'Hide Technical AI Trace' : 'View Technical AI Trace'}
          {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── 8-stage pipeline ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 relative">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const st = getStepStatus(step.id, normState, ticket);
            const isCompleted = st === 'COMPLETED';
            const isCurrent = st === 'ACTIVE';
            const isFailed = st === 'FAILED';
            const isAi = step.isAiStep;
            const badge = isCompleted ? 'Done ✓' : isCurrent ? 'Current' : isFailed ? 'Failed ✕' : 'Pending';

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between relative ${
                  isCurrent
                    ? isAi
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-accent-subtle-bg border-accent-color shadow-md ring-2 ring-accent-color/20'
                    : isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : isFailed
                    ? 'bg-rose-500/10 border-rose-500/50'
                    : 'bg-subtle border-[var(--border)] opacity-80'
                }`}
              >
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-color/50">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-muted-color">0{idx + 1}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                        : isCurrent
                        ? (isAi ? 'bg-amber-500 text-white' : 'bg-accent-color text-white') + ' font-extrabold animate-pulse'
                        : isFailed
                        ? 'bg-rose-500 text-white font-extrabold'
                        : 'bg-slate-200 dark:bg-slate-800 text-muted-color'
                    }`}>
                      {badge}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : isCurrent ? (
                      isAi
                        ? <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        : <span className="w-3.5 h-3.5 rounded-full bg-accent-color shrink-0 mt-1 animate-ping" />
                    ) : isFailed ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 mt-1" />
                    )}
                    <div>
                      <h4 className="text-xs font-extrabold leading-tight text-heading">{step.name}</h4>
                      <p className="text-[10px] text-muted-color leading-tight mt-0.5">{step.subLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-2 border-t border-[var(--border)] text-[10px] font-mono space-y-1">
                  {step.id === 'ERP_SOURCE' && <div className="text-muted-color">Source: <strong className="text-heading">{erpModule}</strong></div>}
                  {step.id === 'INCIDENT_CREATED' && <div className="text-muted-color">ID: <code className="text-accent-color font-bold">{ticketId}</code></div>}
                  {step.id === 'TRIAGE_ASSIGN' && <div className="text-muted-color">Dev: <strong className={isAssigned ? 'text-heading' : 'text-amber-500'}>{assignedDev}</strong></div>}
                  {step.id === 'AI_DIAGNOSIS' && (
                    <div className="text-muted-color">
                      {diagnosisAvailable
                        ? <>Confidence: <strong className="text-amber-500">{confidencePercent}</strong></>
                        : <span className="text-amber-500">Awaiting diagnosis</span>}
                    </div>
                  )}
                  {step.id === 'REMEDIATION_PLAN' && <div className="text-muted-color">Patch: <code className="text-purple-400 font-bold">{patchVersion}</code></div>}
                  {step.id === 'HUMAN_APPROVAL' && (
                    <div className="text-muted-color">
                      {['APPROVED', 'VERIFIED_READY', 'RESOLVED'].includes(normState.stateKey)
                        ? <>Approved by: <strong className="text-heading">{assignedDev}</strong></>
                        : <>Reviewer: <strong className={isAssigned ? 'text-heading' : 'text-amber-500'}>{assignedDev}</strong></>}
                    </div>
                  )}
                  {step.id === 'VERIFICATION' && (
                    <div>
                      {!verifExecuted ? (
                        <div className="text-amber-500 font-bold">
                          <div>Not executed yet</div>
                          <div className="text-[9px] text-muted-color font-normal">{checksTotal} checks configured</div>
                        </div>
                      ) : verifObj?.status === 'FAIL' ? (
                        <div className="text-rose-500 font-bold">
                          <div>Failed ✕</div>
                          <div className="text-[9px] font-mono">{checksPassed}/{checksTotal} checks passed</div>
                        </div>
                      ) : (
                        <div className="text-emerald-500 font-bold">
                          <div>Passed ✓</div>
                          <div className="text-[9px] font-mono">{checksPassed}/{checksTotal} checks passed</div>
                        </div>
                      )}
                    </div>
                  )}
                  {step.id === 'RESOLVED' && <div className="text-muted-color">Status: <strong className="text-heading">{ticket.status}</strong></div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Failure / rollback branch ── */}
        {isFailure && (
          <div className="mt-4 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-500">
                  FAILURE BRANCH — VERIFICATION REJECTED → ROLLBACK → REMEDIATION
                </h4>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500 text-white">SAFEGUARD TRIGGERED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className={`p-3 rounded-lg border space-y-1 ${normState.stateKey === 'VERIFICATION_FAILED' ? 'border-rose-500/50 bg-rose-500/10' : 'border-slate-300 dark:border-slate-700 bg-subtle'}`}>
                <span className="text-rose-500 font-extrabold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> VERIFICATION FAILED</span>
                <span className="text-[10px] text-muted-color block">{verifExecuted ? `${checksPassed}/${checksTotal} checks passed` : 'Awaiting verification'}</span>
              </div>
              <div className={`p-3 rounded-lg border space-y-1 ${normState.stateKey === 'VERIFICATION_FAILED' ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-300 dark:border-slate-700 bg-subtle'}`}>
                <span className="text-amber-500 font-extrabold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> ROLLBACK REQUIRED</span>
                <span className="text-[10px] text-muted-color block">Controlled revert to previous stable version</span>
              </div>
              <div className={`p-3 rounded-lg border space-y-1 ${normState.stateKey === 'ROLLED_BACK' ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-300 dark:border-slate-700 bg-subtle'}`}>
                <span className="text-heading font-extrabold flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5 text-accent-color" /> ROLLED BACK</span>
                <span className="text-[10px] text-muted-color block">{ticket.patch_version ? `Restored ${ticket.patch_version}` : 'Previous release restored'}</span>
              </div>
              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 space-y-1">
                <span className="text-blue-500 font-extrabold flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> RETURN TO REMEDIATION</span>
                <span className="text-[10px] text-muted-color block">Developer revises the patch and re-approves</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AI Diagnosis & Evidence (Why does IncidentAI think this happened?) ── */}
      <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading leading-none">AI DIAGNOSIS &amp; EVIDENCE BREAKDOWN</h3>
              <p className="text-[10px] text-muted-color mt-0.5">Why does IncidentAI think this happened?</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isKbMismatch && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-white flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Potential Knowledge Base Mismatch
              </span>
            )}
            <span className="text-xs font-mono font-extrabold text-amber-500">{confidencePercent}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-surface border border-[var(--border)] space-y-2">
            <span className="text-[10px] font-mono font-bold text-muted-color uppercase block">1. Grounded Evidence</span>
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="p-1.5 rounded bg-accent-subtle-bg text-accent-subtle-text font-bold flex items-center justify-between gap-2">
                <span>ERP Fact</span>
                <span className="text-heading font-extrabold truncate" title={`${erpModule} ${errorCode}`}>{erpModule} ({errorCode})</span>
              </div>
              <div className="p-1.5 rounded bg-purple-500/10 text-purple-400 font-bold flex items-center justify-between gap-2">
                <span>RAG Match</span>
                <span className="truncate max-w-[150px]" title={topKbTitle || 'No KB match'}>{topKbTitle || 'No KB match'}</span>
              </div>
              <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-between gap-2">
                <span>Live Fact</span>
                <span className="truncate max-w-[150px]" title={liveFact || 'No live telemetry'}>{liveFact || 'No live telemetry'}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-surface border border-[var(--border)] space-y-1">
            <span className="text-[10px] font-mono font-bold text-muted-color uppercase block">2. Suspected Root Cause (AI Inference)</span>
            <p className="font-extrabold text-heading leading-snug">{rootCause}</p>
            <span className="text-[10px] font-mono text-muted-color block pt-1">Probabilistic inference — not a confirmed fact. Requires human review.</span>
          </div>

          <div className="p-3.5 rounded-lg bg-surface border border-[var(--border)] space-y-1">
            <span className="text-[10px] font-mono font-bold text-muted-color uppercase block">3. Recommendation &amp; Safety</span>
            <p className="font-mono text-xs text-heading font-semibold" title={recommendation}>{recommendation}</p>
            <span className="text-[10px] font-mono text-amber-500 font-bold block pt-1">Guardrail: human developer approval required before deployment</span>
          </div>
        </div>

        {isKbMismatch && (
          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs font-mono text-amber-600 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong>Potential Knowledge Base Mismatch:</strong> the top historical match is from module <code className="font-bold">{topKbModule}</code> but this incident is <code className="font-bold">{erpModule}</code>. Low-relevance evidence is not treated as authoritative — developer review is required.
            </span>
          </div>
        )}
      </div>

      {/* ── What happens next? (state-driven) ── */}
      <div className="p-5 rounded-xl border border-accent-color/30 bg-accent-subtle-bg/30 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-accent-color" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading">CURRENT STEP &amp; WHAT HAPPENS NEXT?</h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-color text-white">RECOMMENDED ACTION</span>
        </div>

        <p className="text-xs font-medium text-body-color leading-relaxed">
          {normState.stateKey === 'RESOLVED' && <>✓ </>}
          {isFailure && <>⚠ </>}
          {!isFailure && normState.stateKey !== 'RESOLVED' && <>→ </>}
          <strong className={isFailure ? 'text-rose-500' : normState.stateKey === 'RESOLVED' ? 'text-emerald-500' : 'text-amber-500'}>
            {normState.label}.
          </strong>{' '}
          {normState.description}
          {normState.stateKey === 'VERIFICATION_FAILED' && verifExecuted && (
            <> ({checksPassed}/{checksTotal} checks passed)</>
          )}
        </p>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border)]">
          {normState.nextActionCTA && ctaHandler ? (
            <button
              onClick={ctaHandler}
              disabled={Boolean(actionInFlight)}
              className={`btn-primary text-xs ${
                normState.nextActionKey === 'ROLLBACK' ? 'bg-rose-600 hover:bg-rose-500'
                : normState.nextActionKey === 'APPLY_PATCH' ? 'bg-emerald-600 hover:bg-emerald-500'
                : ''
              } ${actionInFlight ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {actionInFlight
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working…</>
                : <><CtaIcon className="w-3.5 h-3.5" /> {normState.nextActionCTA}</>}
            </button>
          ) : (
            <span className="text-xs font-mono font-bold text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Incident resolved — no action required
            </span>
          )}
        </div>
      </div>

      {/* ── Technical AI Execution Trace (secondary, collapsible) ── */}
      {showTechnicalDetails && (
        <div className="pt-4 border-t border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> TECHNICAL AI EXECUTION TRACE
            </h3>
            <span className="text-[10px] font-mono text-muted-color">HOW IncidentAI PROCESSED THE EVIDENCE</span>
          </div>

          <div className="p-4 rounded-xl surface-muted border border-[var(--border)] space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {['ERP Evidence', 'Error Extraction', 'Live System Facts', 'RAG / Historical', 'AI Reasoning', 'Safety & Recommendation'].map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <span className="text-muted-color">&rarr;</span>}
                  <span className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold text-heading">{i + 1}. {s}</span>
                </React.Fragment>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-2">
              <div className="p-3 rounded-lg bg-surface border border-[var(--border)] space-y-1">
                <span className="text-[10px] text-muted-color font-bold block">LOG EXTRACTION</span>
                <p className="text-heading">Error code: <code className="text-rose-500">{errorCode}</code></p>
                <p className="text-muted-color">Module: {erpModule}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-[var(--border)] space-y-1">
                <span className="text-[10px] text-muted-color font-bold block">RAG RETRIEVAL</span>
                <p className="text-heading font-sans truncate" title={topKbTitle || 'none'}>Article: {topKbTitle || 'none'}</p>
                {topKb?.score != null && <p className="text-purple-400">Similarity: {Math.round(topKb.score * 100)}%</p>}
                {topKbModule && <p className={isKbMismatch ? 'text-amber-500' : 'text-muted-color'}>Module: {topKbModule}{isKbMismatch ? ' (mismatch)' : ''}</p>}
              </div>
              <div className="p-3 rounded-lg bg-surface border border-[var(--border)] space-y-1">
                <span className="text-[10px] text-muted-color font-bold block">VERIFICATION RESULT</span>
                {verifExecuted
                  ? <p className={verifObj.status === 'PASS' ? 'text-emerald-500' : 'text-rose-500'}>{verifObj.status} — {checksPassed}/{checksTotal} checks</p>
                  : <p className="text-muted-color">Not executed</p>}
                {verifObj?.executed_by && <p className="text-muted-color">By: {verifObj.executed_by}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
