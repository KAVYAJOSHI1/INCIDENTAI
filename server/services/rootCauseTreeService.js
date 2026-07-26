/**
 * Enterprise Feature 1: AI Root Cause Engine — dependency tree from module down to the failing DB table.
 */

const DEPENDENCY_SIGNATURES = {
  ERR_TAX_VAL_402: { service: "InvoicingService", file: "invoicing/taxValidator.js", function: "validateGstinExemption()", table: "cust_master_tax", trigger: "Customer master record missing tax_exempt_code" },
  ERR_PAYROLL_DEADLOCK: { service: "PayrollBatchService", file: "payroll/batchProcessor.js", function: "calculateGrossSalaryBatch()", table: "emp_tax_deductions_2026", trigger: "Concurrent batch threads racing on a shared row lock" },
  ERR_STOCK_NEG: { service: "InventoryService", file: "inventory/binTransfer.js", function: "validateStockQuantity()", table: "inv_stock_cache", trigger: "Stale cache read before transfer validation" },
  ERR_GL_UNBALANCED: { service: "GeneralLedgerService", file: "ledger/journalPoster.js", function: "postJournalBatch()", table: "gl_journal_lines", trigger: "Currency rounding mismatch across FX conversion" },
  ERR_PO_MISMATCH: { service: "ProcurementService", file: "procurement/poReconciler.js", function: "reconcileGoodsReceipt()", table: "purchase_orders", trigger: "Partial delivery not reconciled against PO quantity" }
};

const DEFAULT_SIGNATURE = { service: "CoreErpService", file: "core/requestHandler.js", function: "handleTransaction()", table: "erp_transaction_log", trigger: "Unclassified backend exception" };

export function buildDependencyTree(ticket) {
  const errorCode = ticket.ocr_findings?.extracted_error_code;
  const signature = DEPENDENCY_SIGNATURES[errorCode] || DEFAULT_SIGNATURE;
  const confidenceScore = ticket.ai_confidence ?? 0.6;
  const humanErrorLikelihood = /missing|exempt|config|manual|not (set|configured)/i.test(ticket.ai_root_cause || "") ? 0.35 : 0.15;

  const nodes = [
    { id: "module", label: ticket.erp_module, type: "erp_module", parent: null },
    { id: "service", label: signature.service, type: "service", parent: "module" },
    { id: "file", label: signature.file, type: "file", parent: "service" },
    { id: "function", label: signature.function, type: "function", parent: "file" },
    { id: "table", label: signature.table, type: "database_table", parent: "function" }
  ];

  return {
    ticket_id: ticket.id,
    nodes,
    suspected_trigger: signature.trigger,
    confidence_score: confidenceScore,
    human_error_likelihood: humanErrorLikelihood
  };
}
