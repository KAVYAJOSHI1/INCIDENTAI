/**
 * Regression tests for FIX 1 (authoritative ERP module) and FIX 3 (error code
 * provenance). Pure functions, no DB/network — see server/utils/erpAuthority.js.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeErpModule, resolveErpModule, resolveErrorCode } from "../utils/erpAuthority.js";

test("normalizeErpModule: uppercases and underscores free-form module names", () => {
  assert.equal(normalizeErpModule("Production"), "PRODUCTION");
  assert.equal(normalizeErpModule("General Ledger"), "GENERAL_LEDGER");
  assert.equal(normalizeErpModule("inventory"), "INVENTORY");
  assert.equal(normalizeErpModule("  Procurement  "), "PROCUREMENT");
  assert.equal(normalizeErpModule(""), null);
  assert.equal(normalizeErpModule(null), null);
  assert.equal(normalizeErpModule(undefined), null);
});

// Test A — the real bug found in production testing: a Production incident's error
// message mentioned "inventory adjustment failed" (Production calls Inventory
// internally), so the OCR/LLM classifier guessed INVENTORY. The ERP's own
// erp_context.module said "Production" the whole time.
test("Test A — authoritative ERP module wins over a conflicting AI/OCR guess", () => {
  const result = resolveErpModule("Production", "INVENTORY");
  assert.equal(result.erp_module, "PRODUCTION");
  assert.equal(result.authoritative_module, "PRODUCTION");
  assert.equal(result.ai_inferred_module, "INVENTORY");
  assert.equal(result.module_source, "ERP_CONTEXT");
});

// Test B — when the ERP and the AI classifier agree, nothing should change.
test("Test B — matching ERP module and AI guess both resolve to the same module", () => {
  const result = resolveErpModule("Inventory", "INVENTORY");
  assert.equal(result.erp_module, "INVENTORY");
  assert.equal(result.authoritative_module, "INVENTORY");
  assert.equal(result.ai_inferred_module, "INVENTORY");
  assert.equal(result.module_source, "ERP_CONTEXT");
});

test("resolveErpModule falls back to the AI guess only when the ERP sent no module at all", () => {
  const result = resolveErpModule(undefined, "PAYROLL");
  assert.equal(result.erp_module, "PAYROLL");
  assert.equal(result.authoritative_module, null);
  assert.equal(result.ai_inferred_module, "PAYROLL");
  assert.equal(result.module_source, "AI_INFERENCE");
});

test("resolveErpModule falls back to GENERAL when neither source has a module", () => {
  const result = resolveErpModule(undefined, undefined);
  assert.equal(result.erp_module, "GENERAL");
  assert.equal(result.module_source, "AI_INFERENCE");
});

// Test D — the real ERP services return only a human-readable message, never a
// literal error code. ERR_STOCK_NEG is synthesized by the AI/keyword classifier and
// must never be presented as an ERP-supplied fact.
test("Test D — error normalization preserves the exact ERP message and labels the code as AI-derived", () => {
  const erpContext = { error_message: "Insufficient stock: cannot make inventory level negative" };
  const result = resolveErrorCode(erpContext, "ERR_STOCK_NEG");
  assert.equal(result.erp_error_message, "Insufficient stock: cannot make inventory level negative");
  assert.equal(result.normalized_error_code, "ERR_STOCK_NEG");
  assert.equal(result.error_code_source, "AI_NORMALIZATION");
});

test("resolveErrorCode prefers a literal ERP-supplied error code when present (future-proofing)", () => {
  const erpContext = { error_message: "PO receipt exceeds ordered quantity", error_code: "ERR_PO_MISMATCH" };
  const result = resolveErrorCode(erpContext, "ERR_UNCLASSIFIED");
  assert.equal(result.normalized_error_code, "ERR_PO_MISMATCH");
  assert.equal(result.error_code_source, "ERP");
});

test("resolveErrorCode handles a report with no erp_context at all (non-ERP-originated text report)", () => {
  const result = resolveErrorCode(null, "ERR_TAX_VAL_402");
  assert.equal(result.erp_error_message, null);
  assert.equal(result.normalized_error_code, "ERR_TAX_VAL_402");
  assert.equal(result.error_code_source, "AI_NORMALIZATION");
});
