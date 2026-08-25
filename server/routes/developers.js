import { listDevelopers } from "../db/store.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { STAFF_ROLES } from "../constants.js";
import { sendJson } from "../utils/http.js";

export function registerDeveloperRoutes(router) {
  router.get(
    "/api/developers",
    requireRole(STAFF_ROLES, async ({ res }) => sendJson(res, 200, { developers: await listDevelopers() }))
  );
}

