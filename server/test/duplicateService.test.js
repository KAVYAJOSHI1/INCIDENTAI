/**
 * Regression tests for FIX 2 (module-aware duplicate detection). Uses the pure,
 * synchronous TF-IDF path (findDuplicateTickets) and the deterministic post-guard
 * (applyModuleAwareGuard) directly — no DB/LLM dependency, so these run offline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findDuplicateTickets, applyModuleAwareGuard, applyContextSignals } from "../services/duplicateService.js";

const inventoryTicket = {
  id: "INC-existing-inventory",
  ticket_number: "INC-10001-0001",
  erp_module: "INVENTORY",
  title: "[INVENTORY] ERR_STOCK_NEG: Negative quantity violation during bin transfer",
  structured_description:
    "AI Diagnostics parsed issue in module INVENTORY. Encountered error code ERR_STOCK_NEG on UI component <BinTransferGrid/>. Inventory adjustment operation rejected causing negative stock levels.",
  vague_user_input:
    "Inventory operation was rejected: Insufficient stock: cannot make inventory level negative (SKU PROD-LITH-001).",
  ocr_findings: { extracted_error_code: "ERR_STOCK_NEG", detected_ui_component: "BinTransferGrid" }
};

// The real bug, reproduced: the OCR/LLM classifier synthesizes the SAME error code
// (ERR_STOCK_NEG) for both incidents because Production's failure message mentions
// "inventory adjustment failed" (Production calls Inventory internally) — so this
// candidate is lexically (and even error-code-wise) near-identical to the Inventory
// ticket above, despite representing a genuinely different business process: a
// blocked production run, not a blocked warehouse transfer.
const productionCandidateText =
  "Production operation was rejected: AI Diagnostics parsed issue in module INVENTORY. Encountered error code ERR_STOCK_NEG on UI component <BinTransferGrid/>. Production run failed to deduct raw material: Insufficient stock: cannot make inventory level negative (SKU PROD-LITH-001).";

// Test C — Production and Inventory aren't falsely deduplicated.
test("Test C — a lexically-similar cross-module incident is not flagged as a duplicate", () => {
  const result = findDuplicateTickets(productionCandidateText, [inventoryTicket], {
    referenceModule: "PRODUCTION",
    referenceComponent: "ProductionRunReleaseForm"
  });

  // Sanity check: without any module penalty this pair would score far above the
  // 0.85 duplicate threshold (shared SKU, shared error text) — the module context
  // is what has to pull it back down.
  assert.equal(result.is_duplicate, false, "cross-module match must not be auto-flagged as a duplicate");
  assert.ok(result.top_match, "the candidate should still surface as the top (related) match");
  assert.equal(result.top_match.ticket.id, "INC-existing-inventory");
  assert.equal(result.top_match.signals.module_match, false, "signals must expose that the module differed");
  assert.equal(result.top_match.signals.semantic_similarity > 0.6, true, "the underlying text similarity should still be visible in the signal, even though it's not a duplicate");
});

test("same-module duplicate detection still works (regression: fix must not blunt real duplicates)", () => {
  // Exactly the text findDuplicateTickets combines for this ticket internally
  // (title + structured_description + vague_user_input + error code) — a report
  // that is genuinely the same incident, reported again.
  const sameModuleCandidateText = `${inventoryTicket.title} ${inventoryTicket.structured_description} ${inventoryTicket.vague_user_input} ${inventoryTicket.ocr_findings.extracted_error_code}`;
  const result = findDuplicateTickets(sameModuleCandidateText, [inventoryTicket], {
    referenceModule: "INVENTORY",
    referenceComponent: "BinTransferGrid"
  });
  assert.equal(result.is_duplicate, true, "an near-identical same-module report should still be caught as a duplicate");
  assert.equal(result.top_match.signals.module_match, true);
});

test("applyContextSignals penalizes a cross-module match and rewards a same-module + same-component match", () => {
  const crossModule = applyContextSignals(0.9, { candidateModule: "INVENTORY", referenceModule: "PRODUCTION" });
  assert.ok(crossModule.score < 0.9, "cross-module score must be penalized below the raw semantic similarity");
  assert.equal(crossModule.signals.module_match, false);

  const sameModule = applyContextSignals(0.9, {
    candidateModule: "INVENTORY",
    referenceModule: "INVENTORY",
    candidateComponent: "BinTransferGrid",
    referenceComponent: "BinTransferGrid"
  });
  assert.ok(sameModule.score >= 0.9, "same-module + same-component should not be penalized");
  assert.equal(sameModule.signals.module_match, true);
  assert.equal(sameModule.signals.component_match, true);
});

test("applyModuleAwareGuard demotes a cross-module duplicate flag unless similarity is overwhelming", () => {
  const crossModuleResult = {
    is_duplicate: true,
    top_match: { ticket: { erp_module: "INVENTORY" }, similarity_score: 0.92 },
    reasoning: "AI judge said duplicate based on shared root cause."
  };
  const guarded = applyModuleAwareGuard(crossModuleResult, "PRODUCTION");
  assert.equal(guarded.is_duplicate, false);
  assert.equal(guarded.cross_module_override, true);
  assert.match(guarded.reasoning, /Module-aware override/);
});

test("applyModuleAwareGuard leaves a same-module duplicate untouched", () => {
  const sameModuleResult = {
    is_duplicate: true,
    top_match: { ticket: { erp_module: "INVENTORY" }, similarity_score: 0.9 },
    reasoning: "same module, high similarity"
  };
  const guarded = applyModuleAwareGuard(sameModuleResult, "INVENTORY");
  assert.equal(guarded, sameModuleResult, "should be returned unchanged (same reference, no override applied)");
});

test("applyModuleAwareGuard allows a cross-module duplicate through only with overwhelming similarity", () => {
  const overwhelming = {
    is_duplicate: true,
    top_match: { ticket: { erp_module: "INVENTORY" }, similarity_score: 0.98 },
    reasoning: "near-identical text, likely the same replayed transaction"
  };
  const guarded = applyModuleAwareGuard(overwhelming, "PRODUCTION");
  assert.equal(guarded.is_duplicate, true, "an overwhelming cross-module similarity is still allowed to be a duplicate");
  assert.equal(guarded.cross_module_override, undefined);
});

test("duplicate creation is never blocked outright — related/is_duplicate=false still returns the candidate for triage visibility", () => {
  const result = findDuplicateTickets(productionCandidateText, [inventoryTicket], { referenceModule: "PRODUCTION" });
  assert.equal(result.is_duplicate, false);
  // The explainable signal is still present — a human/triage view can see *why* it
  // looked similar even though it wasn't auto-flagged.
  assert.ok(result.top_match, "the near-miss should remain visible as an explainable signal, not silently dropped");
});
