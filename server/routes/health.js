import { sendJson } from "../utils/http.js";

export function registerHealthRoutes(router) {
  router.get("/api/health", ({ res }) => sendJson(res, 200, { status: "ok", timestamp: new Date().toISOString() }));
}
