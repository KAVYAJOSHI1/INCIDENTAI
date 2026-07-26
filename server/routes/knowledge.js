import crypto from "node:crypto";
import { listKnowledgeBase, addKnowledgeArticle } from "../db/store.js";
import { searchKnowledgeBase } from "../services/knowledgeService.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerKnowledgeRoutes(router) {
  router.get("/api/knowledge", ({ res }) => sendJson(res, 200, { articles: listKnowledgeBase() }));

  router.get("/api/knowledge/search", ({ res, query }) => {
    const results = searchKnowledgeBase(query.q || "", query.module || null, listKnowledgeBase());
    sendJson(res, 200, { results });
  });

  router.post("/api/knowledge", ({ res, body }) => {
    if (!body?.title || !body?.solution) throw new ApiError(400, 'Request body must include "title" and "solution"');
    const article = {
      id: body.id || `kb_${crypto.randomInt(100000, 999999)}`,
      title: body.title,
      erp_module: body.erp_module || "INVOICING",
      error_code: body.error_code || "ERR_CUSTOM",
      solution: body.solution,
      confidence: body.confidence ?? 0.9,
      tags: body.tags || []
    };
    addKnowledgeArticle(article);
    sendJson(res, 201, { article });
  });
}
