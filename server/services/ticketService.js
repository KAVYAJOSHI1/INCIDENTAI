/**
 * Orchestrates Modules 1-6 into the full incident ingestion pipeline that produces a Jira-style ticket.
 */

import crypto from "node:crypto";
import { analyzeMultimodalInput } from "./ocrService.js";
import { scoreSeverity } from "./severityService.js";
import { predictRootCause } from "./rootCauseService.js";
import { findDuplicateTickets } from "./duplicateService.js";
import { searchKnowledgeBase } from "./knowledgeService.js";
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
export function applyTicketUpdate(id, patch) {
  const ticket = getTicketById(id);
  if (!ticket) return null;

  const nextPatch = { ...patch };

  if (patch.assigned_dev_id && patch.assigned_dev_id !== ticket.assigned_dev_id) {
    const previousDev = getDeveloperById(ticket.assigned_dev_id);
    const nextDev = getDeveloperById(patch.assigned_dev_id);
    if (previousDev) updateDeveloper(previousDev.id, { active_tickets: Math.max(0, previousDev.active_tickets - 1) });
    if (nextDev) {
      updateDeveloper(nextDev.id, { active_tickets: nextDev.active_tickets + 1 });
      nextPatch.assigned_dev_name = patch.assigned_dev_name || nextDev.name;
    }
  }

  const wasOpen = !CLOSED_STATUSES.includes(ticket.status);
  const willBeClosed = patch.status && CLOSED_STATUSES.includes(patch.status);
  if (wasOpen && willBeClosed) {
    nextPatch.resolved_at = patch.resolved_at || new Date().toISOString();
    const assignedDevId = nextPatch.assigned_dev_id || ticket.assigned_dev_id;
    const dev = getDeveloperById(assignedDevId);
    if (dev) updateDeveloper(dev.id, { active_tickets: Math.max(0, dev.active_tickets - 1) });
  }

  return updateTicket(id, nextPatch);
}

export function runIncidentIngestPipeline(inputPayload) {
  const t0 = Date.now();

  const ocrFindings = analyzeMultimodalInput(inputPayload);
  const ocrDurationMs = Date.now() - t0;

  const severityResult = scoreSeverity(inputPayload.text || "", ocrFindings.erp_module);
  const severityDurationMs = Date.now() - t0 - ocrDurationMs;

  const title = `[${ocrFindings.erp_module}] ${ocrFindings.extracted_error_code}: ${(inputPayload.text || "Unexpected ERP Exception").slice(0, 60)}`;
  const structuredDescription =
    `AI Diagnostics parsed issue in module ${ocrFindings.erp_module}. Encountered error code ${ocrFindings.extracted_error_code} ` +
    `on UI component <${ocrFindings.detected_ui_component}/>. ${severityResult.reasons[0] || ""}`.trim();

  const reproductionSteps = [
    `Open ERP Workspace -> ${ocrFindings.erp_module} Module`,
    `Execute primary transaction action (${ocrFindings.detected_ui_component})`,
    `Submit form payload with input data "${(inputPayload.text || "").slice(0, 40)}"`,
    `Observe exception pop-up ${ocrFindings.extracted_error_code}`
  ];

  const expectedBehavior = `ERP processes ${ocrFindings.erp_module} payload without validation failures and records the transaction.`;
  const actualBehavior = `System triggers ${ocrFindings.extracted_error_code} exception pop-up and aborts the transaction thread.`;

  const rootCause = predictRootCause(ocrFindings.extracted_error_code, ocrFindings.erp_module, ocrFindings.detected_ui_component);
  const duplicateResult = findDuplicateTickets(inputPayload.text || title, listTickets());
  const kbMatches = searchKnowledgeBase(inputPayload.text || title, ocrFindings.erp_module, listKnowledgeBase());
  const routing = recommendDeveloperForTicket({ erp_module: ocrFindings.erp_module }, listDevelopers());

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
    vague_user_input: inputPayload.text || "",
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
      related: duplicateResult.related.map((r) => ({ ticket_id: r.ticket.id, similarity_score: r.similarity_score }))
    },
    rag_kb_matches: kbMatches.map((m) => ({
      article: m.article,
      score: m.score,
      confidence_percentage: m.confidence_percentage
    })),
    developer_routing: routing,
    ai_root_cause: rootCause.root_cause,
    ai_suggested_patch: rootCause.suggested_patch,
    ai_confidence: rootCause.confidence,
    sla_remaining_minutes: severityResult.sla_remaining_minutes,
    created_at: new Date().toISOString(),
    pipeline_timings_ms: { ocr: ocrDurationMs, severity: severityDurationMs, total: Date.now() - t0 }
  };

  addTicket(ticket);
  updateDeveloper(routing.recommended.id, { active_tickets: routing.recommended.active_tickets + 1 });

  return ticket;
}
