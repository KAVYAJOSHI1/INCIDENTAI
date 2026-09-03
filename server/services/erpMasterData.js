/**
 * Embedded ERP master data for the Digital Twin display panels.
 *
 * This is SEEDED demo content (orders / shop-floor telemetry / procurement) — it is
 * served from the backend so the frontend renders from an API rather than from
 * frontend-only constants, but it is honestly labelled as seeded, not "live".
 * Inventory is the exception: it is real, mutable database state (erpInventoryService).
 */

export function getErpMasterData() {
  return {
    is_seeded_display_data: true,
    note: "Orders, telemetry and procurement below are seeded demo records. Inventory is real, mutable DB state.",
    orders: [
      { order_id: "SO-1092", customer: "Acme Corp", type: "SALES_ORDER", total_amount: 14500.0, status: "SYNC_FAILED", error_code: "ERR_ORDER_SYNC" },
      { order_id: "SO-1093", customer: "Tesla Energy Supply", type: "SALES_ORDER", total_amount: 48900.0, status: "PROCESSING", error_code: null }
    ],
    production: [
      { line: "Assembly Line 1", node: "CNC-Rotary-04", temperature_c: 94.2, vibration_hz: 184, work_order: "WO-4402", status: "TELEMETRY_CRITICAL", error_code: "ERR_MACHINE_HEALTH" },
      { line: "SMT Line 2", node: "SMT-PickPlace-01", temperature_c: 42.0, vibration_hz: 12, work_order: "WO-4405", status: "RUNNING", error_code: null }
    ],
    procurement: [
      { po: "PO-9041", supplier: "Apex Engineering Ltd", items: 5, total_value: 125000.0, submitted_by: "David Kim", status: "VALIDATION_FAILED", error_code: "ERR_PO_VALIDATION" },
      { po: "PO-9042", supplier: "Global Silicon Supplies", items: 12, total_value: 34000.0, submitted_by: "Sarah Connor", status: "APPROVED", error_code: null }
    ],
    generated_at: new Date().toISOString()
  };
}
