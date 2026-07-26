import { listKnowledgeBase } from "../db/store.js";
import { searchKnowledgeBase } from "../services/knowledgeService.js";
import { sendJson } from "../utils/http.js";

export function registerKnowledgeRoutes(router) {
  router.get("/api/knowledge", ({ res }) => sendJson(res, 200, { articles: listKnowledgeBase() }));

  router.get("/api/knowledge/search", ({ res, query }) => {
    const results = searchKnowledgeBase(query.q || "", query.module || null, listKnowledgeBase());
    sendJson(res, 200, { results });
  });
}
