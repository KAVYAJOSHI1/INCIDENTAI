import { getTicketById } from "../db/store.js";
import { buildDependencyTree } from "../services/rootCauseTreeService.js";
import { buildExplainability } from "../services/explainabilityService.js";
import { computeBusinessImpact } from "../services/businessImpactService.js";
import { buildIncidentTimeline } from "../services/timelineService.js";
import { generateExecutiveSummary } from "../services/executiveSummaryService.js";
import { buildIncidentReplay } from "../services/replayService.js";
import { buildPatchPreview } from "../services/patchPreviewService.js";
import { sendJson, ApiError } from "../utils/http.js";

function requireTicket(id) {
  const ticket = getTicketById(id);
  if (!ticket) throw new ApiError(404, `Ticket ${id} not found`);
  return ticket;
}

export function registerTicketInsightRoutes(router) {
  router.get("/api/tickets/:id/root-cause-tree", ({ res, params }) => {
    sendJson(res, 200, { tree: buildDependencyTree(requireTicket(params.id)) });
  });

  router.get("/api/tickets/:id/explainability", ({ res, params }) => {
    sendJson(res, 200, { explainability: buildExplainability(requireTicket(params.id)) });
  });

  router.get("/api/tickets/:id/business-impact", ({ res, params }) => {
    sendJson(res, 200, { impact: computeBusinessImpact(requireTicket(params.id)) });
  });

  router.get("/api/tickets/:id/timeline", ({ res, params }) => {
    sendJson(res, 200, { timeline: buildIncidentTimeline(requireTicket(params.id)) });
  });

  router.get("/api/tickets/:id/executive-summary", ({ res, params }) => {
    const ticket = requireTicket(params.id);
    const impact = computeBusinessImpact(ticket);
    sendJson(res, 200, { summary: generateExecutiveSummary(ticket, impact) });
  });

  router.get("/api/tickets/:id/replay", ({ res, params }) => {
    sendJson(res, 200, { replay: buildIncidentReplay(requireTicket(params.id)) });
  });

  router.get("/api/tickets/:id/patch-preview", ({ res, params }) => {
    sendJson(res, 200, { preview: buildPatchPreview(requireTicket(params.id)) });
  });
}
