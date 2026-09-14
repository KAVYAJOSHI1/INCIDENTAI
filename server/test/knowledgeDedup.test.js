/**
 * Regression tests for FIX 4 (KB writeback deduplication). Uses the pure,
 * synchronous TF-IDF path (findMostSimilarArticle) directly — no DB/network
 * dependency. The full captureVerifiedKnowledge() DB-writing path (which calls this
 * function as its fallback when Voyage embeddings aren't configured) is exercised
 * for real against the live dev database as part of the real ERP integration
 * regression test, not here — see the final verification report.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findMostSimilarArticle } from "../services/knowledgeService.js";

const existingArticle = {
  id: "kb_existing_1",
  title: "[Verified Resolution] [INVENTORY] ERR_STOCK_NEG: Inventory operation \"stock.adjust\" was rejected",
  erp_module: "INVENTORY",
  error_code: "ERR_STOCK_NEG",
  solution:
    "Reduce or cancel the stock.adjust request so that it does not decrease inventory below zero. If the intended operation is to consume stock, first replenish the SKU PROD-LITH-001 via an inbound receipt or purchase order, then re-execute the stock.adjust.",
  problem: "Inventory operation was rejected: Insufficient stock: cannot make inventory level negative (SKU PROD-LITH-001)."
};

// Test E — essentially the same verified resolution submitted again must be blocked.
// This reproduces the real bug found in testing: the AI diagnosis engine regenerated
// near-identical resolution wording for the same recurring root cause (SKU
// PROD-LITH-001 out of stock) across two separately-ingested real incidents — the
// exact case that produced two ~92%-similar KB articles (kb_190637, kb_640806) before
// this fix. Note this compares on title + solution only (see findMostSimilarArticle),
// deliberately not `problem` — a real ERP-automated incident's problem text always
// embeds a unique correlation/transaction id, which would make two otherwise-identical
// resolutions look artificially dissimilar.
test("Test E — a near-identical verified resolution is recognized as a duplicate and blocked", () => {
  const candidate = {
    title: "[Verified Resolution] [INVENTORY] ERR_STOCK_NEG: Inventory operation \"stock.adjust\" was rejected",
    erp_module: "INVENTORY",
    error_code: "ERR_STOCK_NEG",
    solution:
      "Reduce or cancel the stock.adjust request so it does not decrease inventory below zero. First replenish the SKU PROD-LITH-001 via an inbound receipt or purchase order, then re-execute the stock.adjust."
  };

  const match = findMostSimilarArticle(candidate, [existingArticle], { threshold: 0.7 });
  assert.ok(match, "a resolution with the same module/error code and closely-matching solution wording should match the existing article");
  assert.equal(match.article.id, "kb_existing_1");
});

test("findMostSimilarArticle does NOT block a solution that is only related by module/error code but genuinely reworded (known TF-IDF-fallback limitation)", () => {
  // Deep paraphrases are a real, documented limitation of the lexical fallback — this
  // is exactly why the vector (Voyage) path is tried first when embeddings are
  // configured. Asserting the boundary here so a future change doesn't silently start
  // claiming lexical dedup can do semantic matching it can't.
  const looselyRelatedCandidate = {
    title: "[Verified Resolution] [INVENTORY] ERR_STOCK_NEG: Production operation \"production_run.create\" was",
    erp_module: "INVENTORY",
    error_code: "ERR_STOCK_NEG",
    solution: "Replenish the source bin with the required quantity of PROD-LITH-001 (e.g., process a goods receipt or create a replenishment transfer), then re-submit the operation."
  };
  const match = findMostSimilarArticle(looselyRelatedCandidate, [existingArticle], { threshold: 0.88 });
  assert.equal(match, null, "a genuinely reworded solution should not be caught by the TF-IDF fallback at the default threshold");
});

test("Test E — the exact same article content is caught even at a strict threshold", () => {
  const identicalCandidate = { ...existingArticle };
  const match = findMostSimilarArticle(identicalCandidate, [existingArticle], { threshold: 0.88 });
  assert.ok(match, "identical content must be caught at the default dedup threshold");
  assert.ok(match.score >= 0.88);
});

// Test F — a genuinely different verified resolution must still be inserted normally.
test("Test F — a genuinely different resolution is not blocked by dedup", () => {
  const differentCandidate = {
    title: "[Verified Resolution] [GENERAL_LEDGER] ERR_GL_UNBALANCED: Journal posting failed",
    erp_module: "GENERAL_LEDGER",
    error_code: "ERR_GL_UNBALANCED",
    solution: "Reconcile the trial balance before closing the accounting period; ensure debits equal credits on the journal entry before posting.",
    problem: "Journal posting was rejected: debit and credit totals do not match for entry JE-8841."
  };

  const match = findMostSimilarArticle(differentCandidate, [existingArticle], { threshold: 0.88 });
  assert.equal(match, null, "an unrelated module/error/solution must not be treated as a duplicate");
});

test("findMostSimilarArticle returns null when there is no existing KB content to compare against", () => {
  assert.equal(findMostSimilarArticle(existingArticle, [], { threshold: 0.5 }), null);
  assert.equal(findMostSimilarArticle(existingArticle, null, { threshold: 0.5 }), null);
});
