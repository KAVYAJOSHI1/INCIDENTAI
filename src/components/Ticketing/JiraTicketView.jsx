import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, GitMerge, CheckCircle2, User, Clock,
  AlertTriangle, Layers, BookOpen, FileSearch, Terminal, Sparkles,
  ChevronDown, ChevronUp, Copy, AlertCircle, ArrowRight, ArrowDown,
  Database, Cpu, Server, FileCode, Check, AlertOctagon, HelpCircle,
  ExternalLink, Code2, Tag, Activity, ShieldCheck, RotateCcw,
  UserCheck, Shield, RefreshCw
} from 'lucide-react';
import AIInsightsPanel from './AIInsightsPanel';
import EmptyState from '../Common/EmptyState';
import RemediationCenter from '../Remediation/RemediationCenter';
import PatchPreviewModal from '../Remediation/PatchPreviewModal';
import VerificationPanel from '../Remediation/VerificationPanel';
import RollbackModal from '../Remediation/RollbackModal';
import RemediationTimeline from '../Remediation/RemediationTimeline';
import IncidentLifecycleVisualizer from '../Pipeline/IncidentLifecycleVisualizer';
import * as api from '../../services/apiClient';

const SEV_BADGE = {
  P0_CRITICAL: 'badge-p0',
  P1_HIGH:     'badge-p1',
  P2_MEDIUM:   'badge-p2',
  P3_LOW:      'badge-p3',
};

