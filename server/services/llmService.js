/**
 * Provider-agnostic LLM integration. Tries Anthropic first (if ANTHROPIC_API_KEY or
 * ANTHROPIC_AUTH_TOKEN is set), then falls back to Groq (if GROQ_API_KEY is set) on
 * either a missing Anthropic key or an Anthropic call failure. Every export here degrades
 * gracefully: if neither provider is configured, or every configured provider fails, the
 * caller gets `null` back and falls through to the existing rule-based logic — the app
 * never breaks because AI is unavailable, it just stops being AI-reasoned.
 */

import "../utils/loadEnv.js";
import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

let anthropicClient = null;
let groqClient = null;

function hasAnthropic() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function hasGroq() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function isLlmConfigured() {
  return hasAnthropic() || hasGroq();
}

function getAnthropicClient() {
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

function getGroqClient() {
  if (!groqClient) groqClient = new Groq();
  return groqClient;
}

function extractText(message) {
  const block = message.content.find((b) => b.type === "text");
  return block?.text ?? null;
}

/**
 * Structured classification/generation constrained to a JSON schema. Returns the parsed
 * object, or null if no provider is configured, every configured provider fails, or the
 * response refuses / can't be parsed.
 *
 * Anthropic gets the schema via output_config.format (guaranteed-valid JSON). Groq's
 * structured-outputs support varies by model, so it instead uses the widely-supported
 * response_format: { type: "json_object" } with the schema described in the system prompt.
 */
export async function completeJson({ system, prompt, schema, maxTokens = 1024, effort = "low" }) {
  if (hasAnthropic()) {
    try {
      const message = await getAnthropicClient().messages.create({
        model: ANTHROPIC_MODEL,
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
      if (text) return JSON.parse(text);
    } catch (err) {
      console.warn(`[llmService] Anthropic completeJson failed: ${err.message}`);
    }
    if (!hasGroq()) return null;
  }

  if (hasGroq()) {
    try {
      const completion = await getGroqClient().chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${system}\n\nRespond with ONLY a single valid JSON object matching this JSON Schema, and nothing else:\n${JSON.stringify(schema)}`
          },
          { role: "user", content: prompt }
        ]
      });

      const text = completion.choices[0]?.message?.content;
      if (text) return JSON.parse(text);
    } catch (err) {
      console.warn(`[llmService] Groq completeJson failed, falling back to rule-based logic: ${err.message}`);
    }
  }

  return null;
}

/**
 * Free-form conversational completion (e.g. the developer copilot chat). Returns the
 * reply text, or null if no provider is configured or every configured provider fails.
 */
export async function completeText({ system, messages, maxTokens = 1024, effort = "low" }) {
  if (hasAnthropic()) {
    try {
      const message = await getAnthropicClient().messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system,
        output_config: { effort },
        messages
      });

      if (message.stop_reason === "refusal") return null;
      const text = extractText(message);
      if (text) return text;
    } catch (err) {
      console.warn(`[llmService] Anthropic completeText failed: ${err.message}`);
    }
    if (!hasGroq()) return null;
  }

  if (hasGroq()) {
    try {
      const completion = await getGroqClient().chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, ...messages]
      });

      return completion.choices[0]?.message?.content ?? null;
    } catch (err) {
      console.warn(`[llmService] Groq completeText failed, falling back to rule-based logic: ${err.message}`);
    }
  }

  return null;
}

/**
 * Streaming conversational completion. Invokes `onChunk(text)` as tokens arrive, then
 * returns the full reply text — or null if no provider is configured or every configured
 * provider fails (before or after streaming began).
 */
export async function streamText({ system, messages, maxTokens = 768, effort = "low", onChunk }) {
  if (hasAnthropic()) {
    let emittedAny = false;
    try {
      const stream = getAnthropicClient().messages.stream({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system,
        output_config: { effort },
        messages
      });

      stream.on("text", (delta) => {
        emittedAny = true;
        onChunk(delta);
      });

      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") return null;
      return extractText(final);
    } catch (err) {
      console.warn(`[llmService] Anthropic streamText failed: ${err.message}`);
      // If tokens already reached the caller, don't stitch a second provider's reply onto
      // a partial one — that would read as a garbled mid-sentence response.
      if (emittedAny || !hasGroq()) return null;
    }
  }

  if (hasGroq()) {
    try {
      const stream = await getGroqClient().chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: "system", content: system }, ...messages]
      });

      let full = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk(delta);
        }
      }
      return full || null;
    } catch (err) {
      console.warn(`[llmService] Groq streamText failed, falling back to rule-based logic: ${err.message}`);
      return null;
    }
  }

  return null;
}
