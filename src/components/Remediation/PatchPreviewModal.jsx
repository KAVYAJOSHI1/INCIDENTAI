import React from 'react';
import { FileCode, X, CheckCircle2, XCircle, AlertTriangle, Sparkles, Terminal } from 'lucide-react';

export default function PatchPreviewModal({
  patchData,
  isExecutive = false,
  onClose,
  onApprove,
  onReject
}) {
  if (!patchData) return null;

  const file = patchData.file || "inventory/binTransfer.js";
  const func = patchData.function || "validateStockQuantity()";
  const reason = patchData.reason || "Prevent stale inventory cache data from being used during stock quantity validation.";
  const riskLevel = patchData.risk_level || "MEDIUM";
  const confidence = patchData.confidence_percentage || "65%";

  const diffLines = patchData.diff_lines || [
    { type: "header", text: "@@ -42,7 +42,7 @@ function validateStockQuantity(binId, qty) {" },
    { type: "context", text: "   const bin = await binRepository.findById(binId);" },
    { type: "removed", text: "-  const stock = inventoryCache.get(binId);" },
    { type: "added", text: "+  const stock = await inventoryService.getFreshStock(binId);" },
    { type: "context", text: "   if (stock < qty) {" },
    { type: "context", text: "     throw new InventoryValidationError('ERR_STOCK_NEG');" },
    { type: "context", text: "   }" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="surface border border-[var(--border)] rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] surface-muted">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle-bg)] text-[var(--accent)] flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-heading">PATCH PREVIEW</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  DEMO PATCH
                </span>
              </div>
              <p className="text-xs text-muted-color">Review proposed AI code change diff</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details Summary */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="surface p-3 rounded-lg border border-[var(--border)]">
              <span className="text-muted-color block mb-1">Target File:</span>
              <code className="text-heading font-bold text-accent-subtle-text">{file}</code>
            </div>
            <div className="surface p-3 rounded-lg border border-[var(--border)]">
              <span className="text-muted-color block mb-1">Target Function:</span>
              <code className="text-amber-400 font-bold">{func}</code>
            </div>
          </div>

          <div className="surface-muted p-3.5 rounded-lg border border-[var(--border)] text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-color block mb-1">Reason for Patch</span>
            <p className="text-heading font-medium leading-relaxed">{reason}</p>
          </div>

          {/* Diff Viewer */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-color block">Unified Code Diff</span>
            <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[#090d16] font-mono text-xs p-4 space-y-1 overflow-x-auto">
              {diffLines.map((line, idx) => {
                if (line.type === 'header') {
                  return <div key={idx} className="text-purple-400 opacity-80 py-0.5">{line.text}</div>;
                }
                if (line.type === 'removed') {
                  return (
                    <div key={idx} className="bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded flex items-center gap-2">
                      <span className="select-none font-bold text-rose-500">-</span>
                      <span>{line.text.slice(1)}</span>
                    </div>
                  );
                }
                if (line.type === 'added') {
                  return (
                    <div key={idx} className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded flex items-center gap-2">
                      <span className="select-none font-bold text-emerald-500">+</span>
                      <span>{line.text.slice(1)}</span>
                    </div>
                  );
                }
                return <div key={idx} className="text-neutral-400 px-2 py-0.5">{line.text}</div>;
              })}
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-xs font-mono pt-2">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Risk: {riskLevel}
              </span>
              <span className="text-accent-subtle-text font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Confidence: {confidence}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border)] surface-muted">
          {isExecutive ? (
            <>
              <span className="text-xs font-mono font-bold text-blue-400">
                Executive Read-Only View: Code patch approvals are reserved for Developer role
              </span>
              <button onClick={onClose} className="btn-secondary text-xs">
                Close
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 ml-auto">
              <button onClick={onReject} className="btn-secondary text-xs text-rose-400">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button onClick={onApprove} className="btn-primary text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Patch
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
