import { buildWarRoomSnapshot } from "../services/warRoomService.js";
import { buildDigitalTwin } from "../services/digitalTwinService.js";
import { buildMissionControlSnapshot } from "../services/missionControlService.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { EXECUTIVE_ROLES, OPS_ROLES } from "../constants.js";
import { sendJson } from "../utils/http.js";

export function registerOperationsRoutes(router) {
  router.get(
    "/api/warroom",
    requireRole(OPS_ROLES, async ({ res }) => sendJson(res, 200, { warroom: await buildWarRoomSnapshot() }))
  );
  router.get(
    "/api/digital-twin",
    requireRole(OPS_ROLES, async ({ res }) => sendJson(res, 200, { twin: await buildDigitalTwin() }))
  );
  router.get(
    "/api/mission-control",
    requireRole(OPS_ROLES, async ({ res }) => sendJson(res, 200, { missionControl: await buildMissionControlSnapshot() }))
  );
}

