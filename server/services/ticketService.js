/**
 * Orchestrates Modules 1-6 into the full incident ingestion pipeline that produces a Jira-style ticket.
 */

import crypto from "node:crypto";
import { analyzeMultimodalInput, analyzeMultimodalInputFromImage } from "./ocrService.js";
import { scoreSeverity, scoreSeverityWithAI } from "./severityService.js";
import { predictRootCause, predictRootCauseWithAI } from "./rootCauseService.js";
import { findDuplicateTickets, findDuplicateTicketsWithAI, findDuplicateTicketsWithVector, applyModuleAwareGuard } from "./duplicateService.js";
import { resolveErpModule, resolveErrorCode } from "../utils/erpAuthority.js";
import { searchKnowledgeBase, searchKnowledgeBaseWithAI, searchKnowledgeBaseWithVector, captureVerifiedKnowledge } from "./knowledgeService.js";
import { recommendDeveloperForTicket } from "./loadBalancerService.js";
import { performEvidenceGroundedDiagnosis } from "./diagnosisService.js";
import { recordAuditEvent } from "./auditService.js";
import { listTickets, listKnowledgeBase, listDevelopers, addTicket, updateDeveloper, getTicketById, getDeveloperById, updateTicket, getTicketByCorrelationId } from "../db/store.js";
import { CLOSED_STATUSES } from "../constants.js";

function generateTicketNumber() {
  return `INC-${crypto.randomInt(10000, 99999)}-${Date.now().toString().slice(-4)}`;
}

/**
 * Applies a ticket PATCH while keeping developer active_tickets counts consistent:
 * reassigning a ticket moves capacity between developers, resolving/closing frees it up.
 */
export async function applyTicketUpdate(id, patch) {
  const ticket = await getTicketById(id);
  if (!ticket) return null;

  const nextPatch = { ...patch };

  if (patch.assigned_dev_id && patch.assigned_dev_id !== ticket.assigned_dev_id) {
    let targetDevId = patch.assigned_dev_id;
    if (targetDevId === 'user_demo_developer' || targetDevId.toLowerCase().includes('devi')) {
      targetDevId = 'dev_05';
    }

    const previousDev = await getDeveloperById(ticket.assigned_dev_id);
    let nextDev = await getDeveloperById(targetDevId);

    if (previousDev) await updateDeveloper(previousDev.id, { active_tickets: Math.max(0, previousDev.active_tickets - 1) });
    if (nextDev) {
      await updateDeveloper(nextDev.id, { active_tickets: nextDev.active_tickets + 1 });
      nextPatch.assigned_dev_id = nextDev.id;
      nextPatch.assigned_dev_name = patch.assigned_dev_name || nextDev.name;
    } else {
      nextPatch.assigned_dev_id = targetDevId;
    }
  }

  const wasOpen = !CLOSED_STATUSES.includes(ticket.status);
  const willBeClosed = patch.status && CLOSED_STATUSES.includes(patch.status);
  if (wasOpen && willBeClosed) {
    nextPatch.resolved_at = patch.resolved_at || new Date().toISOString();
    const assignedDevId = nextPatch.assigned_dev_id || ticket.assigned_dev_id;
    const dev = await getDeveloperById(assignedDevId);
    if (dev) await updateDeveloper(dev.id, { active_tickets: Math.max(0, dev.active_tickets - 1) });
  }

  return updateTicket(id, nextPatch);
}

