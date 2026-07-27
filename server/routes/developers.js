import { listDevelopers } from "../db/store.js";
import { sendJson } from "../utils/http.js";

export function registerDeveloperRoutes(router) {
  router.get("/api/developers", async ({ res }) => sendJson(res, 200, { developers: await listDevelopers() }));
}
