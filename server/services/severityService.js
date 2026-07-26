/**
 * Module 3: Severity Scoring Engine — weighted keyword + business-impact model producing P0-P3.
 */

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

const SLA_MINUTES_BY_SEVERITY = { P0_CRITICAL: 15, P1_HIGH: 45, P2_MEDIUM: 120, P3_LOW: 240 };

function buildResult(severity, score, reasons) {
  return { severity, score, reasons, sla_remaining_minutes: SLA_MINUTES_BY_SEVERITY[severity] };
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
