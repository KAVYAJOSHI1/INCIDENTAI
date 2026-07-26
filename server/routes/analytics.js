import { computeMttrSummary, computeModuleHeatmap, computeSeverityDistribution, buildPipelineTrace } from "../services/analyticsService.js";
import { getTicketById } from "../db/store.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerAnalyticsRoutes(router) {
  router.get("/api/analytics/summary", ({ res }) => sendJson(res, 200, { summary: computeMttrSummary() }));
  router.get("/api/analytics/heatmap", ({ res }) => sendJson(res, 200, { heatmap: computeModuleHeatmap() }));
  router.get("/api/analytics/severity-distribution", ({ res }) => sendJson(res, 200, { distribution: computeSeverityDistribution() }));

  router.get("/api/analytics/pipeline/:ticketId", ({ res, params }) => {
    const ticket = getTicketById(params.ticketId);
    if (!ticket) throw new ApiError(404, `Ticket ${params.ticketId} not found`);
    sendJson(res, 200, { pipeline: buildPipelineTrace(ticket) });
  });
}
