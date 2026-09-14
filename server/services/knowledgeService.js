/**
 * Module 5: RAG Knowledge Base Vector Hub. TF-IDF cosine similarity does cheap candidate
 * retrieval (searchKnowledgeBase); searchKnowledgeBaseWithAI then has Claude semantically
 * re-rank that shortlist against the actual query intent — this is the "R" and the "G" of
 * RAG: retrieve a candidate set, then let the model reason over it before it's handed back
 * (or, upstream, used to ground a generated answer). Falls back to the pure TF-IDF ranking
 * when no API key is configured or the call fails.
 */

import crypto from "node:crypto";
import { tokenize, computeIdf, tfidfVector, cosineSimilarity } from "../utils/textSimilarity.js";
import { completeJson } from "./llmService.js";
import { createTtlCache } from "../utils/simpleCache.js";
import { embedQuery } from "./embeddingService.js";
import { query as pgQuery } from "../db/postgres.js";
import { addKnowledgeArticle, listKnowledgeBase } from "../db/store.js";
import { KB_WRITEBACK_DEDUP_THRESHOLD } from "../constants.js";


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

  // Embedding coverage guard: if most articles have no embedding yet (e.g. the embedding
  // provider was rate-limited during seeding), a vector search over the embedded subset
  // silently hides the relevant article. Fall back to full TF-IDF instead of returning a
  // misleading partial result.
  const { rows: cov } = await pgQuery(
    `SELECT count(*) FILTER (WHERE embedding IS NOT NULL)::int AS with_emb, count(*)::int AS total FROM knowledge_base`
  );
  if (!cov[0] || cov[0].total === 0 || cov[0].with_emb < Math.max(1, cov[0].total - 1)) return null;

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

/**
 * Pure TF-IDF similarity search for KB writeback dedup — no DB/network dependency, so
 * it's directly unit-testable. Compares a *candidate* article's full content (title +
 * problem + root cause + solution, the same fields addKnowledgeArticle embeds) against
 * each existing article's, boosting slightly when module/error_code also match. This is
 * deliberately a different, stricter question than normal RAG retrieval ("is this
 * candidate essentially the same knowledge as one we already have?"), not "would this
 * article be relevant to a query" — a normal retrieval match is not automatically a
 * writeback duplicate.
 */
export function findMostSimilarArticle(candidateArticle, existingArticles, { threshold = KB_WRITEBACK_DEDUP_THRESHOLD } = {}) {
  if (!existingArticles || existingArticles.length === 0) return null;

  // Compare on title + solution only. `problem` (the ticket's vague_user_input) is
  // instance-specific noise for this purpose — an ERP-automated incident's problem text
  // always embeds a unique correlation/transaction id, which would make two otherwise
  // identical resolutions score as dissimilar. `root_cause` and `problem` also aren't
  // persisted on a stored KB article at all (see rowToArticle in db/store.js), so
  // including them here would compare the candidate against fields that are always
  // empty on the existing side — comparing on what's actually stored keeps this
  // symmetric and focused on the reusable knowledge (title + solution), not the report.
  const buildText = (a) => [a.title, a.solution].filter(Boolean).join(" ");
  const candidateTokens = tokenize(buildText(candidateArticle));
  const entries = existingArticles.map((article) => ({ article, tokens: tokenize(buildText(article)) }));

  const idf = computeIdf([candidateTokens, ...entries.map((e) => e.tokens)]);
  const candidateVector = tfidfVector(candidateTokens, idf);

  const scored = entries
    .map(({ article, tokens }) => {
      const vector = tfidfVector(tokens, idf);
      let score = cosineSimilarity(candidateVector, vector);
      if (candidateArticle.erp_module && article.erp_module === candidateArticle.erp_module) score = Math.min(0.99, score + 0.05);
      if (candidateArticle.error_code && article.error_code && article.error_code === candidateArticle.error_code) score = Math.min(0.99, score + 0.05);
      return { article, score: Math.round(score * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  return top && top.score >= threshold ? top : null;
}

/**
 * Phase 7: Captures a developer-verified resolution and embeds it into the pgvector knowledge base.
 * Only human-verified resolutions are permitted into the trusted RAG index.
 *
 * FIX 4: before inserting, the candidate resolution is checked against existing KB
 * articles for near-duplicate content (Voyage vector search when configured, TF-IDF
 * fallback otherwise — the same retrieval infrastructure the rest of RAG uses, not a
 * separate mechanism). A sufficiently similar existing article blocks the insert and is
 * returned as-is, annotated `deduplicated: true`, instead of writing a second copy of
 * the same knowledge.
 */
export async function captureVerifiedKnowledge(ticket, verificationData = {}) {
  if (!ticket) throw new Error("Ticket is required for knowledge capture");

  const title = verificationData.title || `[Verified Resolution] ${ticket.title}`;
  const solution = verificationData.verified_resolution || ticket.ai_suggested_patch || ticket.structured_description;
  const rootCause = verificationData.root_cause || ticket.ai_root_cause || "Developer verified root cause";
  const errorCode = ticket.ocr_findings?.extracted_error_code || "ERR_VERIFIED";
  const erpModule = ticket.erp_module || "GENERAL";
  const problem = ticket.vague_user_input || ticket.title;

  const candidate = { title, erp_module: erpModule, error_code: errorCode, solution, problem, root_cause: rootCause };
  const dedupQueryText = [title, problem, rootCause, solution].filter(Boolean).join("\n");

  const vectorMatch = await searchKnowledgeBaseWithVector(dedupQueryText, erpModule, { minScore: KB_WRITEBACK_DEDUP_THRESHOLD });
  let duplicateMatch = vectorMatch && vectorMatch.length > 0 ? { article: vectorMatch[0].article, score: vectorMatch[0].score } : null;

  if (!duplicateMatch) {
    const existingArticles = await listKnowledgeBase();
    duplicateMatch = findMostSimilarArticle(candidate, existingArticles, { threshold: KB_WRITEBACK_DEDUP_THRESHOLD });
  }

  if (duplicateMatch) {
    return {
      ...duplicateMatch.article,
      deduplicated: true,
      matched_similarity: duplicateMatch.score,
      deduplication_reason: `An existing verified knowledge article ("${duplicateMatch.article.title}") is ${Math.round(duplicateMatch.score * 100)}% similar (>= ${Math.round(KB_WRITEBACK_DEDUP_THRESHOLD * 100)}% threshold) — no duplicate article was created.`
    };
  }

  const article = {
    id: `kb_${crypto.randomInt(100000, 999999)}`,
    title,
    erp_module: erpModule,
    error_code: errorCode,
    solution,
    problem,
    root_cause: rootCause,
    confidence: 1.0, // Human verified!
    is_verified: true,
    tags: [erpModule, errorCode, "VERIFIED_RESOLUTION", ...(verificationData.tags || [])]
  };

  const savedArticle = await addKnowledgeArticle(article);

  // Clear rerank cache so vector search reflects new article immediately
  rerankCache.clear?.();

  return { ...savedArticle, deduplicated: false };
}

