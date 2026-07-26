/**
 * pgvector Embedding Similarity Search & Duplicate Ticket Detection Engine
 */

// Simple text similarity distance calculator (simulates 1536-dim vector embedding HNSW search)
export function computeSemanticSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  const wordsA = new Set(textA.toLowerCase().match(/\w+/g) || []);
  const wordsB = new Set(textB.toLowerCase().match(/\w+/g) || []);
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const jaccard = intersection.size / Math.sqrt(wordsA.size * wordsB.size);

  // Boost if exact error code match exists (e.g. ERR_TAX_VAL_402)
  const errorCodePattern = /ERR_[A-Z0-9_]+/i;
  const codeA = textA.match(errorCodePattern);
  const codeB = textB.match(errorCodePattern);

  if (codeA && codeB && codeA[0].toUpperCase() === codeB[0].toUpperCase()) {
    return Math.min(0.95, jaccard + 0.55);
  }

  return Math.min(0.92, Math.max(0.05, jaccard * 1.8));
}

export function searchDuplicateTickets(newTicketDescription, existingTickets) {
  const matches = existingTickets.map((ticket) => {
    const combinedTargetText = `${ticket.title} ${ticket.structured_description} ${ticket.vague_user_input} ${ticket.ocr_findings?.extracted_error_code || ''}`;
    const score = computeSemanticSimilarity(newTicketDescription, combinedTargetText);
    return {
      ticket,
      similarity_score: Math.round(score * 100) / 100,
      similarity_percentage: Math.round(score * 100)
    };
  });

  matches.sort((a, b) => b.similarity_score - a.similarity_score);

  const topMatch = matches[0];
  const isDuplicate = topMatch && topMatch.similarity_score >= 0.75;

  return {
    is_duplicate: isDuplicate,
    top_match: topMatch,
    all_candidates: matches.slice(0, 3)
  };
}

export function searchKnowledgeBase(queryText, erpModule, kbArticles) {
  const matches = kbArticles.map((article) => {
    const combinedKbText = `${article.title} ${article.error_code} ${article.solution} ${article.tags.join(" ")}`;
    let score = computeSemanticSimilarity(queryText, combinedKbText);

    // Module bonus
    if (article.erp_module === erpModule) {
      score = Math.min(0.98, score + 0.15);
    }

    return {
      article,
      score: Math.round(score * 100) / 100,
      confidence_percentage: Math.round(score * 100)
    };
  });

  matches.sort((a, b) => b.score - a.score);

  return matches.filter((m) => m.score > 0.3);
}