export async function runIncidentIngestPipeline(inputPayload) {
  const t0 = Date.now();

  // Idempotency guard: an ERP transaction that fails twice with the same correlation id
  // must map to ONE incident, not two. If we've already ingested this correlation id,
  // return the existing incident and record that the duplicate was suppressed.
  const incomingCorrelationId = inputPayload.erp_context?.correlation_id || null;
  if (incomingCorrelationId) {
    const existing = await getTicketByCorrelationId(incomingCorrelationId);
    if (existing) {
      await recordAuditEvent({
        incident_id: existing.id,
        actor: inputPayload.erp_context?.erp || inputPayload.reporter || "Smart Manufacturing ERP",
        action: "DUPLICATE_SUPPRESSED",
        previous_state: existing.status,
        new_state: existing.status,
        details: `Repeat ERP failure for correlation ${incomingCorrelationId} — no new incident created; mapped to existing ${existing.ticket_number}.`
      }).catch(() => {});
      return existing;
    }
  }

  // Prefer the reporter's own description; fall back to the real pixel-level Tesseract.js
  // OCR text when they only uploaded a screenshot and typed nothing. Without this, a
  // screenshot-only submission had no text signal at all for classification.
  const sourceText = (inputPayload.text || inputPayload.ocrRawText || "").trim();

  let ocrFindings = null;
  if (inputPayload.imageBase64) {
    try {
      // Real server-side OCR on the actual screenshot — independent classification plus a
      // genuine word-level bounding box, not the text-only keyword matcher below.
      ocrFindings = await analyzeMultimodalInputFromImage(inputPayload.imageBase64);
    } catch (err) {
      // Corrupt bytes / unsupported format — don't fail the whole ticket over an
      // unreadable image, fall through to the text-only classifier below.
      console.warn(`[ticketService] Server-side image OCR failed, falling back to text classification: ${err?.message || err}`);
    }
  }
  if (!ocrFindings) {
    ocrFindings = analyzeMultimodalInput({ ...inputPayload, text: sourceText });
    if (inputPayload.ocrRawText) {
      // Surface the real extracted text (not just the synthetic signature summary) so the
      // Developer Workbench shows what Tesseract actually read off the screenshot.
      ocrFindings.raw_text = inputPayload.ocrRawText;
      ocrFindings.ocr_extracted_text = `[Tesseract.js Real OCR]\n${inputPayload.ocrRawText}\n\n${ocrFindings.ocr_extracted_text}`;
    }
  }
  ocrFindings.erp_context = inputPayload.erp_context || null;
  const ocrDurationMs = Date.now() - t0;

  // FIX 1: the ERP's own structured module is authoritative over the OCR/LLM free-text
  // guess (which can be wrong — e.g. a Production failure whose error message mentions
  // "inventory adjustment failed" because Production calls Inventory internally). The
  // AI's guess is preserved on ocrFindings for explainability, never used to override it.
  const moduleResolution = resolveErpModule(inputPayload.erp_context?.module, ocrFindings.erp_module);
  const resolvedModule = moduleResolution.erp_module;
  ocrFindings.ai_inferred_module = moduleResolution.ai_inferred_module;
  ocrFindings.authoritative_module = moduleResolution.authoritative_module;
  ocrFindings.module_source = moduleResolution.module_source;

  // FIX 3: preserve the ERP's literal error text separately from the normalized code the
  // classifier synthesized from it — the ERP services here don't return a structured
  // error_code field today, so `extracted_error_code` is always AI-derived, and must not
  // be presented as though the ERP itself supplied it.
  const errorCodeResolution = resolveErrorCode(inputPayload.erp_context, ocrFindings.extracted_error_code);
  ocrFindings.erp_error_message = errorCodeResolution.erp_error_message;
  ocrFindings.normalized_error_code = errorCodeResolution.normalized_error_code;
  ocrFindings.error_code_source = errorCodeResolution.error_code_source;

  const severityResult =
    (await scoreSeverityWithAI(sourceText, resolvedModule)) ?? scoreSeverity(sourceText, resolvedModule);
  const severityDurationMs = Date.now() - t0 - ocrDurationMs;

  const title = `[${resolvedModule}] ${ocrFindings.extracted_error_code}: ${(sourceText || "Unexpected ERP Exception").slice(0, 60)}`;
  const structuredDescription =
    `AI Diagnostics parsed issue in module ${resolvedModule}. Encountered error code ${ocrFindings.extracted_error_code} ` +
    `on UI component <${ocrFindings.detected_ui_component}/>. ${severityResult.reasons[0] || ""}`.trim();

  const reproductionSteps = [
    `Open ERP Workspace -> ${resolvedModule} Module`,
    `Execute primary transaction action (${ocrFindings.detected_ui_component})`,
    `Submit form payload with input data "${sourceText.slice(0, 40)}"`,
    `Observe exception pop-up ${ocrFindings.extracted_error_code}`
  ];

  const expectedBehavior = `ERP processes ${resolvedModule} payload without validation failures and records the transaction.`;
  const actualBehavior = `System triggers ${ocrFindings.extracted_error_code} exception pop-up and aborts the transaction thread.`;

  const rootCause =
    (await predictRootCauseWithAI(ocrFindings.extracted_error_code, resolvedModule, ocrFindings.detected_ui_component, sourceText)) ??
    predictRootCause(ocrFindings.extracted_error_code, resolvedModule, ocrFindings.detected_ui_component);
  const [existingTickets, knowledgeBaseArticles, developers] = await Promise.all([listTickets(), listKnowledgeBase(), listDevelopers()]);

  // FIX 2: duplicate detection is module-aware — the new incident's resolved module and
  // UI component are passed through so a cross-module match (different business process,
  // shared terminology only) is penalized rather than treated as strong evidence. See
  // applyContextSignals / applyModuleAwareGuard in duplicateService.js.
  const duplicateOptions = { referenceModule: resolvedModule, referenceComponent: ocrFindings.detected_ui_component };

  // pgvector cosine-distance retrieval when Voyage embeddings are configured, falling
  // back to the in-memory TF-IDF candidate set otherwise.
  const candidateDuplicateResult =
    (await findDuplicateTicketsWithVector(sourceText || title, duplicateOptions)) ?? findDuplicateTickets(sourceText || title, existingTickets, duplicateOptions);
  const rawDuplicateResult = (await findDuplicateTicketsWithAI(sourceText || title, candidateDuplicateResult, resolvedModule)) ?? candidateDuplicateResult;
  // Deterministic safety net applied once regardless of which path (TF-IDF / vector / AI
  // re-rank) produced the result above — a cross-module false positive can't slip through
  // even if the LLM judge scored purely off text and ignored module entirely.
  const duplicateResult = applyModuleAwareGuard(rawDuplicateResult, resolvedModule);

  // Broader, unfiltered shortlist feeds the AI re-ranker so it can catch matches lexical/vector retrieval alone would score too low to surface
  const kbShortlist =
    (await searchKnowledgeBaseWithVector(sourceText || title, resolvedModule, { minScore: 0.05 })) ??
    searchKnowledgeBase(sourceText || title, resolvedModule, knowledgeBaseArticles, { minScore: 0.05 });
  const kbFallback = kbShortlist.filter((m) => m.score >= 0.25);
  const kbMatches = (await searchKnowledgeBaseWithAI(sourceText || title, resolvedModule, kbShortlist)) ?? kbFallback;
  const routing = recommendDeveloperForTicket({ erp_module: resolvedModule }, developers);

  // Execute Phase 6 RAG + MCP + LLM Evidence-Grounded Diagnosis
  const initialTicketDraft = {
    id: `INC-${crypto.randomUUID()}`,
    title,
    erp_module: resolvedModule,
    severity: severityResult.severity,
    vague_user_input: inputPayload.text || sourceText,
    ocr_findings: ocrFindings,
    erp_context: inputPayload.erp_context || { erp: "Smart Manufacturing ERP", module: resolvedModule, route: null, record_id: null },
    duplicate_check: {
      is_duplicate: duplicateResult.is_duplicate,
      similarity_score: duplicateResult.top_match ? duplicateResult.top_match.similarity_score : 0,
      reasoning: duplicateResult.reasoning || null,
      cross_module_override: duplicateResult.cross_module_override || false
    }
  };

  const diagnosisResult = await performEvidenceGroundedDiagnosis({
    incident: initialTicketDraft,
    ragKbMatches: kbMatches
  });

  // A transaction the ERP itself REJECTED is a system-side failure — it always enters the
  // developer remediation workflow (approve → verify → apply / rollback). Self-service is
  // only for user-reported confusion, never for a hard ERP validation rejection. This keeps
  // the demo deterministic regardless of how the LLM scores severity/confidence.
  const isErpRejection =
    inputPayload.erp_context?.source_transaction_status === "REJECTED" ||
    inputPayload.erp_context?.source === "erp-backend-auto";
  if (isErpRejection && diagnosisResult.ai_diagnosis) {
    if (diagnosisResult.ai_diagnosis.resolution_type === "SELF_SERVICE") {
      diagnosisResult.ai_diagnosis.resolution_type = "DEVELOPER";
      diagnosisResult.ai_diagnosis.reason =
        `${diagnosisResult.ai_diagnosis.reason || ""} The ERP transaction was hard-rejected by a validation rule, so this enters the developer remediation workflow rather than end-user self-service.`.trim();
    }
    diagnosisResult.ai_diagnosis.requires_human_review = true;
  }

  const finalRootCause = diagnosisResult.ai_diagnosis.root_cause || rootCause.root_cause;
  const finalResolution = diagnosisResult.ai_diagnosis.recommended_resolution || rootCause.suggested_patch;
  const finalConfidence = diagnosisResult.ai_diagnosis.confidence || rootCause.confidence;

  const ticket = {
    id: initialTicketDraft.id,
    ticket_number: generateTicketNumber(),
    title,
    reporter: inputPayload.reporter || "Smart Manufacturing ERP",
    erp_context: initialTicketDraft.erp_context,
    assigned_dev_id: routing.recommended.id,
    assigned_dev_name: routing.recommended.name,
    erp_module: resolvedModule,
    severity: severityResult.severity,
    status: diagnosisResult.ai_diagnosis.resolution_type === "SELF_SERVICE" ? "SELF_SERVICE_RESOLVED" : "TRIAGED",
    vague_user_input: inputPayload.text || sourceText,
    structured_description: structuredDescription,
    reproduction_steps: reproductionSteps,
    expected_behavior: expectedBehavior,
    actual_behavior: actualBehavior,
    ocr_findings: ocrFindings,
    severity_analysis: severityResult,
    duplicate_check: {
      is_duplicate: duplicateResult.is_duplicate,
      similarity_score: duplicateResult.top_match ? duplicateResult.top_match.similarity_score : 0,
      top_match: duplicateResult.top_match
        ? {
            ticket: { id: duplicateResult.top_match.ticket.id, ticket_number: duplicateResult.top_match.ticket.ticket_number },
            similarity_score: duplicateResult.top_match.similarity_score,
            signals: duplicateResult.top_match.signals || null
          }
        : null,
      related: duplicateResult.related.map((r) => ({ ticket_id: r.ticket.id, similarity_score: r.similarity_score })),
      reasoning: duplicateResult.reasoning || null,
      ai_generated: duplicateResult.ai_generated,
      cross_module_override: duplicateResult.cross_module_override || false
    },
    rag_kb_matches: kbMatches.map((m) => ({
      article: m.article,
      score: m.score,
      confidence_percentage: m.confidence_percentage,
      why_relevant: m.why_relevant || null,
      ai_generated: m.ai_generated ?? false
    })),
    developer_routing: routing,
    ai_root_cause: finalRootCause,
    ai_suggested_patch: finalResolution,
    ai_confidence: finalConfidence,
    mcp_evidence: diagnosisResult.mcp_evidence,
    rag_evidence: diagnosisResult.rag_evidence,
    ai_diagnosis: diagnosisResult.ai_diagnosis,
    resolution_type: diagnosisResult.ai_diagnosis.resolution_type,
    requires_human_review: diagnosisResult.ai_diagnosis.requires_human_review,
    correlation_id: inputPayload.erp_context?.correlation_id || diagnosisResult.correlation_id,
    ai_generated: Boolean(rootCause.ai_generated || severityResult.ai_generated || duplicateResult.ai_generated || process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY),
    sla_remaining_minutes: severityResult.sla_remaining_minutes,
    created_at: new Date().toISOString(),
    pipeline_timings_ms: { ocr: ocrDurationMs, severity: severityDurationMs, total: Date.now() - t0 }
  };

  const savedTicket = await addTicket(ticket);
  await updateDeveloper(routing.recommended.id, { active_tickets: routing.recommended.active_tickets + 1 });

  await recordAuditEvent({
    incident_id: savedTicket.id,
    actor: inputPayload.erp_context?.erp || savedTicket.reporter || "Smart Manufacturing ERP",
    action: "INCIDENT_CREATED",
    previous_state: null,
    new_state: savedTicket.status,
    details: `Incident ingested from ${savedTicket.erp_module} — ${title}. Correlation ${savedTicket.correlation_id || "n/a"}.`
  }).catch(() => {});

  return savedTicket;
}

/**
 * Phase 7: Verification workflow executed by developer.
 * Marks ticket as VERIFIED -> KNOWLEDGE_CAPTURED and triggers RAG writeback via Voyage embeddings.
 */
export async function verifyAndCaptureKnowledge(id, verificationData = {}, developerUser = {}) {
  const ticket = await getTicketById(id);
  if (!ticket) return null;

  // 1. Capture verified knowledge and generate Voyage vector embedding
  const kbArticle = await captureVerifiedKnowledge(ticket, verificationData);

  // 2. Transition ticket through VERIFIED -> KNOWLEDGE_CAPTURED
  const updatedTicket = await applyTicketUpdate(id, {
    status: "KNOWLEDGE_CAPTURED",
    resolved_at: new Date().toISOString(),
    ai_root_cause: verificationData.root_cause || ticket.ai_root_cause,
    ai_suggested_patch: verificationData.verified_resolution || ticket.ai_suggested_patch,
    requires_human_review: false
  });

  return { ticket: updatedTicket, kbArticle };
}

