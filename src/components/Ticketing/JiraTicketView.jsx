import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, GitMerge, CheckCircle2, User, Clock,
  AlertTriangle, Layers, BookOpen, FileSearch, Terminal, Sparkles,
  ChevronDown, ChevronUp, Copy, AlertCircle, ArrowRight, ArrowLeft, ArrowDown,
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
import PipelineStrip from '../Pipeline/PipelineStrip';
import * as api from '../../services/apiClient';

/** Condenses one MCP evidence item into a short human-readable fact line. */
function summarizeMcpEvidence(ev) {
  if (!ev || ev.status !== 200) return ev?.error || 'unavailable';
  const d = ev.data || {};
  if (Array.isArray(d.inventory) && d.inventory.length) {
    return d.inventory
      .slice(0, 3)
      .map((r) => `${r.sku} @ ${r.warehouse}/${r.bin}: ${r.available_qty} available`)
      .join(' · ');
  }
  if (Array.isArray(d.transactions) && d.transactions.length) {
    const t = d.transactions[0];
    return `${t.type} ${t.id}: ${t.status}${t.reason ? ` — ${t.reason}` : ''}`;
  }
  if (Array.isArray(d.invoices) && d.invoices.length) {
    const i = d.invoices[0];
    return `${i.id}: ${i.status}${i.reason ? ` — ${i.reason}` : ''}`;
  }
  if (d.overall) return `ERP service health: ${d.overall}${d.note ? ` (${d.note})` : ''}`;
  return JSON.stringify(d).slice(0, 160);
}

const SEV_BADGE = {
  P0_CRITICAL: 'badge-p0',
  P1_HIGH:     'badge-p1',
  P2_MEDIUM:   'badge-p2',
  P3_LOW:      'badge-p3',
};

