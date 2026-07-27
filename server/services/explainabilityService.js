/**
 * Enterprise Feature 2: AI Decision Explainability Matrix — surfaces the "why" behind each
 * AI decision already computed, distinguishing real Claude reasoning from the deterministic
 * fallback so the UI can show which one actually served the result.
 */

import { completeJson } from "./llmService.js";

export function buildExplainability(ticket) {
  const severity = {
    value: ticket.severity,
    score: ticket.severity_analysis?.score ?? null,
    reasons: ticket.severity_analysis?.reasons || [],
    ai_generated: ticket.severity_analysis?.ai_generated ?? false
  };

  const routing = ticket.developer_routing?.recommended
    ? {
        developer: ticket.developer_routing.recommended.name,
        match_score: ticket.developer_routing.recommended.match_score,
        reasoning: ticket.developer_routing.recommended.reasoning,
        skill_overlap: ticket.developer_routing.recommended.skill_overlap || []
      }
    : null;

  const similarityPercentage = Math.round((ticket.duplicate_check?.similarity_score || 0) * 100);
  const duplicateIsAiGenerated = !!ticket.duplicate_check?.ai_generated;
  const duplicateMatch = {
    matched_ticket: ticket.duplicate_check?.top_match?.ticket?.ticket_number || null,
    similarity_percentage: similarityPercentage,
    is_duplicate: !!ticket.duplicate_check?.is_duplicate,
    ai_generated: duplicateIsAiGenerated,
    factors:
      duplicateIsAiGenerated && ticket.duplicate_check?.reasoning
        ? [ticket.duplicate_check.reasoning]
        : similarityPercentage > 0
          ? ["Extracted error code comparison", "Structured description token overlap (TF-IDF cosine)", "OCR-detected UI component match"]
          : []
  };

  const knowledgeMatches = (ticket.rag_kb_matches || []).slice(0, 3).map((m) => ({
    title: m.article.title,
    confidence_percentage: m.confidence_percentage,
    ai_generated: !!m.ai_generated,
    why_relevant: m.why_relevant || null
  }));

  return { ticket_id: ticket.id, severity, developer_routing: routing, duplicate_match: duplicateMatch, knowledge_matches: knowledgeMatches };
}

const NARRATIVE_SCHEMA = {
  type: "object",
  properties: {
    narrative: { type: "string" }
  },
  required: ["narrative"],
  additionalProperties: false
};

const NARRATIVE_SYSTEM_PROMPT = `You are an ERP incident triage engineer explaining, in 2-3 plain-English sentences, why an AI support system made the decisions it made for a ticket. Synthesize the severity classification, developer routing, duplicate-match result, and knowledge base matches already computed into one coherent explanation a support lead can read at a glance. Do not invent facts beyond what is given in the JSON.`;

/**
 * Asks Claude to synthesize the already-computed explainability fields into a coherent
 * plain-English narrative. Returns null (caller falls back to explainDecisionFallback) if
 * the LLM is unavailable or fails.
 */
export async function explainDecisionWithAI(explainability) {
  const result = await completeJson({
    system: NARRATIVE_SYSTEM_PROMPT,
    prompt: JSON.stringify(explainability),
    schema: NARRATIVE_SCHEMA,
    maxTokens: 300
  });

  if (!result) return null;
  return { narrative: result.narrative, narrative_ai_generated: true };
}

export function explainDecisionFallback(explainability) {
  const parts = [];

  parts.push(
    `Classified as ${explainability.severity.value?.replace("_", " ") || "unscored"}${
      explainability.severity.reasons[0] ? ` (${explainability.severity.reasons[0]})` : ""
    }.`
  );

  if (explainability.developer_routing) {
    parts.push(`Routed to ${explainability.developer_routing.developer} at a ${explainability.developer_routing.match_score}% skill/capacity match.`);
  }

  if (explainability.duplicate_match.similarity_percentage > 0) {
    parts.push(
      `${explainability.duplicate_match.is_duplicate ? "Flagged as a duplicate" : "Checked for duplicates"} with a top similarity of ${explainability.duplicate_match.similarity_percentage}%.`
    );
  }

  if (explainability.knowledge_matches.length > 0) {
    parts.push(`${explainability.knowledge_matches.length} related knowledge base article(s) surfaced.`);
  }

  return { narrative: parts.join(" "), narrative_ai_generated: false };
}
