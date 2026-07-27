/**
 * Enterprise Feature 6: Enterprise War Room Operations Center.
 */

import { listTickets } from "../db/store.js";
import { CLOSED_STATUSES, ERP_MODULES } from "../constants.js";

export async function buildWarRoomSnapshot() {
  const tickets = await listTickets();

  const moduleStatus = ERP_MODULES.map((module) => {
    const openTickets = tickets.filter((t) => t.erp_module === module && !CLOSED_STATUSES.includes(t.status));
    const hasP0 = openTickets.some((t) => t.severity === "P0_CRITICAL");
    const hasP1 = openTickets.some((t) => t.severity === "P1_HIGH");
    return {
      module,
      health: hasP0 ? "RED" : hasP1 ? "YELLOW" : "GREEN",
      open_incidents: openTickets.length
    };
  });

  const activityFeed = [...tickets]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)
    .map((t) => ({ ticket_number: t.ticket_number, title: t.title, severity: t.severity, status: t.status, created_at: t.created_at }));

  const criticalTicker = tickets
    .filter((t) => t.severity === "P0_CRITICAL" && !CLOSED_STATUSES.includes(t.status))
    .map((t) => ({ ticket_number: t.ticket_number, title: t.title, erp_module: t.erp_module, assigned_dev_name: t.assigned_dev_name }));

  return { module_status: moduleStatus, activity_feed: activityFeed, critical_ticker: criticalTicker, generated_at: new Date().toISOString() };
}
