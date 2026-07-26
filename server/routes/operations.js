import { buildWarRoomSnapshot } from "../services/warRoomService.js";
import { buildDigitalTwin } from "../services/digitalTwinService.js";
import { buildMissionControlSnapshot } from "../services/missionControlService.js";
import { sendJson } from "../utils/http.js";

export function registerOperationsRoutes(router) {
  router.get("/api/warroom", ({ res }) => sendJson(res, 200, { warroom: buildWarRoomSnapshot() }));
  router.get("/api/digital-twin", ({ res }) => sendJson(res, 200, { twin: buildDigitalTwin() }));
  router.get("/api/mission-control", ({ res }) => sendJson(res, 200, { missionControl: buildMissionControlSnapshot() }));
}
