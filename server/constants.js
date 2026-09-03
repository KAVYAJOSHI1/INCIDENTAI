export const CLOSED_STATUSES = ["RESOLVED", "CLOSED", "RESOLVED_DUPLICATE_MERGED", "SELF_SERVICE_RESOLVED", "VERIFIED", "KNOWLEDGE_CAPTURED", "ROLLED_BACK"];
export const INCIDENT_STATUSES = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "REMEDIATION_PENDING",
  "APPROVED",
  "VERIFICATION",
  "VERIFICATION_FAILED",
  "ROLLBACK_REQUIRED",
  "ROLLED_BACK",
  "RESOLVED",
  "SELF_SERVICE_RESOLVED",
  "VERIFIED",
  "KNOWLEDGE_CAPTURED",
  "ESCALATED",
  "BLOCKED",
  "REOPENED"
];
export const ERP_MODULES = ["INVENTORY", "ORDERS", "PRODUCTION", "PROCUREMENT", "INVOICING", "PAYROLL", "GENERAL_LEDGER", "AUTH"];

// IncidentAI has exactly two authenticated personas.
//  - DEVELOPER  → investigate, approve, remediate, verify, rollback
//  - EXECUTIVE  → monitor incidents, business impact, SLA, risk, system status
// The real business user operates through the separate Smart Manufacturing ERP, not here.
export const ROLES = ["DEVELOPER", "EXECUTIVE"];
export const STAFF_ROLES = ["DEVELOPER", "EXECUTIVE"];
export const DEVELOPER_ROLES = ["DEVELOPER"];
export const EXECUTIVE_ROLES = ["EXECUTIVE"];
export const OPS_ROLES = ["DEVELOPER", "EXECUTIVE"];
