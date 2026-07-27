/**
 * Enterprise Feature 10: Mission Control Command Center — unified rollup of live platform health.
 */

import { listTickets, listDevelopers, listKnowledgeBase } from "../db/store.js";
import { computeMttrSummary, computeModuleHeatmap } from "./analyticsService.js";
import { CLOSED_STATUSES } from "../constants.js";

const HOURLY_ENGINEERING_RATE = 145;

export async function buildMissionControlSnapshot() {
  const [tickets, developers, knowledgeBase, summary, heatmap] = await Promise.all([
    listTickets(),
    listDevelopers(),
    listKnowledgeBase(),
    computeMttrSummary(),
    computeModuleHeatmap()
  ]);

  const ticketsWithTimings = tickets.filter((t) => t.pipeline_timings_ms?.total != null);
  const aiQueueLatencyMs = ticketsWithTimings.length
    ? Math.round(ticketsWithTimings.reduce((sum, t) => sum + t.pipeline_timings_ms.total, 0) / ticketsWithTimings.length)
    : 0;

  const totalActive = developers.reduce((sum, d) => sum + d.active_tickets, 0);
  const totalCapacity = developers.reduce((sum, d) => sum + d.max_capacity, 0);
  const hoursSaved = Math.max(0, summary.manual_baseline_hours - summary.ai_mttr_hours) * summary.resolved_count;

  return {
    live_incidents: tickets.filter((t) => !CLOSED_STATUSES.includes(t.status)).length,
    developer_capacity: {
      active: totalActive,
      total: totalCapacity,
      utilization_percentage: totalCapacity ? Math.round((totalActive / totalCapacity) * 100) : 0
    },
    ai_queue_latency_ms: aiQueueLatencyMs,
    knowledge_base_hits: knowledgeBase.length,
    module_health: heatmap.map((h) => ({ erp_module: h.erp_module, total: h.total, critical: h.P0_CRITICAL })),
    daily_cost_savings: Math.round(hoursSaved * HOURLY_ENGINEERING_RATE),
    team_mttr_hours: summary.ai_mttr_hours,
    generated_at: new Date().toISOString()
  };
}
