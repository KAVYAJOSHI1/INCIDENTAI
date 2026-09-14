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
import { embedQuery } from "./embeddingService.js";
import { query as pgQuery } from "../db/postgres.js";
import { MODULE_MISMATCH_PENALTY, SAME_MODULE_BONUS, COMPONENT_MATCH_BONUS, CROSS_MODULE_DUPLICATE_FLOOR } from "../constants.js";

// Short TTL: the shortlist depends on the live ticket list, which changes as new tickets are created.
const duplicateJudgeCache = createTtlCache(30_000);

/**
 * Module-aware scoring: two incidents that only share generic terminology (e.g. both
 * mention "stock"/"inventory") but come from different ERP modules represent different
 * business processes and must not be conflated. Module is a strong discriminator — a
 * cross-module match is penalized before the duplicate threshold is applied, while a
 * matching UI component is a small corroborating signal, not a deciding one.
 *
 * Returns the same shape the ticket detail already exposes duplicate reasoning through
 * (`signals`), so the explanation is inspectable rather than a black box.
 */
export function applyContextSignals(baseScore, { candidateModule, referenceModule, candidateComponent, referenceComponent, candidateCode, referenceCode } = {}) {
  let score = baseScore;
  const modulesKnown = Boolean(candidateModule && referenceModule);
  const moduleMatch = modulesKnown ? candidateModule === referenceModule : null;

  if (modulesKnown && !moduleMatch) {
    score -= MODULE_MISMATCH_PENALTY;
  } else if (modulesKnown && moduleMatch) {
    score = Math.min(0.99, score + SAME_MODULE_BONUS);
  }

  const componentsKnown = Boolean(candidateComponent && referenceComponent);
  const componentMatch = componentsKnown ? candidateComponent === referenceComponent : null;
  if (componentsKnown && componentMatch) {
    score = Math.min(0.99, score + COMPONENT_MATCH_BONUS);
  }

  const codesKnown = Boolean(candidateCode && referenceCode);
  const errorCodeMatch = codesKnown ? candidateCode === referenceCode : null;

  return {
    score: Math.max(0, Math.min(0.99, score)),
    signals: {
      semantic_similarity: Math.round(baseScore * 100) / 100,
      module_match: moduleMatch,
      component_match: componentMatch,
      error_code_match: errorCodeMatch
    }
  };
}

/**
 * Final, deterministic safety net applied once to whichever duplicate result won
 * (TF-IDF, pgvector, or the LLM re-ranker) — so a cross-module false positive can't slip
 * through even if the AI judge scored purely off text and ignored module entirely.
 * Cross-module matches are demoted from "duplicate" to "related" unless the similarity
 * is overwhelming (CROSS_MODULE_DUPLICATE_FLOOR) — module is a strong discriminator, not
 * an absolute one (e.g. a genuinely identical transaction replayed under two module tags).
 */
export function applyModuleAwareGuard(duplicateResult, referenceModule) {
  if (!duplicateResult?.is_duplicate || !duplicateResult.top_match || !referenceModule) return duplicateResult;

  const candidateModule = duplicateResult.top_match.ticket?.erp_module;
  if (!candidateModule || candidateModule === referenceModule) return duplicateResult;
  if (duplicateResult.top_match.similarity_score >= CROSS_MODULE_DUPLICATE_FLOOR) return duplicateResult;

  return {
    ...duplicateResult,
    is_duplicate: false,
    cross_module_override: true,
    reasoning: `${duplicateResult.reasoning || ""} [Module-aware override: top match is in a different ERP module (${candidateModule} vs ${referenceModule}); cross-module matches require similarity >= ${CROSS_MODULE_DUPLICATE_FLOOR} to be treated as a duplicate rather than a related signal.]`.trim()
  };
}

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

const DUPLICATE_JUDGE_SYSTEM_PROMPT = `You are a duplicate-incident detector for an ERP support desk. Given a NEW incident report and a shortlist of EXISTING open tickets (pre-filtered by lexical similarity, each tagged with its ERP module), determine whether the new incident describes the same underlying issue as one of the existing tickets — even if worded completely differently. Set is_duplicate to true only when you are confident it is the same root problem, not merely the same ERP module or a superficially similar symptom. Module is a strong discriminator: incidents in DIFFERENT ERP modules represent different business processes (e.g. a Production run being blocked vs. a direct Inventory warehouse transfer being blocked) and must NOT be marked duplicates just because both mention shared terminology like "stock" or "inventory" or share the same ultimate root cause — only cross-module-match when the SAME literal transaction/record is clearly involved. similarity_score is your calibrated 0-1 estimate of how likely they are duplicates.`;

/**
 * Re-ranks the TF-IDF shortlist with Claude. Returns null (caller falls back to the pure
 * TF-IDF result) if the LLM is unavailable, fails, or the shortlist is empty.
 * `referenceModule` (the NEW incident's authoritative module) is surfaced to the model
 * explicitly and used to carry forward the same module_match signal the TF-IDF/vector
 * paths compute, so the explanation stays consistent regardless of which path produced it.
 */
