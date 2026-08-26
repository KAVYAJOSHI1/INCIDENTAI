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
import * as api from '../../services/apiClient';

const SEV_BADGE = {
  P0_CRITICAL: 'badge-p0',
  P1_HIGH:     'badge-p1',
  P2_MEDIUM:   'badge-p2',
  P3_LOW:      'badge-p3',
};

export default function JiraTicketView({ ticket, onMergeDuplicate, onAssignDeveloper, onNavigateToErp }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isReproduceOpen, setIsReproduceOpen] = useState(true);
  const [copiedPatch, setCopiedPatch] = useState(false);

  // Remediation & Patch State
  const [remediation, setRemediation] = useState(null);
  const [patchData, setPatchData] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);

  useEffect(() => {
    if (ticket?.id) {
      loadTicketData(ticket.id);
    }
  }, [ticket?.id]);

  const loadTicketData = async (id) => {
    try {
      const [rem, pt, logs] = await Promise.all([
        api.fetchRemediation(id).catch(() => null),
        api.fetchPatch(id).catch(() => null),
        api.fetchAuditLogs(id).catch(() => [])
      ]);
      if (rem) setRemediation(rem);
      if (pt) setPatchData(pt);
      if (logs) setAuditLogs(logs);
    } catch (err) {
      console.error("Failed to load remediation data for ticket:", err);
    }
  };

  const handleApproveRemediation = async () => {
    if (!ticket?.id) return;
    try {
      const updated = await api.approveRemediation(ticket.id, "Marcus Vance");
      setRemediation(updated);
      await loadTicketData(ticket.id);
    } catch (err) {
      console.error("Approve failed:", err);
    }
  };

  const handleRejectRemediation = async (reason) => {
    if (!ticket?.id) return;
    try {
      const updated = await api.rejectRemediation(ticket.id, reason, "Marcus Vance");
      setRemediation(updated);
      await loadTicketData(ticket.id);
    } catch (err) {
      console.error("Reject failed:", err);
    }
  };

  const handleRunVerification = async (simulateFail = false) => {
    if (!ticket?.id) return;
    try {
      const res = await api.verifyPatch(ticket.id, { simulate_failure: simulateFail });
      setVerificationResult(res);
      await loadTicketData(ticket.id);
      setActiveTab('VERIFICATION');
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };

  const handleApplyPatch = async () => {
    if (!ticket?.id) return;
    try {
      await api.applyPatch(ticket.id, "Marcus Vance");
      await loadTicketData(ticket.id);
      setActiveTab('TIMELINE');
    } catch (err) {
      console.error("Apply patch failed:", err);
    }
  };

  const handleRollbackConfirm = async (reason) => {
    if (!ticket?.id) return;
    const res = await api.rollbackPatch(ticket.id, reason, "Marcus Vance");
    await loadTicketData(ticket.id);
    return res;
  };

  if (!ticket) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No Incident Selected"
        description="Select an incident from the Triage Feed to view its investigation dashboard."
      />
    );
  }

  // Ticket fields normalization
  const ticketId = ticket.ticket_number || ticket.id || 'INC-79613-6322';
  const correlationId = ticket.correlation_id || `ERP-${ticket.erp_module || 'INV'}-W2-20260826-1042`;

  const rawSeverity = ticket.severity || 'P3_LOW';
  const sevBadgeClass = SEV_BADGE[rawSeverity] || 'badge-p3';
  const severityFormatted = rawSeverity.includes('_')
    ? `${rawSeverity.split('_')[0]} · ${rawSeverity.split('_')[1]}`
    : rawSeverity;

  const erpModule = ticket.erp_module || 'INVENTORY';
  const status = ticket.remediation_status || ticket.status || 'IN_PROGRESS';
  const slaMinutes = ticket.sla_remaining_minutes != null ? ticket.sla_remaining_minutes : 240;
  const isSlaAtRisk = slaMinutes < 30 && status !== 'RESOLVED';

  const confidenceScore = ticket.ai_confidence ?? 0.65;
  const confidencePercent = `${Math.round(confidenceScore * 100)}%`;

  const reporter = ticket.reporter || 'ERP Operator (John Doe)';
  const assignedDev = ticket.assigned_dev_name || 'Marcus Vance';
  const reviewerName = ticket.reviewer_name || 'Sarah Chen';
  const resolutionOwner = ticket.resolution_owner || assignedDev;

  const errorCode = ticket.ocr_findings?.extracted_error_code || ticket.error_code || 'ERR_STOCK_NEG';
  const uiComponent = ticket.ocr_findings?.detected_component || ticket.ui_component || 'BinTransferGrid';
  const businessImpact = ticket.business_impact_score || 6;
  const affectedWarehouse = ticket.affected_warehouse || (erpModule === 'INVENTORY' ? 'WH-A / Bin W2' : 'Primary Operations Center');
  const affectedProcess = ticket.affected_process || (erpModule === 'INVENTORY' ? 'Warehouse Stock Movement' : 'ERP Transaction Workflow');

  const userReportText = ticket.vague_user_input || ticket.structured_description ||
    "ERR_STOCK_NEG: Negative quantity violation during stock transfer in warehouse bin W2";

  const suspectedRootCauseText = ticket.ai_root_cause || "Stale inventory cache read before transfer validation";
  const suggestedPatchText = ticket.ai_suggested_patch || "EXEC redis-cli DEL inv_stock:SK-902 && SELECT sync_inventory_cache('SK-902');";

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
              {isSlaAtRisk ? (
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
                style={{ width: `${Math.max(10, Math.min(100, (slaMinutes / 240) * 100))}%` }}
              />
            </div>
          </div>

          {/* Assigned Developer */}
          <div className="surface-muted p-3.5 rounded-xl border border-[var(--border)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-color block">Assigned Developer</span>
              <span className="text-xs font-extrabold text-heading flex items-center gap-1.5 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-accent-color" /> {assignedDev}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
              Active: 4/5
            </span>
          </div>

          {/* AI Confidence Meter */}
          <div className="surface-muted p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-color flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Diagnostic Confidence
              </span>
              <span className="font-extrabold text-amber-500">{confidencePercent}</span>
            </div>
            <div className="w-full bg-[var(--bg-page)] h-2 rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: confidencePercent }}
              />
            </div>
          </div>
        </div>

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
          2. DYNAMIC "WHAT HAPPENS NEXT?" PROMPT BOX
          ========================================== */}
      <div className="surface p-5 rounded-2xl border border-accent-color/30 bg-accent-subtle-bg/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-accent-color" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading">
              CURRENT SITUATION & WHAT HAPPENS NEXT?
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-color text-white">
            RECOMMENDED NEXT ACTION
          </span>
        </div>

        {/* Context Prompt Text based on Status */}
        <p className="text-xs font-medium text-body-color leading-relaxed">
          {status === 'VERIFICATION_FAILED' ? (
            <>
              ❌ <strong className="text-rose-500">Post-patch verification suite failed.</strong> Stock constraint race condition detected during concurrency check. Action required: Developer <strong>{assignedDev}</strong> must review rollback options and initiate controlled rollback.
            </>
          ) : status === 'APPROVED' || status === 'REMEDIATION_PENDING' ? (
            <>
              ✓ <strong className="text-emerald-500">Remediation plan approved by {assignedDev}.</strong> Action required: Execute automated verification suite to validate syntax, unit tests, and regression constraints.
            </>
          ) : status === 'VERIFICATION' || status === 'VERIFIED' ? (
            <>
              ✓ <strong className="text-emerald-500">Verification suite passed 5/5 checks.</strong> Action required: Apply verified patch v1.4.9 to target environment and resolve incident.
            </>
          ) : status === 'RESOLVED' || status === 'APPLIED' ? (
            <>
              ✓ <strong className="text-emerald-500">Incident successfully resolved and verified.</strong> Knowledge article written back to RAG Knowledge Base.
            </>
          ) : (
            <>
              ⚠ <strong className="text-amber-500">Incident is currently in progress.</strong> AI has generated a proposed fix with <strong>{confidencePercent} confidence</strong>. Action required: Developer <strong>{assignedDev}</strong> must review and approve the remediation plan.
            </>
          )}
        </p>

        {/* Dynamic CTA Button */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border)]">
          {status === 'VERIFICATION_FAILED' ? (
            <button
              onClick={() => setIsRollbackModalOpen(true)}
              className="btn-primary text-xs bg-rose-600 hover:bg-rose-500"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Initiate Controlled Rollback
            </button>
          ) : status === 'APPROVED' || status === 'REMEDIATION_PENDING' ? (
            <button
              onClick={() => handleRunVerification(false)}
              className="btn-primary text-xs"
            >
              <Terminal className="w-3.5 h-3.5" /> Start Automated Verification Engine
            </button>
          ) : status === 'VERIFICATION' || status === 'VERIFIED' ? (
            <button
              onClick={handleApplyPatch}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Apply Patch & Resolve Incident
            </button>
          ) : status === 'RESOLVED' || status === 'APPLIED' ? (
            <span className="text-xs font-mono font-bold text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Incident Fully Resolved
            </span>
          ) : (
            <button
              onClick={() => setActiveTab('REMEDIATION')}
              className="btn-primary text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Review & Approve Remediation Plan
            </button>
          )}
        </div>
      </div>

      {/* ==========================================
          3. TRANSPARENT OWNERSHIP & RESPONSIBILITY GRID
          ========================================== */}
      <div className="surface p-5 rounded-2xl border border-[var(--border)] space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-heading flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-accent-color" /> INCIDENT OWNERSHIP & RESPONSIBILITY MATRIX
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
            <span className="text-muted-color text-[10px] uppercase font-bold block">Incident Reporter</span>
            <span className="font-bold text-heading block truncate">{reporter}</span>
            <span className="text-[10px] text-muted-color">Role: ERP Operator</span>
          </div>

          <div className="p-3 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
            <span className="text-muted-color text-[10px] uppercase font-bold block">Assigned Developer</span>
            <span className="font-bold text-accent-color block truncate">{assignedDev}</span>
            <span className="text-[10px] text-muted-color">Capacity: 4/5 tickets</span>
          </div>

          <div className="p-3 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
            <span className="text-muted-color text-[10px] uppercase font-bold block">Code Reviewer</span>
            <span className="font-bold text-heading block truncate">{reviewerName}</span>
            <span className="text-[10px] text-muted-color">Role: Senior Architect</span>
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
                  <code className="text-heading font-bold">{erpModule}Service</code>
                </div>
                <div>
                  <span className="text-muted-color block text-[10px]">Suspected File:</span>
                  <code className="text-accent-subtle-text font-bold">inventory/binTransfer.js</code>
                </div>
                <div>
                  <span className="text-muted-color block text-[10px]">Function:</span>
                  <code className="text-amber-400 font-bold">validateStockQuantity()</code>
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--border)] text-xs font-mono">
                <span className="text-muted-color">Suspected Root Cause: </span>
                <strong className="text-heading font-sans block mt-1">{suspectedRootCauseText}</strong>
              </div>
            </div>
          </div>

          {/* Reproduction Steps Card */}
          <div className="surface p-5 rounded-2xl border border-[var(--border)] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-accent-color" /> EXACT REPRODUCTION STEPS
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-body-color font-mono pl-1">
              <li className="p-2 rounded bg-subtle border border-[var(--border)]">Open ERP Workspace → {erpModule} Module</li>
              <li className="p-2 rounded bg-subtle border border-[var(--border)]">Navigate to Bin Transfers → Select SKU SK-902 (Industrial Motor Assembly)</li>
              <li className="p-2 rounded bg-subtle border border-[var(--border)]">Select From Bin W1 (Available: 84 units) → To Bin W2</li>
              <li className="p-2 rounded bg-subtle border border-[var(--border)]">Enter Transfer Quantity: 100 units (&gt; 84 available balance)</li>
              <li className="p-2 rounded bg-subtle border border-[var(--border)]">Click Submit Transfer → Observe exception pop-up <code className="text-rose-500 font-bold">{errorCode}</code></li>
            </ol>
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
              Impact Score: {businessImpact} / 10
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
              <span className="text-muted-color text-[10px] uppercase font-bold block">Affected Facility / Bin</span>
              <strong className="text-heading text-sm block">{affectedWarehouse}</strong>
              <span className="text-muted-color text-[10px]">Warehouse Zone WH-A</span>
            </div>

            <div className="p-4 rounded-xl bg-subtle border border-[var(--border)] space-y-1">
              <span className="text-muted-color text-[10px] uppercase font-bold block">Affected Business Process</span>
              <strong className="text-heading text-sm block">{affectedProcess}</strong>
              <span className="text-muted-color text-[10px]">Stock Movements & Fulfillment</span>
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
                Confidence: {confidencePercent} (MEDIUM CONFIDENCE)
              </span>
            </div>

            {/* Technical Execution Path Chain */}
            <div className="p-4 rounded-xl surface-muted border border-[var(--border)] space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-color block">
                Technical Path Hierarchy & Execution Chain
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="px-2 py-1 rounded bg-accent-subtle-bg text-accent-subtle-text font-bold">INVENTORY</span>
                <span className="text-muted-color">&rarr;</span>
                <span className="px-2 py-1 rounded surface border border-[var(--border)] font-bold text-heading">InventoryService</span>
                <span className="text-muted-color">&rarr;</span>
                <span className="px-2 py-1 rounded surface border border-[var(--border)] font-bold text-purple-400">inventory/binTransfer.js</span>
                <span className="text-muted-color">&rarr;</span>
                <span className="px-2 py-1 rounded surface border border-[var(--border)] font-bold text-amber-400">validateStockQuantity()</span>
                <span className="text-muted-color">&rarr;</span>
                <span className="px-2 py-1 rounded surface border border-[var(--border)] font-bold text-rose-400">inv_stock_cache</span>
              </div>
            </div>

            {/* Grounding Categories & Badges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* FACT */}
              <div className="p-3.5 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    FACT
                  </span>
                  <span className="text-xs font-bold text-heading">Grounded ERP Facts</span>
                </div>
                <ul className="text-xs font-mono text-muted-color space-y-1 pl-1">
                  <li>• Error Code: <code className="text-rose-500 font-bold">{errorCode}</code></li>
                  <li>• Bin Location: <code className="text-heading font-bold">{affectedWarehouse}</code></li>
                  <li>• Transfer Requested: <code className="text-rose-400 font-bold">100 units &gt; 84 available</code></li>
                </ul>
              </div>

              {/* AI INFERENCE */}
              <div className="p-3.5 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    AI INFERENCE
                  </span>
                  <span className="text-xs font-bold text-heading">Probabilistic Root Cause</span>
                </div>
                <p className="text-xs text-body-color leading-relaxed font-sans">
                  {suspectedRootCauseText}
                </p>
                <span className="text-[10px] font-mono text-muted-color block">Note: AI Inference is probabilistic and requires human review.</span>
              </div>

              {/* HISTORICAL EVIDENCE */}
              <div className="p-3.5 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    HISTORICAL EVIDENCE
                  </span>
                  <span className="text-xs font-bold text-heading">Vector Knowledge Match</span>
                </div>
                <p className="text-xs text-muted-color font-mono">
                  Matched Article <strong className="text-heading">KB-802 (Concurrency Stock Lock)</strong> with <strong>88% RAG similarity score</strong>.
                </p>
              </div>

              {/* RECOMMENDATION */}
              <div className="p-3.5 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    RECOMMENDATION
                  </span>
                  <span className="text-xs font-bold text-heading">Proposed Fix</span>
                </div>
                <p className="text-xs text-muted-color font-mono line-clamp-2">
                  {suggestedPatchText}
                </p>
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
          ticket={ticket}
          remediation={remediation}
          onClose={() => setIsRollbackModalOpen(false)}
          onRollback={handleRollbackConfirm}
        />
      )}
    </div>
  );
}
