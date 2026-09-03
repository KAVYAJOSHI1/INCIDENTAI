import React, { useState } from 'react';
import {
  CheckCircle2, Clock, ShieldAlert, Sparkles, Terminal, ShieldCheck,
  AlertTriangle, RotateCcw, ArrowRight, ArrowDown, ChevronDown, ChevronUp,
  Database, Server, Cpu, FileCode, Check, AlertOctagon, HelpCircle,
  ExternalLink, Layers, GitFork, UserCheck, Activity, RefreshCw, XCircle
} from 'lucide-react';

// Step definitions for the Incident Resolution Lifecycle
const LIFECYCLE_STEPS = [
  {
    id: 'ERP_SOURCE',
    name: 'ERP / SOURCE',
    subLabel: 'Where did problem originate?',
    owner: 'ERP System',
    description: 'Operational transaction failure ingested from ERP source.'
  },
  {
    id: 'INCIDENT_CREATED',
    name: 'INCIDENT CREATED',
    subLabel: 'Incident ingested into platform',
    owner: 'Ingestion Engine',
    description: 'Ticket generated with correlation ID and initial metadata.'
  },
  {
    id: 'TRIAGE_ASSIGN',
    name: 'TRIAGE & ASSIGN',
    subLabel: 'Owner & priority determined',
    owner: 'Support Triage',
    description: 'Severity classified and engineer assigned to incident.'
  },
  {
    id: 'AI_DIAGNOSIS',
    name: 'AI DIAGNOSIS',
    subLabel: 'Why does IncidentAI think this happened?',
    owner: 'IncidentAI Engine',
    isAiStep: true,
    description: 'RAG retrieval, log extraction, and root cause inference.'
  },
  {
    id: 'REMEDIATION_PLAN',
    name: 'REMEDIATION PLAN',
    subLabel: 'Proposed fix & code patch',
    owner: 'Remediation Engine',
    description: 'Automated patch generation and version delta proposal.'
  },
  {
    id: 'HUMAN_APPROVAL',
    name: 'HUMAN APPROVAL',
    subLabel: 'Developer review & approval',
    owner: 'Assigned Developer',
    description: 'Human-in-the-loop safety verification and authorization.'
  },
  {
    id: 'VERIFICATION',
    name: 'VERIFICATION',
    subLabel: 'Did the fix actually work?',
    owner: 'Verification Suite',
    description: 'Automated dry-run, unit test, and regression validation.'
  },
  {
    id: 'RESOLVED',
    name: 'RESOLVED',
    subLabel: 'Final operational status',
    owner: 'Operations',
    description: 'Patch applied, incident closed, and RAG knowledge captured.'
  }
];

// Fallback / Failure branch steps when verification fails
const FAILURE_BRANCH_STEPS = [
  {
    id: 'VERIFICATION_FAILED',
    name: 'VERIFICATION FAILED',
    subLabel: 'Test suite rejected patch',
    description: 'Automated verification check failed during patch validation.'
  },
  {
    id: 'ROLLBACK_REQUIRED',
    name: 'ROLLBACK REQUIRED',
    subLabel: 'Safe system revert initiated',
    description: 'System flagged for controlled rollback to restore stability.'
  },
  {
    id: 'ROLLED_BACK',
    name: 'ROLLED BACK',
    subLabel: 'Previous stable state restored',
    description: 'Patch reverted cleanly to target baseline version.'
  },
  {
    id: 'RETURN_TO_REMEDIATION',
    name: 'RETURN TO REMEDIATION',
    subLabel: 'Re-triage patch design',
    description: 'Ticket returned to developer for patch adjustments.'
  }
];

