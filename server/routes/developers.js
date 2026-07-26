import { listDevelopers } from "../db/store.js";
import { sendJson } from "../utils/http.js";

export function registerDeveloperRoutes(router) {
  router.get("/api/developers", ({ res }) => sendJson(res, 200, { developers: listDevelopers() }));
}
