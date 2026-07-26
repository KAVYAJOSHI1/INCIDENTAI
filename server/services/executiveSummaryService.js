/**
 * Enterprise Feature 5: Executive AI Summary — "Explain to Executive" briefing card.
 */

import { CLOSED_STATUSES } from "../constants.js";

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

  return { ticket_id: ticket.id, headline, business_summary: businessSummary, financial_exposure: financialExposure, resolution_eta: resolutionEta, recommended_actions: recommendedActions };
}
