/**
 * Patch Service
 * Generates patch diff previews and manages patch metadata.
 */

import { getTicketById } from "../db/store.js";
import { getRemediationForTicket } from "./remediationService.js";

export async function getPatchPreviewForTicket(ticketId) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return null;

  const remediation = await getRemediationForTicket(ticketId);

  const file = ticket.ocr_findings?.detected_component ? `inventory/${ticket.ocr_findings.detected_component.toLowerCase()}.js` : "inventory/binTransfer.js";
  const func = "validateStockQuantity()";
  const reason = "Prevent stale inventory cache data from being used during stock quantity validation.";

  const diffLines = [
    { type: "header", text: "@@ -42,7 +42,7 @@ function validateStockQuantity(binId, qty) {" },
    { type: "context", text: "   const bin = await binRepository.findById(binId);" },
    { type: "removed", text: "-  const stock = inventoryCache.get(binId);" },
    { type: "added", text: "+  const stock = await inventoryService.getFreshStock(binId);" },
    { type: "context", text: "   if (stock < qty) {" },
    { type: "context", text: "     throw new InventoryValidationError('ERR_STOCK_NEG');" },
    { type: "context", text: "   }" }
  ];

  return {
    ticket_id: ticketId,
    ticket_number: ticket.ticket_number || ticketId,
    file,
    function: func,
    reason,
    diff_lines: diffLines,
    raw_diff: diffLines.map((l) => l.text).join("\n"),
    risk_level: remediation?.risk_level || "MEDIUM",
    confidence: remediation?.confidence || 0.65,
    confidence_percentage: remediation?.confidence_percentage || "65%",
    status: remediation?.status || "PROPOSED"
  };
}
