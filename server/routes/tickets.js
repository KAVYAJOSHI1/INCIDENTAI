import { listTickets, getTicketById } from "../db/store.js";
import { applyTicketUpdate } from "../services/ticketService.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerTicketRoutes(router) {
  router.get("/api/tickets", ({ res, query }) => sendJson(res, 200, { tickets: listTickets(query) }));

  router.get("/api/tickets/:id", ({ res, params }) => {
    const ticket = getTicketById(params.id);
    if (!ticket) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { ticket });
  });

  router.patch("/api/tickets/:id", ({ res, params, body }) => {
    const ticket = applyTicketUpdate(params.id, body || {});
    if (!ticket) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { ticket });
  });
}
