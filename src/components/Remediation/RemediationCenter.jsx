import React, { useState } from 'react';
import {
  ShieldAlert, Sparkles, CheckCircle2, XCircle, FileCode, AlertTriangle,
  ChevronRight, Lock, Eye, Terminal, ArrowRight, ShieldCheck, Check, Shield
} from 'lucide-react';

export default function RemediationCenter({
  ticket,
  remediation,
  onApprove,
  onReject,
  onViewPatch,
  onStartVerification
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!ticket) return null;

  const rootCause = remediation?.root_cause || ticket.ai_diagnosis?.root_cause || ticket.ai_root_cause || "Diagnosis pending";
  const recommendedRemediation = remediation?.recommended_remediation || ticket.ai_diagnosis?.recommended_resolution || ticket.ai_suggested_patch || "No remediation proposed yet";
  const proposedAction = remediation?.proposed_action || "Awaiting remediation plan generation.";
  const confidenceScore = remediation?.confidence ?? ticket.ai_confidence ?? null;
  const hasConfidence = confidenceScore != null;
  const confidencePercent = hasConfidence ? `${Math.round(confidenceScore * 100)}%` : "Unavailable";
  const confidenceBand = !hasConfidence ? "UNKNOWN" : confidenceScore >= 0.85 ? "HIGH" : confidenceScore >= 0.6 ? "MEDIUM" : "LOW";
  const riskLevel = remediation?.risk_level || "MEDIUM";
  const isKbMismatch = remediation?.kb_mismatch_detected || (ticket.rag_kb_matches?.[0]?.article?.erp_module && ticket.rag_kb_matches[0].article.erp_module !== ticket.erp_module);
  const kbMatchModule = ticket.rag_kb_matches?.[0]?.article?.erp_module || null;
  const kbMatchScore = ticket.rag_kb_matches?.[0]?.score ?? null;

  const status = remediation?.status || "PROPOSED"; // PROPOSED | APPROVED | VERIFIED | APPLIED | ROLLED_BACK

  const handleApproveClick = async () => {
    setIsApproving(true);
    try {
      await onApprove?.();
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectClick = async () => {
    setIsRejecting(true);
    try {
      await onReject?.();
    } finally {
      setIsRejecting(false);
    }
  };

  const getRiskBadge = (risk) => {
    if (risk === "HIGH" || risk === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertTriangle className="w-3.5 h-3.5" /> Risk: {risk}
        </span>
      );
    }
    if (risk === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5" /> Risk: {risk}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" /> Risk: {risk}
      </span>
    );
  };

  return (
    <div className="surface p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle-bg)] text-[var(--accent)] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-heading leading-none">Remediation Control Center</h2>
            <p className="text-xs text-muted-color mt-1">Autonomous AI Proposal with Developer Safety Guardrails</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getRiskBadge(riskLevel)}

          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded surface-muted border border-[var(--border)] text-heading">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" /> AI Confidence: {confidencePercent}
          </span>
        </div>
      </div>

      {/* AI Confidence Visual Progress Indicator Bar */}
      <div className="surface-muted p-4 rounded-xl border border-[var(--border)] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-muted-color flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" /> AI Confidence Visual Meter
          </span>
          <span className="font-bold text-amber-400">
            {hasConfidence ? `${confidencePercent} — ${confidenceBand} CONFIDENCE` : 'Confidence unavailable'} (Human Approval Required)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-[var(--bg-page)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
            style={{ width: hasConfidence ? `${Math.round(confidenceScore * 100)}%` : '0%' }}
          />
        </div>
      </div>

      {/* Safety Alert Banner for KB Mismatch */}
      {isKbMismatch ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-500 font-bold">
              <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
              ⚠ Potential Knowledge Base Mismatch
            </div>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              Automatic Execution: BLOCKED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[var(--bg-page)] border border-rose-500/20 font-mono text-[11px]">
            <div>
              <span className="text-muted-color block text-[9px] uppercase">Incident Module</span>
              <strong className="text-heading">{ticket.erp_module || '—'}</strong>
            </div>
            <div>
              <span className="text-muted-color block text-[9px] uppercase">Top RAG KB Match</span>
              <strong className="text-amber-400">{kbMatchModule || 'None'}</strong>
            </div>
            <div>
              <span className="text-muted-color block text-[9px] uppercase">RAG Similarity</span>
              <strong className="text-rose-400">
                {kbMatchScore != null ? `${Math.round(kbMatchScore * 100)}% (Low Relevance)` : 'N/A'}
              </strong>
            </div>
          </div>

          <p className="text-muted-color leading-relaxed font-sans">
            "The AI found a potentially related historical resolution, but because the module and relevance do not match strongly enough, IncidentAI blocks automatic remediation and requires human review."
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-blue-400 font-semibold">
            <Shield className="w-4 h-4" /> Safety Guard: Human-in-the-Loop Required
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Human Approval: <strong className="text-amber-400">REQUIRED</strong></span>
            <span>Auto Execution: <strong className="text-rose-400">BLOCKED</strong></span>
          </div>
        </div>
      )}

      {/* Remediation Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Root Cause & Recommended Remediation */}
        <div className="surface-muted p-4 rounded-xl border border-[var(--border)] space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-color block">Root Cause Analysis</span>
          <p className="text-xs font-semibold text-heading leading-relaxed">{rootCause}</p>

          <div className="pt-2 border-t border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-color block mb-1">Recommended Remediation</span>
            <p className="text-xs text-body-color leading-relaxed font-medium">{recommendedRemediation}</p>
          </div>
        </div>

        {/* Card 2: Proposed Action Plan */}
        <div className="surface-muted p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-color block mb-1">Proposed Action Plan</span>
            <p className="text-xs font-medium text-heading leading-relaxed">{proposedAction}</p>
          </div>

          <div className="p-2.5 rounded bg-[var(--bg-page)] border border-[var(--border)] text-[11px] font-mono text-muted-color flex justify-between">
            <span>Remediation State:</span>
            <strong className="text-heading font-bold">{status}</strong>
          </div>
        </div>
      </div>

      {/* Action Button Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          {onViewPatch && (
            <button onClick={onViewPatch} className="btn-secondary text-xs">
              <FileCode className="w-3.5 h-3.5" /> Preview Code Patch Diff
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === "PROPOSED" && (
            <>
              <button
                onClick={handleRejectClick}
                disabled={isRejecting}
                className="btn-secondary text-xs text-rose-400 hover:border-rose-500/50"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Proposal
              </button>

              <button
                onClick={handleApproveClick}
                disabled={isApproving}
                className="btn-primary text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Patch Remediation
              </button>
            </>
          )}

          {status === "APPROVED" && (
            <button onClick={onStartVerification} className="btn-primary text-xs bg-blue-600 hover:bg-blue-500">
              <Terminal className="w-3.5 h-3.5" /> Run Automated Patch Verification
            </button>
          )}

          {(status === "VERIFIED" || status === "APPLIED" || status === "KNOWLEDGE_CAPTURED" || status === "RESOLVED") && (
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Remediation Approved & Verified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
