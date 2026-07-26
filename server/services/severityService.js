/**
 * Module 3: Severity Scoring Engine. Tries real Claude reasoning first (scoreSeverityWithAI);
 * falls back to the deterministic weighted keyword model (scoreSeverity) when no API key is
 * configured or the call fails for any reason.
 */

import { completeJson } from "./llmService.js";

const SEVERITY_SCHEMA = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["P0_CRITICAL", "P1_HIGH", "P2_MEDIUM", "P3_LOW"] },
    reasons: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }
  },
  required: ["severity", "reasons"],
  additionalProperties: false
};

const SEVERITY_SYSTEM_PROMPT = `You are an expert ERP incident triage engineer classifying the business severity of support tickets for systems like SAP, NetSuite, Odoo, and Oracle ERP.

Severity tiers:
- P0_CRITICAL: revenue-blocking, production outage, data loss/corruption, security incident, or payroll/payment processing completely down.
- P1_HIGH: a significant business function is blocked with no workaround (e.g. cannot post invoices, validation failures preventing transactions), affecting some users.
- P2_MEDIUM: degraded functionality, data discrepancies, or an inconvenient bug that has a workaround.
- P3_LOW: cosmetic issue, typo, or minor UI problem with no functional impact.

Classify strictly based on business impact described in the report, not on emotional tone.`;

const SLA_MINUTES_BY_SEVERITY = { P0_CRITICAL: 15, P1_HIGH: 45, P2_MEDIUM: 120, P3_LOW: 240 };

export async function scoreSeverityWithAI(rawText, erpModule) {
  const result = await completeJson({
    system: SEVERITY_SYSTEM_PROMPT,
    prompt: `ERP Module: ${erpModule}\nIncident report: "${rawText}"\n\nClassify the severity.`,
    schema: SEVERITY_SCHEMA
  });

  if (!result) return null;

  return {
    severity: result.severity,
    score: null,
    reasons: result.reasons,
    sla_remaining_minutes: SLA_MINUTES_BY_SEVERITY[result.severity],
    ai_generated: true
  };
}

const SEVERITY_KEYWORDS = {
  P0_CRITICAL: {
    weight: 40,
    terms: ["crash", "deadlock", "outage", "fatal", "down", "halt", "data loss", "corruption",
      "security breach", "payment gateway failure", "cannot process payroll", "system unavailable"]
  },
  P1_HIGH: {
    weight: 25,
    terms: ["cannot post", "blocked", "validation failed", "tax", "billing", "urgent",
      "exception", "timeout", "fails to save", "unable to submit"]
  },
  P2_MEDIUM: {
    weight: 12,
    terms: ["incorrect", "mismatch", "discrepancy", "warning", "slow", "delay", "wrong count", "out of sync"]
  },
  P3_LOW: {
    weight: 5,
    terms: ["typo", "cosmetic", "display", "minor", "label", "spacing", "ui glitch"]
  }
};

const MODULE_BASE_IMPACT = { PAYROLL: 12, INVOICING: 10, GENERAL_LEDGER: 8, INVENTORY: 6, PROCUREMENT: 5 };

function buildResult(severity, score, reasons) {
  return { severity, score, reasons, sla_remaining_minutes: SLA_MINUTES_BY_SEVERITY[severity], ai_generated: false };
}

export function scoreSeverity(rawText, erpModule) {
  const text = (rawText || "").toLowerCase();

  if (/\bp0\b/.test(text)) return buildResult("P0_CRITICAL", 100, ["Explicit P0 mention in report"]);
  if (/\bp1\b/.test(text)) return buildResult("P1_HIGH", 80, ["Explicit P1 mention in report"]);
  if (/\bp3\b/.test(text)) return buildResult("P3_LOW", 10, ["Explicit P3 mention in report"]);

  let score = MODULE_BASE_IMPACT[erpModule] || 4;
  const reasons = [`Base business impact for ${erpModule || "UNKNOWN"} module: ${score}`];

  for (const [tier, { weight, terms }] of Object.entries(SEVERITY_KEYWORDS)) {
    const hit = terms.find((term) => text.includes(term));
    if (hit) {
      score += weight;
      reasons.push(`Matched keyword "${hit}" (+${weight}, ${tier} signal)`);
    }
  }

  let severity = "P3_LOW";
  if (score >= 40) severity = "P0_CRITICAL";
  else if (score >= 25) severity = "P1_HIGH";
  else if (score >= 12) severity = "P2_MEDIUM";

  return buildResult(severity, score, reasons);
}
