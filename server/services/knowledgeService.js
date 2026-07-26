/**
 * Module 5: RAG Knowledge Base Vector Hub — TF-IDF cosine semantic search with module-affinity boosting.
 */

import { tokenize, computeIdf, tfidfVector, cosineSimilarity } from "../utils/textSimilarity.js";

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
        confidence_percentage: Math.round(score * article.confidence * 100)
      };
    })
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
