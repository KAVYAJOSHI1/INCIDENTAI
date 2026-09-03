/**
 * Patch Service
 * Generates an illustrative patch diff preview for the current incident. The file,
 * function and rationale are derived from this incident's dependency tree; the diff
 * body is a representative simulation (clearly labelled) of the recommended change.
 */

import { getTicketById } from "../db/store.js";
import { getRemediationForTicket } from "./remediationService.js";
import { buildDependencyTree } from "./rootCauseTreeService.js";

export async function getPatchPreviewForTicket(ticketId) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const remediation = await getRemediationForTicket(ticketId);
  const tree = buildDependencyTree(ticket);

  const file = remediation?.affected_component || tree.nodes.find((n) => n.type === "file")?.label || `${(ticket.erp_module || "core").toLowerCase()}/handler.js`;
  const func = remediation?.affected_function || tree.nodes.find((n) => n.type === "function")?.label || "handleTransaction()";
  const table = remediation?.affected_table || tree.nodes.find((n) => n.type === "database_table")?.label || "erp_transaction_log";
  const errCode = remediation?.error_code || ticket.ocr_findings?.extracted_error_code || "ERR_UNCLASSIFIED";
  const reason = remediation?.recommended_remediation
    ? `Recommended: ${remediation.recommended_remediation}`
    : `Harden ${func} against the condition that triggers ${errCode}.`;

  const diffLines = [
    { type: "header", text: `@@ ${file} — ${func} @@` },
    { type: "context", text: `   // Guard added to prevent ${errCode}` },
    { type: "removed", text: `-  const record = cache.get(key);` },
    { type: "added", text: `+  const record = await ${table.split("_")[0]}Repository.getFresh(key);` },
    { type: "context", text: `   if (!isValid(record)) {` },
    { type: "context", text: `     throw new ValidationError('${errCode}');` },
    { type: "context", text: `   }` }
  ];

  return {
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number || ticket.id,
    file,
    function: func,
    reason,
    is_illustrative: true,
    diff_lines: diffLines,
    raw_diff: diffLines.map((l) => l.text).join("\n"),
    risk_level: remediation?.risk_level || "MEDIUM",
    confidence: remediation?.confidence ?? null,
    confidence_percentage: remediation?.confidence_percentage || "Unavailable",
    current_version: remediation?.current_version || "v1.0.0",
    target_version: remediation?.target_version || "v1.0.1",
    status: remediation?.status || "PROPOSED"
  };
}
