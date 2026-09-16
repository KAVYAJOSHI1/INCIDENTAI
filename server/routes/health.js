import { sendJson } from "../utils/http.js";

export function registerHealthRoutes(router) {
  router.get("/", ({ res }) => sendJson(res, 200, {
    service: "IncidentAI Backend API",
    status: "online",
    frontend_url: "http://localhost:3001",
    health_check: "http://localhost:4000/api/health",
    timestamp: new Date().toISOString()
  }));

  router.get("/api/health", ({ res }) => sendJson(res, 200, { status: "ok", timestamp: new Date().toISOString() }));
}
