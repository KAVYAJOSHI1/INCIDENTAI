/**
 * Module 6: Dynamic Developer Load Balancing & Routing.
 * Match Score = SkillMatch x (1 - ActiveLoad/MaxCapacity) x SpeedFactor x OnCallBonus
 */

const MODULE_SKILLS_MAP = {
  INVOICING: ["SAP ABAP", "Accounting Logic", "Invoicing", "Tax Engine"],
  PAYROLL: ["Payroll Engine", "Python", "Tax Engine", "HR Logic"],
  INVENTORY: ["PostgreSQL", "NetSuite SuiteScript", "Inventory Indexing", "SQL Tuning"],
  GENERAL_LEDGER: ["Oracle PL/SQL", "General Ledger", "Audit Compliance", "SAP ABAP"],
  PROCUREMENT: ["NetSuite SuiteScript", "Procurement", "REST API", "PostgreSQL"]
};

export function recommendDeveloperForTicket(ticket, developersList) {
  const requiredSkills = MODULE_SKILLS_MAP[ticket.erp_module] || ["PostgreSQL", "REST API"];

  const scored = developersList.map((dev) => {
    const matchingSkills = dev.skills.filter((skill) =>
      requiredSkills.some((req) => req.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(req.toLowerCase()))
    );
    const skillScore = matchingSkills.length / Math.max(requiredSkills.length, 1);

    const loadRatio = dev.active_tickets / dev.max_capacity;
    const capacityScore = Math.max(0.05, 1.0 - loadRatio);

    const speedFactor = Math.min(1.2, Math.max(0.6, 4.0 / (dev.historical_mttr_hours || 3.0)));
    const onCallBonus = dev.on_call ? 1.1 : 0.85;

    const rawScore = (skillScore * 0.45 + capacityScore * 0.35 + (speedFactor - 0.5) * 0.2) * onCallBonus * 100;
    const matchScore = Math.min(99, Math.max(15, Math.round(rawScore)));

    let reasoning;
    if (skillScore > 0.5 && loadRatio < 0.6) {
      reasoning = `High expertise in ${matchingSkills.join(", ") || dev.erp_modules[0]} with low active workload (${dev.active_tickets}/${dev.max_capacity} tickets).`;
    } else if (loadRatio >= 0.8) {
      reasoning = `Matches required skills but currently near max capacity (${dev.active_tickets}/${dev.max_capacity} tickets).`;
    } else {
      reasoning = `Primary module match: ${dev.erp_modules.join(", ")}, MTTR: ${dev.historical_mttr_hours}h.`;
    }

    return {
      ...dev,
      match_score: matchScore,
      skill_overlap: matchingSkills,
      capacity_available: dev.max_capacity - dev.active_tickets,
      reasoning
    };
  });

  scored.sort((a, b) => b.match_score - a.match_score);

  return { recommended: scored[0], alternatives: scored.slice(1) };
}

export function rebalanceWorkload(ticketsList, developersList) {
  const actions = [];
  const overloadedDevIds = new Set(developersList.filter((d) => d.active_tickets / d.max_capacity >= 0.8).map((d) => d.id));
  const activeStatuses = ["TRIAGED", "ASSIGNED", "IN_PROGRESS"];
  const p0Tickets = ticketsList.filter((t) => t.severity === "P0_CRITICAL" && activeStatuses.includes(t.status));

  for (const p0 of p0Tickets) {
    if (!overloadedDevIds.has(p0.assigned_dev_id)) continue;

    const offloadCandidate = ticketsList.find((t) =>
      t.assigned_dev_id === p0.assigned_dev_id &&
      t.id !== p0.id &&
      ["P2_MEDIUM", "P3_LOW"].includes(t.severity) &&
      activeStatuses.includes(t.status)
    );
    if (!offloadCandidate) continue;

    const currentDev = developersList.find((d) => d.id === p0.assigned_dev_id);
    const candidates = developersList.filter((d) => d.id !== currentDev.id && d.active_tickets < d.max_capacity);
    if (candidates.length === 0) continue;

    const { recommended: bestAlternative } = recommendDeveloperForTicket({ erp_module: offloadCandidate.erp_module }, candidates);
    if (!bestAlternative) continue;

    actions.push({
      ticket_id: offloadCandidate.id,
      ticket_number: offloadCandidate.ticket_number,
      from_dev_id: currentDev.id,
      from_dev_name: currentDev.name,
      to_dev_id: bestAlternative.id,
      to_dev_name: bestAlternative.name,
      reason: `P0 outage ${p0.ticket_number} requires ${currentDev.name}'s full capacity; reassigning lower priority ${offloadCandidate.severity} ticket to ${bestAlternative.name} (match ${bestAlternative.match_score}%).`
    });

    offloadCandidate.assigned_dev_id = bestAlternative.id;
    offloadCandidate.assigned_dev_name = bestAlternative.name;
    currentDev.active_tickets = Math.max(0, currentDev.active_tickets - 1);
    const targetDev = developersList.find((d) => d.id === bestAlternative.id);
    targetDev.active_tickets += 1;
  }

  return actions;
}
