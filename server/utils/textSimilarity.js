/**
 * TF-IDF vectorization & cosine similarity (simulates pgvector embedding search without a real embedding model).
 */

const STOPWORDS = new Set([
  "the", "a", "an", "is", "was", "were", "be", "to", "of", "and", "or", "in",
  "on", "at", "for", "with", "this", "that", "it", "as", "by", "from"
]);

export function tokenize(text) {
  return (text || "").toLowerCase().match(/[a-z0-9_]+/g)?.filter((t) => !STOPWORDS.has(t) && t.length > 1) || [];
}

export function computeIdf(documents) {
  const documentFrequency = new Map();
  documents.forEach((tokens) => {
    new Set(tokens).forEach((term) => documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1));
  });
  const totalDocs = documents.length;
  const idf = new Map();
  documentFrequency.forEach((count, term) => idf.set(term, Math.log((totalDocs + 1) / (count + 1)) + 1));
  return idf;
}

export function tfidfVector(tokens, idf) {
  const termFrequency = new Map();
  tokens.forEach((term) => termFrequency.set(term, (termFrequency.get(term) || 0) + 1));

  const vector = new Map();
  termFrequency.forEach((count, term) => {
    const weight = (count / (tokens.length || 1)) * (idf.get(term) ?? Math.log(2));
    vector.set(term, weight);
  });
  return vector;
}

export function cosineSimilarity(vectorA, vectorB) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  vectorA.forEach((valueA, term) => {
    magA += valueA * valueA;
    if (vectorB.has(term)) dot += valueA * vectorB.get(term);
  });
  vectorB.forEach((valueB) => { magB += valueB * valueB; });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function extractErrorCode(text) {
  const match = (text || "").match(/ERR_[A-Z0-9_]+/i);
  return match ? match[0].toUpperCase() : null;
}
