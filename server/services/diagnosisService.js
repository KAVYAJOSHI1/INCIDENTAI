/**
 * Phase 6: RAG + MCP + LLM Evidence-Grounded Incident Diagnosis Engine.
 * 
 * Architecture Rules:
 * 1. RAG = Historical Knowledge (What happened before?)
 * 2. MCP = Live ERP Facts (What is happening now?)
 * 3. LLM = Evidence-Grounded Diagnosis (What does the evidence mean?)
 * 4. Self-Service is permitted ONLY when confidence >= 0.85, severity is P2-P4,
 *    and live MCP facts do not contradict historical resolution.
 * 5. Degrades gracefully if LLM, RAG, or MCP services fail.
 */

import "../utils/loadEnv.js";
import { completeJson } from "./llmService.js";
import { executeMcpToolDirect } from "../mcp/erpMcpServer.js";
import crypto from "node:crypto";

/**
 * Determines and executes required read-only MCP tools based on incident module context.
 */
export async function collectMcpEvidence(incident, correlationId) {
  const module = (incident.erp_module || incident.erp_context?.module || "").toUpperCase();
  const recordId = incident.erp_context?.record_id || null;
  const traceId = correlationId || `diag-mcp-${crypto.randomUUID()}`;

  const toolsToRun = [];

  if (module.includes("FINANCE") || module.includes("INVOIC") || module.includes("LEDGER") || module.includes("PAYABLE")) {
    toolsToRun.push({ name: "get_invoice", args: recordId ? { id: recordId } : {} });
    toolsToRun.push({ name: "get_transaction", args: recordId ? { id: recordId } : {} });
    toolsToRun.push({ name: "get_service_health", args: {} });
  } else if (module.includes("INVENTORY") || module.includes("STOCK") || module.includes("WAREHOUSE")) {
    toolsToRun.push({ name: "get_inventory", args: {} });
    toolsToRun.push({ name: "get_product", args: {} });
    toolsToRun.push({ name: "get_service_health", args: {} });
  } else if (module.includes("PROCURE") || module.includes("PURCHAS")) {
    toolsToRun.push({ name: "get_purchase_order", args: recordId ? { id: recordId } : {} });
    toolsToRun.push({ name: "get_service_health", args: {} });
  } else if (module.includes("PRODUCT") || module.includes("MANUFACT") || module.includes("SHOP")) {
    toolsToRun.push({ name: "get_production_order", args: {} });
    toolsToRun.push({ name: "get_inventory", args: {} });
    toolsToRun.push({ name: "get_product", args: {} });
    toolsToRun.push({ name: "get_service_health", args: {} });
  } else {
    toolsToRun.push({ name: "get_service_health", args: {} });
  }

  const results = [];
  for (const t of toolsToRun) {
    try {
      const res = await executeMcpToolDirect(t.name, t.args, traceId);
      if (res.status === 200) {
        results.push({
          tool: t.name,
          status: 200,
          label: "LIVE ERP FACTS",
          source: res.source || "gateway",
          source_label: res.source === "embedded" ? "LIVE ERP (embedded)" : "LIVE ERP (gateway)",
          data: res.data,
          correlationId: res.correlationId
        });
      } else {
        results.push({
          tool: t.name,
          status: res.status,
          label: "LIVE ERP VERIFICATION UNAVAILABLE",
          error: res.error || `HTTP ${res.status}`,
          correlationId: res.correlationId
        });
      }
    } catch (err) {
      results.push({
        tool: t.name,
        status: 500,
        label: "LIVE ERP VERIFICATION UNAVAILABLE",
        error: err.message,
        correlationId: traceId
      });
    }
  }

  return results;
}

/**
 * Formats historical RAG knowledge base matches into clean evidence structures.
 */
export function formatRagEvidence(ragKbMatches = []) {
  return ragKbMatches.map((m) => {
    const art = m.article || {};
    return {
      title: art.title || "Historical KB Entry",
      similarity_score: m.score || 0,
      confidence_percentage: m.confidence_percentage || Math.round((m.score || 0) * 100),
      problem: art.problem || art.summary || null,
      root_cause: art.root_cause || null,
      verified_resolution: art.verified_resolution || art.solution || "No resolution documented",
      is_verified: Boolean(art.is_verified ?? true),
      erp_module: art.erp_module || art.category || "GENERAL",
      label: "HISTORICAL KNOWLEDGE"
    };
  });
}

const DIAGNOSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    root_cause: { type: "string" },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: "string", enum: ["MCP", "RAG", "INFERENCE"] },
          fact: { type: "string" }
        },
        required: ["source", "fact"]
      }
    },
    recommended_resolution: { type: "string" },
    confidence: { type: "number" },
    resolution_type: { type: "string", enum: ["SELF_SERVICE", "DEVELOPER", "HUMAN_REVIEW"] },
    requires_human_review: { type: "boolean" },
    reason: { type: "string" }
  },
  required: [
    "root_cause",
    "evidence",
    "recommended_resolution",
    "confidence",
    "resolution_type",
    "requires_human_review",
    "reason"
  ]
};

/**
 * Executes evidence-grounded incident diagnosis using RAG, MCP, and LLM.
 */
export async function performEvidenceGroundedDiagnosis({
  incident,
  ragKbMatches = [],
  correlationId = null
}) {
  const traceId = correlationId || `diag-${crypto.randomUUID()}`;

  // 1. Collect Live ERP Evidence via Selective MCP Execution
  const mcpEvidence = await collectMcpEvidence(incident, traceId);

  // 2. Format Historical Knowledge RAG Evidence
  const ragEvidence = formatRagEvidence(ragKbMatches);

  // 3. Prepare Prompt context
  const systemPrompt = `You are the IncidentAI Senior Intelligence Engine for a Smart Manufacturing ERP platform.
You produce strict, evidence-grounded root-cause diagnosis and resolution recommendations.

CRITICAL GROUNDING & SAFETY RULES:
1. Base your reasoning ONLY on the provided evidence sections:
   - [LIVE ERP FACTS]: Real-time system state fetched directly via read-only MCP tools right now.
   - [HISTORICAL KNOWLEDGE]: Historical incident resolutions and knowledge base articles from RAG vector search.
2. LIVE ERP FACTS represent what is happening NOW in the ERP.
3. HISTORICAL KNOWLEDGE represents what happened BEFORE.
4. Do NOT apply a historical resolution if LIVE ERP FACTS contradict it or show a different failure state.
5. Never invent ERP records, transactions, or state. Do not claim an MCP tool was executed if it is not in the live list.
6. Clearly distinguish facts from inference.
7. If evidence is conflicting, low confidence, or incomplete, mark requires_human_review: true.
8. NEVER recommend automatic execution of unsafe production database writes.
9. Resolution type guidelines:
   - SELF_SERVICE: Permitted ONLY if confidence >= 0.85, incident severity is NOT P0/P1, resolution is safe for end user, and live ERP state confirms applicability.
   - DEVELOPER: Code/schema bug, unexpected system crash, or required developer patch.
   - HUMAN_REVIEW: Low confidence or conflicting evidence.`;

  const userPrompt = `[CURRENT INCIDENT DETAILS]
Ticket ID: ${incident.id || incident.ticket_number || "NEW-INCIDENT"}
Module: ${incident.erp_module || "GENERAL"}
Title: ${incident.title || "ERP Error"}
User Description: ${incident.vague_user_input || incident.title || ""}
Extracted Error Code: ${incident.ocr_findings?.extracted_error_code || "UNKNOWN_ERR"}
UI Component: ${incident.ocr_findings?.detected_ui_component || "Unknown"}
ERP Context Metadata: ${JSON.stringify(incident.erp_context || {})}
Severity: ${incident.severity || "P2"}

[LIVE ERP FACTS (MCP Live Tool Output)]
${JSON.stringify(mcpEvidence, null, 2)}

[HISTORICAL KNOWLEDGE (RAG Database Matches)]
${JSON.stringify(ragEvidence, null, 2)}

[DUPLICATE DETECTION CONTEXT]
Is Duplicate: ${incident.duplicate_check?.is_duplicate ?? false}
Similarity Score: ${incident.duplicate_check?.similarity_score ?? 0}
Reasoning: ${incident.duplicate_check?.reasoning || "None"}

[TASK]
Analyze the incident, live ERP facts, and historical knowledge. Output a single JSON object strictly adhering to the JSON schema.`;

  // 4. Invoke Provider-Agnostic LLM Engine
  let aiDiagnosis = await completeJson({
    system: systemPrompt,
    prompt: userPrompt,
    schema: DIAGNOSIS_JSON_SCHEMA,
    maxTokens: 1024
  });

  // 5. Fallback & Rule-Based Degradation Engine
  if (!aiDiagnosis) {
    console.warn(`[diagnosisService] LLM diagnosis unavailable or failed schema validation. Applying evidence-grounded rule-based fallback.`);
    aiDiagnosis = generateFallbackDiagnosis(incident, mcpEvidence, ragEvidence);
  }

  // 6. Safety & RBAC Guardrail Policy Override
  aiDiagnosis = applySafetyGuardrails(incident, aiDiagnosis, mcpEvidence, ragEvidence);

  return {
    correlation_id: traceId,
    mcp_evidence: mcpEvidence,
    rag_evidence: ragEvidence,
    ai_diagnosis: aiDiagnosis
  };
}

