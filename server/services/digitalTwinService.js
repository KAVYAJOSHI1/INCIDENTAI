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

export function buildDigitalTwin() {
  const tickets = listTickets();

  const nodes = ERP_MODULES.map((module) => {
    const openTickets = tickets.filter((t) => t.erp_module === module && !CLOSED_STATUSES.includes(t.status));
    const hasP0 = openTickets.some((t) => t.severity === "P0_CRITICAL");
    const hasP1 = openTickets.some((t) => t.severity === "P1_HIGH");
    const health = hasP0 ? "RED" : hasP1 ? "YELLOW" : "GREEN";
    const failurePrediction = hasP0 ? 0.8 : hasP1 ? 0.4 : Math.min(0.25, openTickets.length * 0.05);

    return {
      id: module,
      label: module,
      health,
      open_incidents: openTickets.length,
      failure_prediction_percentage: Math.round(failurePrediction * 100)
    };
  });

  return { nodes, edges: TOPOLOGY_EDGES, generated_at: new Date().toISOString() };
}
