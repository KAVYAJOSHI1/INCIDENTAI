/**
 * Module 3: AI Root Cause & Patch Predictor. Tries real Claude reasoning first
 * (predictRootCauseWithAI); falls back to the signature lookup table (predictRootCause)
 * when no API key is configured or the call fails for any reason.
 */

import { completeJson } from "./llmService.js";

const ROOT_CAUSE_SCHEMA = {
  type: "object",
  properties: {
    root_cause: { type: "string" },
    suggested_patch: { type: "string" },
    confidence: { type: "number" }
  },
  required: ["root_cause", "suggested_patch", "confidence"],
  additionalProperties: false
};

const ROOT_CAUSE_SYSTEM_PROMPT = `You are a senior ERP backend engineer investigating production incidents across SAP, NetSuite, Odoo, and Oracle ERP systems.

Given an error code, the ERP module it occurred in, and the UI component that triggered it, infer the single most likely backend root cause and propose one concrete, realistic patch (SQL statement, index, or short code snippet — whichever fits the described failure). Use ERP conventions appropriate to the module (e.g. SAP ABAP table naming, Odoo/Python ORM patterns, Oracle PL/SQL, NetSuite SuiteScript) and invent plausible table/field names consistent with the error description. confidence is your calibrated probability (0-1) that this diagnosis is correct given the limited information available.`;

export async function predictRootCauseWithAI(errorCode, erpModule, component, contextText) {
  const result = await completeJson({
    system: ROOT_CAUSE_SYSTEM_PROMPT,
    prompt: `Error code: ${errorCode}\nERP module: ${erpModule}\nUI component: <${component}/>\nOriginal report: "${contextText || ""}"\n\nDiagnose the root cause and propose a patch.`,
    schema: ROOT_CAUSE_SCHEMA,
    maxTokens: 512
  });

  if (!result) return null;
  return { ...result, ai_generated: true };
}

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
  if (signature) return { ...signature, ai_generated: false };

  return {
    root_cause: `Constraint violation or missing required field mapping in ${String(erpModule).toLowerCase()} backend service triggered via <${component}/>.`,
    suggested_patch: `-- Suggested SQL Patch for ${errorCode}\nUPDATE erp_${String(erpModule).toLowerCase()}_config SET status = 'ACTIVE' WHERE error_ref = '${errorCode}';`,
    confidence: 0.55,
    ai_generated: false
  };
}
