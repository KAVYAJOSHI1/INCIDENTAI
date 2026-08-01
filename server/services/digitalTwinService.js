/**
 * Enterprise Feature 7: ERP Digital Twin System Topology.
 */

import { listTickets } from "../db/store.js";
import { CLOSED_STATUSES, ERP_MODULES } from "../constants.js";

const TOPOLOGY_EDGES = [
  { source: "INVOICING", target: "GENERAL_LEDGER" },
  { source: "PAYROLL", target: "GENERAL_LEDGER" },
  { source: "INVENTORY", target: "PROCUREMENT" },
  { source: "PROCUREMENT", target: "GENERAL_LEDGER" },
  { source: "INVENTORY", target: "INVOICING" }
];

export async function buildDigitalTwin() {
  const tickets = await listTickets();
  const now = Date.now();

  // Step 1: Base module risk calculation from active incidents & ticket aging
  const moduleBaseScores = {};
  ERP_MODULES.forEach((module) => {
    const openTickets = tickets.filter((t) => t.erp_module === module && !CLOSED_STATUSES.includes(t.status));
    let baseScore = 0;
    openTickets.forEach((t) => {
      const ageHours = Math.max(0.1, (now - new Date(t.created_at || now)) / 3_600_000);
      const ageMultiplier = Math.min(1.5, 1 + ageHours / 24);
      const sevWeight = t.severity === "P0_CRITICAL" ? 0.40 : t.severity === "P1_HIGH" ? 0.20 : t.severity === "P2_MEDIUM" ? 0.10 : 0.04;
      baseScore += sevWeight * ageMultiplier;
    });
    moduleBaseScores[module] = Math.min(0.95, baseScore);
  });

  // Step 2: Topological risk propagation across ERP dependency graph
  const finalScores = { ...moduleBaseScores };
  TOPOLOGY_EDGES.forEach(({ source, target }) => {
    const sourceRisk = moduleBaseScores[source] || 0;
    if (sourceRisk > 0.3) {
      finalScores[target] = Math.min(0.95, (finalScores[target] || 0) + sourceRisk * 0.25);
    }
  });

  const nodes = ERP_MODULES.map((module) => {
    const openTickets = tickets.filter((t) => t.erp_module === module && !CLOSED_STATUSES.includes(t.status));
    const score = finalScores[module] || 0;
    const health = score >= 0.60 ? "RED" : score >= 0.25 ? "YELLOW" : "GREEN";

    return {
      id: module,
      label: module,
      health,
      open_incidents: openTickets.length,
      failure_prediction_percentage: Math.round(score * 100)
    };
  });

  return { nodes, edges: TOPOLOGY_EDGES, generated_at: new Date().toISOString() };
}
