/**
 * Audit Logging Service
 * Records structured enterprise audit events for all remediation and patch lifecycle actions.
 */

const auditLogs = [];

export async function recordAuditEvent(eventData) {
  const entry = {
    id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    incident_id: eventData.incident_id || "UNKNOWN",
    actor: eventData.actor || "Developer (Marcus Vance)",
    action: eventData.action, // PATCH_PROPOSED | PATCH_APPROVED | PATCH_REJECTED | VERIFICATION_STARTED | VERIFICATION_PASSED | VERIFICATION_FAILED | PATCH_APPLIED | ROLLBACK_INITIATED | ROLLBACK_SUCCESSFUL
    previous_state: eventData.previous_state || null,
    new_state: eventData.new_state || null,
    patch_version: eventData.patch_version || "v1.4.9",
    verification_result: eventData.verification_result || null,
    rollback_status: eventData.rollback_status || null,
    details: eventData.details || "",
    timestamp: new Date().toISOString()
  };

  auditLogs.unshift(entry);
  if (auditLogs.length > 500) auditLogs.pop();
  return entry;
}

export async function getAuditLogsForIncident(incidentId) {
  return auditLogs.filter((log) => log.incident_id === incidentId);
}

export async function getAllAuditLogs(limit = 50) {
  return auditLogs.slice(0, limit);
}
