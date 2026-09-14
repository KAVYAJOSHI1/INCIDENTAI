import { listTickets, getTicketById } from "../db/store.js";
import { applyTicketUpdate, verifyAndCaptureKnowledge } from "../services/ticketService.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validateBody } from "../utils/validate.js";
import { ticketPatchSchema } from "../utils/schemas.js";
import { DEVELOPER_ROLES } from "../constants.js";
import { sendJson, ApiError } from "../utils/http.js";

// Both authenticated personas (Developer, Executive) see the full incident record.
// The end-user / reporter self-service path was removed — the business user operates
// through the separate Smart Manufacturing ERP, not IncidentAI. `reporter` is retained
// on the row only as ERP-source audit metadata.
export function registerTicketRoutes(router) {
  router.get(
    "/api/tickets",
    requireAuth(async ({ res, query }) => {
      const tickets = await listTickets(query);
      sendJson(res, 200, { tickets });
    })
  );

  router.get(
    "/api/tickets/:id",
    requireAuth(async ({ res, params }) => {
      const ticket = await getTicketById(params.id);
      if (!ticket) throw new ApiError(404, `Ticket ${params.id} not found`);
      sendJson(res, 200, { ticket });
    })
  );

  router.patch(
    "/api/tickets/:id",
    requireRole(DEVELOPER_ROLES, async ({ res, params, body }) => {
      const patch = validateBody(ticketPatchSchema, body);
      const ticket = await applyTicketUpdate(params.id, patch);
      if (!ticket) throw new ApiError(404, `Ticket ${params.id} not found`);
      sendJson(res, 200, { ticket });
    })
  );

  router.post(
    "/api/tickets/:id/verify",
    requireRole(DEVELOPER_ROLES, async ({ res, params, body, user }) => {
      const result = await verifyAndCaptureKnowledge(params.id, body || {}, user);
      if (!result) throw new ApiError(404, `Ticket ${params.id} not found`);
      const deduplicated = Boolean(result.kbArticle?.deduplicated);
      sendJson(res, 200, {
        success: true,
        message: deduplicated
          ? `Resolution verified. An equivalent verified knowledge article already exists (${result.kbArticle.matched_similarity * 100}% similar) — no duplicate article was created.`
          : "Resolution verified and indexed into RAG vector knowledge base",
        deduplicated,
        ticket: result.ticket,
        knowledge_article: result.kbArticle
      });
    })
  );
}
