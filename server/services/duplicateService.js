/**
 * Module 4: pgvector-style Duplicate Detection Engine. TF-IDF cosine similarity does cheap
 * candidate retrieval (findDuplicateTickets); findDuplicateTicketsWithAI then has Claude
 * semantically judge that shortlist — catching duplicates worded completely differently
 * that lexical similarity alone would miss. Falls back to the pure TF-IDF result when no
 * API key is configured or the call fails.
 */

import { tokenize, computeIdf, tfidfVector, cosineSimilarity, extractErrorCode } from "../utils/textSimilarity.js";
import { completeJson } from "./llmService.js";
import { createTtlCache } from "../utils/simpleCache.js";

// Short TTL: the shortlist depends on the live ticket list, which changes as new tickets are created.
const duplicateJudgeCache = createTtlCache(30_000);

const DUPLICATE_JUDGE_SCHEMA = {
  type: "object",
  properties: {
    is_duplicate: { type: "boolean" },
    best_match_ticket_number: { anyOf: [{ type: "string" }, { type: "null" }] },
    similarity_score: { type: "number" },
    reasoning: { type: "string" }
  },
  required: ["is_duplicate", "similarity_score", "reasoning"],
  additionalProperties: false
};

const DUPLICATE_JUDGE_SYSTEM_PROMPT = `You are a duplicate-incident detector for an ERP support desk. Given a NEW incident report and a shortlist of EXISTING open tickets (pre-filtered by lexical similarity), determine whether the new incident describes the same underlying issue as one of the existing tickets — even if worded completely differently. Set is_duplicate to true only when you are confident it is the same root problem, not merely the same ERP module or a superficially similar symptom. similarity_score is your calibrated 0-1 estimate of how likely they are duplicates.`;

/**
 * Re-ranks the TF-IDF shortlist with Claude. Returns null (caller falls back to the pure
 * TF-IDF result) if the LLM is unavailable, fails, or the shortlist is empty.
 */
export async function findDuplicateTicketsWithAI(candidateText, tfidfResult) {
  const shortlist = tfidfResult.all_candidates;
  if (!shortlist || shortlist.length === 0) return null;

  const cacheKey = `${candidateText.trim().toLowerCase()}::${shortlist.map((c) => c.ticket.ticket_number).sort().join(",")}`;
  const cached = duplicateJudgeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const shortlistText = shortlist
    .map((c) => `- ${c.ticket.ticket_number}: "${c.ticket.title}" — ${c.ticket.structured_description}`)
    .join("\n");

  const result = await completeJson({
    system: DUPLICATE_JUDGE_SYSTEM_PROMPT,
    prompt: `NEW incident report: "${candidateText}"\n\nEXISTING tickets shortlist:\n${shortlistText}\n\nIs the new incident a duplicate of one of these?`,
    schema: DUPLICATE_JUDGE_SCHEMA,
    maxTokens: 512
  });

  if (!result) return null;

  const matchedCandidate = shortlist.find((c) => c.ticket.ticket_number === result.best_match_ticket_number);
  const topMatch = matchedCandidate
    ? {
        ticket: matchedCandidate.ticket,
        similarity_score: Math.round(result.similarity_score * 100) / 100,
        similarity_percentage: Math.round(result.similarity_score * 100)
      }
    : null;

  const mapped = {
    is_duplicate: result.is_duplicate && !!topMatch,
    top_match: topMatch,
    related: shortlist.filter((c) => c !== matchedCandidate).slice(0, 3),
    all_candidates: shortlist,
    reasoning: result.reasoning,
    ai_generated: true
  };

  duplicateJudgeCache.set(cacheKey, mapped);
  return mapped;
}

export function findDuplicateTickets(candidateText, existingTickets, { threshold = 0.85, relatedThreshold = 0.55 } = {}) {
  if (existingTickets.length === 0) {
    return { is_duplicate: false, top_match: null, related: [], all_candidates: [], ai_generated: false };
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

  return { is_duplicate: isDuplicate, top_match: topMatch, related, all_candidates: scored.slice(0, 5), ai_generated: false };
}
