import { runIncidentIngestPipeline } from "../services/ticketService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody } from "../utils/validate.js";
import { incidentInputSchema } from "../utils/schemas.js";
import { sendJson } from "../utils/http.js";

export function registerIncidentRoutes(router) {
  router.post(
    "/api/incidents/ingest",
    requireAuth(async ({ res, body }) => {
      const input = validateBody(incidentInputSchema, body);
      const ticket = await runIncidentIngestPipeline(input);
      sendJson(res, 201, { ticket });
    })
  );
}
