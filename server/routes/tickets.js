import { listTickets, getTicketById } from "../db/store.js";
import { applyTicketUpdate } from "../services/ticketService.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validateBody } from "../utils/validate.js";
import { ticketPatchSchema } from "../utils/schemas.js";
import { STAFF_ROLES } from "../constants.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerTicketRoutes(router) {
  router.get(
    "/api/tickets",
    requireAuth(async ({ res, query }) => sendJson(res, 200, { tickets: await listTickets(query) }))
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
    requireRole(STAFF_ROLES, async ({ res, params, body }) => {
      const patch = validateBody(ticketPatchSchema, body);
      const ticket = await applyTicketUpdate(params.id, patch);
      if (!ticket) throw new ApiError(404, `Ticket ${params.id} not found`);
      sendJson(res, 200, { ticket });
    })
  );
}
