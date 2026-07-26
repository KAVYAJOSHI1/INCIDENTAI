import { runIncidentIngestPipeline } from "../services/ticketService.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerIncidentRoutes(router) {
  router.post("/api/incidents/ingest", ({ res, body }) => {
    if (!body || (!body.text && !body.fileName)) {
      throw new ApiError(400, 'Request body must include "text" or "fileName"');
    }
    const ticket = runIncidentIngestPipeline(body);
    sendJson(res, 201, { ticket });
  });
}
