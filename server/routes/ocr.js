import { analyzeMultimodalInput, analyzeMultimodalInputFromImage } from "../services/ocrService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody } from "../utils/validate.js";
import { incidentInputSchema } from "../utils/schemas.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerOcrRoutes(router) {
  router.post(
    "/api/ocr/analyze",
    requireAuth(async ({ res, body }) => {
      const input = validateBody(incidentInputSchema, body);

      let ocr;
      if (input.imageBase64) {
        try {
          ocr = await analyzeMultimodalInputFromImage(input.imageBase64);
        } catch (err) {
          throw new ApiError(400, `Could not read image: ${err.message}`);
        }
      } else {
        ocr = analyzeMultimodalInput(input);
      }

      sendJson(res, 200, { ocr });
    })
  );
}
