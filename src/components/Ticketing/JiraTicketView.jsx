import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, GitMerge, CheckCircle2, User, Clock,
  AlertTriangle, Layers, BookOpen, FileSearch, Terminal, Sparkles,
  ChevronDown, ChevronUp, Copy, AlertCircle, ArrowRight, ArrowDown,
  Database, Cpu, Server, FileCode, Check, AlertOctagon, HelpCircle,
  ExternalLink, Code2, Tag, Activity, ShieldCheck, RotateCcw
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

export default function JiraTicketView({ ticket, onMergeDuplicate, onAssignDeveloper }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW | REMEDIATION | PATCH | VERIFICATION | TIMELINE | INSIGHTS
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

  // Normalization
  const ticketId = ticket.ticket_number || ticket.id || 'INC-79613-6322';
  const isDemoScenario = ticketId.includes('79613') || ticket.erp_module === 'INVENTORY';

  const rawSeverity = ticket.severity || 'P3_LOW';
  const sevBadgeClass = SEV_BADGE[rawSeverity] || 'badge-p3';
  const severityFormatted = rawSeverity.includes('_')
    ? `${rawSeverity.split('_')[0]} · ${rawSeverity.split('_')[1]}`
    : rawSeverity;

  const erpModule = ticket.erp_module || 'INVENTORY';
  const status = ticket.remediation_status || ticket.status || 'RESOLVED';
  const slaMinutes = ticket.sla_remaining_minutes != null ? ticket.sla_remaining_minutes : 240;

  const confidenceScore = isDemoScenario && ticket.ai_confidence == null ? 0.65 : (ticket.ai_confidence ?? 0.65);
  const confidencePercent = `${Math.round(confidenceScore * 100)}%`;

  const reporter = ticket.reporter || 'erp_operator@smartfactory.demo';
  const assignedDev = ticket.assigned_dev_name || 'Marcus Vance';
  const errorCode = ticket.ocr_findings?.extracted_error_code || ticket.error_code || 'ERR_STOCK_NEG';
  const uiComponent = ticket.ocr_findings?.detected_component || ticket.ui_component || 'BinTransferGrid';
  const businessImpact = ticket.business_impact_score || ticket.business_impact || 6;

  const userReportText = ticket.vague_user_input || ticket.structured_description ||
    "ERR_INVENTORY_VAL_808: Negative quantity violation during stock transfer in warehouse bin W2";

  const aiDiagnosisTitle = "AI Diagnosis";
  const suspectedRootCauseText = ticket.ai_root_cause || "Stale cache read before transfer validation";
  const fullRootCauseDetail = "Unexpected inventory validation or execution exception in the INVENTORY module. Suspected trigger: stale cache read before transfer validation.";

  const rootCauseChain = [
    { type: 'MODULE', label: erpModule, icon: Server, color: 'var(--accent)' },
    { type: 'SERVICE', label: 'InventoryService', icon: Cpu, color: 'var(--purple)' },
    { type: 'FILE', label: 'inventory/binTransfer.js', icon: FileCode, color: 'var(--accent-subtle-text)' },
    { type: 'FUNCTION', label: 'validateStockQuantity()', icon: Terminal, color: '#f59e0b' },
    { type: 'DB TABLE', label: 'inv_stock_cache', icon: Database, color: '#ef4444' }
  ];

  const expectedBehaviorText = ticket.expected_behavior ||
    "ERP processes the inventory payload without validation failures and records the transaction.";
  const actualBehaviorText = ticket.actual_behavior ||
    "System triggers ERR_STOCK_NEG exception and aborts the transaction thread.";

  const reproductionSteps = (ticket.reproduction_steps && ticket.reproduction_steps.length > 0)
    ? ticket.reproduction_steps
    : [
        "Open ERP Workspace → INVENTORY Module",
        "Execute BinTransferGrid",
        "Submit form payload with ERR_INVENTORY_VAL_808: Negative quantity",
        "Observe ERR_STOCK_NEG"
      ];

  const recommendedActionText = "Review inventory cache/configuration and retry the transaction. If the issue persists, escalate to developer on-call.";
  const suggestedPatchText = ticket.ai_suggested_patch || "EXEC redis-cli DEL inv_stock:SK-902 && SELECT sync_inventory_cache('SK-902');";

  const rawRagMatches = ticket.rag_kb_matches && ticket.rag_kb_matches.length > 0
    ? ticket.rag_kb_matches
    : [
        {
          article: {
            title: "[Verified Resolution] [GENERAL_LEDGER] ERR_GL_UNBALANCED",
            solution: "Round journal line amounts to 2 decimal places before batch posting and reconcile FX conversion rate snapshot.",
            erp_module: "GENERAL_LEDGER"
          },
          confidence_percentage: 25,
          why_relevant: "Matched on general error keywords across database tables."
        }
      ];

  const handleCopyPatch = () => {
    navigator.clipboard.writeText(suggestedPatchText);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 1600);
  };

  const getTrustBadgeStyle = (score) => {
    if (score >= 0.8) return { bg: 'var(--green-bg)', text: 'var(--green-text)', border: 'var(--green-border)', label: 'High Confidence' };
    if (score >= 0.5) return { bg: 'var(--amber-bg)', text: 'var(--amber-text)', border: 'var(--amber-border)', label: 'Medium Confidence' };
    return { bg: 'var(--red-bg)', text: 'var(--red-text)', border: 'var(--red-border)', label: 'Low Confidence' };
  };

  const confidenceTrustStyle = getTrustBadgeStyle(confidenceScore);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* --- DUPLICATE ALERT BANNER --- */}
      {ticket.duplicate_check?.is_duplicate && (
        <div className="callout callout-amber flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                Duplicate detected — {Math.round(ticket.duplicate_check.similarity_score * 100)}% similarity
                {' '}with <code className="font-mono font-bold">
                  {ticket.duplicate_check.top_match?.ticket?.ticket_number || ticket.duplicate_check.top_match?.ticket_number || 'Parent Incident'}
                </code>
              </p>
              {ticket.duplicate_check.reasoning && (
                <p className="text-xs opacity-75 mt-0.5">"{ticket.duplicate_check.reasoning}"</p>
              )}
            </div>
          </div>
          <button
            onClick={() => onMergeDuplicate?.(ticket.id, ticket.duplicate_check.top_match?.ticket?.id)}
            className="btn-secondary text-xs shrink-0"
            style={{ borderColor: 'var(--amber-border)' }}
          >
            <GitMerge className="w-3.5 h-3.5" />
            Merge Duplicate
          </button>
        </div>
      )}

      {/* --- REVERT ROLLBACK BANNER IF PATCH APPLIED / REVERTED --- */}
      {(status === 'APPLIED' || status === 'RESOLVED' || status === 'REVERTED') && (
        <div className="surface p-4 rounded-xl border border-[var(--border)] flex flex-wrap items-center justify-between gap-3 shadow-sm bg-[var(--accent-subtle-bg)]/20">
          <div className="flex items-center gap-3 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-heading">REMEDIATION STATUS: </span>
              <span className={status === 'REVERTED' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {status === 'REVERTED' ? 'REVERTED TO v1.4.8' : 'PATCH APPLIED (v1.4.9)'}
              </span>
            </div>
          </div>

          <button onClick={() => setIsRollbackModalOpen(true)} className="btn-secondary text-xs text-rose-400 hover:border-rose-500/50">
            <RotateCcw className="w-3.5 h-3.5" /> Revert Patch
          </button>
        </div>
      )}

      {/* ==========================================
          1. INCIDENT HEADER
          ========================================== */}
      <div className="surface p-5 rounded-xl border border-[var(--border)] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {/* Metadata Badges Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[var(--accent-subtle-bg)] text-[var(--accent-subtle-text)] border border-[var(--accent-subtle-bd)]">
              {ticketId}
            </span>

            <span className={`${sevBadgeClass} font-mono text-xs px-2.5 py-1 rounded-md`}>
              {severityFormatted}
            </span>

            <span className="badge-module font-mono text-xs px-2.5 py-1 rounded-md">
              {erpModule}
            </span>

            <span
              className="text-xs px-2.5 py-1 rounded-md font-bold font-mono uppercase"
              style={{
                background: status === 'RESOLVED' || status === 'APPLIED' ? 'var(--green-bg)' : 'var(--bg-muted)',
                color: status === 'RESOLVED' || status === 'APPLIED' ? 'var(--green-text)' : 'var(--text-muted)',
                border: status === 'RESOLVED' || status === 'APPLIED' ? '1px solid var(--green-border)' : '1px solid var(--border)'
              }}
            >
              {status}
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-md surface-muted">
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              SLA: {slaMinutes} min
            </span>

            <span
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-md"
              style={{
                background: confidenceTrustStyle.bg,
                color: confidenceTrustStyle.text,
                border: `1px solid ${confidenceTrustStyle.border}`
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Confidence: {confidencePercent}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onAssignDeveloper && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-color hidden sm:inline">Assignee:</span>
                <span className="font-semibold text-heading">{assignedDev}</span>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-heading leading-snug">
          {ticket.title || `[${erpModule}] ${errorCode}: Negative quantity violation during stock transfer`}
        </h1>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-[var(--border)]">
          {[
            { id: 'OVERVIEW', label: 'Overview & Diagnosis', icon: Activity },
            { id: 'REMEDIATION', label: 'Remediation Center', icon: ShieldCheck },
            { id: 'PATCH', label: 'Patch Diff', icon: FileCode },
            { id: 'VERIFICATION', label: 'Verification Stage', icon: Terminal },
            { id: 'TIMELINE', label: 'Remediation Timeline', icon: Clock },
            { id: 'INSIGHTS', label: 'AI Insights', icon: Sparkles }
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-muted-color hover:text-heading hover:bg-[var(--bg-muted)]'
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
          TAB 1: OVERVIEW & DIAGNOSIS
          ========================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5">
          {/* Executive Summary & Developer Summary Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Executive Summary */}
            <div className="surface p-5 rounded-xl border border-[var(--border)] shadow-sm space-y-3 bg-[var(--accent-subtle-bg)]/30">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" /> INCIDENT EXECUTIVE SUMMARY
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  EVALUATOR BRIEF
                </span>
              </div>
              <p className="text-xs font-medium text-heading leading-relaxed">
                Inventory stock transfer failed because the system likely read stale inventory cache data during quantity validation (<code className="font-mono text-rose-400">ERR_STOCK_NEG</code>).
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] font-mono text-[11px]">
                <div>
                  <span className="text-muted-color block text-[9px] uppercase">AI Confidence</span>
                  <span className="text-amber-400 font-bold">{confidencePercent}</span>
                </div>
                <div>
                  <span className="text-muted-color block text-[9px] uppercase">Risk Level</span>
                  <span className="text-amber-400 font-bold">MEDIUM</span>
                </div>
                <div>
                  <span className="text-muted-color block text-[9px] uppercase">Remediation</span>
                  <span className="text-[var(--accent)] font-bold">{remediation?.status || 'Pending Approval'}</span>
                </div>
              </div>
            </div>

            {/* Developer Summary */}
            <div className="surface p-5 rounded-xl border border-[var(--border)] shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" /> DEVELOPER TECHNICAL SUMMARY
                </h3>
                <span className="text-[10px] font-mono text-muted-color">STACK Context</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-muted-color block text-[10px]">Component:</span>
                  <code className="text-purple-400 font-bold">BinTransferGrid</code>
                </div>
                <div>
                  <span className="text-muted-color block text-[10px]">Service:</span>
                  <code className="text-heading font-bold">InventoryService</code>
                </div>
                <div>
                  <span className="text-muted-color block text-[10px]">File:</span>
                  <code className="text-accent-subtle-text font-bold">inventory/binTransfer.js</code>
                </div>
                <div>
                  <span className="text-muted-color block text-[10px]">Function:</span>
                  <code className="text-amber-400 font-bold">validateStockQuantity()</code>
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--border)] text-xs font-mono">
                <span className="text-muted-color">Suspected Trigger: </span>
                <code className="text-rose-400 font-bold">inv_stock_cache</code>
              </div>
            </div>
          </div>
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface p-5 rounded-xl border border-[var(--border)] shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-color flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[var(--accent)]" /> Incident Metadata
                </h3>
                <span className="text-[10px] font-mono text-faint-color">SYSTEM LOGS</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px border-dashed var(--border)' }}>
                  <span className="text-muted-color">Reporter:</span>
                  <span className="font-medium text-heading flex items-center gap-1.5"><User className="w-3 h-3 text-muted-color" /> {reporter}</span>
                </div>
                <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px border-dashed var(--border)' }}>
                  <span className="text-muted-color">Assigned Developer:</span>
                  <span className="font-semibold text-heading">{assignedDev}</span>
                </div>
                <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px border-dashed var(--border)' }}>
                  <span className="text-muted-color">Error Code:</span>
                  <code className="font-mono font-bold px-2 py-0.5 rounded text-rose-500 bg-rose-500/10 border border-rose-500/20">{errorCode}</code>
                </div>
                <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px border-dashed var(--border)' }}>
                  <span className="text-muted-color">UI Component:</span>
                  <code className="font-mono font-bold px-2 py-0.5 rounded text-purple-400 bg-purple-500/10 border border-purple-500/20">{uiComponent}</code>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-color">Business Impact Score:</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded text-amber-500 bg-amber-500/10 border border-amber-500/20">{businessImpact} / 10</span>
                </div>
              </div>
            </div>

            <div className="surface p-5 rounded-xl border border-[var(--border)] shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-color flex items-center gap-1.5">
                  <FileSearch className="w-3.5 h-3.5 text-[var(--accent)]" /> User Report
                </h3>
                <span className="text-[10px] font-mono text-faint-color">INGESTED FEED</span>
              </div>
              <div className="surface-muted p-4 rounded-lg flex-1 flex flex-col justify-center border border-[var(--border)]">
                <p className="text-sm italic font-medium leading-relaxed text-heading">"{userReportText}"</p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-color pt-1">
                <span>Verified Operator Signal</span>
                <span className="font-mono text-[10px]">Source: Smart ERP Client</span>
              </div>
            </div>
          </div>

          {/* AI Diagnosis */}
          <div
            className="surface p-6 rounded-xl border shadow-md space-y-5"
            style={{
              borderLeft: '4px solid var(--accent)',
              borderColor: 'var(--accent-subtle-bd)',
              background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)'
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle-bg)] text-[var(--accent)] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-heading leading-none">{aiDiagnosisTitle}</h2>
                  <p className="text-xs text-muted-color mt-1">Automated Root Cause Identification & Execution Reasoning</p>
                </div>
              </div>

              <span
                className="text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{
                  background: confidenceTrustStyle.bg,
                  color: confidenceTrustStyle.text,
                  border: `1px solid ${confidenceTrustStyle.border}`
                }}
              >
                ⚡ Confidence: {confidencePercent} ({confidenceTrustStyle.label})
              </span>
            </div>

            <div className="surface-muted p-4 rounded-xl border border-[var(--border)] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-color block">Suspected Root Cause</span>
              <p className="text-sm font-semibold text-heading leading-relaxed">{suspectedRootCauseText}</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-color flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" /> Visual Dependency & Root Cause Chain
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                {rootCauseChain.map((node, idx) => {
                  const NodeIcon = node.icon;
                  return (
                    <React.Fragment key={idx}>
                      <div className="surface p-3 rounded-lg border border-[var(--border)] shadow-sm text-center flex flex-col items-center justify-center relative hover:border-[var(--accent)] transition-all">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-color mb-1">{node.type}</span>
                        <div className="flex items-center gap-1.5 mb-1" style={{ color: node.color }}>
                          <NodeIcon className="w-3.5 h-3.5 shrink-0" />
                          <code className="text-xs font-mono font-bold truncate max-w-[120px]">{node.label}</code>
                        </div>
                      </div>
                      {idx < rootCauseChain.length - 1 && (
                        <div className="hidden sm:flex items-center justify-center text-muted-color">
                          <ArrowRight className="w-4 h-4 text-[var(--accent)] opacity-70" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Expected vs Actual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Expected Behavior
              </div>
              <p className="text-xs text-body-color leading-relaxed font-medium">{expectedBehaviorText}</p>
            </div>
            <div className="surface p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" /> Actual Behavior
              </div>
              <p className="text-xs text-body-color leading-relaxed font-medium">{actualBehaviorText}</p>
            </div>
          </div>

          {/* Knowledge Base Matches */}
          <div className="surface p-5 rounded-xl border border-[var(--border)] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--accent)]" /> Knowledge Base Matches
              </h3>
              <span className="text-[10px] font-mono text-faint-color">PGVECTOR / RAG INDEX</span>
            </div>

            {rawRagMatches.map((item, idx) => {
              const matchedModule = item.article?.erp_module;
              const isModuleMismatch = matchedModule && matchedModule !== erpModule;
              const matchConfidence = item.confidence_percentage ?? 25;

              return (
                <div key={idx} className="space-y-3">
                  {isModuleMismatch && (
                    <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-rose-500 font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> ⚠️ Potential Knowledge Base Mismatch
                      </div>
                      <p className="text-muted-color leading-relaxed">
                        Module mismatch detected: Incident belongs to <strong className="text-heading">{erpModule}</strong>, but matched KB article belongs to <strong className="text-heading">{matchedModule}</strong>. Match score is low (TF-IDF {matchConfidence}%). Do not apply resolution without manual verification.
                      </p>
                    </div>
                  )}

                  <div className="surface-muted p-4 rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-3 border border-[var(--border)]">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-bold text-heading">{item.article?.title || `[Verified Resolution] [${matchedModule || 'GENERAL_LEDGER'}] ERR_GL_UNBALANCED`}</p>
                      <p className="text-xs text-muted-color leading-relaxed">{item.article?.solution}</p>
                      {item.why_relevant && <p className="text-[11px] italic text-faint-color">"{item.why_relevant}"</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isModuleMismatch && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">MISMATCH</span>
                      )}
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[var(--accent-subtle-bg)] text-[var(--accent-subtle-text)] border border-[var(--accent-subtle-bd)]">
                        TF-IDF {matchConfidence}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: REMEDIATION CENTER
          ========================================== */}
      {activeTab === 'REMEDIATION' && (
        <RemediationCenter
          ticket={ticket}
          remediation={remediation}
          onApprove={handleApproveRemediation}
          onReject={handleRejectRemediation}
          onViewPatch={() => setIsPatchModalOpen(true)}
          onStartVerification={() => setActiveTab('VERIFICATION')}
        />
      )}

      {/* ==========================================
          TAB 3: PATCH DIFF
          ========================================== */}
      {activeTab === 'PATCH' && (
        <div className="surface p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[var(--accent)]" /> Patch Preview & Line Diff
            </h3>
            <span className="text-[10px] font-mono text-faint-color">UNIFIED DIFF</span>
          </div>

          <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[#090d16] font-mono text-xs p-4 space-y-1">
            <div className="text-purple-400 opacity-80 py-0.5">@@ -42,7 +42,7 @@ function validateStockQuantity(binId, qty) &#123;</div>
            <div className="text-neutral-400 px-2 py-0.5">&nbsp;&nbsp;const bin = await binRepository.findById(binId);</div>
            <div className="bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded flex items-center gap-2"><span className="font-bold text-rose-500">-</span>- const stock = inventoryCache.get(binId);</div>
            <div className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded flex items-center gap-2"><span className="font-bold text-emerald-500">+</span>+ const stock = await inventoryService.getFreshStock(binId);</div>
            <div className="text-neutral-400 px-2 py-0.5">&nbsp;&nbsp;if (stock &lt; qty) &#123;</div>
            <div className="text-neutral-400 px-2 py-0.5">&nbsp;&nbsp;&nbsp;&nbsp;throw new InventoryValidationError('ERR_STOCK_NEG');</div>
            <div className="text-neutral-400 px-2 py-0.5">&nbsp;&nbsp;&#125;</div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: VERIFICATION STAGE
          ========================================== */}
      {activeTab === 'VERIFICATION' && (
        <VerificationPanel
          verificationResult={verificationResult}
          onRunVerification={() => handleRunVerification(false)}
          onSimulateFailure={() => handleRunVerification(true)}
          onApplyPatch={handleApplyPatch}
        />
      )}

      {/* ==========================================
          TAB 5: REMEDIATION TIMELINE
          ========================================== */}
      {activeTab === 'TIMELINE' && (
        <RemediationTimeline auditLogs={auditLogs} ticket={ticket} />
      )}

      {/* ==========================================
          TAB 6: AI INSIGHTS
          ========================================== */}
      {activeTab === 'INSIGHTS' && (
        <AIInsightsPanel ticket={ticket} />
      )}

      {/* Patch Preview Modal */}
      {isPatchModalOpen && (
        <PatchPreviewModal
          patchData={patchData}
          onClose={() => setIsPatchModalOpen(false)}
          onApprove={async () => {
            await handleApproveRemediation();
            setIsPatchModalOpen(false);
          }}
          onReject={async () => {
            await handleRejectRemediation("Developer rejected patch");
            setIsPatchModalOpen(false);
          }}
        />
      )}

      {/* Rollback Modal */}
      <RollbackModal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        onConfirmRollback={handleRollbackConfirm}
      />
    </div>
  );
}
