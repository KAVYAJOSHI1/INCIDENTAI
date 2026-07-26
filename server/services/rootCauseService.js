/**
 * Module 3: AI Root Cause & Patch Predictor — rule-engine over known error signatures with a generic fallback.
 */

const ROOT_CAUSE_SIGNATURES = {
  ERR_TAX_VAL_402: {
    root_cause: "Missing mandatory GSTIN exemption code mapping in customer master records table `cust_master_tax`.",
    suggested_patch: "UPDATE cust_master_tax SET tax_exempt_code = 'GST_EXEMPT_A1' WHERE customer_id = :customer_id;",
    confidence: 0.93
  },
  ERR_PAYROLL_DEADLOCK: {
    root_cause: "Row lock contention on table `emp_tax_deductions_2026` during parallel batch thread processing.",
    suggested_patch: "CREATE INDEX CONCURRENTLY idx_tax_deduct_emp ON emp_tax_deductions_2026 (emp_id, tax_year);",
    confidence: 0.91
  },
  ERR_STOCK_NEG: {
    root_cause: "Stale Redis cache key `inv_stock:<sku>` not invalidated during previous PO receipt.",
    suggested_patch: "EXEC redis-cli DEL inv_stock:<sku> && SELECT sync_inventory_cache('<sku>');",
    confidence: 0.88
  },
  ERR_GL_UNBALANCED: {
    root_cause: "Journal entry batch posted with mismatched debit/credit totals due to currency rounding in multi-currency conversion.",
    suggested_patch: "UPDATE gl_journal_lines SET amount = ROUND(amount, 2) WHERE batch_id = :batch_id;",
    confidence: 0.85
  },
  ERR_PO_MISMATCH: {
    root_cause: "Purchase order quantity does not match goods receipt note due to partial delivery not being reconciled.",
    suggested_patch: "UPDATE purchase_orders SET status = 'PARTIALLY_RECEIVED' WHERE po_number = :po_number;",
    confidence: 0.84
  }
};

export function predictRootCause(errorCode, erpModule, component) {
  const signature = ROOT_CAUSE_SIGNATURES[errorCode];
  if (signature) return { ...signature };

  return {
    root_cause: `Constraint violation or missing required field mapping in ${String(erpModule).toLowerCase()} backend service triggered via <${component}/>.`,
    suggested_patch: `-- Suggested SQL Patch for ${errorCode}\nUPDATE erp_${String(erpModule).toLowerCase()}_config SET status = 'ACTIVE' WHERE error_ref = '${errorCode}';`,
    confidence: 0.55
  };
}
