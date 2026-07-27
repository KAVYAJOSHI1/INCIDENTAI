import { computeMttrSummary, computeModuleHeatmap, computeSeverityDistribution, buildPipelineTrace } from "../services/analyticsService.js";
import { getTicketById } from "../db/store.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerAnalyticsRoutes(router) {
  router.get("/api/analytics/summary", async ({ res }) => sendJson(res, 200, { summary: await computeMttrSummary() }));
  router.get("/api/analytics/heatmap", async ({ res }) => sendJson(res, 200, { heatmap: await computeModuleHeatmap() }));
  router.get("/api/analytics/severity-distribution", async ({ res }) => sendJson(res, 200, { distribution: await computeSeverityDistribution() }));

  router.get("/api/analytics/pipeline/:ticketId", async ({ res, params }) => {
    const ticket = await getTicketById(params.ticketId);
    if (!ticket) throw new ApiError(404, `Ticket ${params.ticketId} not found`);
    sendJson(res, 200, { pipeline: buildPipelineTrace(ticket) });
  });
}
