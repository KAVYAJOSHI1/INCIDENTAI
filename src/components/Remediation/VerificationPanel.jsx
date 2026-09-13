import React, { useState, useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, XCircle, Loader2, Play, ShieldAlert, ArrowRight } from 'lucide-react';

export default function VerificationPanel({
  verificationResult,
  onRunVerification,
  onApplyPatch,
  onSimulateFailure
}) {
  const [isRunning, setIsRunning] = useState(false);
  // Reveal the checks one at a time so the presenter sees RUNNING → PASS/FAIL.
  const [revealed, setRevealed] = useState(0);
  const lastResultRef = useRef(null);

  useEffect(() => {
    const stamp = verificationResult?.timestamp || null;
    if (!verificationResult || stamp === lastResultRef.current) return undefined;
    lastResultRef.current = stamp;
    const total = verificationResult.checks?.length || 0;
    setRevealed(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= total) clearInterval(iv);
    }, 420);
    return () => clearInterval(iv);
  }, [verificationResult]);

  const handleRun = async (simulateFail = false) => {
    setIsRunning(true);
    try {
      if (simulateFail) {
        await onSimulateFailure?.();
      } else {
        await onRunVerification?.();
      }
    } finally {
      setIsRunning(false);
    }
  };

  const checks = verificationResult?.checks || [];

  const overallStatus = verificationResult?.status || null;

  return (
    <div className="surface p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle-bg)] text-[var(--accent)] flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-heading leading-none">Verification Stage</h2>
            <p className="text-xs text-muted-color mt-1">Automated Post-Patch Validation & Regression Testing</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            SIMULATED VERIFICATION ENVIRONMENT
          </span>

          {verificationResult && revealed >= (verificationResult.checks?.length || 0) && (
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                overallStatus === "PASS"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {overallStatus === "PASS" ? "✓ PASS" : "❌ FAILED"}
            </span>
          )}
        </div>
      </div>

      {/* Runner Controls if not run yet */}
      {!verificationResult && (
        <div className="surface-muted p-5 rounded-xl border border-[var(--border)] text-center space-y-3">
          <p className="text-xs text-muted-color">
            Patch has been approved. Execute the automated verification suite (syntax, unit tests, module-constraint validation, cross-module regression, and incident reproduction) before production deployment.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleRun(false)}
              disabled={isRunning}
              className="btn-primary text-xs"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run Validation Suite (PASS)
            </button>

            <button
              onClick={() => handleRun(true)}
              disabled={isRunning}
              className="btn-secondary text-xs text-amber-400 border-amber-500/30"
            >
              DEMO FAILURE SIMULATION
            </button>
          </div>
        </div>
      )}

      {/* Verification Checks List */}
      {verificationResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-muted-color">
            <span>Validation Checks Executed</span>
            <span>Duration: {verificationResult.total_duration_ms ?? 0}ms</span>
          </div>

          <div className="space-y-2">
            {checks.map((chk, idx) => {
              const running = idx >= revealed;
              const isPass = chk.status === "PASS";
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono transition-colors ${
                    running
                      ? "bg-subtle border-[var(--border)]"
                      : isPass
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-rose-500/5 border-rose-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {running ? (
                      <Loader2 className="w-4 h-4 text-accent-color shrink-0 animate-spin" />
                    ) : isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-semibold text-heading">{chk.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-muted-color text-[11px] hidden sm:inline">{running ? '' : chk.detail}</span>
                    <span className={running ? "text-accent-color font-bold" : isPass ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {running ? 'RUNNING' : chk.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] font-mono text-muted-color">
            Verification logic is real (checks derived from this incident's module, error code and dependency tree); the
            build / CI target is a simulated environment. A patch is never declared successful just because it was applied.
          </p>

          {/* Verification Result Banner & Action Button */}
          {revealed >= checks.length && (
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)]">
              <div className="text-xs">
                <span className="text-muted-color">Verification Result: </span>
                <strong className={overallStatus === "PASS" ? "text-emerald-400 font-mono font-bold" : "text-rose-400 font-mono font-bold"}>
                  {overallStatus} — {checks.filter((c) => c.status === 'PASS').length}/{checks.length} checks passed
                </strong>
              </div>

              {overallStatus === "PASS" && onApplyPatch && (
                <button onClick={onApplyPatch} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Apply Patch & Resolve Incident
                </button>
              )}
              {overallStatus === "FAIL" && (
                <span className="text-xs font-mono font-bold text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Rollback required — see the safeguard below
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