export default function JiraTicketView({
  ticket,
  userRole,
  currentUser,
  developers = [],
  currentSubpage = 'overview',
  onNavigateSubpage,
  onBackToQueue,
  onMergeDuplicate,
  onAssignDeveloper,
  onNavigateToErp,
  onTicketUpdated
}) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isReproduceOpen, setIsReproduceOpen] = useState(true);
  const [copiedPatch, setCopiedPatch] = useState(false);

  // Sync activeTab state with route currentSubpage
  useEffect(() => {
    if (currentSubpage) {
      const s = currentSubpage.toLowerCase();
      if (s === 'timeline' || s === 'lifecycle') setActiveTab('TIMELINE');
      else if (s === 'impact' || s === 'risks') setActiveTab('IMPACT');
      else if (s === 'diagnosis') setActiveTab('DIAGNOSIS');
      else if (s === 'remediation') setActiveTab('REMEDIATION');
      else if (s === 'verification') setActiveTab('VERIFICATION');
      else setActiveTab('OVERVIEW');
    }
  }, [currentSubpage]);

  const handleSubpageNavigation = (subpageKey) => {
    const s = subpageKey.toLowerCase();
    if (s === 'timeline' || s === 'lifecycle') setActiveTab('TIMELINE');
    else if (s === 'impact' || s === 'risks') setActiveTab('IMPACT');
    else if (s === 'diagnosis') setActiveTab('DIAGNOSIS');
    else if (s === 'remediation') setActiveTab('REMEDIATION');
    else if (s === 'verification') setActiveTab('VERIFICATION');
    else setActiveTab('OVERVIEW');

    if (onNavigateSubpage) {
      onNavigateSubpage(s);
    } else if (ticket?.id) {
      window.history.pushState({}, '', `/incident/${ticket.id}/${s}`);
    }
  };

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
    }, { onSuccessTab: 'REMEDIATION' });

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

  // ── Ticket field normalization ──
  const ticketId = ticket.ticket_number || ticket.id;
  const correlationId = ticket.correlation_id || '—';

  const rawSeverity = ticket.severity || 'P3_LOW';
  const sevBadgeClass = SEV_BADGE[rawSeverity] || 'badge-p3';
  const severityFormatted = rawSeverity.includes('_')
    ? `${rawSeverity.split('_')[0]} · ${rawSeverity.split('_')[1]}`
    : rawSeverity;

  const erpModule = ticket.erp_module || 'Unknown module';
  const status = ticket.status || ticket.remediation_status || 'NEW';
  const slaMinutes = ticket.sla_remaining_minutes != null ? ticket.sla_remaining_minutes : null;
  const isSlaAtRisk = slaMinutes != null && slaMinutes < 30 && status !== 'RESOLVED';

  const confidenceScore = ticket.ai_confidence;
  const hasConfidence = confidenceScore != null;
  const confidencePercent = hasConfidence ? `${Math.round(confidenceScore * 100)}%` : 'Confidence unavailable';

  const incidentSource = ticket.erp_context?.erp || 'Smart Manufacturing ERP';
  const isAssigned = Boolean(ticket.assigned_dev_name || ticket.assigned_dev_id);
  const assignedDev = ticket.assigned_dev_name || 'Unassigned';

  const isAssignedToCurrentUser = Boolean(
    currentUser && (
      (ticket.assigned_dev_id && (ticket.assigned_dev_id === currentUser.id || ticket.assigned_dev_id === currentUser.devId)) ||
      (ticket.assigned_dev_name && currentUser.name && (
        ticket.assigned_dev_name.toLowerCase() === currentUser.name.toLowerCase() ||
        ticket.assigned_dev_name.toLowerCase().includes(currentUser.name.split(' ')[0].toLowerCase()) ||
        currentUser.name.toLowerCase().includes(ticket.assigned_dev_name.split(' ')[0].toLowerCase())
      ))
    )
  );

  const allDevsList = (developers && developers.length > 0) ? developers : [
    { id: 'dev_01', name: 'Alex Mercer' },
    { id: 'dev_02', name: 'Sarah Jenkins' },
    { id: 'dev_03', name: 'Marcus Vance' },
    { id: 'dev_04', name: 'Priya Sharma' },
    { id: 'dev_05', name: 'Devi Developer' }
  ];

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

  // RAG evidence
  const topKb = ticket.rag_kb_matches?.[0];
  const topKbTitle = topKb?.article?.title || ticket.rag_evidence?.[0]?.title || null;
  const topKbModule = topKb?.article?.erp_module || null;
  const topKbScore = topKb?.score ?? topKb?.confidence_percentage ?? null;
  const isKbMismatch = Boolean(topKbModule && topKbModule !== ticket.erp_module);
  const grFacts = Array.isArray(ticket.ai_diagnosis?.evidence) ? ticket.ai_diagnosis.evidence : [];
  const liveFacts = Array.isArray(ticket.mcp_evidence) ? ticket.mcp_evidence : [];

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
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={() => {
            if (onBackToQueue) onBackToQueue();
            else handleSubpageNavigation('overview');
          }}
          className="flex items-center gap-2 text-xs font-bold text-muted-color hover:text-heading transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-accent-color" /> Back to Incident Queue
        </button>

        <span className="text-[11px] font-mono text-muted-color hidden sm:inline">
          Workspace Route: <code className="text-accent-color font-mono font-bold">/incident/{ticketId}/{currentSubpage || 'overview'}</code>
        </span>
      </div>

      {/* Header */}
      <div className="surface p-6 rounded-2xl border border-[var(--border)] shadow-md space-y-5">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${statusStyle.dot}`} />
              {status}
            </span>

            <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-lg bg-accent-subtle-bg text-accent-subtle-text border border-accent-subtle-bd">
              {ticketId}
            </span>

            <span className="text-xs font-mono px-2.5 py-1 rounded-lg surface-muted border border-[var(--border)] text-muted-color hidden md:inline">
              Ref: {correlationId}
            </span>

            <span className={`${sevBadgeClass} text-xs font-mono px-2.5 py-1 rounded-lg`}>
              {severityFormatted}
            </span>

            <span className="badge-module text-xs font-mono px-2.5 py-1 rounded-lg">
              {erpModule}
            </span>
          </div>

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

        {/* Title */}
        <div>
          <h1 className="text-xl font-extrabold text-heading leading-snug">
            {ticket.title || `[${erpModule}] ${errorCode}: Operational Failure in ${uiComponent}`}
          </h1>
          <p className="text-xs text-muted-color mt-1">
            Source: <strong className="text-heading">Smart Manufacturing ERP</strong> · Module: <strong className="text-heading">{erpModule}</strong> · Correlation ID: <code className="font-mono text-accent-color">{correlationId}</code>
          </p>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
          <div className="surface-muted p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-color flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent-color" /> SLA Countdown
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

          {/* Assigned Developer & Ownership Context */}
          <div className="surface-muted p-3.5 rounded-xl border border-[var(--border)] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-color block">Assigned Developer</span>
              {isAssignedToCurrentUser ? (
                <span className="text-xs font-extrabold flex items-center gap-1.5 mt-0.5 text-emerald-400">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {ticket.assigned_dev_name || currentUser?.name || 'Devi Developer'}
                  <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-1">
                    YOUR INCIDENT
                  </span>
                </span>
              ) : isAssigned ? (
                <span className="text-xs font-extrabold flex items-center gap-1.5 mt-0.5 text-heading">
                  <UserCheck className="w-3.5 h-3.5 text-accent-color shrink-0" /> {assignedDev}
                </span>
              ) : (
                <span className="text-xs font-extrabold flex items-center gap-1.5 mt-0.5 text-amber-500">
                  <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Unassigned
                </span>
              )}
            </div>

            {onAssignDeveloper && (
              <div className="flex items-center gap-2">
                {!isAssignedToCurrentUser ? (
                  <button
                    onClick={() => {
                      const devId = (currentUser?.id === 'user_demo_developer') ? 'dev_05' : (currentUser?.id || currentUser?.devId || 'dev_05');
                      onAssignDeveloper(ticket.id, devId);
                    }}
                    className="btn-primary text-xs py-1.5 px-3 font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {isAssigned ? 'Reassign to Me' : 'Claim Ticket & Assign to Me'}
                  </button>
                ) : userRole === 'executive' ? (
                  <select
                    value={ticket.assigned_dev_id || ''}
                    onChange={(e) => onAssignDeveloper(ticket.id, e.target.value)}
                    className="input-field text-xs py-1 px-2 font-bold text-accent-color bg-subtle border border-[var(--border)] rounded-lg cursor-pointer"
                  >
                    <option value="" disabled>Reassign Dev...</option>
                    {allDevsList.map((dev) => (
                      <option key={dev.id} value={dev.id}>{dev.name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onAssignDeveloper(ticket.id, e.target.value);
                    }}
                    className="input-field text-xs py-1 px-2 font-medium text-muted-color bg-subtle border border-[var(--border)] rounded-lg cursor-pointer hover:text-heading"
                  >
                    <option value="">Transfer Ownership...</option>
                    {allDevsList
                      .filter((d) => d.name !== currentUser?.name && d.id !== currentUser?.id && d.name !== 'Devi Developer')
                      .map((dev) => (
                        <option key={dev.id} value={dev.id}>
                          Transfer to {dev.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="surface-muted p-3.5 rounded-xl border border-[var(--border)] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-color flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Confidence
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

        {actionError && (
          <div className="px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs font-medium text-rose-600 dark:text-rose-300 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><AlertOctagon className="w-3.5 h-3.5 shrink-0" /> {actionError}</span>
            <button onClick={() => setActionError(null)} className="opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Sub-Navigation Tabs for Selected Incident */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[var(--border)] overflow-x-auto">
          {[
            { id: 'OVERVIEW', route: 'overview', label: 'Overview & Summary', icon: FileSearch },
            { id: 'IMPACT', route: 'impact', label: 'Impact & Risks', icon: ShieldAlert },
            { id: 'DIAGNOSIS', route: 'diagnosis', label: 'AI Diagnosis & Evidence', icon: Sparkles },
            { id: 'REMEDIATION', route: 'remediation', label: 'Remediation Plan', icon: FileCode },
            { id: 'VERIFICATION', route: 'verification', label: 'Verification Engine', icon: ShieldCheck },
            { id: 'TIMELINE', route: 'lifecycle', label: 'Lifecycle Timeline', icon: Clock }
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSubpageNavigation(tab.route)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
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

      {/* AI Investigation Pipeline — visible on every tab, fixed to this incident */}
      <PipelineStrip ticket={ticket} />

      {/* PAGE 1: OVERVIEW & SUMMARY */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5">
          <div className="surface p-6 rounded-2xl border border-[var(--border)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-accent-color" /> INCIDENT OVERVIEW & EXECUTIVE SUMMARY
              </h3>
              <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                EXECUTIVE SUMMARY
              </span>
            </div>
            <p className="text-sm font-medium text-heading leading-relaxed">
              {userReportText}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[var(--border)] text-xs font-mono">
              <div className="p-3 rounded-xl surface-muted border border-[var(--border)] space-y-1">
                <span className="text-muted-color text-[10px] uppercase font-bold block">Module</span>
                <strong className="text-heading font-bold">{erpModule}</strong>
              </div>
              <div className="p-3 rounded-xl surface-muted border border-[var(--border)] space-y-1">
                <span className="text-muted-color text-[10px] uppercase font-bold block">Error Code</span>
                <strong className="text-rose-400 font-bold">{errorCode}</strong>
              </div>
              <div className="p-3 rounded-xl surface-muted border border-[var(--border)] space-y-1">
                <span className="text-muted-color text-[10px] uppercase font-bold block">Detected Component</span>
                <strong className="text-purple-400 font-bold">{uiComponent}</strong>
              </div>
            </div>
          </div>

          <div className="surface p-6 rounded-2xl border border-[var(--border)] space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent-color" /> STEP-BY-STEP REPRODUCTION
            </h3>
            {reproSteps ? (
              <ol className="space-y-2.5 text-xs text-body-color font-mono">
                {reproSteps.map((step, i) => (
                  <li key={i} className="p-3 rounded-xl surface-muted border border-[var(--border)] flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-accent-color/10 text-accent-color font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-color font-mono p-4 rounded-xl surface-muted border border-[var(--border)]">
                No reproduction steps recorded for this incident.
              </p>
            )}
          </div>

          <div className="surface p-6 rounded-2xl border border-[var(--border)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
                <Code2 className="w-4 h-4 text-accent-color" /> TECHNICAL DIAGNOSTIC METADATA
              </h3>
              <span className="text-[10px] font-mono text-muted-color">SYSTEM LOGS</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl surface-muted border border-[var(--border)] space-y-1">
                <span className="text-muted-color block text-[10px]">Suspected Service:</span>
                <code className="text-heading font-bold">{suspectedService}</code>
              </div>
              <div className="p-3 rounded-xl surface-muted border border-[var(--border)] space-y-1">
                <span className="text-muted-color block text-[10px]">Suspected File:</span>
                <code className="text-accent-subtle-text font-bold">{suspectedFile}</code>
              </div>
              <div className="p-3 rounded-xl surface-muted border border-[var(--border)] space-y-1">
                <span className="text-muted-color block text-[10px]">Function:</span>
                <code className="text-amber-400 font-bold">{suspectedFunc}</code>
              </div>
              <div className="p-3 rounded-xl surface-muted border border-[var(--border)] space-y-1">
                <span className="text-muted-color block text-[10px]">Database Table:</span>
                <code className="text-emerald-400 font-bold">{suspectedTable}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2: IMPACT & RISK */}
      {activeTab === 'IMPACT' && (
        <div className="space-y-5">
          <div className="surface p-6 rounded-2xl border border-[var(--border)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> BUSINESS IMPACT EVALUATION
              </h3>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Impact Rating: {businessImpact != null ? `${businessImpact} / 10` : 'Unrated'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <span className="text-muted-color text-[10px] uppercase font-bold block">Affected Facility / Warehouse</span>
                <strong className="text-heading text-base block">{affectedWarehouse}</strong>
                <span className="text-muted-color text-[10px]">Physical Operations Location</span>
              </div>

              <div className="p-4 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <span className="text-muted-color text-[10px] uppercase font-bold block">Affected Business Process</span>
                <strong className="text-heading text-base block">{affectedProcess}</strong>
                <span className="text-muted-color text-[10px]">Workflow Sequence</span>
              </div>

              <div className="p-4 rounded-xl surface-muted border border-[var(--border)] space-y-1.5">
                <span className="text-muted-color text-[10px] uppercase font-bold block">API Correlation Reference</span>
                <strong className="text-accent-color text-base block">{correlationId}</strong>
                <span className="text-muted-color text-[10px]">ERP Transaction Tracking ID</span>
              </div>
            </div>
          </div>

          <div className="surface p-6 rounded-2xl border border-[var(--border)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-color" /> SLA TARGET COUNTDOWN & GUARANTEE
              </h3>
              {isSlaAtRisk ? (
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> SLA AT RISK ({slaMinutes}m remaining)
                </span>
              ) : (
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {slaMinutes != null ? `${slaMinutes} MIN REMAINING` : 'SLA NORMAL'}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-color">Target Resolution SLA Window</span>
                <span className="font-bold text-heading">{slaMinutes != null ? `${slaMinutes} / 240 Minutes` : 'Standard SLA'}</span>
              </div>
              <div className="w-full bg-[var(--bg-page)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
                <div
                  className={`h-full rounded-full transition-all ${isSlaAtRisk ? 'bg-rose-500' : 'bg-accent-color'}`}
                  style={{ width: slaMinutes == null ? '0%' : `${Math.max(6, Math.min(100, (slaMinutes / 240) * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl surface-muted border border-[var(--border)] text-xs text-muted-color space-y-1 font-mono">
              <div><strong>Human Review Required:</strong> {ticket.requires_human_review ? 'Yes (Safety Guardrail active)' : 'No'}</div>
              <div><strong>Assigned Resolution Owner:</strong> <strong className="text-heading">{ticket.assigned_dev_name || 'Unassigned'}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 3: AI DIAGNOSIS & EVIDENCE */}
      {activeTab === 'DIAGNOSIS' && (
        <div className="space-y-5">
          <div className="surface p-6 rounded-2xl border border-[var(--border)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI DIAGNOSIS — HOW IncidentAI REACHED THIS
              </h3>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Confidence: {hasConfidence ? confidencePercent : 'Unavailable'}
              </span>
            </div>

            {/* 1. CONFIRMED FACTS (MCP + incident metadata) */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">1 · CONFIRMED FACTS</span>
                <span className="text-xs font-bold text-heading">Current ERP Facts (MCP) — read live, not guessed</span>
              </div>
              <ul className="text-xs font-mono text-body-color space-y-1">
                <li>• Error code <code className="text-rose-500 font-bold">{errorCode}</code> in module <code className="text-heading font-bold">{erpModule}</code> ({uiComponent})</li>
                {liveFacts.filter((e) => e.status === 200).map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500">•</span>
                    <span>
                      <span className="text-[10px] px-1 rounded bg-emerald-500/10 text-emerald-500 mr-1">{e.source_label || 'LIVE ERP'}</span>
                      {summarizeMcpEvidence(e)}
                    </span>
                  </li>
                ))}
                {liveFacts.filter((e) => e.status === 200).length === 0 && (
                  <li className="text-muted-color">• Live ERP verification was unavailable for this incident.</li>
                )}
              </ul>
            </div>

            {/* 2. HISTORICAL EVIDENCE (RAG) */}
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">2 · HISTORICAL EVIDENCE</span>
                  <span className="text-xs font-bold text-heading">Past Incident Knowledge (RAG)</span>
                </div>
                {isKbMismatch && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-white flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Potential Knowledge Base Mismatch
                  </span>
                )}
              </div>
              {(ticket.rag_kb_matches || []).length > 0 ? (
                <ul className="text-xs space-y-1.5">
                  {(ticket.rag_kb_matches || []).slice(0, 3).map((m, i) => {
                    const mMod = m.article?.erp_module;
                    const mismatch = mMod && mMod !== ticket.erp_module;
                    return (
                      <li key={i} className="font-mono text-body-color flex items-start gap-1.5">
                        <span className={mismatch ? 'text-amber-500' : 'text-purple-400'}>•</span>
                        <span>
                          {m.score != null && <span className="text-purple-400 font-bold mr-1">{Math.round(m.score * 100)}%</span>}
                          <span className="text-heading">{m.article?.title}</span>
                          <span className={`ml-1 ${mismatch ? 'text-amber-500 font-bold' : 'text-muted-color'}`}>[{mMod}{mismatch ? ' — different module' : ''}]</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs font-mono text-amber-500">
                  ⚠ No historical incident or knowledge-base article matches this {erpModule} failure. IncidentAI will not fabricate a precedent — a developer must review.
                </p>
              )}
            </div>

            {/* 3. AI INFERENCE */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">3 · AI INFERENCE</span>
                <span className="text-xs font-bold text-heading">AI Reasoning (LLM) — proposed, not confirmed</span>
              </div>
              <p className="text-sm font-semibold text-heading leading-relaxed">{suspectedRootCauseText}</p>
              {ticket.ai_diagnosis?.reason && (
                <p className="text-[11px] text-muted-color leading-relaxed">{ticket.ai_diagnosis.reason}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 bg-[var(--bg-page)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                  <div className="h-full bg-amber-500" style={{ width: hasConfidence ? `${Math.round(confidenceScore * 100)}%` : '0%' }} />
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-500">{hasConfidence ? confidencePercent : 'N/A'} confidence</span>
              </div>
              <p className="text-[10px] font-mono text-muted-color">Probabilistic hypothesis from the model — treated as a proposal, never as fact.</p>
            </div>

            {/* 4. RECOMMENDATION */}
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">4 · RECOMMENDATION</span>
                <span className="text-xs font-bold text-heading">Proposed next action</span>
              </div>
              <p className="text-xs font-mono text-body-color leading-relaxed">{suggestedPatchText}</p>
              <p className="text-[10px] font-mono text-amber-500 font-bold">Guardrail: requires human developer approval before anything is applied.</p>
            </div>

            <div className="pt-2">
              <AIInsightsPanel ticket={ticket} />
            </div>
          </div>
        </div>
      )}

      {/* PAGE 4: REMEDIATION PLAN */}
      {activeTab === 'REMEDIATION' && (
        <div className="space-y-5">
          <RemediationCenter
            ticket={ticket}
            remediation={remediation}
            isExecutive={userRole === 'EXECUTIVE'}
            onApprove={handleApproveRemediation}
            onReject={handleRejectRemediation}
            onViewPatch={() => setIsPatchModalOpen(true)}
            onStartVerification={() => handleRunVerification(false)}
          />
        </div>
      )}

      {/* PAGE 5: VERIFICATION ENGINE */}
      {activeTab === 'VERIFICATION' && (
        <div className="space-y-5">
          <VerificationPanel
            verificationResult={verificationResult}
            onRunVerification={() => handleRunVerification(false)}
            onSimulateFailure={() => handleRunVerification(true)}
            onApplyPatch={handleApplyPatch}
          />

          {status === 'ROLLED_BACK' ? (
            <div className="surface p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> ROLLBACK COMPLETE
                </h3>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                  {remediation?.current_version || ticket.patch_version || 'v1.0.0'} RESTORED
                </span>
              </div>
              <p className="text-xs text-muted-color font-mono leading-relaxed">
                Verification failed, so the patch was rolled back and the previous version was restored. The incident is
                held out of the verification loop. Send it back to remediation so the developer can revise the fix and
                re-approve.
              </p>
              <div className="flex items-center justify-end">
                <button
                  onClick={handleReturnToRemediation}
                  disabled={Boolean(actionInFlight)}
                  className="btn-primary text-xs font-bold py-2.5 px-5"
                >
                  {actionInFlight === 'return'
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Returning…</>
                    : <><RefreshCw className="w-4 h-4" /> Return to Remediation Loop</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="surface p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-500" /> EMERGENCY ROLLBACK SAFEGUARD
                </h3>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ZERO DOWNTIME
                </span>
              </div>

              <p className="text-xs text-muted-color font-mono leading-relaxed">
                {status === 'VERIFICATION_FAILED'
                  ? 'Verification failed. Roll back now to restore the previous version, then send the incident back to remediation.'
                  : 'If patch verification fails or unexpected anomalies occur post-deployment, trigger instant rollback to restore previous system state.'}
              </p>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => setIsRollbackModalOpen(true)}
                  className="btn-danger text-xs font-bold py-2.5 px-5"
                >
                  <RotateCcw className="w-4 h-4" /> Trigger Emergency Rollback
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAGE 6: LIFECYCLE TIMELINE */}
      {activeTab === 'TIMELINE' && (
        <div className="space-y-5">
          <div className="surface p-6 rounded-2xl border border-[var(--border)] shadow-sm">
            <RemediationTimeline ticket={ticket} auditLogs={auditLogs} />
          </div>
        </div>
      )}

      {/* Patch Preview Modal */}
      {isPatchModalOpen && (
        <PatchPreviewModal
          patchData={patchData}
          isExecutive={userRole === 'EXECUTIVE'}
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
