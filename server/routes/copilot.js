import { getTicketById } from "../db/store.js";
import { handleCopilotChat, handleCopilotChatWithAI } from "../services/copilotService.js";
import { requireRole } from "../middleware/authMiddleware.js";
import { validateBody } from "../utils/validate.js";
import { copilotChatSchema } from "../utils/schemas.js";
import { STAFF_ROLES } from "../constants.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerCopilotRoutes(router) {
  router.post(
    "/api/copilot/chat",
    requireRole(STAFF_ROLES, async ({ res, body }) => {
      const input = validateBody(copilotChatSchema, body);
      const ticket = await getTicketById(input.ticket_id);
      if (!ticket) throw new ApiError(404, `Ticket ${input.ticket_id} not found`);

      const reply = (await handleCopilotChatWithAI(input.message, ticket)) ?? handleCopilotChat(input.message, ticket);
      sendJson(res, 200, { reply });
    })
  );
}
