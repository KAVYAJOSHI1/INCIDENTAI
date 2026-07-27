/**
 * Real vector embeddings via Voyage AI (voyage-3.5, 1024 dimensions — matches the
 * `vector(1024)` columns in server/db/schema.sql). Every export degrades gracefully:
 * without VOYAGE_API_KEY, or on any call failure, callers get `null` back and fall
 * through to the existing TF-IDF cosine similarity — pgvector search never breaks
 * the app, it just stops being semantic.
 */

import "../utils/loadEnv.js";
import { createTtlCache } from "../utils/simpleCache.js";

const MODEL = "voyage-3.5";
const OUTPUT_DIMENSION = 1024;
const API_URL = "https://api.voyageai.com/v1/embeddings";

// Query embeddings repeat often (search-as-you-type, duplicate checks against the
// same shortlist) — cache briefly so we don't re-embed identical text.
const embedCache = createTtlCache(60_000);

export function isEmbeddingConfigured() {
  return Boolean(process.env.VOYAGE_API_KEY);
}

async function callVoyage(inputs, inputType) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ input: inputs, model: MODEL, input_type: inputType, output_dimension: OUTPUT_DIMENSION })
  });

  if (!response.ok) {
    throw new Error(`Voyage API returned ${response.status}: ${await response.text()}`);
  }

  const body = await response.json();
  return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/**
 * Embeds a single query string (e.g. a live search box or duplicate-check candidate
 * text). Returns null if the LLM/embeddings provider is unavailable or the call fails.
 */
export async function embedQuery(text) {
  if (!isEmbeddingConfigured() || !text?.trim()) return null;

  const cached = embedCache.get(text);
  if (cached !== undefined) return cached;

  try {
    const [vector] = await callVoyage([text], "query");
    embedCache.set(text, vector);
    return vector;
  } catch (err) {
    console.warn(`[embeddingService] embedQuery failed, falling back to TF-IDF: ${err.message}`);
    return null;
  }
}

/**
 * Embeds one or more documents (ticket descriptions, KB articles) for storage.
 * Returns null (caller stores no embedding, TF-IDF still applies at query time)
 * on any failure.
 */
export async function embedDocuments(texts) {
  if (!isEmbeddingConfigured() || texts.length === 0) return null;

  try {
    return await callVoyage(texts, "document");
  } catch (err) {
    console.warn(`[embeddingService] embedDocuments failed: ${err.message}`);
    return null;
  }
}

export function toVectorLiteral(embedding) {
  return embedding ? `[${embedding.join(",")}]` : null;
}
