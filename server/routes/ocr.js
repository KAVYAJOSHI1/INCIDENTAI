import { analyzeMultimodalInput } from "../services/ocrService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody } from "../utils/validate.js";
import { incidentInputSchema } from "../utils/schemas.js";
import { sendJson } from "../utils/http.js";

export function registerOcrRoutes(router) {
  router.post(
    "/api/ocr/analyze",
    requireAuth(async ({ res, body }) => {
      const input = validateBody(incidentInputSchema, body);
      sendJson(res, 200, { ocr: analyzeMultimodalInput(input) });
    })
  );
}
