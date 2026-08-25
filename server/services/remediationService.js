/**
 * Remediation Engine Service
 * Connects AI Diagnosis to Remediation Plans, Risk Assessment, and Safety Guardrails.
 */

import { getTicketById, updateTicket } from "../db/store.js";
import { recordAuditEvent } from "./auditService.js";

// In-memory remediation store (can also merge state into ticket objects)
const remediationStore = new Map();

function calculateRemediationRisk(ticket, kbMismatch) {
  const module = ticket.erp_module || "INVENTORY";
  const severity = ticket.severity || "P3_LOW";
  const isFinancial = ["FINANCE", "PAYROLL", "GENERAL_LEDGER"].includes(module);

  if (kbMismatch) return "HIGH";
  if (severity === "P0_CRITICAL" || isFinancial) return "HIGH";
  if (severity === "P1_HIGH") return "MEDIUM";
  return "LOW";
}

export async function getRemediationForTicket(ticketId) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  if (remediationStore.has(ticketId)) {
    return remediationStore.get(ticketId);
  }

  // Generate remediation plan dynamically from ticket details
  const matchedKb = (ticket.rag_kb_matches || [])[0];
  const matchedModule = matchedKb?.article?.erp_module;
  const isKbMismatch = Boolean(matchedModule && matchedModule !== ticket.erp_module);

  const confidenceScore = ticket.ai_confidence ?? 0.65;
  const riskLevel = calculateRemediationRisk(ticket, isKbMismatch);

  const remediationPlan = {
    id: `REM-${ticketId}`,
    ticket_id: ticketId,
    ticket_number: ticket.ticket_number || ticketId,
    root_cause: ticket.ai_root_cause || "Stale cache read before transfer validation",
    recommended_remediation:
      ticket.ai_suggested_patch ||
      "Invalidate or refresh inventory cache before validateStockQuantity() executes.",
    proposed_action:
      "Refresh inventory cache and update stock quantity validation flow in inventory/binTransfer.js.",
    confidence: confidenceScore,
    confidence_percentage: `${Math.round(confidenceScore * 100)}%`,
    risk_level: riskLevel,
    human_approval_required: riskLevel === "HIGH" || riskLevel === "CRITICAL" || isKbMismatch || confidenceScore < 0.8,
    kb_mismatch_detected: isKbMismatch,
    kb_mismatch_details: isKbMismatch
      ? `Incident belongs to ${ticket.erp_module}, but top KB match belongs to ${matchedModule}. Automatic patch execution blocked.`
      : null,
    status: ticket.remediation_status || "PROPOSED", // PROPOSED | APPROVED | TESTING | VERIFIED | APPLIED | FAILED | REVERTED
    current_version: ticket.patch_version || "v1.4.8",
    target_version: "v1.4.9",
    created_at: new Date().toISOString()
  };

  remediationStore.set(ticketId, remediationPlan);
  return remediationPlan;
}

export async function approveRemediation(ticketId, actor = "Marcus Vance") {
  const remediation = await getRemediationForTicket(ticketId);
  if (!remediation) return null;

  const previousState = remediation.status;
  remediation.status = "APPROVED";
  remediation.approved_by = actor;
  remediation.approved_at = new Date().toISOString();

  remediationStore.set(ticketId, remediation);
  await updateTicket(ticketId, { remediation_status: "APPROVED" });

  await recordAuditEvent({
    incident_id: ticketId,
    actor,
    action: "PATCH_APPROVED",
    previous_state: previousState,
    new_state: "APPROVED",
    patch_version: remediation.target_version,
    details: `Developer ${actor} approved remediation plan.`
  });

  return remediation;
}

export async function rejectRemediation(ticketId, reason = "Developer rejected proposed remediation", actor = "Marcus Vance") {
  const remediation = await getRemediationForTicket(ticketId);
  if (!remediation) return null;

  const previousState = remediation.status;
  remediation.status = "REJECTED";
  remediation.rejection_reason = reason;
  remediation.rejected_at = new Date().toISOString();

  remediationStore.set(ticketId, remediation);
  await updateTicket(ticketId, { remediation_status: "REJECTED" });

  await recordAuditEvent({
    incident_id: ticketId,
    actor,
    action: "PATCH_REJECTED",
    previous_state: previousState,
    new_state: "REJECTED",
    details: reason
  });

  return remediation;
}
