/**
 * Real vector embeddings via Voyage AI (voyage-3.5, 1024 dimensions — matches the
 * `vector(1024)` columns in server/db/schema.sql). Every export degrades gracefully:
 * without VOYAGE_API_KEY, or on any call failure, callers get `null` back and fall
 * through to the existing TF-IDF cosine similarity — pgvector search never breaks
 * the app, it just stops being semantic.
 */

import "../utils/loadEnv.js";
import { createTtlCache } from "../utils/simpleCache.js";

const MODEL = process.env.VOYAGE_MODEL || "voyage-3";
const OUTPUT_DIMENSION = 1024;
const API_URL = "https://api.voyageai.com/v1/embeddings";

// Query embeddings repeat often (search-as-you-type, duplicate checks against the
// same shortlist) — cache briefly so we don't re-embed identical text.
const embedCache = createTtlCache(60_000);

export function isEmbeddingConfigured() {
  return Boolean(process.env.VOYAGE_API_KEY);
}

// Retries default to 0 (like the LLM clients in llmService) so a rate-limited / down
// provider fails fast to the TF-IDF fallback instead of stalling ingestion + reset with
// back-off sleeps. Override with VOYAGE_MAX_RETRIES when the provider has real headroom.
const MAX_RETRIES = Number(process.env.VOYAGE_MAX_RETRIES ?? 0);
const REQUEST_TIMEOUT_MS = Number(process.env.VOYAGE_TIMEOUT_MS ?? 4000);

async function callVoyage(inputs, inputType, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: inputs, model: MODEL, input_type: inputType, output_dimension: OUTPUT_DIMENSION }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (response.ok) {
      const body = await response.json();
      return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }

    if (response.status === 429 && attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    throw new Error(`Voyage API returned ${response.status}: ${await response.text()}`);
  }
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
