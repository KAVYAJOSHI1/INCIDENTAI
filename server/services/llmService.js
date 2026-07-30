/**
 * Real Claude API integration. Every export here degrades gracefully: if no API key is
 * configured, or a call fails for any reason (auth, rate limit, refusal, network), the
 * caller gets `null` back and falls through to the existing rule-based logic — the app
 * never breaks because the AI is unavailable, it just stops being AI-reasoned.
 */

import "../utils/loadEnv.js";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";

let client = null;

export function isLlmConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

function extractText(message) {
  const block = message.content.find((b) => b.type === "text");
  return block?.text ?? null;
}

/**
 * Structured classification/generation constrained to a JSON schema. Returns the parsed
 * object, or null if the LLM is unavailable, refuses, or returns something unparseable.
 */
export async function completeJson({ system, prompt, schema, maxTokens = 1024, effort = "low" }) {
  if (!isLlmConfigured()) return null;

  try {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      output_config: {
        effort,
        format: { type: "json_schema", schema }
      },
      messages: [{ role: "user", content: prompt }]
    });

    if (message.stop_reason === "refusal") return null;

    const text = extractText(message);
    if (!text) return null;

    return JSON.parse(text);
  } catch (err) {
    console.warn(`[llmService] completeJson failed, falling back to rule-based logic: ${err.message}`);
    return null;
  }
}

/**
 * Free-form conversational completion (e.g. the developer copilot chat). Returns the
 * reply text, or null on any failure.
 */
export async function completeText({ system, messages, maxTokens = 1024, effort = "low" }) {
  if (!isLlmConfigured()) return null;

  try {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      output_config: { effort },
      messages
    });

    if (message.stop_reason === "refusal") return null;
    return extractText(message);
  } catch (err) {
    console.warn(`[llmService] completeText failed, falling back to rule-based logic: ${err.message}`);
    return null;
  }
}

/**
 * Streaming conversational completion. Invokes `onChunk(text)` as tokens arrive, then
 * returns the full reply text — or null on any failure (before or after streaming began).
 */
export async function streamText({ system, messages, maxTokens = 768, effort = "low", onChunk }) {
  if (!isLlmConfigured()) return null;

  try {
    const stream = getClient().messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      output_config: { effort },
      messages
    });

    stream.on("text", (delta) => onChunk(delta));

    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") return null;

    return extractText(final);
  } catch (err) {
    console.warn(`[llmService] streamText failed, falling back to rule-based logic: ${err.message}`);
    return null;
  }
}
