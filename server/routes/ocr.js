import { analyzeMultimodalInput } from "../services/ocrService.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerOcrRoutes(router) {
  router.post("/api/ocr/analyze", ({ res, body }) => {
    if (!body || (!body.text && !body.fileName)) {
      throw new ApiError(400, 'Request body must include "text" or "fileName"');
    }
    sendJson(res, 200, { ocr: analyzeMultimodalInput(body) });
  });
}