/**
 * Safety Guardrails Policy Override
 */
function applySafetyGuardrails(incident, diagnosis, mcpEvidence, ragEvidence) {
  const result = { ...diagnosis };

  // Guardrail 1: P0/P1 High-Severity Incidents MUST NEVER be SELF_SERVICE
  // (severity arrives as "P0_CRITICAL" / "P1_HIGH" / "P2_MEDIUM" — match on the prefix).
  const sev = (incident.severity || "P2").toUpperCase().split("_")[0];
  if ((sev === "P0" || sev === "P1") && result.resolution_type === "SELF_SERVICE") {
    result.resolution_type = "DEVELOPER";
    result.requires_human_review = true;
    result.reason = `Severity ${sev} critical incidents require developer triage and cannot be resolved via automated self-service.`;
  }

  // Guardrail 2: Low Confidence Forces Human Review
  if (result.confidence < 0.85 && result.resolution_type === "SELF_SERVICE") {
    result.resolution_type = "HUMAN_REVIEW";
    result.requires_human_review = true;
    result.reason = `Confidence score (${Math.round(result.confidence * 100)}%) is below the safe self-service threshold (85%).`;
  }

  // Guardrail 3: Live MCP State Errors Downgrade Self-Service
  const hasMcpErrors = mcpEvidence.some((e) => e.status !== 200);
  if (hasMcpErrors && result.resolution_type === "SELF_SERVICE") {
    result.resolution_type = "DEVELOPER";
    result.requires_human_review = true;
    result.reason = `Live ERP state verification experienced service errors or unavailable endpoints. Recommending developer triage.`;
  }

  return result;
}

/**
 * Rule-Based Fallback Diagnosis when LLM engine is offline
 */
function generateFallbackDiagnosis(incident, mcpEvidence, ragEvidence) {
  const topRag = ragEvidence.find((r) => r.is_verified) || ragEvidence[0];
  const liveHealth = mcpEvidence.find((e) => e.tool === "get_service_health");
  const isHealthy = liveHealth?.status === 200 && liveHealth?.data?.overall !== "DOWN";

  const facts = [];

  if (liveHealth) {
    facts.push({
      source: "MCP",
      fact: `Live ERP Service Health: Gateway is ${liveHealth.data?.gateway || "UP"}, overall state is ${liveHealth.data?.overall || "NORMAL"}.`
    });
  } else {
    facts.push({
      source: "MCP",
      fact: "Live ERP verification was unavailable."
    });
  }

  if (topRag) {
    facts.push({
      source: "RAG",
      fact: `Historical KB Match (${Math.round(topRag.similarity_score * 100)}% match): "${topRag.title}" — ${topRag.verified_resolution}`
    });
  }

  const confidence = topRag && topRag.similarity_score > 0.8 ? 0.82 : 0.65;
  const sevPrefix = (incident.severity || "P2").toUpperCase().split("_")[0];
  const isP0P1 = sevPrefix === "P0" || sevPrefix === "P1";

  let resolutionType = "DEVELOPER";
  if (topRag && topRag.similarity_score >= 0.85 && isHealthy && !isP0P1 && topRag.is_verified) {
    resolutionType = "SELF_SERVICE";
  }

  return {
    root_cause: topRag?.root_cause || `Unexpected validation or execution exception in ${incident.erp_module || "ERP"} module (${incident.ocr_findings?.extracted_error_code || "ERR"}).`,
    evidence: facts,
    recommended_resolution: topRag?.verified_resolution || `Review ${incident.erp_module || "ERP"} configuration and retry transaction. If issue persists, escalate to developer on-call.`,
    confidence,
    resolution_type: resolutionType,
    requires_human_review: resolutionType !== "SELF_SERVICE",
    reason: resolutionType === "SELF_SERVICE"
      ? "Verified historical resolution matches incident pattern and live ERP system state is operational."
      : "Rule-based fallback: Automated diagnosis requires human/developer review."
  };
}
