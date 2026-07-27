import { listDevelopers } from "../db/store.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { sendJson } from "../utils/http.js";

export function registerDeveloperRoutes(router) {
  router.get(
    "/api/developers",
    requireAuth(async ({ res }) => sendJson(res, 200, { developers: await listDevelopers() }))
  );
}
