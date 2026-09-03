/**
 * Audit Logging Service — Postgres-backed (server/db/audit_log).
 *
 * Every meaningful lifecycle transition records one immutable, timestamped row.
 * Rows persist across server restarts. `synthetic: true` marks pre-seeded demo
 * history so the UI can visually distinguish it from real, live events.
 */

import crypto from "node:crypto";
import { insertAuditEvent, listAuditByIncident, listAuditAll } from "../db/store.js";

export async function recordAuditEvent(eventData) {
  const entry = {
    id: `AUDIT-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
    incident_id: eventData.incident_id || "UNKNOWN",
    actor: eventData.actor || "System",
    action: eventData.action,
    previous_state: eventData.previous_state || null,
    new_state: eventData.new_state || null,
    patch_version: eventData.patch_version || null,
    verification_result: eventData.verification_result || null,
    rollback_status: eventData.rollback_status || null,
    details: eventData.details || "",
    synthetic: eventData.synthetic === true
  };

  try {
    return await insertAuditEvent(entry);
  } catch (err) {
    console.warn(`[auditService] Failed to persist audit event (${entry.action}): ${err.message}`);
    return { ...entry, timestamp: new Date().toISOString() };
  }
}

export async function getAuditLogsForIncident(incidentId) {
  try {
    return await listAuditByIncident(incidentId);
  } catch (err) {
    console.warn(`[auditService] Failed to read audit logs for ${incidentId}: ${err.message}`);
    return [];
  }
}

export async function getAllAuditLogs(limit = 50) {
  try {
    return await listAuditAll(limit);
  } catch (err) {
    console.warn(`[auditService] Failed to read audit logs: ${err.message}`);
    return [];
  }
}
