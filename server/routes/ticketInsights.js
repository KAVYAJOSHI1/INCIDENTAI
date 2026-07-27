import { getTicketById } from "../db/store.js";
import { buildDependencyTree } from "../services/rootCauseTreeService.js";
import { buildExplainability, explainDecisionWithAI, explainDecisionFallback } from "../services/explainabilityService.js";
import { computeBusinessImpact, computeBusinessImpactWithAI } from "../services/businessImpactService.js";
import { buildIncidentTimeline } from "../services/timelineService.js";
import { generateExecutiveSummary, generateExecutiveSummaryWithAI } from "../services/executiveSummaryService.js";
import { buildIncidentReplay } from "../services/replayService.js";
import { buildPatchPreview, buildPatchPreviewWithAI } from "../services/patchPreviewService.js";
import { sendJson, ApiError } from "../utils/http.js";

async function requireTicket(id) {
  const ticket = await getTicketById(id);
  if (!ticket) throw new ApiError(404, `Ticket ${id} not found`);
  return ticket;
}

export function registerTicketInsightRoutes(router) {
  router.get("/api/tickets/:id/root-cause-tree", async ({ res, params }) => {
    sendJson(res, 200, { tree: buildDependencyTree(await requireTicket(params.id)) });
  });

  router.get("/api/tickets/:id/explainability", async ({ res, params }) => {
    const explainability = buildExplainability(await requireTicket(params.id));
    const narrative = (await explainDecisionWithAI(explainability)) ?? explainDecisionFallback(explainability);
    sendJson(res, 200, { explainability: { ...explainability, ...narrative } });
  });

  router.get("/api/tickets/:id/business-impact", async ({ res, params }) => {
    const ticket = await requireTicket(params.id);
    const impact = (await computeBusinessImpactWithAI(ticket)) ?? computeBusinessImpact(ticket);
    sendJson(res, 200, { impact });
  });

  router.get("/api/tickets/:id/timeline", async ({ res, params }) => {
    sendJson(res, 200, { timeline: buildIncidentTimeline(await requireTicket(params.id)) });
  });

  router.get("/api/tickets/:id/executive-summary", async ({ res, params }) => {
    const ticket = await requireTicket(params.id);
    const impact = (await computeBusinessImpactWithAI(ticket)) ?? computeBusinessImpact(ticket);
    const summary = (await generateExecutiveSummaryWithAI(ticket, impact)) ?? generateExecutiveSummary(ticket, impact);
    sendJson(res, 200, { summary });
  });

  router.get("/api/tickets/:id/replay", async ({ res, params }) => {
    sendJson(res, 200, { replay: buildIncidentReplay(await requireTicket(params.id)) });
  });

  router.get("/api/tickets/:id/patch-preview", async ({ res, params }) => {
    const ticket = await requireTicket(params.id);
    const preview = (await buildPatchPreviewWithAI(ticket)) ?? buildPatchPreview(ticket);
    sendJson(res, 200, { preview });
  });
}
