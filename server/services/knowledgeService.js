/**
 * Module 5: RAG Knowledge Base Vector Hub. TF-IDF cosine similarity does cheap candidate
 * retrieval (searchKnowledgeBase); searchKnowledgeBaseWithAI then has Claude semantically
 * re-rank that shortlist against the actual query intent — this is the "R" and the "G" of
 * RAG: retrieve a candidate set, then let the model reason over it before it's handed back
 * (or, upstream, used to ground a generated answer). Falls back to the pure TF-IDF ranking
 * when no API key is configured or the call fails.
 */

import { tokenize, computeIdf, tfidfVector, cosineSimilarity } from "../utils/textSimilarity.js";
import { completeJson } from "./llmService.js";
import { createTtlCache } from "../utils/simpleCache.js";
import { embedQuery } from "./embeddingService.js";
import { query as pgQuery } from "../db/postgres.js";

// Search-as-you-type can fire several requests per second for near-identical queries;
// cache successful reranks briefly so we don't burn API calls on every keystroke.
const rerankCache = createTtlCache(60_000);

const KB_RERANK_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          article_id: { type: "string" },
          relevance_score: { type: "number" },
          why_relevant: { type: "string" }
        },
        required: ["article_id", "relevance_score", "why_relevant"],
        additionalProperties: false
      }
    }
  },
  required: ["results"],
  additionalProperties: false
};

const KB_RERANK_SYSTEM_PROMPT = `You are a RAG retrieval engine for an ERP support knowledge base. Given a support query and a shortlist of candidate knowledge base articles (pre-filtered by lexical similarity), select and rank only the articles that would genuinely help resolve the query. relevance_score is your calibrated 0-1 estimate of how well each article addresses the query. Omit articles that are not actually relevant rather than padding the list — an empty result is correct when nothing in the shortlist helps.`;

/**
 * Re-ranks a TF-IDF shortlist with Claude. Returns null (caller falls back to the pure
 * TF-IDF ranking) if the LLM is unavailable, fails, or the shortlist is empty.
 */
export async function searchKnowledgeBaseWithAI(queryText, erpModule, shortlist) {
  if (!shortlist || shortlist.length === 0) return null;

  const cacheKey = `${erpModule || ""}::${queryText.trim().toLowerCase()}::${shortlist.map((s) => s.article.id).sort().join(",")}`;
  const cached = rerankCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const shortlistText = shortlist
    .map((s) => `- id=${s.article.id} [${s.article.erp_module}]: "${s.article.title}" — ${s.article.solution}`)
    .join("\n");

  const result = await completeJson({
    system: KB_RERANK_SYSTEM_PROMPT,
    prompt: `Query (ERP module: ${erpModule || "unspecified"}): "${queryText}"\n\nCandidate articles:\n${shortlistText}\n\nSelect and rank the genuinely relevant ones.`,
    schema: KB_RERANK_SCHEMA,
    maxTokens: 512
  });

  if (!result) return null;

  const byId = new Map(shortlist.map((s) => [s.article.id, s.article]));
  const mapped = result.results
    .filter((r) => byId.has(r.article_id))
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .map((r) => ({
      article: byId.get(r.article_id),
      score: Math.round(r.relevance_score * 100) / 100,
      confidence_percentage: Math.round(r.relevance_score * 100),
      why_relevant: r.why_relevant,
      ai_generated: true
    }));

  rerankCache.set(cacheKey, mapped);
  return mapped;
}

/**
 * pgvector candidate retrieval: embeds the query with Voyage AI and ranks knowledge
 * base articles by cosine distance in Postgres. Returns null (caller falls back to
 * searchKnowledgeBase's in-memory TF-IDF) if no embedding could be produced — no
 * VOYAGE_API_KEY, embedding call failure, or no article has an embedding yet.
 */
export async function searchKnowledgeBaseWithVector(queryText, erpModule, { minScore = 0.25 } = {}) {
  const vector = await embedQuery(queryText);
  if (!vector) return null;

  const vectorLiteral = `[${vector.join(",")}]`;
  const { rows } = await pgQuery(
    `SELECT id, title, erp_module, error_code, solution, confidence, tags,
            1 - (embedding <=> $1::vector) AS similarity
     FROM knowledge_base
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 8`,
    [vectorLiteral]
  );

  if (rows.length === 0) return null;

  return rows
    .map((row) => {
      let score = row.similarity;
      if (erpModule && row.erp_module === erpModule) score = Math.min(0.99, score + 0.15);
      return {
        article: { id: row.id, title: row.title, erp_module: row.erp_module, error_code: row.error_code, solution: row.solution, confidence: Number(row.confidence), tags: row.tags },
        score: Math.round(score * 100) / 100,
        confidence_percentage: Math.round(score * Number(row.confidence) * 100),
        ai_generated: false
      };
    })
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

export function searchKnowledgeBase(queryText, erpModule, kbArticles, { minScore = 0.25 } = {}) {
  if (kbArticles.length === 0) return [];

  const queryTokens = tokenize(queryText);
  const entries = kbArticles.map((article) => ({
    article,
    tokens: tokenize(`${article.title} ${article.error_code} ${article.solution} ${article.tags.join(" ")}`)
  }));

  const idf = computeIdf([queryTokens, ...entries.map((e) => e.tokens)]);
  const queryVector = tfidfVector(queryTokens, idf);

  return entries
    .map(({ article, tokens }) => {
      const vector = tfidfVector(tokens, idf);
      let score = cosineSimilarity(queryVector, vector);
      if (erpModule && article.erp_module === erpModule) score = Math.min(0.99, score + 0.15);

      return {
        article,
        score: Math.round(score * 100) / 100,
        confidence_percentage: Math.round(score * article.confidence * 100),
        ai_generated: false
      };
    })
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