export async function findDuplicateTicketsWithAI(candidateText, tfidfResult, referenceModule = null) {
  const shortlist = tfidfResult.all_candidates;
  if (!shortlist || shortlist.length === 0) return null;

  const cacheKey = `${candidateText.trim().toLowerCase()}::${referenceModule || ""}::${shortlist.map((c) => c.ticket.ticket_number).sort().join(",")}`;
  const cached = duplicateJudgeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const shortlistText = shortlist
    .map((c) => `- ${c.ticket.ticket_number} [module: ${c.ticket.erp_module || "unknown"}]: "${c.ticket.title}" — ${c.ticket.structured_description}`)
    .join("\n");

  const result = await completeJson({
    system: DUPLICATE_JUDGE_SYSTEM_PROMPT,
    prompt: `NEW incident report (module: ${referenceModule || "unknown"}): "${candidateText}"\n\nEXISTING tickets shortlist:\n${shortlistText}\n\nIs the new incident a duplicate of one of these?`,
    schema: DUPLICATE_JUDGE_SCHEMA,
    maxTokens: 512
  });

  if (!result) return null;

  const matchedCandidate = shortlist.find((c) => c.ticket.ticket_number === result.best_match_ticket_number);
  const topMatch = matchedCandidate
    ? {
        ticket: matchedCandidate.ticket,
        similarity_score: Math.round(result.similarity_score * 100) / 100,
        similarity_percentage: Math.round(result.similarity_score * 100),
        signals: {
          ...(matchedCandidate.signals || {}),
          semantic_similarity: Math.round(result.similarity_score * 100) / 100,
          module_match: referenceModule && matchedCandidate.ticket.erp_module ? matchedCandidate.ticket.erp_module === referenceModule : null
        }
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

/**
 * pgvector candidate retrieval: embeds the incoming text with Voyage AI and ranks
 * existing tickets by cosine distance in Postgres. Returns null (caller falls back
 * to findDuplicateTickets' in-memory TF-IDF) if no embedding could be produced —
 * no VOYAGE_API_KEY, embedding call failure, or no ticket has an embedding yet.
 */
export async function findDuplicateTicketsWithVector(candidateText, { threshold = 0.85, relatedThreshold = 0.55, referenceModule = null, referenceComponent = null } = {}) {
  const vector = await embedQuery(candidateText);
  if (!vector) return null;

  const { rows } = await pgQuery(
    `SELECT id, ticket_number, title, structured_description, vague_user_input, ocr_findings, erp_module,
            1 - (embedding <=> $1::vector) AS similarity
     FROM tickets
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 8`,
    [`[${vector.join(",")}]`]
  );

  if (rows.length === 0) return null;

  const scored = rows.map((row) => {
    const { score, signals } = applyContextSignals(row.similarity, {
      candidateModule: row.erp_module,
      referenceModule,
      candidateComponent: row.ocr_findings?.detected_ui_component,
      referenceComponent,
      candidateCode: row.ocr_findings?.extracted_error_code,
      referenceCode: extractErrorCode(candidateText)
    });
    return {
      ticket: {
        id: row.id,
        ticket_number: row.ticket_number,
        title: row.title,
        structured_description: row.structured_description,
        vague_user_input: row.vague_user_input,
        ocr_findings: row.ocr_findings,
        erp_module: row.erp_module
      },
      similarity_score: Math.round(score * 100) / 100,
      similarity_percentage: Math.round(score * 100),
      signals
    };
  }).sort((a, b) => b.similarity_score - a.similarity_score);

  const topMatch = scored[0];
  const isDuplicate = !!topMatch && topMatch.similarity_score >= threshold;
  const related = scored.filter((m) => m.similarity_score >= relatedThreshold && m.similarity_score < threshold).slice(0, 3);

  return { is_duplicate: isDuplicate, top_match: topMatch, related, all_candidates: scored.slice(0, 5), ai_generated: false };
}

export function findDuplicateTickets(candidateText, existingTickets, { threshold = 0.85, relatedThreshold = 0.55, referenceModule = null, referenceComponent = null } = {}) {
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
      let baseScore = cosineSimilarity(candidateVector, vector);

      const ticketCode = ticket.ocr_findings?.extracted_error_code || extractErrorCode(`${ticket.title} ${ticket.structured_description}`);
      if (candidateCode && ticketCode && candidateCode === ticketCode) {
        baseScore = Math.min(0.99, baseScore + 0.35);
      }

      const { score, signals } = applyContextSignals(baseScore, {
        candidateModule: ticket.erp_module,
        referenceModule,
        candidateComponent: ticket.ocr_findings?.detected_ui_component,
        referenceComponent,
        candidateCode: ticketCode,
        referenceCode: candidateCode
      });

      return {
        ticket,
        similarity_score: Math.round(score * 100) / 100,
        similarity_percentage: Math.round(score * 100),
        signals
      };
    })
    .sort((a, b) => b.similarity_score - a.similarity_score);

  const topMatch = scored[0];
  const isDuplicate = !!topMatch && topMatch.similarity_score >= threshold;
  const related = scored.filter((m) => m.similarity_score >= relatedThreshold && m.similarity_score < threshold).slice(0, 3);

  return { is_duplicate: isDuplicate, top_match: topMatch, related, all_candidates: scored.slice(0, 5), ai_generated: false };
}
