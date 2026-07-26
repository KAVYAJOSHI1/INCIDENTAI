/**
 * Dynamic Developer Load Balancing & Routing Engine
 * Formula:
 * Match Score = SkillMatchWeight * (1 - ActiveLoad / MaxCapacity) * SpeedFactor
 */

export function recommendDeveloperForTicket(ticket, developersList) {
  const moduleSkillsMap = {
    INVOICING: ["SAP ABAP", "Accounting Logic", "Invoicing", "Tax Engine"],
    PAYROLL: ["Payroll Engine", "Python", "Tax Engine", "HR Logic"],
    INVENTORY: ["PostgreSQL", "NetSuite SuiteScript", "Inventory Indexing", "SQL Tuning"],
    GENERAL_LEDGER: ["Oracle PL/SQL", "General Ledger", "Audit Compliance", "SAP ABAP"],
    PROCUREMENT: ["NetSuite SuiteScript", "Procurement", "REST API", "PostgreSQL"]
  };

  const requiredSkills = moduleSkillsMap[ticket.erp_module] || ["PostgreSQL", "REST API"];

  const scoredDevelopers = developersList.map((dev) => {
    // 1. Skill Match Score (0.0 to 1.0)
    const matchingSkills = dev.skills.filter((skill) =>
      requiredSkills.some((req) => req.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(req.toLowerCase()))
    );
    const skillScore = matchingSkills.length / Math.max(requiredSkills.length, 1);

    // 2. Capacity Score (0.0 to 1.0)
    const loadRatio = dev.active_tickets / dev.max_capacity;
    const capacityScore = Math.max(0.05, 1.0 - loadRatio);

    // 3. Speed Factor (Lower MTTR is better)
    const speedFactor = Math.min(1.2, Math.max(0.6, 4.0 / (dev.historical_mttr_hours || 3.0)));

    // 4. On Call Bonus
    const onCallBonus = dev.on_call ? 1.1 : 0.85;

    // Combined Weighted Match Score (0 to 100%)
    let rawScore = (skillScore * 0.45 + capacityScore * 0.35 + (speedFactor - 0.5) * 0.20) * onCallBonus * 100;
    
    // Clamp between 15% and 99%
    const matchScore = Math.min(99, Math.max(15, Math.round(rawScore)));

    let reasoning = "";
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

  // Sort by match score descending
  scoredDevelopers.sort((a, b) => b.match_score - a.match_score);

  return {
    recommended: scoredDevelopers[0],
    alternatives: scoredDevelopers.slice(1)
  };
}
