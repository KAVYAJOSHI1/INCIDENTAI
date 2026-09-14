/**
 * Resolves which "module" and "error code" an ingested incident is ultimately labeled
 * with, when two sources disagree:
 *
 *  - the ERP's own structured payload (`erp_context.module` / `erp_context.error_code`),
 *    which is a fact about the transaction that actually ran, and
 *  - the OCR/LLM free-text classifier's guess (`ocrFindings.erp_module` /
 *    `extracted_error_code`), which can be wrong when the error message mentions a
 *    different subsystem than the one that actually failed (e.g. a Production run
 *    failing because it internally calls Inventory — the message says "inventory
 *    adjustment failed" even though the failing operation was Production's).
 *
 * Rule: structured ERP metadata is authoritative and wins. The AI/OCR guess is kept
 * alongside for explainability, never silently discarded.
 */

/**
 * Normalizes a free-form module string (however the ERP happens to have cased/spaced
 * it — "Production", "General Ledger", "general-ledger") into the canonical
 * SCREAMING_SNAKE_CASE form used internally (ERP_MODULES in constants.js). Does not
 * validate against that list — an ERP module we haven't seen before is still real and
 * still authoritative, it just gets the same consistent casing/format applied.
 */
export function normalizeErpModule(rawModule) {
  if (!rawModule || typeof rawModule !== "string") return null;
  const normalized = rawModule
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || null;
}

/**
 * authoritative_module: the ERP's own structured module, normalized (null if the ERP
 *   didn't send one — e.g. a manually-typed, non-ERP-originated report).
 * ai_inferred_module: the OCR/LLM classifier's guess, normalized, kept purely for
 *   explainability/debugging — never used for the final classification when an
 *   authoritative module exists.
 * erp_module: the final classification. Authoritative when available, AI inference
 *   only as a fallback.
 */
export function resolveErpModule(erpContextModule, aiInferredModule) {
  const authoritative = normalizeErpModule(erpContextModule);
  const aiInferred = normalizeErpModule(aiInferredModule) || aiInferredModule || null;
  return {
    erp_module: authoritative || aiInferred || "GENERAL",
    authoritative_module: authoritative,
    ai_inferred_module: aiInferred,
    module_source: authoritative ? "ERP_CONTEXT" : "AI_INFERENCE"
  };
}

/**
 * erp_error_message: the ERP's own error text, preserved byte-for-byte — never rewritten.
 * normalized_error_code: a short machine-matchable code. Literal from the ERP when it
 *   ever supplies one (error_code_source "ERP"); otherwise the AI/keyword classifier's
 *   synthesized label (error_code_source "AI_NORMALIZATION") — which must never be
 *   presented as though the ERP itself returned that code.
 */
export function resolveErrorCode(erpContext, aiExtractedErrorCode) {
  const erpErrorMessage = erpContext?.error_message ?? null;
  const erpProvidedCode = erpContext?.error_code || null;
  const normalizedErrorCode = erpProvidedCode || aiExtractedErrorCode || "ERR_UNCLASSIFIED";
  return {
    erp_error_message: erpErrorMessage,
    normalized_error_code: normalizedErrorCode,
    error_code_source: erpProvidedCode ? "ERP" : "AI_NORMALIZATION"
  };
}
