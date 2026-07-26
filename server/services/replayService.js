/**
 * Enterprise Feature 8: Incident Replay Engine — step-by-step playback from user action to resolution.
 */

function extractPrimaryTable(sqlPatch) {
  const match = (sqlPatch || "").match(/\b(?:UPDATE|FROM|INTO|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  return match ? match[1] : "target table";
}

export function buildIncidentReplay(ticket) {
  const steps = [
    { id: "user_action", label: "User Action", detail: ticket.reproduction_steps?.at(-1) || ticket.vague_user_input || "User performed a standard ERP transaction" },
    { id: "api_call", label: "API Call", detail: `POST /api/${String(ticket.erp_module).toLowerCase()}/${ticket.ocr_findings?.detected_ui_component || "action"}` },
    { id: "sql_query", label: "SQL Query", detail: `Query against \`${extractPrimaryTable(ticket.ai_suggested_patch)}\`` },
    { id: "erp_service", label: "ERP Service", detail: `${ticket.erp_module} service layer` },
    { id: "failure_point", label: "Failure Point", detail: ticket.ocr_findings?.extracted_error_code || "Unclassified exception" },
    { id: "ai_diagnosis", label: "AI Diagnosis", detail: ticket.ai_root_cause },
    { id: "resolution", label: "Resolution", detail: ticket.resolved_at ? ticket.ai_suggested_patch : "Pending execution" }
  ];

  return { ticket_id: ticket.id, steps };
}
