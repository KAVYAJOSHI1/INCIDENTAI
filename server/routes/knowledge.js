import crypto from "node:crypto";
import { listKnowledgeBase, addKnowledgeArticle } from "../db/store.js";
import { searchKnowledgeBase, searchKnowledgeBaseWithAI, searchKnowledgeBaseWithVector } from "../services/knowledgeService.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validateBody } from "../utils/validate.js";
import { knowledgeArticleSchema } from "../utils/schemas.js";
import { STAFF_ROLES } from "../constants.js";
import { sendJson } from "../utils/http.js";

export function registerKnowledgeRoutes(router) {
  router.get(
    "/api/knowledge",
    requireAuth(async ({ res }) => sendJson(res, 200, { articles: await listKnowledgeBase() }))
  );

  router.get(
    "/api/knowledge/search",
    requireAuth(async ({ res, query }) => {
      const q = query.q || "";
      const module = query.module || null;
      const shortlist =
        (await searchKnowledgeBaseWithVector(q, module, { minScore: 0.05 })) ??
        searchKnowledgeBase(q, module, await listKnowledgeBase(), { minScore: 0.05 });
      const fallback = shortlist.filter((m) => m.score >= 0.25);
      const results = (await searchKnowledgeBaseWithAI(q, module, shortlist)) ?? fallback;
      sendJson(res, 200, { results });
    })
  );

  router.post(
    "/api/knowledge",
    requireRole(STAFF_ROLES, async ({ res, body }) => {
      const input = validateBody(knowledgeArticleSchema, body);
      const article = {
        id: input.id || `kb_${crypto.randomInt(100000, 999999)}`,
        title: input.title,
        erp_module: input.erp_module || "INVOICING",
        error_code: input.error_code || "ERR_CUSTOM",
        solution: input.solution,
        confidence: input.confidence ?? 0.9,
        tags: input.tags || []
      };
      const saved = await addKnowledgeArticle(article);
      sendJson(res, 201, { article: saved });
    })
  );
}
