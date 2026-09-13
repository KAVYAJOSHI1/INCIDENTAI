/**
 * Local read-only MCP adapter — embedded ERP state.
 * =================================================
 * The MCP server (erpMcpServer.js) prefers the real Smart Manufacturing ERP Gateway at
 * :5000. When that gateway is not running (the common case for a self-contained demo),
 * executeMcpToolDirect() falls back to this adapter, which answers the SAME read-only tool
 * names from IncidentAI's own embedded ERP tables (server/db/erp_inventory + erp_transactions).
 *
 * This is genuinely "live" data — it is the current, mutable database state the Digital Twin
 * and the Demo Incident Factory operate on — so MCP evidence stays real. Every response is
 * tagged `source: "embedded"` so the UI can label it "LIVE ERP (embedded)" rather than
 * implying an external enterprise connector.
 */

import { listInventory, listErpTransactions, listErpTransactionsByType } from "../db/store.js";

const TYPE_BY_TOOL = {
  get_purchase_order: "GOODS_RECEIPT",
  get_production_order: "PRODUCTION_RUN_RELEASE",
  get_transaction: null // any type
};

export async function executeLocalMcpTool(toolName, toolArgs = {}, correlationId = null) {
  try {
    switch (toolName) {
      case "get_inventory":
      case "get_product": {
        let inventory = await listInventory();
        if (toolArgs.sku || toolArgs.product_id) {
          const needle = String(toolArgs.sku || toolArgs.product_id).toUpperCase();
          inventory = inventory.filter((r) => r.sku.toUpperCase() === needle);
        }
        return {
          status: 200,
          correlationId,
          data: {
            source: "embedded",
            generated_at: new Date().toISOString(),
            inventory: inventory.map((r) => ({
              warehouse: r.warehouse,
              bin: r.bin,
              sku: r.sku,
              product_name: r.product_name,
              available_qty: r.available_qty,
              reserved_qty: r.reserved_qty,
              reorder_threshold: r.reorder_threshold
            }))
          }
        };
      }

      case "get_transaction":
      case "get_purchase_order":
      case "get_production_order": {
        const type = TYPE_BY_TOOL[toolName];
        const rows = type ? await listErpTransactionsByType(type, 5) : await listErpTransactions(5);
        return {
          status: 200,
          correlationId,
          data: {
            source: "embedded",
            generated_at: new Date().toISOString(),
            transactions: rows.map((r) => ({
              id: r.id,
              type: r.type,
              status: r.status,
              sku: r.sku,
              qty: r.qty,
              reason: r.reason,
              incident_id: r.incident_id,
              metadata: r.metadata,
              created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at
            }))
          }
        };
      }

      case "get_invoice": {
        const rows = await listErpTransactionsByType("INVOICE_POST", 5);
        return {
          status: 200,
          correlationId,
          data: { source: "embedded", generated_at: new Date().toISOString(), invoices: rows.map((r) => ({ id: r.id, status: r.status, reason: r.reason, metadata: r.metadata })) }
        };
      }

      case "get_service_health": {
        return {
          status: 200,
          correlationId,
          data: {
            source: "embedded",
            overall: "NORMAL",
            gateway: "N/A (embedded ERP)",
            services: { inventory: "UP", procurement: "UP", production: "UP", finance: "UP" },
            note: "Embedded ERP state — external Smart Manufacturing ERP Gateway not connected."
          }
        };
      }

      default:
        return { status: 400, error: `Unknown tool for local adapter: ${toolName}`, correlationId };
    }
  } catch (err) {
    return { status: 500, error: `Local ERP adapter error: ${err.message}`, correlationId };
  }
}
