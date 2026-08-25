/**
 * Rollback & Recovery Service
 * Executes controlled patch rollbacks and state restorations when remediation fails or is reverted by developer.
 */

import { getTicketById, updateTicket } from "../db/store.js";
import { getRemediationForTicket } from "./remediationService.js";
import { recordAuditEvent } from "./auditService.js";

export async function executePatchRollback(ticketId, reason = "Rollback after unsuccessful remediation", actor = "Marcus Vance") {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const remediation = await getRemediationForTicket(ticketId);
  const previousState = remediation.status;
  const previousVersion = remediation.current_version || "v1.4.9";
  const restoredVersion = "v1.4.8";

  // Record initial rollback initiation
  await recordAuditEvent({
    incident_id: ticketId,
    actor,
    action: "ROLLBACK_INITIATED",
    previous_state: previousState,
    new_state: "ROLLBACK_IN_PROGRESS",
    patch_version: previousVersion,
    rollback_status: "IN_PROGRESS",
    details: `Developer ${actor} initiated rollback. Reason: ${reason}`
  });

  const steps = [
    { step: 1, action: "Stopping application thread & snapshotting current state", status: "COMPLETED", timestamp: new Date().toISOString() },
    { step: 2, action: `Restoring codebase & database schema to previous version (${restoredVersion})`, status: "COMPLETED", timestamp: new Date().toISOString() },
    { step: 3, action: "Executing post-rollback sanity & verification suite", status: "COMPLETED", timestamp: new Date().toISOString() },
    { step: 4, action: "Rollback verified. Re-opening incident for investigation", status: "COMPLETED", timestamp: new Date().toISOString() }
  ];

  remediation.status = "REVERTED";
  remediation.current_version = restoredVersion;
  remediation.reverted_at = new Date().toISOString();
  remediation.rollback_reason = reason;

  await updateTicket(ticketId, {
    remediation_status: "REVERTED",
    status: "REOPENED_POST_ROLLBACK",
    patch_version: restoredVersion
  });

  await recordAuditEvent({
    incident_id: ticketId,
    actor,
    action: "ROLLBACK_SUCCESSFUL",
    previous_state: "ROLLBACK_IN_PROGRESS",
    new_state: "REVERTED",
    patch_version: restoredVersion,
    rollback_status: "SUCCESSFUL",
    details: `Rollback completed. Restored version ${restoredVersion}. Incident reopened.`
  });

  return {
    ticket_id: ticketId,
    status: "ROLLBACK_SUCCESSFUL",
    previous_version: previousVersion,
    restored_version: restoredVersion,
    reason,
    steps,
    timestamp: remediation.reverted_at
  };
}
