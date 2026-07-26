/**
 * Enterprise Feature 3: Business Impact & Financial Loss Engine.
 */

const MODULE_HOURLY_REVENUE_IMPACT = { PAYROLL: 8200, INVOICING: 6400, GENERAL_LEDGER: 4100, INVENTORY: 3200, PROCUREMENT: 2100 };
const MODULE_USER_BASE = { PAYROLL: 2400, INVOICING: 850, GENERAL_LEDGER: 120, INVENTORY: 340, PROCUREMENT: 95 };
const MODULE_DEPARTMENTS = {
  PAYROLL: ["HR", "Finance"],
  INVOICING: ["Finance", "Sales"],
  GENERAL_LEDGER: ["Finance", "Accounting"],
  INVENTORY: ["Logistics", "Operations"],
  PROCUREMENT: ["Procurement", "Finance"]
};
const SEVERITY_MULTIPLIER = { P0_CRITICAL: 1.0, P1_HIGH: 0.55, P2_MEDIUM: 0.2, P3_LOW: 0.05 };
const COMPLIANCE_SENSITIVE_MODULES = ["PAYROLL", "GENERAL_LEDGER"];

export function computeBusinessImpact(ticket) {
  const multiplier = SEVERITY_MULTIPLIER[ticket.severity] ?? 0.1;
  const revenueLossPerHour = Math.round((MODULE_HOURLY_REVENUE_IMPACT[ticket.erp_module] || 1500) * multiplier);
  const affectedUsers = Math.round((MODULE_USER_BASE[ticket.erp_module] || 100) * multiplier);
  const impactedDepartments = MODULE_DEPARTMENTS[ticket.erp_module] || ["Operations"];

  const complianceRisk = COMPLIANCE_SENSITIVE_MODULES.includes(ticket.erp_module) && multiplier >= 0.55
    ? "HIGH"
    : multiplier >= 0.2
      ? "MEDIUM"
      : "LOW";

  const slaUrgencyBump = ticket.sla_remaining_minutes != null && ticket.sla_remaining_minutes < 30 ? 0.15 : 0;
  const slaBreachProbability = Math.round(Math.min(0.95, multiplier * 0.8 + slaUrgencyBump) * 100);

  return {
    ticket_id: ticket.id,
    revenue_loss_per_hour: revenueLossPerHour,
    affected_users: affectedUsers,
    impacted_departments: impactedDepartments,
    compliance_risk: complianceRisk,
    sla_breach_probability: slaBreachProbability
  };
}
