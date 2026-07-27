export const CLOSED_STATUSES = ["RESOLVED", "CLOSED", "RESOLVED_DUPLICATE_MERGED"];
export const ERP_MODULES = ["INVOICING", "PAYROLL", "INVENTORY", "GENERAL_LEDGER", "PROCUREMENT"];
export const ROLES = ["END_USER", "SUPPORT_TRIAGE", "DEVELOPER", "EXECUTIVE"];
// Roles allowed to perform internal-staff mutations (assign/resolve tickets, curate the
// knowledge base, rebalance load, use the developer copilot). END_USER can submit incidents
// but not act on them once triaged.
export const STAFF_ROLES = ["SUPPORT_TRIAGE", "DEVELOPER", "EXECUTIVE"];
