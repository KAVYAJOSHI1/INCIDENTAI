import React, { useEffect, useState } from 'react';
import {
  Zap, AlertTriangle, RotateCcw, ExternalLink, Loader2, ShieldAlert,
  Package, Factory, ShoppingCart, Receipt, Scale, CheckCircle2
} from 'lucide-react';
import { fetchDemoScenarios, triggerDemoScenario, resetDemoEnvironment } from '../../services/apiClient';

const MODULE_ICON = {
  INVENTORY: Package,
  PRODUCTION: Factory,
  PROCUREMENT: ShoppingCart,
  INVOICING: Receipt,
  GENERAL_LEDGER: Scale
};

/**
 * Presenter console: one click per realistic ERP failure. Every scenario runs a REAL
 * operation against the embedded ERP (validates against live DB state, rejects, and
 * ingests a persisted incident through the normal pipeline) — nothing is faked here.
 */
export default function DemoScenarioPanel({ onSelectTicket, onAfterChange }) {
  const [scenarios, setScenarios] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetSummary, setResetSummary] = useState(null);
  const [busyLabel, setBusyLabel] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    fetchDemoScenarios().then(setScenarios).catch(() => setScenarios([]));
  }, []);

  // Elapsed-time counter while a scenario is being ingested + diagnosed by the AI.
  useEffect(() => {
    if (!busyId) return undefined;
    setElapsed(0);
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [busyId]);

  const runScenario = async (s) => {
    setBusyId(s.id);
    setBusyLabel(s.label);
    setError(null);
    setResult(null);
    setResetSummary(null);
    try {
      const res = await triggerDemoScenario(s.id);
      setResult({ ...res, _scenario: s });
      onAfterChange?.();
    } catch (err) {
      setError(err.message || 'Scenario failed');
    } finally {
      setBusyId(null);
    }
  };

  const runReset = async () => {
    setResetting(true);
    setError(null);
    setResult(null);
    try {
      const summary = await resetDemoEnvironment();
      setResetSummary(summary);
      setConfirmReset(false);
      onAfterChange?.();
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="surface p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge-module"><Zap className="w-3.5 h-3.5 inline mr-1" /> Demo Failure Scenarios</span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#059669' }}>
            REAL ERP PROCESSING · EMBEDDED DB
          </span>
        </div>

        {/* Reset */}
        {!confirmReset ? (
          <button onClick={() => { setConfirmReset(true); setResetSummary(null); }} className="btn-secondary text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Demo Environment
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-color">Restore baseline?</span>
            <button onClick={runReset} disabled={resetting} className="btn-primary text-xs bg-amber-600 hover:bg-amber-500">
              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Confirm Reset
            </button>
            <button onClick={() => setConfirmReset(false)} className="btn-secondary text-xs">Cancel</button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-color">
        Each button runs a genuine Smart Manufacturing ERP operation that violates a business rule. The ERP
        rejects the transaction and IncidentAI ingests a persisted incident — correlation ID, module and
        error code preserved. <strong>Reset</strong> deterministically restores the 5 baseline incidents and
        inventory quantities so the demo can be run again.
      </p>

      {/* Scenario grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {scenarios.map((s) => {
          const Icon = MODULE_ICON[s.module] || AlertTriangle;
          const isBusy = busyId === s.id;
          const isSafety = s.id === 'journal-imbalance';
          return (
            <button
              key={s.id}
              onClick={() => runScenario(s)}
              disabled={Boolean(busyId)}
              className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                isSafety
                  ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500'
                  : 'border-[var(--border)] bg-subtle hover:border-[var(--accent)]'
              } ${busyId && !isBusy ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-heading">
                  <Icon className="w-4 h-4 text-accent-color" /> {s.label}
                </span>
                {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-color" />}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="badge-module text-[10px]">{s.module}</span>
                <span className="text-[10px] font-mono text-rose-500 font-bold">{s.error_code}</span>
                {isSafety && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5" /> AI SAFETY
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-color leading-snug">{s.description}</p>
            </button>
          );
        })}
      </div>

      {busyId && (
        <div className="p-3.5 rounded-xl border border-accent-color/30 bg-accent-subtle-bg/40 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-accent-color shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-heading">{busyLabel}: ERP rejected the transaction — AI investigation in progress…</span>
            <span className="text-muted-color font-mono ml-1.5">{elapsed}s</span>
            <span className="block text-[11px] text-muted-color mt-0.5">
              Reading live ERP facts (MCP), searching past incidents (RAG), and reasoning over the evidence (LLM). Typically 5–20s.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl border border-rose-400 bg-rose-500/10 text-xs text-rose-600">{error}</div>
      )}

      {resetSummary && (
        <div className="p-4 rounded-xl border border-emerald-400 bg-emerald-500/10 space-y-1.5">
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Demo environment reset to baseline
          </span>
          <p className="text-[11px] text-muted-color font-mono">
            {resetSummary.tickets_after_reset} baseline incidents · {resetSummary.inventory_rows_after_reset} inventory rows ·
            {' '}{resetSummary.transactions_cleared} ERP transactions cleared · {resetSummary.audit_cleared} audit rows cleared
          </p>
        </div>
      )}

      {/* Result card */}
      {result && result.incident && (
        <div className="p-4 rounded-xl border border-rose-400 bg-rose-500/10 space-y-2">
          <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> ERP transaction REJECTED — incident persisted
          </span>
          <p className="text-xs text-body-color">{result.message || `${result._scenario.label}: ERP rejected the operation and IncidentAI created an incident.`}</p>
          <div className="text-[11px] text-muted-color space-y-1 font-mono">
            <div>Incident: <strong className="text-heading">{result.incident.ticket_number || result.incident.id}</strong></div>
            <div>Module: <strong>{result.incident.erp_module || result._scenario.module}</strong> · Severity: <strong>{result.incident.severity}</strong></div>
            <div>Correlation: <strong>{result.incident.correlation_id}</strong></div>
            <div>Assigned: <strong>{result.incident.assigned_dev_name || '—'}</strong> · Status: <strong className="text-amber-600">{result.incident.status}</strong></div>
          </div>
          <button onClick={() => onSelectTicket && onSelectTicket(result.incident.id)}
            className="btn-primary text-xs w-full py-1.5 justify-center">
            Open in IncidentAI <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
