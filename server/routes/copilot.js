import { getTicketById } from "../db/store.js";
import { handleCopilotChat } from "../services/copilotService.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerCopilotRoutes(router) {
  router.post("/api/copilot/chat", ({ res, body }) => {
    if (!body?.ticket_id || !body?.message) {
      throw new ApiError(400, 'Request body must include "ticket_id" and "message"');
    }
    const ticket = getTicketById(body.ticket_id);
    if (!ticket) throw new ApiError(404, `Ticket ${body.ticket_id} not found`);
    sendJson(res, 200, { reply: handleCopilotChat(body.message, ticket) });
  });
}
