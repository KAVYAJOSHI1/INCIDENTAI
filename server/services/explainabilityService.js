/**
 * Enterprise Feature 2: AI Decision Explainability Matrix — surfaces the "why" behind each
 * AI decision already computed, distinguishing real Claude reasoning from the deterministic
 * fallback so the UI can show which one actually served the result.
 */

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
