/**
 * Enterprise Feature 3: Business Impact & Financial Loss Engine. Tries real Claude reasoning
 * first (computeBusinessImpactWithAI); falls back to the deterministic module/severity formula
 * (computeBusinessImpact) when no API key is configured or the call fails.
 */

import { completeJson } from "./llmService.js";

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
    sla_breach_probability: slaBreachProbability,
    reasoning: null,
    ai_generated: false
  };
}

const IMPACT_SCHEMA = {
  type: "object",
  properties: {
    revenue_loss_per_hour: { type: "number" },
    affected_users: { type: "number" },
    impacted_departments: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
    compliance_risk: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    sla_breach_probability: { type: "number" },
    reasoning: { type: "string" }
  },
  required: ["revenue_loss_per_hour", "affected_users", "impacted_departments", "compliance_risk", "sla_breach_probability", "reasoning"],
  additionalProperties: false
};

const IMPACT_SYSTEM_PROMPT = `You are a business impact analyst for ERP incidents (SAP, NetSuite, Odoo, Oracle ERP). Given a ticket's module, severity, title, and description, estimate realistic operational and financial exposure: dollar revenue loss per hour, number of affected users, impacted business departments, compliance risk level, and probability (0-100) of breaching the incident's SLA. Ground your estimate in typical enterprise ERP scale for the given module and severity — do not wildly overstate or understate. Briefly justify your estimate in one sentence.`;

/**
 * Asks Claude to estimate the business impact directly from ticket context. Returns null
 * (caller falls back to computeBusinessImpact) if the LLM is unavailable or fails.
 */
export async function computeBusinessImpactWithAI(ticket) {
  const result = await completeJson({
    system: IMPACT_SYSTEM_PROMPT,
    prompt: `Ticket: "${ticket.title}"\nERP Module: ${ticket.erp_module}\nSeverity: ${ticket.severity}\nDescription: ${
      ticket.structured_description || ticket.vague_user_input || ""
    }\nSLA remaining minutes: ${ticket.sla_remaining_minutes ?? "unknown"}\n\nEstimate the business impact.`,
    schema: IMPACT_SCHEMA,
    maxTokens: 400
  });

  if (!result) return null;

  return {
    ticket_id: ticket.id,
    revenue_loss_per_hour: Math.round(result.revenue_loss_per_hour),
    affected_users: Math.round(result.affected_users),
    impacted_departments: result.impacted_departments,
    compliance_risk: result.compliance_risk,
    sla_breach_probability: Math.round(result.sla_breach_probability),
    reasoning: result.reasoning,
    ai_generated: true
  };
}