// Helper to calculate state progress index (0 to 7) based on ticket status and actual verification execution
function getStepStatus(stepId, currentStatus, isVerifExecuted, isVerifPassed, isVerifFailed) {
  const normStatus = (currentStatus || 'NEW').toUpperCase();

  const isFailed = isVerifFailed || normStatus === 'VERIFICATION_FAILED' || normStatus === 'FAILED';
  const isRollback = normStatus === 'ROLLBACK_REQUIRED' || normStatus === 'ROLLED_BACK' || normStatus === 'REVERTED';

  switch (stepId) {
    case 'ERP_SOURCE':
      return { state: 'completed', badge: 'Ingested' };

    case 'INCIDENT_CREATED':
      return { state: 'completed', badge: 'Created' };

    case 'TRIAGE_ASSIGN':
      if (normStatus === 'NEW') return { state: 'current', badge: 'In Progress' };
      return { state: 'completed', badge: 'Triaged' };

    case 'AI_DIAGNOSIS':
      if (normStatus === 'NEW') return { state: 'pending', badge: 'Queued' };
      if (normStatus === 'TRIAGED') return { state: 'current', badge: 'Diagnosing' };
      return { state: 'completed', badge: 'Analyzed' };

    case 'REMEDIATION_PLAN':
      if (['NEW', 'TRIAGED'].includes(normStatus)) return { state: 'pending', badge: 'Pending' };
      if (normStatus === 'ASSIGNED' || normStatus === 'IN_PROGRESS') return { state: 'current', badge: 'Formulating' };
      return { state: 'completed', badge: 'Plan Ready' };

    case 'HUMAN_APPROVAL':
      if (['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS'].includes(normStatus)) return { state: 'pending', badge: 'Pending' };
      if (normStatus === 'REMEDIATION_PENDING' || normStatus === 'PROPOSED') return { state: 'current', badge: 'Approval Required' };
      return { state: 'completed', badge: 'Approved' };

    case 'VERIFICATION':
      if (isFailed || isRollback) return { state: 'failed', badge: 'Failed ✕' };
      if (isVerifExecuted && isVerifPassed) {
        return { state: 'completed', badge: 'Verified ✓' };
      }
      if (['APPROVED', 'VERIFICATION'].includes(normStatus)) return { state: 'current', badge: 'Ready' };
      return { state: 'pending', badge: 'Pending' };

    case 'RESOLVED':
      if (isFailed || isRollback) return { state: 'pending', badge: 'On Hold' };
      if (isVerifExecuted && isVerifPassed && ['RESOLVED', 'VERIFIED', 'KNOWLEDGE_CAPTURED', 'SELF_SERVICE_RESOLVED', 'APPLIED'].includes(normStatus)) {
        return { state: 'completed', badge: 'Resolved ✓' };
      }
      return { state: 'pending', badge: 'Pending' };

    default:
      return { state: 'pending', badge: 'Pending' };
  }
}

