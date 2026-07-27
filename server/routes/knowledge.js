import crypto from "node:crypto";
import { listKnowledgeBase, addKnowledgeArticle } from "../db/store.js";
import { searchKnowledgeBase, searchKnowledgeBaseWithAI, searchKnowledgeBaseWithVector } from "../services/knowledgeService.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerKnowledgeRoutes(router) {
  router.get("/api/knowledge", async ({ res }) => sendJson(res, 200, { articles: await listKnowledgeBase() }));

  router.get("/api/knowledge/search", async ({ res, query }) => {
    const q = query.q || "";
    const module = query.module || null;
    const shortlist =
      (await searchKnowledgeBaseWithVector(q, module, { minScore: 0.05 })) ??
      searchKnowledgeBase(q, module, await listKnowledgeBase(), { minScore: 0.05 });
    const fallback = shortlist.filter((m) => m.score >= 0.25);
    const results = (await searchKnowledgeBaseWithAI(q, module, shortlist)) ?? fallback;
    sendJson(res, 200, { results });
  });

  router.post("/api/knowledge", async ({ res, body }) => {
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
    const saved = await addKnowledgeArticle(article);
    sendJson(res, 201, { article: saved });
  });
}
