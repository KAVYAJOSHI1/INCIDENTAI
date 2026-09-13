/**
 * Demo Incident Factory + Reset routes.
 *
 * GET  /api/demo/scenarios              — list the presenter-triggerable failure scenarios (any auth)
 * POST /api/demo/scenarios/:id/trigger  — run one real embedded-ERP failure → persisted incident (DEVELOPER)
 * POST /api/demo/reset                  — deterministically restore the presentation baseline (DEVELOPER)
 */

import { listDemoScenarios, triggerDemoScenario } from "../services/demoScenarioService.js";
import { resetDemoEnvironment } from "../services/demoResetService.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { DEVELOPER_ROLES } from "../constants.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerDemoRoutes(router) {
  router.get(
    "/api/demo/scenarios",
    requireAuth(async ({ res }) => sendJson(res, 200, { scenarios: listDemoScenarios() }))
  );

  router.post(
    "/api/demo/scenarios/:id/trigger",
    requireRole(DEVELOPER_ROLES, async ({ res, params }) => {
      const result = await triggerDemoScenario(params.id);
      if (!result) throw new ApiError(404, `Unknown demo scenario: ${params.id}`);
      sendJson(res, 200, result);
    })
  );

  router.post(
    "/api/demo/reset",
    requireRole(DEVELOPER_ROLES, async ({ res, user }) => {
      const summary = await resetDemoEnvironment(user?.name || "Demo Presenter");
      sendJson(res, 200, { success: true, summary });
    })
  );
}
