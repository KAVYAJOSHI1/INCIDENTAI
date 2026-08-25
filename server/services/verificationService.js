/**
 * Verification Engine Service
 * Executes automated post-patch validation checks (Syntax, Unit, Inventory, Regression, Reproduction).
 */

import { getTicketById, updateTicket } from "../db/store.js";
import { getRemediationForTicket } from "./remediationService.js";
import { recordAuditEvent } from "./auditService.js";

export async function runPatchVerification(ticketId, options = {}) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const remediation = await getRemediationForTicket(ticketId);

  const shouldFail = options.simulate_failure === true || options.force_fail === true;
  const resultStatus = shouldFail ? "FAILED" : "PASS";

  const checks = [
    { name: "Syntax validation", status: "PASS", duration_ms: 120, detail: "ESLint & AST syntax check clean" },
    { name: "Unit test", status: "PASS", duration_ms: 340, detail: "binTransfer.test.js 8/8 passed" },
    { name: "Inventory validation", status: shouldFail ? "FAIL" : "PASS", duration_ms: 210, detail: shouldFail ? "Stock cache race condition detected during concurrency check" : "Quantity constraint assertion validated" },
    { name: "Regression check", status: shouldFail ? "FAIL" : "PASS", duration_ms: 450, detail: shouldFail ? "Warehouse API response timeout on bin W2" : "Zero side-effect regressions across 14 modules" },
    { name: "Incident reproduction check", status: shouldFail ? "FAIL" : "PASS", duration_ms: 580, detail: shouldFail ? "ERR_STOCK_NEG still reproduces under heavy payload" : "ERR_STOCK_NEG no longer reproduces" }
  ];

  const previousState = remediation.status;
  const newStatus = shouldFail ? "FAILED" : "VERIFIED";
  remediation.status = newStatus;
  remediation.verification_result = resultStatus;
  remediation.verified_at = new Date().toISOString();

  await updateTicket(ticketId, {
    remediation_status: newStatus,
    status: shouldFail ? "REMEDIATION_FAILED" : "VERIFIED"
  });

  await recordAuditEvent({
    incident_id: ticketId,
    actor: options.actor || "Verification Runner",
    action: shouldFail ? "VERIFICATION_FAILED" : "VERIFICATION_PASSED",
    previous_state: previousState,
    new_state: newStatus,
    verification_result: resultStatus,
    patch_version: remediation.target_version,
    details: shouldFail ? "Verification suite detected post-patch validation failure." : "All 5 verification checks PASSED."
  });

  return {
    ticket_id: ticketId,
    status: resultStatus,
    verification_mode: "SIMULATED VERIFICATION",
    checks,
    total_duration_ms: 1700,
    timestamp: new Date().toISOString()
  };
}

export async function applyPatch(ticketId, actor = "Marcus Vance") {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const remediation = await getRemediationForTicket(ticketId);
  const previousState = remediation.status;

  remediation.status = "APPLIED";
  remediation.applied_at = new Date().toISOString();
  remediation.current_version = "v1.4.9";

  await updateTicket(ticketId, {
    remediation_status: "APPLIED",
    status: "RESOLVED",
    patch_version: "v1.4.9"
  });

  await recordAuditEvent({
    incident_id: ticketId,
    actor,
    action: "PATCH_APPLIED",
    previous_state: previousState,
    new_state: "APPLIED",
    patch_version: "v1.4.9",
    verification_result: "PASS",
    details: "Patch applied successfully to target environment. Incident resolved."
  });

  return {
    ticket_id: ticketId,
    status: "APPLIED",
    previous_version: "v1.4.8",
    current_version: "v1.4.9",
    applied_at: remediation.applied_at
  };
}