export default function JiraTicketView({ ticket, onMergeDuplicate, onAssignDeveloper, onNavigateToErp, onTicketUpdated }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isReproduceOpen, setIsReproduceOpen] = useState(true);
  const [copiedPatch, setCopiedPatch] = useState(false);

  // Remediation & Patch State
  const [remediation, setRemediation] = useState(null);
  const [patchData, setPatchData] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [rcTree, setRcTree] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(null); // 'approve' | 'reject' | 'verify' | 'apply' | 'rollback' | 'return'
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    // Reset all sub-state immediately on ticket change to prevent cross-incident data leakage
    setRemediation(null);
    setPatchData(null);
    setVerificationResult(null);
    setRcTree(null);
    setAuditLogs([]);
    setActionError(null);
    setActionInFlight(null);

    if (ticket?.id) {
      loadTicketData(ticket.id);
    }
  }, [ticket?.id]);

  const loadTicketData = async (id) => {
    setIsLoadingData(true);
    try {
      const [rem, pt, logs, tree] = await Promise.all([
        api.fetchRemediation(id).catch(() => null),
        api.fetchPatch(id).catch(() => null),
        api.fetchAuditLogs(id).catch(() => []),
        api.fetchRootCauseTree(id).catch(() => null)
      ]);
      if (rem) {
        setRemediation(rem);
        setVerificationResult(rem.verification_result || null);
      }
      if (pt) setPatchData(pt);
      if (tree) setRcTree(tree);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error("Failed to load remediation data for ticket:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const refreshTicketAndState = async (id, updatedTicketFromApi = null) => {
    const freshTicket = updatedTicketFromApi || (await api.fetchTicket(id).catch(() => null));
    await loadTicketData(id);
    if (onTicketUpdated) {
      onTicketUpdated(freshTicket || id);
    }
  };

  // Every workflow action: block double-submit, surface backend errors, and only
  // advance the UI once the backend has confirmed + we have re-read fresh state.
  const runAction = async (key, fn, { onSuccessTab } = {}) => {
    if (!ticket?.id || actionInFlight) return null;
    setActionInFlight(key);
    setActionError(null);
    try {
      const res = await fn(ticket.id);
      await refreshTicketAndState(ticket.id, res?.ticket);
      if (onSuccessTab) setActiveTab(onSuccessTab);
      return res;
    } catch (err) {
      setActionError(err?.message || `${key} failed`);
      return null;
    } finally {
      setActionInFlight(null);
    }
  };

  const handleApproveRemediation = () =>
    runAction('approve', async (id) => {
      const res = await api.approveRemediation(id);
      if (res?.remediation) setRemediation(res.remediation);
      return res;
    });

  const handleRejectRemediation = (reason) =>
    runAction('reject', async (id) => {
      const res = await api.rejectRemediation(id, reason);
      if (res?.remediation) setRemediation(res.remediation);
      return res;
    });

  const handleRunVerification = (simulateFail = false) =>
    runAction('verify', async (id) => {
      const res = await api.verifyPatch(id, { simulate_failure: simulateFail });
      if (res?.verification) setVerificationResult(res.verification);
      return res;
    }, { onSuccessTab: 'VERIFICATION' });

  const handleApplyPatch = () =>
    runAction('apply', (id) => api.applyPatch(id), { onSuccessTab: 'TIMELINE' });

  const handleReturnToRemediation = () =>
    runAction('return', (id) => api.returnToRemediation(id), { onSuccessTab: 'REMEDIATION' });

  const handleRollbackConfirm = async (reason) => {
    const res = await runAction('rollback', (id) => api.rollbackPatch(id, reason));
    return res?.rollback || res;
  };

  if (!ticket) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No Incident Selected"
        description="Select an incident from the Incident Queue to view its investigation dashboard."
      />
    );
  }

  // ── Ticket field normalization — every value comes from THIS incident, with an
  //    honest empty marker ("—" / "Unavailable") where the record has no data. ──
  const ticketId = ticket.ticket_number || ticket.id;
  const correlationId = ticket.correlation_id || '—';

  const rawSeverity = ticket.severity || 'P3_LOW';
  const sevBadgeClass = SEV_BADGE[rawSeverity] || 'badge-p3';
  const severityFormatted = rawSeverity.includes('_')
    ? `${rawSeverity.split('_')[0]} · ${rawSeverity.split('_')[1]}`
    : rawSeverity;

  const erpModule = ticket.erp_module || 'Unknown module';
  // Authoritative workflow status is ticket.status; remediation_status is the sub-state mirror.
  const status = ticket.status || ticket.remediation_status || 'NEW';
  const slaMinutes = ticket.sla_remaining_minutes != null ? ticket.sla_remaining_minutes : null;
  const isSlaAtRisk = slaMinutes != null && slaMinutes < 30 && status !== 'RESOLVED';

  const confidenceScore = ticket.ai_confidence;
  const hasConfidence = confidenceScore != null;
  const confidencePercent = hasConfidence ? `${Math.round(confidenceScore * 100)}%` : 'Confidence unavailable';

  // The incident source is the ERP system, not a person — IncidentAI ownership is
  // Assigned Developer (operational owner) → Reviewer → Resolution Owner.
  const incidentSource = ticket.erp_context?.erp || 'Smart Manufacturing ERP';
  const isAssigned = Boolean(ticket.assigned_dev_name || ticket.assigned_dev_id);
  const assignedDev = ticket.assigned_dev_name || 'Unassigned';
  const reviewerName = ticket.reviewer_name || '—';
  const resolutionOwner = ticket.resolution_owner || (isAssigned ? assignedDev : '—');

  const errorCode = ticket.ocr_findings?.extracted_error_code || ticket.error_code || '—';
  const uiComponent = ticket.ocr_findings?.detected_component || ticket.ocr_findings?.detected_ui_component || ticket.ui_component || '—';
  const businessImpact = ticket.business_impact_score ?? null;
  const affectedWarehouse = ticket.affected_warehouse || ticket.erp_context?.warehouse || '—';
  const affectedProcess = ticket.affected_process || ticket.erp_context?.process || '—';

  const userReportText = ticket.vague_user_input || ticket.structured_description || ticket.title || '—';

  const suspectedRootCauseText =
    ticket?.ai_diagnosis?.root_cause || ticket?.ai_root_cause || 'Diagnosis pending';
  const suggestedPatchText = ticket.ai_diagnosis?.recommended_resolution || ticket.ai_suggested_patch || 'No remediation proposed yet';

  const reproSteps = Array.isArray(ticket.reproduction_steps) && ticket.reproduction_steps.length
    ? ticket.reproduction_steps
    : null;

  // RAG evidence — from this incident's own retrieval
  const topKb = ticket.rag_kb_matches?.[0];
  const topKbTitle = topKb?.article?.title || ticket.rag_evidence?.[0]?.title || null;
  const topKbModule = topKb?.article?.erp_module || null;
  const topKbScore = topKb?.score ?? topKb?.confidence_percentage ?? null;
  const isKbMismatch = Boolean(topKbModule && topKbModule !== ticket.erp_module);
  const grFacts = Array.isArray(ticket.ai_diagnosis?.evidence) ? ticket.ai_diagnosis.evidence : [];
  const liveFacts = Array.isArray(ticket.mcp_evidence) ? ticket.mcp_evidence : [];

  // Dependency tree for THIS incident (fetched from /root-cause-tree) — drives the
  // technical stack diagnostic + execution-chain, no hardcoded inventory scenario.
  const treeNodes = Array.isArray(rcTree?.nodes) ? rcTree.nodes : [];
  const nodeLabel = (type) => treeNodes.find((n) => n.type === type)?.label || null;
  const suspectedService = nodeLabel('service') || (ticket.erp_module ? `${ticket.erp_module}Service` : '—');
  const suspectedFile = nodeLabel('file') || '—';
  const suspectedFunc = nodeLabel('function') || '—';
  const suspectedTable = nodeLabel('database_table') || '—';
  const suspectedTrigger = rcTree?.suspected_trigger || null;

  const getStatusColor = (st) => {
    if (st === 'RESOLVED' || st === 'VERIFIED' || st === 'APPLIED') return { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300', dot: 'bg-emerald-500' };
    if (st === 'VERIFICATION_FAILED' || st === 'FAILED') return { bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300', dot: 'bg-rose-500' };
    if (st === 'ROLLED_BACK' || st === 'REVERTED') return { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300', dot: 'bg-amber-500' };
    return { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300', dot: 'bg-blue-500' };
  };

  const statusStyle = getStatusColor(status);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ==========================================
          1. VISUALLY DOMINANT INCIDENT STATUS HEADER
          ========================================== */}
      <div className="surface p-6 rounded-2xl border border-[var(--border)] shadow-md space-y-5">
        {/* Top Metadata & Navigation Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${statusStyle.dot}`} />
              {status}
            </span>

            {/* Ticket Number */}
            <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-lg bg-accent-subtle-bg text-accent-subtle-text border border-accent-subtle-bd">
              {ticketId}
            </span>

            {/* Correlation ID */}
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg surface-muted border border-[var(--border)] text-muted-color hidden md:inline">
              Ref: {correlationId}
            </span>

            {/* Severity Badge */}
            <span className={`${sevBadgeClass} text-xs font-mono px-2.5 py-1 rounded-lg`}>
              {severityFormatted}
            </span>

            {/* Module Badge */}
            <span className="badge-module text-xs font-mono px-2.5 py-1 rounded-lg">
              {erpModule}
            </span>
          </div>

          {/* Right Action Controls: Two-Way ERP Navigation + Tab Jumpers */}
          <div className="flex items-center gap-2">
            {onNavigateToErp && (
              <button
                onClick={onNavigateToErp}
                className="btn-secondary text-xs font-bold text-accent-color border-accent-color/30 hover:bg-accent-subtle-bg"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Source Transaction in ERP
              </button>
            )}

            <button
              onClick={() => setIsPatchModalOpen(true)}
              className="btn-secondary text-xs"
            >
              <FileCode className="w-3.5 h-3.5" /> Patch Diff
            </button>
          </div>
        </div>

        {/* Title & Ownership Header Row */}
        <div>
          <h1 className="text-xl font-extrabold text-heading leading-snug">
            {ticket.title || `[${erpModule}] ${errorCode}: Operational Failure in ${uiComponent}`}
          </h1>
          <p className="text-xs text-muted-color mt-1">
            Source: <strong className="text-heading">Smart Manufacturing ERP</strong> · Module: <strong className="text-heading">{erpModule}</strong> · Correlation ID: <code className="font-mono text-accent-color">{correlationId}</code>
          </p>
        </div>

        {/* Header SLA Countdown Bar + AI Confidence Meter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
          {/* SLA Timer & Progress Bar */}
          <div className="surface-muted p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-color flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent-color" /> SLA Target Countdown
              </span>
              {slaMinutes == null ? (
                <span className="font-bold text-muted-color">Not tracked</span>
              ) : isSlaAtRisk ? (
                <span className="text-rose-500 font-extrabold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> SLA AT RISK ({slaMinutes}m)
                </span>
              ) : (
                <span className="font-bold text-heading">{slaMinutes} min remaining</span>
              )}
            </div>
            <div className="w-full bg-[var(--bg-page)] h-2 rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
              <div
                className={`h-full rounded-full transition-all ${isSlaAtRisk ? 'bg-rose-500' : 'bg-accent-color'}`}
                style={{ width: slaMinutes == null ? '0%' : `${Math.max(6, Math.min(100, (slaMinutes / 240) * 100))}%` }}
              />
            </div>
          </div>

          {/* Assigned Developer */}
          <div className="surface-muted p-3.5 rounded-xl border border-[var(--border)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-color block">Assigned Developer</span>
              <span className={`text-xs font-extrabold flex items-center gap-1.5 mt-0.5 ${isAssigned ? 'text-heading' : 'text-amber-500'}`}>
                <UserCheck className="w-3.5 h-3.5 text-accent-color" /> {assignedDev}
              </span>
            </div>
          </div>

          {/* AI Confidence Meter */}
          <div className="surface-muted p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-color flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Diagnostic Confidence
              </span>
              <span className="font-extrabold text-amber-500">{hasConfidence ? confidencePercent : 'N/A'}</span>
            </div>
            <div className="w-full bg-[var(--bg-page)] h-2 rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: hasConfidence ? `${Math.round(confidenceScore * 100)}%` : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Workflow action error banner */}
        {actionError && (
          <div className="px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs font-medium text-rose-600 dark:text-rose-300 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><AlertOctagon className="w-3.5 h-3.5 shrink-0" /> {actionError}</span>
            <button onClick={() => setActionError(null)} className="opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)] overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: 'Overview & Summary', icon: Activity },
            { id: 'IMPACT', label: 'Impact & Risk', icon: ShieldAlert },
            { id: 'DIAGNOSIS', label: 'AI Diagnosis & Evidence', icon: Sparkles },
            { id: 'REMEDIATION', label: 'Remediation Plan', icon: ShieldCheck },
            { id: 'VERIFICATION', label: 'Verification Engine', icon: Terminal },
            { id: 'TIMELINE', label: 'Lifecycle Timeline', icon: Clock }
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent-color text-white shadow-sm'
                    : 'text-muted-color hover:text-heading hover:bg-subtle'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          2. INCIDENT RESOLUTION LIFECYCLE & ACTION ENGINE
          ========================================== */}
      <IncidentLifecycleVisualizer
        ticket={ticket}
        verificationResult={verificationResult}
        actionInFlight={actionInFlight}
        onApprove={handleApproveRemediation}
        onRunVerification={() => handleRunVerification(false)}
        onApplyPatch={handleApplyPatch}
        onRollback={() => setIsRollbackModalOpen(true)}
        onReturnToRemediation={handleReturnToRemediation}
        onOpenRemediationTab={() => setActiveTab('REMEDIATION')}
      />

      {/* ==========================================
          3. TRANSPARENT OWNERSHIP & RESPONSIBILITY GRID
          ========================================== */}
      <div className="surface p-5 rounded-2xl border border-[var(--border)] space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-accent-color" /> INCIDENT OWNERSHIP & RESPONSIBILITY MATRIX
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
            <span className="text-muted-color text-[10px] uppercase font-bold block">Incident Source</span>
            <span className="font-bold text-heading block truncate">{incidentSource}</span>
            <span className="text-[10px] text-muted-color">{ticket.erp_module || 'ERP'} · {correlationId}</span>
          </div>

          <div className="p-3 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
            <span className="text-muted-color text-[10px] uppercase font-bold block">Assigned Developer · Owner</span>
            <span className={`font-bold block truncate ${isAssigned ? 'text-accent-color' : 'text-amber-500'}`}>{assignedDev}</span>
            <span className="text-[10px] text-muted-color">Operational owner — investigates &amp; remediates</span>
          </div>

          <div className="p-3 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
            <span className="text-muted-color text-[10px] uppercase font-bold block">Code Reviewer</span>
            <span className="font-bold text-heading block truncate">{reviewerName}</span>
            <span className="text-[10px] text-muted-color">Reviews the patch</span>
          </div>

          <div className="p-3 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
            <span className="text-muted-color text-[10px] uppercase font-bold block">Resolution Owner</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block truncate">{resolutionOwner}</span>
            <span className="text-[10px] text-muted-color">Accountable for MTTR</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          TAB 1: OVERVIEW & SUMMARY
          ========================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5">
          {/* Executive & Technical Summary Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* What Happened? Summary */}
            <div className="surface p-5 rounded-2xl border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-color" /> WHAT HAPPENED? (SUMMARY)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  PLAIN LANGUAGE
                </span>
              </div>
              <p className="text-xs font-medium text-heading leading-relaxed">
                {userReportText}
              </p>
              <div className="pt-2 border-t border-[var(--border)] text-xs text-muted-color space-y-1">
                <div><strong>Module:</strong> {erpModule}</div>
                <div><strong>Error Code:</strong> <code className="font-mono text-rose-500">{errorCode}</code></div>
                <div><strong>UI Component:</strong> <code className="font-mono text-purple-400">{uiComponent}</code></div>
              </div>
            </div>

            {/* Current Technical Context */}
            <div className="surface p-5 rounded-2xl border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-accent-color" /> TECHNICAL STACK DIAGNOSTIC
                </h3>
                <span className="text-[10px] font-mono text-muted-color">DEVELOPER VIEW</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-muted-color block text-[10px]">Component:</span>
                  <code className="text-purple-400 font-bold">{uiComponent}</code>
                </div>
                <div>
                  <span className="text-muted-color block text-[10px]">Service:</span>
                  <code className="text-heading font-bold">{suspectedService}</code>
                </div>
                <div>
                  <span className="text-muted-color block text-[10px]">Suspected File:</span>
                  <code className="text-accent-subtle-text font-bold">{suspectedFile}</code>
                </div>
                <div>
                  <span className="text-muted-color block text-[10px]">Function:</span>
                  <code className="text-amber-400 font-bold">{suspectedFunc}</code>
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--border)] text-xs font-mono">
                <span className="text-muted-color">Suspected Root Cause: </span>
                <strong className="text-heading font-sans block mt-1">{suspectedRootCauseText}</strong>
              </div>
            </div>
          </div>

          {/* Reproduction Steps Card — from this incident's own generated steps */}
          <div className="surface p-5 rounded-2xl border border-[var(--border)] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-accent-color" /> REPRODUCTION STEPS
            </h3>
            {reproSteps ? (
              <ol className="list-decimal list-inside space-y-2 text-xs text-body-color font-mono pl-1">
                {reproSteps.map((step, i) => (
                  <li key={i} className="p-2 rounded bg-subtle border border-[var(--border)]">{step}</li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-color font-mono">No reproduction steps recorded for this incident.</p>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: IMPACT & BUSINESS RISK
          ========================================== */}
      {activeTab === 'IMPACT' && (
        <div className="surface p-6 rounded-2xl border border-[var(--border)] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <h3 className="text-base font-bold text-heading flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> WHAT IS THE IMPACT? (BUSINESS & OPERATIONAL)
            </h3>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Impact Score: {businessImpact != null ? `${businessImpact} / 10` : 'Not scored'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
              <span className="text-muted-color text-[10px] uppercase font-bold block">Affected Facility</span>
              <strong className="text-heading text-sm block">{affectedWarehouse}</strong>
              <span className="text-muted-color text-[10px]">Module: {erpModule}</span>
            </div>

            <div className="p-4 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
              <span className="text-muted-color text-[10px] uppercase font-bold block">Affected Business Process</span>
              <strong className="text-heading text-sm block">{affectedProcess}</strong>
              <span className="text-muted-color text-[10px]">Severity: {severityFormatted}</span>
            </div>

            <div className="p-4 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
              <span className="text-muted-color text-[10px] uppercase font-bold block">Transaction Reference</span>
              <strong className="text-accent-color text-sm block">{correlationId}</strong>
              <span className="text-muted-color text-[10px]">API Correlation Tracking ID</span>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: AI DIAGNOSIS & EVIDENCE
          ========================================== */}
      {activeTab === 'DIAGNOSIS' && (
        <div className="space-y-5">
          <div className="surface p-6 rounded-2xl border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-heading flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> WHAT DID AI FIND & WHY?
              </h3>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {hasConfidence
                  ? `Confidence: ${confidencePercent} (${confidenceScore >= 0.85 ? 'HIGH' : confidenceScore >= 0.6 ? 'MEDIUM' : 'LOW'})`
                  : 'Confidence unavailable'}
              </span>
            </div>

            {/* KB mismatch guardrail banner */}
            {isKbMismatch && (
              <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs font-mono text-amber-600 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Potential Knowledge Base Mismatch:</strong> the top historical match is from module{' '}
                  <code className="font-bold">{topKbModule}</code> but this incident is <code className="font-bold">{erpModule}</code>.
                  Low-relevance evidence is not treated as authoritative — human approval required before deployment.
                </span>
              </div>
            )}

            {/* Technical Execution Path Chain — from this incident's dependency tree */}
            <div className="p-4 rounded-xl surface-muted border border-[var(--border)] space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-color block">
                Technical Path Hierarchy & Execution Chain
              </span>
              {treeNodes.length ? (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  {treeNodes.map((n, i) => (
                    <React.Fragment key={n.id}>
                      {i > 0 && <span className="text-muted-color">&rarr;</span>}
                      <span className={`px-2 py-1 rounded font-bold border border-[var(--border)] ${
                        n.type === 'erp_module' ? 'bg-accent-subtle-bg text-accent-subtle-text'
                        : n.type === 'file' ? 'surface text-purple-400'
                        : n.type === 'function' ? 'surface text-amber-400'
                        : n.type === 'database_table' ? 'surface text-rose-400'
                        : 'surface text-heading'
                      }`}>{n.label}</span>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-color font-mono">Dependency tree not available for this incident.</p>
              )}
              {suspectedTrigger && <p className="text-[10px] font-mono text-muted-color pt-1">Suspected trigger: {suspectedTrigger}</p>}
            </div>

            {/* Grounding Categories & Badges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* FACT */}
              <div className="p-3.5 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">FACT</span>
                  <span className="text-xs font-bold text-heading">Grounded ERP Facts</span>
                </div>
                <ul className="text-xs font-mono text-muted-color space-y-1 pl-1">
                  <li>• Error Code: <code className="text-rose-500 font-bold">{errorCode}</code></li>
                  <li>• Module: <code className="text-heading font-bold">{erpModule}</code></li>
                  {grFacts.slice(0, 3).map((fct, i) => (
                    <li key={i}>• {typeof fct === 'string' ? fct : fct.fact || fct.detail || JSON.stringify(fct)}</li>
                  ))}
                  {liveFacts.slice(0, 2).map((lf, i) => (
                    <li key={`l${i}`}>• {lf.fact || lf.summary || lf.tool || JSON.stringify(lf)}</li>
                  ))}
                  {grFacts.length === 0 && liveFacts.length === 0 && (
                    <li className="text-muted-color/70">No additional grounded facts recorded.</li>
                  )}
                </ul>
              </div>

              {/* AI INFERENCE */}
              <div className="p-3.5 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">AI INFERENCE</span>
                  <span className="text-xs font-bold text-heading">Probabilistic Root Cause</span>
                </div>
                <p className="text-xs text-body-color leading-relaxed font-sans">{suspectedRootCauseText}</p>
                <span className="text-[10px] font-mono text-muted-color block">Note: AI inference is probabilistic and requires human review — it is not a confirmed fact.</span>
              </div>

              {/* HISTORICAL EVIDENCE */}
              <div className="p-3.5 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">HISTORICAL EVIDENCE</span>
                  <span className="text-xs font-bold text-heading">Vector Knowledge Match</span>
                </div>
                {topKbTitle ? (
                  <p className="text-xs text-muted-color font-mono">
                    Matched <strong className="text-heading">{topKbTitle}</strong>
                    {topKbModule && <> ({topKbModule})</>}
                    {topKbScore != null && <> · <strong>{typeof topKbScore === 'number' && topKbScore <= 1 ? `${Math.round(topKbScore * 100)}%` : topKbScore} similarity</strong></>}
                    {isKbMismatch && <span className="text-amber-500 font-bold"> — module mismatch</span>}
                  </p>
                ) : (
                  <p className="text-xs text-muted-color font-mono">No historical knowledge-base match retrieved for this incident.</p>
                )}
              </div>

              {/* RECOMMENDATION */}
              <div className="p-3.5 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">RECOMMENDATION</span>
                  <span className="text-xs font-bold text-heading">Proposed Fix</span>
                </div>
                <p className="text-xs text-muted-color font-mono line-clamp-3">{suggestedPatchText}</p>
                <span className="text-[10px] font-mono text-amber-500 font-bold block pt-1">Requires human developer approval before deployment.</span>
              </div>
            </div>

            {/* AI Insights Embedded Sub-Panel */}
            <div className="pt-3 border-t border-[var(--border)]">
              <AIInsightsPanel ticket={ticket} />
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: REMEDIATION PLAN
          ========================================== */}
      {activeTab === 'REMEDIATION' && (
        <RemediationCenter
          ticket={ticket}
          remediation={remediation}
          onApprove={handleApproveRemediation}
          onReject={handleRejectRemediation}
          onViewPatch={() => setIsPatchModalOpen(true)}
          onStartVerification={() => handleRunVerification(false)}
        />
      )}

      {/* ==========================================
          TAB 5: VERIFICATION ENGINE
          ========================================== */}
      {activeTab === 'VERIFICATION' && (
        <VerificationPanel
          verificationResult={verificationResult}
          onRunVerification={() => handleRunVerification(false)}
          onApplyPatch={handleApplyPatch}
          onSimulateFailure={() => handleRunVerification(true)}
        />
      )}

      {/* ==========================================
          TAB 6: LIFECYCLE TIMELINE
          ========================================== */}
      {activeTab === 'TIMELINE' && (
        <RemediationTimeline auditLogs={auditLogs} />
      )}

      {/* Patch Preview Modal */}
      {isPatchModalOpen && (
        <PatchPreviewModal
          patchData={patchData}
          onClose={() => setIsPatchModalOpen(false)}
          onApprove={() => {
            setIsPatchModalOpen(false);
            handleApproveRemediation();
          }}
          onReject={() => setIsPatchModalOpen(false)}
        />
      )}

      {/* Rollback Modal */}
      {isRollbackModalOpen && (
        <RollbackModal
          isOpen={isRollbackModalOpen}
          onClose={() => setIsRollbackModalOpen(false)}
          onConfirmRollback={async (reason) => {
            const res = await handleRollbackConfirm(reason);
            setIsRollbackModalOpen(false);
            return res;
          }}
          currentVersion={remediation?.current_version || patchData?.current_version || ticket.patch_version || '—'}
          previousVersion={remediation?.baseline_version || '—'}
        />
      )}
    </div>
  );
}
