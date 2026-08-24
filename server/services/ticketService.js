/**
 * Orchestrates Modules 1-6 into the full incident ingestion pipeline that produces a Jira-style ticket.
 */

import crypto from "node:crypto";
import { analyzeMultimodalInput, analyzeMultimodalInputFromImage } from "./ocrService.js";
import { scoreSeverity, scoreSeverityWithAI } from "./severityService.js";
import { predictRootCause, predictRootCauseWithAI } from "./rootCauseService.js";
import { findDuplicateTickets, findDuplicateTicketsWithAI, findDuplicateTicketsWithVector } from "./duplicateService.js";
import { searchKnowledgeBase, searchKnowledgeBaseWithAI, searchKnowledgeBaseWithVector, captureVerifiedKnowledge } from "./knowledgeService.js";
import { recommendDeveloperForTicket } from "./loadBalancerService.js";
import { performEvidenceGroundedDiagnosis } from "./diagnosisService.js";
import { listTickets, listKnowledgeBase, listDevelopers, addTicket, updateDeveloper, getTicketById, getDeveloperById, updateTicket } from "../db/store.js";
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
    const previousDev = await getDeveloperById(ticket.assigned_dev_id);
    const nextDev = await getDeveloperById(patch.assigned_dev_id);
    if (previousDev) await updateDeveloper(previousDev.id, { active_tickets: Math.max(0, previousDev.active_tickets - 1) });
    if (nextDev) {
      await updateDeveloper(nextDev.id, { active_tickets: nextDev.active_tickets + 1 });
      nextPatch.assigned_dev_name = patch.assigned_dev_name || nextDev.name;
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

  const severityResult =
    (await scoreSeverityWithAI(sourceText, ocrFindings.erp_module)) ?? scoreSeverity(sourceText, ocrFindings.erp_module);
  const severityDurationMs = Date.now() - t0 - ocrDurationMs;

  const title = `[${ocrFindings.erp_module}] ${ocrFindings.extracted_error_code}: ${(sourceText || "Unexpected ERP Exception").slice(0, 60)}`;
  const structuredDescription =
    `AI Diagnostics parsed issue in module ${ocrFindings.erp_module}. Encountered error code ${ocrFindings.extracted_error_code} ` +
    `on UI component <${ocrFindings.detected_ui_component}/>. ${severityResult.reasons[0] || ""}`.trim();

  const reproductionSteps = [
    `Open ERP Workspace -> ${ocrFindings.erp_module} Module`,
    `Execute primary transaction action (${ocrFindings.detected_ui_component})`,
    `Submit form payload with input data "${sourceText.slice(0, 40)}"`,
    `Observe exception pop-up ${ocrFindings.extracted_error_code}`
  ];

  const expectedBehavior = `ERP processes ${ocrFindings.erp_module} payload without validation failures and records the transaction.`;
  const actualBehavior = `System triggers ${ocrFindings.extracted_error_code} exception pop-up and aborts the transaction thread.`;

  const rootCause =
    (await predictRootCauseWithAI(ocrFindings.extracted_error_code, ocrFindings.erp_module, ocrFindings.detected_ui_component, sourceText)) ??
    predictRootCause(ocrFindings.extracted_error_code, ocrFindings.erp_module, ocrFindings.detected_ui_component);
  const [existingTickets, knowledgeBaseArticles, developers] = await Promise.all([listTickets(), listKnowledgeBase(), listDevelopers()]);

  // pgvector cosine-distance retrieval when Voyage embeddings are configured, falling
  // back to the in-memory TF-IDF candidate set otherwise.
  const candidateDuplicateResult =
    (await findDuplicateTicketsWithVector(sourceText || title)) ?? findDuplicateTickets(sourceText || title, existingTickets);
  const duplicateResult = (await findDuplicateTicketsWithAI(sourceText || title, candidateDuplicateResult)) ?? candidateDuplicateResult;

  // Broader, unfiltered shortlist feeds the AI re-ranker so it can catch matches lexical/vector retrieval alone would score too low to surface
  const kbShortlist =
    (await searchKnowledgeBaseWithVector(sourceText || title, ocrFindings.erp_module, { minScore: 0.05 })) ??
    searchKnowledgeBase(sourceText || title, ocrFindings.erp_module, knowledgeBaseArticles, { minScore: 0.05 });
  const kbFallback = kbShortlist.filter((m) => m.score >= 0.25);
  const kbMatches = (await searchKnowledgeBaseWithAI(sourceText || title, ocrFindings.erp_module, kbShortlist)) ?? kbFallback;
  const routing = recommendDeveloperForTicket({ erp_module: ocrFindings.erp_module }, developers);

  // Execute Phase 6 RAG + MCP + LLM Evidence-Grounded Diagnosis
  const initialTicketDraft = {
    id: `INC-${crypto.randomUUID()}`,
    title,
    erp_module: ocrFindings.erp_module,
    severity: severityResult.severity,
    vague_user_input: inputPayload.text || sourceText,
    ocr_findings: ocrFindings,
    erp_context: inputPayload.erp_context || { erp: "Smart Manufacturing ERP", module: ocrFindings.erp_module, route: null, record_id: null },
    duplicate_check: {
      is_duplicate: duplicateResult.is_duplicate,
      similarity_score: duplicateResult.top_match ? duplicateResult.top_match.similarity_score : 0,
      reasoning: duplicateResult.reasoning || null
    }
  };

  const diagnosisResult = await performEvidenceGroundedDiagnosis({
    incident: initialTicketDraft,
    ragKbMatches: kbMatches
  });

  const finalRootCause = diagnosisResult.ai_diagnosis.root_cause || rootCause.root_cause;
  const finalResolution = diagnosisResult.ai_diagnosis.recommended_resolution || rootCause.suggested_patch;
  const finalConfidence = diagnosisResult.ai_diagnosis.confidence || rootCause.confidence;

  const ticket = {
    id: initialTicketDraft.id,
    ticket_number: generateTicketNumber(),
    title,
    reporter: inputPayload.reporter || "ERP Operator User",
    erp_context: initialTicketDraft.erp_context,
    assigned_dev_id: routing.recommended.id,
    assigned_dev_name: routing.recommended.name,
    erp_module: ocrFindings.erp_module,
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
            similarity_score: duplicateResult.top_match.similarity_score
          }
        : null,
      related: duplicateResult.related.map((r) => ({ ticket_id: r.ticket.id, similarity_score: r.similarity_score })),
      reasoning: duplicateResult.reasoning || null,
      ai_generated: duplicateResult.ai_generated
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
    correlation_id: diagnosisResult.correlation_id,
    ai_generated: Boolean(rootCause.ai_generated || severityResult.ai_generated || duplicateResult.ai_generated || process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY),
    sla_remaining_minutes: severityResult.sla_remaining_minutes,
    created_at: new Date().toISOString(),
    pipeline_timings_ms: { ocr: ocrDurationMs, severity: severityDurationMs, total: Date.now() - t0 }
  };

  const savedTicket = await addTicket(ticket);
  await updateDeveloper(routing.recommended.id, { active_tickets: routing.recommended.active_tickets + 1 });

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

