/**
 * Orchestrates Modules 1-6 into the full incident ingestion pipeline that produces a Jira-style ticket.
 */

import crypto from "node:crypto";
import { analyzeMultimodalInput } from "./ocrService.js";
import { scoreSeverity, scoreSeverityWithAI } from "./severityService.js";
import { predictRootCause, predictRootCauseWithAI } from "./rootCauseService.js";
import { findDuplicateTickets, findDuplicateTicketsWithAI, findDuplicateTicketsWithVector } from "./duplicateService.js";
import { searchKnowledgeBase, searchKnowledgeBaseWithAI, searchKnowledgeBaseWithVector } from "./knowledgeService.js";
import { recommendDeveloperForTicket } from "./loadBalancerService.js";
import { listTickets, listKnowledgeBase, listDevelopers, addTicket, updateDeveloper, getTicketById, getDeveloperById, updateTicket } from "../db/store.js";
import { CLOSED_STATUSES } from "../constants.js";

function generateTicketNumber() {
  return `INC-${crypto.randomInt(1000, 9999)}`;
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

  const ocrFindings = analyzeMultimodalInput({ ...inputPayload, text: sourceText });
  if (inputPayload.ocrRawText) {
    // Surface the real extracted text (not just the synthetic signature summary) so the
    // Developer Workbench shows what Tesseract actually read off the screenshot.
    ocrFindings.raw_text = inputPayload.ocrRawText;
    ocrFindings.ocr_extracted_text = `[Tesseract.js Real OCR]\n${inputPayload.ocrRawText}\n\n${ocrFindings.ocr_extracted_text}`;
  }
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

  const ticket = {
    id: `INC-2026-${crypto.randomInt(1000, 9999)}`,
    ticket_number: generateTicketNumber(),
    title,
    reporter: inputPayload.reporter || "ERP Operator User",
    assigned_dev_id: routing.recommended.id,
    assigned_dev_name: routing.recommended.name,
    erp_module: ocrFindings.erp_module,
    severity: severityResult.severity,
    status: "TRIAGED",
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
    ai_root_cause: rootCause.root_cause,
    ai_suggested_patch: rootCause.suggested_patch,
    ai_confidence: rootCause.confidence,
    sla_remaining_minutes: severityResult.sla_remaining_minutes,
    created_at: new Date().toISOString(),
    pipeline_timings_ms: { ocr: ocrDurationMs, severity: severityDurationMs, total: Date.now() - t0 }
  };

  const savedTicket = await addTicket(ticket);
  await updateDeveloper(routing.recommended.id, { active_tickets: routing.recommended.active_tickets + 1 });

  return savedTicket;
}
