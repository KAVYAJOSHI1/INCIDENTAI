/**
 * Remediation Engine Service
 * Connects AI Diagnosis to Remediation Plans, Risk Assessment, and Safety Guardrails.
 *
 * The remediation plan + its lifecycle sub-state are persisted in Postgres
 * (server/db/remediation) so approver identity, timestamps and verification
 * results survive a server restart. All state transitions are validated by the
 * authoritative workflow state machine.
 */

import { getTicketById, updateTicket, getRemediationRow, upsertRemediationRow } from "../db/store.js";
import { recordAuditEvent } from "./auditService.js";
import { assertAction, bumpPatchVersion } from "./workflowStateMachine.js";
import { buildDependencyTree } from "./rootCauseTreeService.js";

function calculateRemediationRisk(ticket, kbMismatch) {
  const module = ticket.erp_module || "GENERAL";
  const severity = ticket.severity || "P3_LOW";
  const isFinancial = ["FINANCE", "PAYROLL", "GENERAL_LEDGER", "INVOICING"].includes(module);

  if (kbMismatch) return "HIGH";
  if (severity === "P0_CRITICAL" || isFinancial) return "HIGH";
  if (severity === "P1_HIGH") return "MEDIUM";
  return "LOW";
}

/**
 * Builds a remediation plan strictly from this incident's own diagnosis + evidence.
 * No cross-incident or hardcoded fallbacks — unavailable fields are returned null/empty.
 */
function buildRemediationPlan(ticket) {
  const matchedKb = (ticket.rag_kb_matches || [])[0];
  const matchedModule = matchedKb?.article?.erp_module;
  const isKbMismatch = Boolean(matchedModule && matchedModule !== ticket.erp_module);

  const confidenceScore = ticket.ai_confidence ?? null;
  const riskLevel = calculateRemediationRisk(ticket, isKbMismatch);
  const tree = buildDependencyTree(ticket);

  const rootCause = ticket.ai_diagnosis?.root_cause || ticket.ai_root_cause || null;
  const recommended = ticket.ai_diagnosis?.recommended_resolution || ticket.ai_suggested_patch || null;

  const currentVersion = ticket.patch_version || "v1.0.0";

  return {
    id: `REM-${ticket.id}`,
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number || ticket.id,
    root_cause: rootCause,
    recommended_remediation: recommended,
    proposed_action: recommended
      ? `Apply the recommended fix in ${tree.nodes.find((n) => n.type === "file")?.label || "the affected module"} and re-run the ${ticket.erp_module} validation suite.`
      : null,
    affected_component: tree.nodes.find((n) => n.type === "file")?.label || null,
    affected_function: tree.nodes.find((n) => n.type === "function")?.label || null,
    affected_table: tree.nodes.find((n) => n.type === "database_table")?.label || null,
    error_code: ticket.ocr_findings?.extracted_error_code || ticket.error_code || null,
    confidence: confidenceScore,
    confidence_percentage: confidenceScore != null ? `${Math.round(confidenceScore * 100)}%` : "Unavailable",
    risk_level: riskLevel,
    human_approval_required:
      riskLevel === "HIGH" || riskLevel === "CRITICAL" || isKbMismatch || confidenceScore == null || confidenceScore < 0.8,
    kb_mismatch_detected: isKbMismatch,
    kb_mismatch_details: isKbMismatch
      ? `Incident belongs to ${ticket.erp_module}, but top KB match belongs to ${matchedModule}. Automatic patch execution blocked pending human review.`
      : null,
    current_version: currentVersion,
    target_version: bumpPatchVersion(currentVersion)
  };
}

/**
 * Returns the persisted remediation record for a ticket, generating + persisting
 * an initial PROPOSED plan the first time it is requested.
 */
export async function getRemediationForTicket(ticketId) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const canonicalId = ticket.id;
  let row = await getRemediationRow(canonicalId);

  if (!row) {
    const plan = buildRemediationPlan(ticket);
    row = await upsertRemediationRow(canonicalId, {
      ticket_number: ticket.ticket_number || null,
      plan,
      status: ticket.remediation_status || "PROPOSED",
      current_version: plan.current_version,
      target_version: plan.target_version
    });
  }

  // Flatten to the shape the API/UI already expects (plan fields at top level).
  return {
    ...row.plan,
    status: row.status,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    rejection_reason: row.rejection_reason,
    applied_by: row.applied_by,
    applied_at: row.applied_at,
    reverted_at: row.reverted_at,
    rollback_reason: row.rollback_reason,
    verification_result: row.verification_result || null,
    current_version: row.current_version || row.plan?.current_version || "v1.0.0",
    target_version: row.target_version || row.plan?.target_version || "v1.0.1",
    baseline_version: row.plan?.current_version || "v1.0.0",
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function approveRemediation(ticketId, actor = "Developer") {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const targetStatus = assertAction(ticket.status, "APPROVE_REMEDIATION", ticket);
  const remediation = await getRemediationForTicket(ticketId);
  const previousState = remediation.status;

  await upsertRemediationRow(ticket.id, {
    status: "APPROVED",
    approved_by: actor,
    approved_at: new Date().toISOString()
  });

  const updatedTicket = await updateTicket(ticket.id, {
    remediation_status: "APPROVED",
    status: targetStatus
  });

  await recordAuditEvent({
    incident_id: ticket.id,
    actor,
    action: "PATCH_APPROVED",
    previous_state: previousState,
    new_state: targetStatus,
    patch_version: remediation.target_version,
    details: `${actor} approved the remediation plan.`
  });

  return { remediation: await getRemediationForTicket(ticketId), ticket: updatedTicket };
}

export async function rejectRemediation(ticketId, reason = "Developer rejected proposed remediation", actor = "Developer") {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const targetStatus = assertAction(ticket.status, "REJECT_REMEDIATION", ticket);
  const remediation = await getRemediationForTicket(ticketId);
  const previousState = remediation.status;

  await upsertRemediationRow(ticket.id, {
    status: "PROPOSED",
    rejected_at: new Date().toISOString(),
    rejection_reason: reason,
    approved_by: null,
    approved_at: null
  });

  const updatedTicket = await updateTicket(ticket.id, {
    remediation_status: "REJECTED",
    status: targetStatus
  });

  await recordAuditEvent({
    incident_id: ticket.id,
    actor,
    action: "PATCH_REJECTED",
    previous_state: previousState,
    new_state: targetStatus,
    details: reason
  });

  return { remediation: await getRemediationForTicket(ticketId), ticket: updatedTicket };
}

/**
 * Returns a rolled-back / failed incident to the remediation loop so the developer
 * can revise and re-propose. Implements the failure-path edge in the lifecycle diagram.
 */
export async function returnToRemediation(ticketId, actor = "Developer") {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const targetStatus = assertAction(ticket.status, "RETURN_TO_REMEDIATION", ticket);
  const previousState = ticket.status;

  await upsertRemediationRow(ticket.id, {
    status: "PROPOSED",
    approved_by: null,
    approved_at: null,
    verification_result: null
  });

  const updatedTicket = await updateTicket(ticket.id, {
    remediation_status: "PROPOSED",
    status: targetStatus,
    verification_result: null
  });

  await recordAuditEvent({
    incident_id: ticket.id,
    actor,
    action: "RETURNED_TO_REMEDIATION",
    previous_state: previousState,
    new_state: targetStatus,
    details: `${actor} returned the incident to the remediation loop for patch revision.`
  });

  return { remediation: await getRemediationForTicket(ticketId), ticket: updatedTicket };
}
