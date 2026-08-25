import { computeMttrSummary, computeModuleHeatmap, computeSeverityDistribution, buildPipelineTrace } from "../services/analyticsService.js";
import { getTicketById } from "../db/store.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { EXECUTIVE_ROLES, STAFF_ROLES } from "../constants.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerAnalyticsRoutes(router) {
  router.get(
    "/api/analytics/summary",
    requireRole(EXECUTIVE_ROLES, async ({ res }) => sendJson(res, 200, { summary: await computeMttrSummary() }))
  );
  router.get(
    "/api/analytics/heatmap",
    requireRole(EXECUTIVE_ROLES, async ({ res }) => sendJson(res, 200, { heatmap: await computeModuleHeatmap() }))
  );
  router.get(
    "/api/analytics/severity-distribution",
    requireRole(EXECUTIVE_ROLES, async ({ res }) => sendJson(res, 200, { distribution: await computeSeverityDistribution() }))
  );

  router.get(
    "/api/analytics/pipeline/:ticketId",
    requireRole(STAFF_ROLES, async ({ res, params }) => {
      const ticket = await getTicketById(params.ticketId);
      if (!ticket) throw new ApiError(404, `Ticket ${params.ticketId} not found`);
      sendJson(res, 200, { pipeline: buildPipelineTrace(ticket) });
    })
  );
}

