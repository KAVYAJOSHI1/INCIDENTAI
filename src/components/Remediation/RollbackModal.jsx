import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, Loader2, X, ShieldAlert } from 'lucide-react';

export default function RollbackModal({
  isOpen,
  onClose,
  onConfirmRollback,
  currentVersion = "v1.4.9",
  previousVersion = "v1.4.8"
}) {
  const [reason, setReason] = useState("Rollback after unsuccessful remediation.");
  const [isExecuting, setIsExecuting] = useState(false);
  const [rollbackProgress, setRollbackProgress] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsExecuting(true);
    setRollbackProgress({
      step: 1,
      status: "ROLLBACK IN PROGRESS",
      detail: "Stopping application thread & snapshotting current state..."
    });

    setTimeout(() => {
      setRollbackProgress({
        step: 2,
        status: "ROLLBACK IN PROGRESS",
        detail: `Restoring codebase to previous version (${previousVersion})...`
      });
    }, 800);

    setTimeout(() => {
      setRollbackProgress({
        step: 3,
        status: "ROLLBACK IN PROGRESS",
        detail: "Running post-rollback state verification..."
      });
    }, 1600);

    setTimeout(async () => {
      try {
        const res = await onConfirmRollback?.(reason);
        setRollbackProgress({
          step: 4,
          status: "ROLLBACK SUCCESSFUL",
          detail: `Previous state restored to ${previousVersion}. Incident reopened for investigation.`
        });
      } catch (err) {
        setRollbackProgress({
          step: 4,
          status: "ROLLBACK FAILED",
          detail: err.message
        });
      } finally {
        setIsExecuting(false);
      }
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="surface border border-[var(--border)] rounded-xl shadow-2xl max-w-md w-full overflow-hidden space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] surface-muted">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-heading">Revert Patch?</h3>
              <p className="text-xs text-muted-color">Restore previous system version</p>
            </div>
          </div>
          {!isExecuting && (
            <button onClick={onClose} className="btn-icon">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!rollbackProgress ? (
            <>
              <p className="text-xs text-body-color leading-relaxed font-medium">
                This action will restore the previous application state and reopen the incident.
              </p>

              <div className="surface-muted p-3.5 rounded-lg border border-[var(--border)] space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-color">Current Version:</span>
                  <span className="text-rose-400 font-bold">{currentVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-color">Target Version:</span>
                  <span className="text-emerald-400 font-bold">{previousVersion}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-color block">
                  Revert Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field text-xs w-full"
                  placeholder="Reason for rollback..."
                />
              </div>
            </>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                {rollbackProgress.status === "ROLLBACK SUCCESSFUL" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-bold font-mono text-heading">{rollbackProgress.status}</h4>
                  <p className="text-xs text-muted-color mt-0.5">{rollbackProgress.detail}</p>
                </div>
              </div>

              <div className="w-full bg-[var(--bg-muted)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${(rollbackProgress.step / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] surface-muted">
          {!rollbackProgress ? (
            <>
              <button onClick={onClose} className="btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={handleConfirm} className="btn-primary text-xs bg-rose-600 hover:bg-rose-500">
                <RotateCcw className="w-3.5 h-3.5" /> Confirm Revert
              </button>
            </>
          ) : (
            rollbackProgress.status === "ROLLBACK SUCCESSFUL" && (
              <button onClick={onClose} className="btn-primary text-xs">
                Done
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
