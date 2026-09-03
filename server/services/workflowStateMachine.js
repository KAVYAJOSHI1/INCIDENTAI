/**
 * Authoritative Incident Workflow State Machine.
 *
 * `tickets.status` is the single source of truth for where an incident is in the
 * resolution lifecycle. `tickets.remediation_status` mirrors the same progression
 * for the remediation sub-domain. Every workflow action (approve, verify, apply,
 * rollback, return-to-remediation) MUST pass through assertAction() so an invalid
 * transition is rejected by the backend instead of silently corrupting state.
 *
 * The frontend mirror of this model lives in src/utils/workflowState.js — keep the
 * two in sync.
 */

import { ApiError } from "../utils/http.js";

// Canonical lifecycle states (ordered). Terminal-ish states allow only a subset of actions.
export const WORKFLOW_STATES = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "APPROVED",
  "VERIFICATION",          // verification executed & PASSED — ready to apply patch
  "VERIFICATION_FAILED",   // verification executed & FAILED
  "ROLLBACK_REQUIRED",
  "ROLLED_BACK",
  "RESOLVED"
];

// Statuses that mean "AI decided the reporter can self-resolve" — outside the dev remediation loop.
export const SELF_SERVICE_STATES = ["SELF_SERVICE_RESOLVED"];

// Fully closed — no further workflow actions.
export const TERMINAL_STATES = [
  "RESOLVED",
  "VERIFIED",
  "KNOWLEDGE_CAPTURED",
  "SELF_SERVICE_RESOLVED",
  "RESOLVED_DUPLICATE_MERGED",
  "CLOSED"
];

/**
 * action -> { from: [allowed source statuses], to: target status }
 * `to` may be a function (currentTicket, context) => status for branching actions.
 */
export const TRANSITIONS = {
  APPROVE_REMEDIATION: {
    from: ["TRIAGED", "ASSIGNED", "IN_PROGRESS", "REMEDIATION_PENDING", "REOPENED", "ROLLED_BACK", "VERIFICATION_FAILED"],
    to: "APPROVED"
  },
  REJECT_REMEDIATION: {
    from: ["TRIAGED", "ASSIGNED", "IN_PROGRESS", "REMEDIATION_PENDING", "REOPENED", "APPROVED"],
    to: "IN_PROGRESS"
  },
  START_VERIFICATION: {
    // APPROVED is the normal entry; VERIFICATION / VERIFICATION_FAILED allow a re-run
    // of the suite without forcing a re-approval.
    from: ["APPROVED", "VERIFICATION", "VERIFICATION_FAILED"],
    to: (ticket, ctx) => (ctx?.failed ? "VERIFICATION_FAILED" : "VERIFICATION")
  },
  APPLY_PATCH: {
    from: ["VERIFICATION"],
    to: "RESOLVED"
  },
  ROLLBACK: {
    from: ["VERIFICATION_FAILED", "ROLLBACK_REQUIRED", "RESOLVED"],
    to: "ROLLED_BACK"
  },
  RETURN_TO_REMEDIATION: {
    from: ["ROLLED_BACK", "VERIFICATION_FAILED"],
    to: "IN_PROGRESS"
  }
};

/**
 * Throws ApiError(409) if `action` is not permitted from `currentStatus`.
 * Returns the resolved target status for the action.
 */
export function assertAction(currentStatus, action, ticket = null, ctx = null) {
  const rule = TRANSITIONS[action];
  if (!rule) throw new ApiError(400, `Unknown workflow action: ${action}`);

  const status = (currentStatus || "NEW").toUpperCase();
  if (!rule.from.includes(status)) {
    throw new ApiError(
      409,
      `Invalid workflow transition: cannot ${action.replace(/_/g, " ").toLowerCase()} while incident is in state ${status}. ` +
        `Allowed from: ${rule.from.join(", ")}.`
    );
  }

  return typeof rule.to === "function" ? rule.to(ticket, ctx) : rule.to;
}

/** True when the incident is fully closed and no workflow action should be offered. */
export function isTerminal(status) {
  return TERMINAL_STATES.includes((status || "").toUpperCase());
}

/** Bump the patch component of a vX.Y.Z string. Falls back sanely on non-semver input. */
export function bumpPatchVersion(version) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(version || "").trim());
  if (!m) return "v1.0.1";
  return `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}