export default function IncidentLifecycleVisualizer({
  ticket,
  verificationResult,
  onApprove,
  onRunVerification,
  onApplyPatch,
  onRollback,
  onOpenRemediationTab
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!ticket) {
    return (
      <div className="surface p-6 rounded-2xl border border-[var(--border)] text-center space-y-2">
        <Sparkles className="w-6 h-6 text-muted-color mx-auto" />
        <h3 className="text-sm font-extrabold text-heading">No Active Incident Selected</h3>
        <p className="text-xs text-muted-color">Select an incident from the Triage Feed to visualize its lifecycle.</p>
      </div>
    );
  }

  const ticketId = ticket.ticket_number || ticket.id || 'INC-79613-6322';
  const correlationId = ticket.correlation_id || `ERP-${ticket.erp_module || 'INV'}-W2-20260826-1042`;
  const erpModule = ticket.erp_module || 'INVENTORY';
  const status = ticket.remediation_status || ticket.status || 'IN_PROGRESS';
  const normStatus = status.toUpperCase();

  // Verification execution state resolution
  const hasVerificationExecuted = Boolean(
    verificationResult ||
    ['VERIFIED', 'VERIFICATION_FAILED', 'APPLIED', 'RESOLVED', 'KNOWLEDGE_CAPTURED', 'SELF_SERVICE_RESOLVED', 'ROLLED_BACK', 'REVERTED'].includes(normStatus)
  );

  const isVerifPassed = hasVerificationExecuted && (
    (verificationResult && verificationResult.status === 'PASS') ||
    ['VERIFIED', 'APPLIED', 'RESOLVED', 'KNOWLEDGE_CAPTURED', 'SELF_SERVICE_RESOLVED'].includes(normStatus)
  );

  const isVerifFailed = hasVerificationExecuted && (
    (verificationResult && verificationResult.status === 'FAIL') ||
    ['VERIFICATION_FAILED', 'FAILED', 'ROLLBACK_REQUIRED', 'ROLLED_BACK', 'REVERTED'].includes(normStatus)
  );

  const failedChecksCount = verificationResult?.checks?.filter(c => c.status !== 'PASS').length ?? 1;
  const passedChecksCount = verificationResult?.checks?.filter(c => c.status === 'PASS').length ?? (isVerifPassed ? 5 : 0);
  const totalChecksCount = verificationResult?.checks?.length ?? 5;

  const confidenceScore = ticket.ai_confidence ?? 0.65;
  const confidencePercent = `${Math.round(confidenceScore * 100)}%`;

  // Coherent Root Cause mapping: prefer specific hypothesis over generic fallback string
  const rootCause = (() => {
    const diagRoot = ticket?.ai_diagnosis?.root_cause;
    const aiRoot = ticket?.ai_root_cause;
    if (diagRoot && !diagRoot.includes("Unexpected validation or execution exception")) {
      return diagRoot;
    }
    if (aiRoot && !aiRoot.includes("Unexpected validation or execution exception")) {
      return aiRoot;
    }
    return diagRoot || aiRoot || "Stale inventory cache read before transfer validation";
  })();

  const assignedDev = ticket.assigned_dev_name || 'Marcus Vance';

  // Safety mismatch check
  const isKbMismatch = ticket.kb_match && ticket.kb_match.module && ticket.kb_match.module !== erpModule;

  return (
    <div className="surface p-6 rounded-2xl border border-[var(--border)] shadow-md space-y-6">
      {/* ── Visualizer Header & Meta Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-module text-xs font-mono font-extrabold">
              <Activity className="w-3.5 h-3.5" /> ENTERPRISE INCIDENT RESOLUTION LIFECYCLE
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              STATE-AWARE WORKFLOW
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-heading">
            Lifecycle Progress for <span className="font-mono text-accent-color">{ticketId}</span>
          </h2>
          <p className="text-xs text-muted-color mt-0.5">
            Module: <strong className="text-heading">{erpModule}</strong> · Ref: <code className="font-mono text-accent-color">{correlationId}</code> · Developer: <strong className="text-heading">{assignedDev}</strong>
          </p>
        </div>

        {/* Technical Details Toggle Button */}
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="btn-secondary text-xs font-semibold"
        >
          <GitFork className="w-3.5 h-3.5 text-accent-color" />
          {showTechnicalDetails ? 'Hide Technical AI Execution' : 'View Technical AI Execution'}
          {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Main Lifecycle Step Pipeline (Horizontal Responsive Grid) ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 relative">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const { state, badge } = getStepStatus(step.id, status, hasVerificationExecuted, isVerifPassed, isVerifFailed);
            const isAi = step.isAiStep;
            const isCompleted = state === 'completed';
            const isCurrent = state === 'current';
            const isFailed = state === 'failed';
            const isPending = state === 'pending';

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
                {/* Connector Arrow for desktop */}
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-color/50">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Step Header */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-muted-color">
                      0{idx + 1}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : isCurrent
                          ? isAi
                            ? 'bg-amber-500 text-white font-extrabold animate-pulse'
                            : 'bg-accent-color text-white font-extrabold animate-pulse'
                          : isFailed
                          ? 'bg-rose-500 text-white font-extrabold'
                          : 'bg-slate-200 dark:bg-slate-800 text-muted-color'
                      }`}
                    >
                      {badge}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : isCurrent ? (
                      isAi ? (
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-spin-slow" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full bg-accent-color shrink-0 mt-1 animate-ping" />
                      )
                    ) : isFailed ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 mt-1" />
                    )}

                    <div>
                      <h4 className={`text-xs font-extrabold leading-tight ${isCurrent ? 'text-heading font-black' : 'text-heading'}`}>
                        {step.name}
                      </h4>
                      <p className="text-[10px] text-muted-color leading-tight mt-0.5">
                        {step.subLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step Specific Context Card / Details */}
                <div className="mt-auto pt-2 border-t border-[var(--border)] text-[10px] font-mono space-y-1">
                  {step.id === 'ERP_SOURCE' && (
                    <div className="text-muted-color">
                      Source: <strong className="text-heading">{erpModule} ERP</strong>
                    </div>
                  )}
                  {step.id === 'INCIDENT_CREATED' && (
                    <div className="text-muted-color">
                      ID: <code className="text-accent-color font-bold">{ticketId}</code>
                    </div>
                  )}
                  {step.id === 'TRIAGE_ASSIGN' && (
                    <div className="text-muted-color">
                      Dev: <strong className="text-heading">{assignedDev}</strong>
                    </div>
                  )}
                  {step.id === 'AI_DIAGNOSIS' && (
                    <div className="space-y-0.5">
                      <div className="text-amber-500 font-extrabold flex items-center justify-between">
                        <span>Conf: {confidencePercent}</span>
                        <span className="text-[9px] px-1 bg-amber-500/20 rounded">RAG</span>
                      </div>
                      <div className="text-muted-color truncate" title={rootCause}>
                        Cause: {rootCause.slice(0, 22)}...
                      </div>
                    </div>
                  )}
                  {step.id === 'REMEDIATION_PLAN' && (
                    <div className="text-muted-color">
                      Patch: <code className="text-purple-400 font-bold">v1.4.9</code>
                    </div>
                  )}
                  {step.id === 'HUMAN_APPROVAL' && (
                    <div className="text-muted-color">
                      Owner: <strong className="text-heading">{assignedDev}</strong>
                    </div>
                  )}
                  {step.id === 'VERIFICATION' && (
                    <div>
                      {!hasVerificationExecuted ? (
                        <div className="text-amber-500 font-bold space-y-0.5" title="Verification has not been executed yet.">
                          <div>Verification Ready</div>
                          <div className="text-[9px] text-muted-color font-normal">5 checks configured</div>
                        </div>
                      ) : isVerifFailed ? (
                        <div className="text-rose-500 font-bold space-y-0.5">
                          <div>Verification Failed ✕</div>
                          <div className="text-[9px] text-rose-400 font-mono">
                            {passedChecksCount}/{totalChecksCount} checks passed
                          </div>
                        </div>
                      ) : (
                        <div className="text-emerald-500 font-bold space-y-0.5">
                          <div>Verification Passed ✓</div>
                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                            {passedChecksCount}/{totalChecksCount} checks passed
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {step.id === 'RESOLVED' && (
                    <div className="text-muted-color">
                      Status: <strong className="text-heading">{status}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Dynamic Failure & Rollback Branch Line (Visible when verification fails) ── */}
        {isVerifFailed && (
          <div className="mt-4 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-500">
                  FAILURE BRANCH: VERIFICATION REJECTED & ROLLBACK WORKFLOW
                </h4>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500 text-white">
                SAFEGUARD TRIGGERED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 space-y-1">
                <span className="text-rose-500 font-extrabold block flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> VERIFICATION FAILED
                </span>
                <span className="text-[10px] text-muted-color block">Did the fix work? <strong>No ({passedChecksCount}/{totalChecksCount} checks passed)</strong></span>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1">
                <span className="text-amber-500 font-extrabold block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> ROLLBACK REQUIRED
                </span>
                <span className="text-[10px] text-muted-color block">Safe system revert initiated to version v1.4.8</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-subtle space-y-1">
                <span className="text-heading font-extrabold block flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-accent-color" /> ROLLED BACK
                </span>
                <span className="text-[10px] text-muted-color block">Previous stable release restored cleanly</span>
              </div>

              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 space-y-1">
                <span className="text-blue-500 font-extrabold block flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> RETURN TO REMEDIATION
                </span>
                <span className="text-[10px] text-muted-color block">Re-triage patch & adjust concurrency locks</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AI DIAGNOSIS HIGHLIGHTED DATA BOX ── */}
      <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading leading-none">
                AI DIAGNOSIS & EVIDENCE BREAKDOWN
              </h3>
              <p className="text-[10px] text-muted-color mt-0.5">Why does IncidentAI think this happened?</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isKbMismatch ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-white flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Potential Knowledge Base Mismatch
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                LIVE RAG INTEGRATION
              </span>
            )}
            <span className="text-xs font-mono font-extrabold text-amber-500">
              Confidence: {confidencePercent}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Grounded Evidence Sources */}
          <div className="p-3.5 rounded-lg bg-surface border border-[var(--border)] space-y-2">
            <span className="text-[10px] font-mono font-bold text-muted-color uppercase block">1. Grounded Evidence Sources</span>
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="p-1.5 rounded bg-accent-subtle-bg text-accent-subtle-text font-bold flex items-center justify-between">
                <span>ERP Facts</span>
                <span className="text-heading font-extrabold">{erpModule} ({ticket.ocr_findings?.extracted_error_code || ticket.error_code || 'ERR_STOCK_NEG'})</span>
              </div>
              <div className="p-1.5 rounded bg-purple-500/10 text-purple-400 font-bold flex items-center justify-between">
                <span>RAG Evidence</span>
                <span>{ticket.rag_kb_matches?.[0]?.article?.title || 'KB-101 (Cache Sync)'}</span>
              </div>
              <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-between">
                <span>Live Telemetry</span>
                <span>DB / Redis Fact Verified</span>
              </div>
            </div>
          </div>

          {/* AI Inference / Root Cause */}
          <div className="p-3.5 rounded-lg bg-surface border border-[var(--border)] space-y-1">
            <span className="text-[10px] font-mono font-bold text-muted-color uppercase block">2. Suspected Root Cause (AI Inference)</span>
            <p className="font-extrabold text-heading leading-snug">{rootCause}</p>
            <span className="text-[10px] font-mono text-muted-color block pt-1">
              Inferred via automated log extraction, RAG vector similarity & stack trace analysis
            </span>
          </div>

          {/* AI Recommendation & Safety Guardrail */}
          <div className="p-3.5 rounded-lg bg-surface border border-[var(--border)] space-y-1">
            <span className="text-[10px] font-mono font-bold text-muted-color uppercase block">3. AI Recommendation & Safety</span>
            <p className="font-mono text-xs text-heading font-semibold truncate" title={ticket.ai_suggested_patch || "Execute redis-cli DEL inv_stock:SK-902 && SELECT sync_inventory_cache('SK-902');"}>
              {ticket.ai_suggested_patch || "EXEC redis-cli DEL inv_stock:SK-902 && sync_cache()"}
            </p>
            <span className="text-[10px] font-mono text-amber-500 font-bold block pt-1">
              Guardrail: Human approval required before deployment
            </span>
          </div>
        </div>

        {/* KB Mismatch warning banner if applicable */}
        {isKbMismatch && (
          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs font-mono text-amber-600 dark:text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Potential Knowledge Base Mismatch:</strong> Historical resolution is from module <code className="font-bold">{ticket.kb_match.module}</code> (incident is <code className="font-bold">{erpModule}</code>). Developer review strongly recommended.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── DYNAMIC "WHAT HAPPENS NEXT?" CONCISE AREA ── */}
      <div className="p-5 rounded-xl border border-accent-color/30 bg-accent-subtle-bg/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-accent-color" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading">
              CURRENT STEP & WHAT HAPPENS NEXT?
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-color text-white">
            RECOMMENDED ACTION
          </span>
        </div>

        {/* Context explanation text */}
        <p className="text-xs font-medium text-body-color leading-relaxed">
          {isVerifFailed ? (
            <>
              ❌ <strong className="text-rose-500">Verification suite failed ({passedChecksCount}/{totalChecksCount} checks passed).</strong> Stock constraint race condition detected during concurrency check. Action required: Developer <strong>{assignedDev}</strong> must review failed checks and initiate controlled rollback.
            </>
          ) : isVerifPassed ? (
            <>
              ✓ <strong className="text-emerald-500">Verification suite passed ({passedChecksCount}/{totalChecksCount} checks passed).</strong> Action required: Apply verified patch v1.4.9 to target environment and resolve incident.
            </>
          ) : normStatus === 'APPROVED' ? (
            <>
              ✓ <strong className="text-emerald-500">Remediation plan approved by developer.</strong> Verification Ready (5 checks configured). Action required: Execute automated verification suite to validate fix before production deployment.
            </>
          ) : normStatus === 'RESOLVED' || normStatus === 'APPLIED' ? (
            <>
              ✓ <strong className="text-emerald-500">Incident successfully resolved and verified.</strong> Knowledge article written back to RAG Knowledge Base.
            </>
          ) : (
            <>
              ⚠ <strong className="text-amber-500">Incident is currently triaged.</strong> AI has prepared a remediation recommendation with <strong>{confidencePercent} confidence</strong>. Action required: Review diagnosis and approve fix.
            </>
          )}
        </p>

        {/* Action Button CTA */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border)]">
          {isVerifFailed ? (
            <button
              onClick={onRollback}
              className="btn-primary text-xs bg-rose-600 hover:bg-rose-500"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Initiate Controlled Rollback
            </button>
          ) : isVerifPassed ? (
            <button
              onClick={onApplyPatch}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Apply Patch & Resolve Incident
            </button>
          ) : normStatus === 'APPROVED' ? (
            <button
              onClick={onRunVerification}
              className="btn-primary text-xs"
            >
              <Terminal className="w-3.5 h-3.5" /> Start Automated Verification Engine
            </button>
          ) : normStatus === 'RESOLVED' || normStatus === 'APPLIED' ? (
            <span className="text-xs font-mono font-bold text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Incident Fully Resolved
            </span>
          ) : (
            <button
              onClick={onApprove || onOpenRemediationTab}
              className="btn-primary text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Review & Approve Remediation Plan
            </button>
          )}
        </div>
      </div>

      {/* ── SECONDARY TECHNICAL AI EXECUTION TRACE (COLLAPSIBLE) ── */}
      {showTechnicalDetails && (
        <div className="pt-4 border-t border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> TECHNICAL AI EXECUTION TRACE & REASONING CHAIN
            </h3>
            <span className="text-[10px] font-mono text-muted-color">DEVELOPER & ARCHITECT VIEW</span>
          </div>

          <div className="p-4 rounded-xl surface-muted border border-[var(--border)] space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold text-heading">1. ERP Evidence</span>
              <span className="text-muted-color">&rarr;</span>
              <span className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold text-rose-500">2. Error Extraction</span>
              <span className="text-muted-color">&rarr;</span>
              <span className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold text-accent-color">3. Live System Facts</span>
              <span className="text-muted-color">&rarr;</span>
              <span className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold text-purple-400">4. RAG / Historical Evidence</span>
              <span className="text-muted-color">&rarr;</span>
              <span className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold text-amber-500">5. AI Reasoning</span>
              <span className="text-muted-color">&rarr;</span>
              <span className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-bold text-emerald-500">6. Safety & Recommendation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono pt-2">
              <div className="p-3 rounded-lg bg-surface border border-[var(--border)] space-y-1">
                <span className="text-[10px] text-muted-color font-bold block">LOG EXTRACTION & PARSING</span>
                <p className="text-heading">Extracted Code: <code className="text-rose-500">ERR_STOCK_NEG</code></p>
                <p className="text-muted-color">UI Component: BinTransferGrid</p>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-[var(--border)] space-y-1">
                <span className="text-[10px] text-muted-color font-bold block">RAG VECTOR SIMILARITY</span>
                <p className="text-heading">Article: KB-802 (Stock Lock Concurrency)</p>
                <p className="text-purple-400">Cosine Distance Score: 0.88</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
