/**
 * Module 4: pgvector-style Duplicate Detection Engine — TF-IDF cosine similarity + exact error-code boosting.
 */

import { tokenize, computeIdf, tfidfVector, cosineSimilarity, extractErrorCode } from "../utils/textSimilarity.js";

export function findDuplicateTickets(candidateText, existingTickets, { threshold = 0.85, relatedThreshold = 0.55 } = {}) {
  if (existingTickets.length === 0) {
    return { is_duplicate: false, top_match: null, related: [], all_candidates: [] };
  }

  const candidateTokens = tokenize(candidateText);
  const candidateCode = extractErrorCode(candidateText);

  const corpusEntries = existingTickets.map((ticket) => {
    const combined = `${ticket.title} ${ticket.structured_description} ${ticket.vague_user_input} ${ticket.ocr_findings?.extracted_error_code || ""}`;
    return { ticket, tokens: tokenize(combined) };
  });

  const idf = computeIdf([candidateTokens, ...corpusEntries.map((e) => e.tokens)]);
  const candidateVector = tfidfVector(candidateTokens, idf);

  const scored = corpusEntries
    .map(({ ticket, tokens }) => {
      const vector = tfidfVector(tokens, idf);
      let score = cosineSimilarity(candidateVector, vector);

      const ticketCode = ticket.ocr_findings?.extracted_error_code || extractErrorCode(`${ticket.title} ${ticket.structured_description}`);
      if (candidateCode && ticketCode && candidateCode === ticketCode) {
        score = Math.min(0.99, score + 0.35);
      }

      return {
        ticket,
        similarity_score: Math.round(score * 100) / 100,
        similarity_percentage: Math.round(score * 100)
      };
    })
    .sort((a, b) => b.similarity_score - a.similarity_score);

  const topMatch = scored[0];
  const isDuplicate = !!topMatch && topMatch.similarity_score >= threshold;
  const related = scored.filter((m) => m.similarity_score >= relatedThreshold && m.similarity_score < threshold).slice(0, 3);

  return { is_duplicate: isDuplicate, top_match: topMatch, related, all_candidates: scored.slice(0, 5) };
}
