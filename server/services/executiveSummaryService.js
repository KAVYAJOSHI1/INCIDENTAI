/**
 * Enterprise Feature 5: Executive AI Summary — "Explain to Executive" briefing card. Tries
 * real Claude reasoning first (generateExecutiveSummaryWithAI); falls back to the deterministic
 * template (generateExecutiveSummary) when no API key is configured or the call fails.
 */

import { CLOSED_STATUSES } from "../constants.js";
import { completeJson } from "./llmService.js";
import { createTtlCache } from "../utils/simpleCache.js";

// Ticket insight tabs are re-fetched every time a user opens/reopens the panel; cache the
// briefing briefly so repeated views of the same ticket don't re-hit the Claude API.
const summaryCache = createTtlCache(60_000);

export function generateExecutiveSummary(ticket, businessImpact) {
  const severityLabel = ticket.severity.replace("_", " ");
  const isClosed = CLOSED_STATUSES.includes(ticket.status);

  const headline = `${severityLabel} incident in ${ticket.erp_module} ${isClosed ? "has been resolved" : "is actively being worked"}`;

  const businessSummary =
    `${ticket.title} is impacting an estimated ${businessImpact.affected_users} users across ` +
    `${businessImpact.impacted_departments.join(" and ")}, with a projected exposure of ` +
    `$${businessImpact.revenue_loss_per_hour.toLocaleString()}/hour while unresolved.`;

  const financialExposure =
    `$${businessImpact.revenue_loss_per_hour.toLocaleString()}/hour · ${businessImpact.compliance_risk} compliance risk · ` +
    `${businessImpact.sla_breach_probability}% SLA breach probability`;

  const resolutionEta = isClosed
    ? "Resolved"
    : `Est. ${ticket.sla_remaining_minutes ?? "—"} minutes remaining on SLA target`;

  const recommendedActions = [
    `Confirm ${ticket.assigned_dev_name || "a specialist"} as incident owner`,
    businessImpact.compliance_risk === "HIGH" ? "Notify compliance & legal stakeholders" : "Monitor for SLA breach",
    "Review the AI-suggested patch before production rollout"
  ];

  return {
    ticket_id: ticket.id,
    headline,
    business_summary: businessSummary,
    financial_exposure: financialExposure,
    resolution_eta: resolutionEta,
    recommended_actions: recommendedActions,
    ai_generated: false
  };
}

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    business_summary: { type: "string" },
    financial_exposure: { type: "string" },
    resolution_eta: { type: "string" },
    recommended_actions: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 }
  },
  required: ["headline", "business_summary", "financial_exposure", "resolution_eta", "recommended_actions"],
  additionalProperties: false
};

const SUMMARY_SYSTEM_PROMPT = `You write concise executive briefings on ERP incidents for non-technical business leadership. Given a ticket and its already-computed business impact figures, write: a one-line headline, a 1-2 sentence business summary in plain English, a one-line financial exposure statement, a resolution ETA statement, and 2-4 recommended leadership actions. Use the provided financial and impact figures exactly as given — do not invent new numbers.`;

/**
 * Asks Claude to write the executive briefing prose, grounded in the already-computed
 * business impact figures. Returns null (caller falls back to generateExecutiveSummary) if
 * the LLM is unavailable or fails.
 */
export async function generateExecutiveSummaryWithAI(ticket, businessImpact) {
  const isClosed = CLOSED_STATUSES.includes(ticket.status);

  const cacheKey = `${ticket.id}::${ticket.status}::${businessImpact.revenue_loss_per_hour}::${businessImpact.sla_breach_probability}`;
  const cached = summaryCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const result = await completeJson({
    system: SUMMARY_SYSTEM_PROMPT,
    prompt: `Ticket: "${ticket.title}" (${ticket.ticket_number})\nSeverity: ${ticket.severity}\nModule: ${ticket.erp_module}\nStatus: ${ticket.status}${
      isClosed ? " (closed)" : ""
    }\nAssigned developer: ${ticket.assigned_dev_name || "unassigned"}\nSLA remaining minutes: ${ticket.sla_remaining_minutes ?? "unknown"}\n\nBusiness impact:\n- Revenue loss/hour: $${
      businessImpact.revenue_loss_per_hour
    }\n- Affected users: ${businessImpact.affected_users}\n- Impacted departments: ${businessImpact.impacted_departments.join(", ")}\n- Compliance risk: ${
      businessImpact.compliance_risk
    }\n- SLA breach probability: ${businessImpact.sla_breach_probability}%\n\nWrite the executive briefing.`,
    schema: SUMMARY_SCHEMA,
    maxTokens: 500
  });

  if (!result) return null;

  const mapped = { ticket_id: ticket.id, ...result, ai_generated: true };
  summaryCache.set(cacheKey, mapped);
  return mapped;
}
