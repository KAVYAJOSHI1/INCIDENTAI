/**
 * Enterprise Feature 9: AI Patch Preview & Safety Guardrails. Tries real Claude reasoning
 * first (buildPatchPreviewWithAI); falls back to the deterministic heuristic (buildPatchPreview)
 * when no API key is configured, there's no patch to review, or the call fails.
 */

import { completeJson } from "./llmService.js";

const RISK_BASE_BY_SEVERITY = { P0_CRITICAL: 55, P1_HIGH: 35, P2_MEDIUM: 18, P3_LOW: 8 };
const FINANCIAL_MODULES = ["PAYROLL", "GENERAL_LEDGER"];

export function buildPatchPreview(ticket) {
  const patch = ticket.ai_suggested_patch || "";
  const affectedTables = [...new Set([...patch.matchAll(/\b(?:UPDATE|FROM|INTO|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)].map((m) => m[1]))];

  const estimatedSuccessPercentage = Math.round((ticket.ai_confidence ?? 0.7) * 100);
  const touchesFinancialData = FINANCIAL_MODULES.includes(ticket.erp_module);
  const riskScore = Math.min(95, (RISK_BASE_BY_SEVERITY[ticket.severity] ?? 20) + (touchesFinancialData ? 15 : 0));
  const riskLevel = riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW";

  return {
    ticket_id: ticket.id,
    affected_tables: affectedTables.length ? affectedTables : ["(no table detected — review manually)"],
    estimated_success_percentage: estimatedSuccessPercentage,
    risk_score: riskScore,
    risk_level: riskLevel,
    rollback_plan: `Snapshot affected rows before executing; on failure, restore ${affectedTables[0] || "the target table"} from the pre-patch backup and reopen ${ticket.ticket_number}.`,
    side_effect_warnings: [
      ...(touchesFinancialData ? ["Touches financial ledger/payroll data — requires dual sign-off before execution."] : []),
      "Run against a staging replica first to validate row counts before production execution."
    ],
    execution_steps: [
      "Take a row-level snapshot of affected table(s)",
      "Execute patch in staging environment",
      "Verify row count and constraint checks pass",
      "Execute in production during a low-traffic window",
      "Monitor error rate for 15 minutes post-deploy"
    ],
    ai_generated: false
  };
}

const PATCH_SCHEMA = {
  type: "object",
  properties: {
    affected_tables: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
    estimated_success_percentage: { type: "number" },
    risk_score: { type: "number" },
    risk_level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    rollback_plan: { type: "string" },
    side_effect_warnings: { type: "array", items: { type: "string" }, maxItems: 4 },
    execution_steps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 7 }
  },
  required: ["affected_tables", "estimated_success_percentage", "risk_score", "risk_level", "rollback_plan", "side_effect_warnings", "execution_steps"],
  additionalProperties: false
};

const PATCH_SYSTEM_PROMPT = `You are a senior ERP database engineer reviewing an AI-suggested SQL patch before it is executed against production. Given the patch and ticket context, identify the affected tables, estimate a realistic success percentage and risk score (0-100)/level (considering whether it touches financial or payroll data), write a concrete rollback plan, list any side-effect warnings, and lay out ordered execution steps a developer should follow. Be specific and grounded in the actual patch shown, not generic boilerplate.`;

/**
 * Asks Claude to review the actual suggested patch SQL. Returns null (caller falls back to
 * buildPatchPreview) if there's no patch to review, the LLM is unavailable, or the call fails.
 */
export async function buildPatchPreviewWithAI(ticket) {
  const patch = ticket.ai_suggested_patch || "";
  if (!patch.trim()) return null;

  const result = await completeJson({
    system: PATCH_SYSTEM_PROMPT,
    prompt: `Ticket: "${ticket.title}" (${ticket.ticket_number})\nSeverity: ${ticket.severity}\nERP Module: ${ticket.erp_module}\nAI confidence: ${
      ticket.ai_confidence ?? "unknown"
    }\n\nSuggested patch:\n${patch}\n\nAssess this patch.`,
    schema: PATCH_SCHEMA,
    maxTokens: 600
  });

  if (!result) return null;

  return {
    ticket_id: ticket.id,
    affected_tables: result.affected_tables,
    estimated_success_percentage: Math.round(result.estimated_success_percentage),
    risk_score: Math.round(result.risk_score),
    risk_level: result.risk_level,
    rollback_plan: result.rollback_plan,
    side_effect_warnings: result.side_effect_warnings,
    execution_steps: result.execution_steps,
    ai_generated: true
  };
}
