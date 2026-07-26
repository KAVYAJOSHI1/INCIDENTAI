/**
 * Enterprise Feature 9: AI Patch Preview & Safety Guardrails.
 */

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
    ]
  };
}
