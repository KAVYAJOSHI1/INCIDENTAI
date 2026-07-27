import { buildWarRoomSnapshot } from "../services/warRoomService.js";
import { buildDigitalTwin } from "../services/digitalTwinService.js";
import { buildMissionControlSnapshot } from "../services/missionControlService.js";
import { sendJson } from "../utils/http.js";

export function registerOperationsRoutes(router) {
  router.get("/api/warroom", async ({ res }) => sendJson(res, 200, { warroom: await buildWarRoomSnapshot() }));
  router.get("/api/digital-twin", async ({ res }) => sendJson(res, 200, { twin: await buildDigitalTwin() }));
  router.get("/api/mission-control", async ({ res }) => sendJson(res, 200, { missionControl: await buildMissionControlSnapshot() }));
}
