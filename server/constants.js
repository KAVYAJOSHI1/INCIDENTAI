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

// Duplicate detection: how much a cross-module match is penalized/boosted before the
// normal is_duplicate threshold is applied, and how high a cross-module similarity has
// to be to still count as a duplicate despite the penalty (a strong discriminator, not
// an absolute ban — see server/services/duplicateService.js).
export const MODULE_MISMATCH_PENALTY = Number(process.env.MODULE_MISMATCH_PENALTY ?? 0.3);
export const SAME_MODULE_BONUS = Number(process.env.SAME_MODULE_BONUS ?? 0.05);
export const COMPONENT_MATCH_BONUS = Number(process.env.COMPONENT_MATCH_BONUS ?? 0.05);
export const CROSS_MODULE_DUPLICATE_FLOOR = Number(process.env.CROSS_MODULE_DUPLICATE_FLOOR ?? 0.97);

// KB writeback: how similar a newly-verified resolution must be to an existing KB
// article before it's treated as "the same knowledge" and the insert is skipped
// instead of creating a near-duplicate article (server/services/knowledgeService.js).
export const KB_WRITEBACK_DEDUP_THRESHOLD = Number(process.env.KB_WRITEBACK_DEDUP_THRESHOLD ?? 0.88);

// IncidentAI has exactly two authenticated personas.
//  - DEVELOPER  → investigate, approve, remediate, verify, rollback
//  - EXECUTIVE  → monitor incidents, business impact, SLA, risk, system status
// The real business user operates through the separate Smart Manufacturing ERP, not here.
export const ROLES = ["DEVELOPER", "EXECUTIVE"];
export const STAFF_ROLES = ["DEVELOPER", "EXECUTIVE"];
export const DEVELOPER_ROLES = ["DEVELOPER"];
export const EXECUTIVE_ROLES = ["EXECUTIVE"];
export const OPS_ROLES = ["DEVELOPER", "EXECUTIVE"];
