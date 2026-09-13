/**
 * Seed data for Smart Manufacturing ERP & IncidentAI Platform.
 * Mirroring enterprise schema with realistic connected seed records.
 */

export const developers = [
  {
    id: "dev_01",
    name: "Alex Mercer",
    role: "Senior SAP ABAP Specialist",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    skills: ["SAP ABAP", "PostgreSQL", "Accounting Logic", "General Ledger"],
    erp_modules: ["INVOICING", "GENERAL_LEDGER", "ORDERS"],
    active_tickets: 3,
    max_capacity: 5,
    historical_mttr_hours: 2.8,
    on_call: true,
    performance_score: 98.4
  },
  {
    id: "dev_02",
    name: "Sarah Jenkins",
    role: "Python / Odoo ERP Lead",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    skills: ["Python", "Odoo ORM", "Payroll Engine", "Tax Engine", "Telemetry"],
    erp_modules: ["PAYROLL", "INVOICING", "PRODUCTION"],
    active_tickets: 1,
    max_capacity: 5,
    historical_mttr_hours: 1.9,
    on_call: true,
    performance_score: 96.8
  },
  {
    id: "dev_03",
    name: "Marcus Vance",
    role: "Database & NetSuite Architect",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    skills: ["PostgreSQL", "SQL Tuning", "Inventory Indexing", "NetSuite SuiteScript", "Auth"],
    erp_modules: ["INVENTORY", "PROCUREMENT", "AUTH"],
    active_tickets: 4,
    max_capacity: 5,
    historical_mttr_hours: 3.5,
    on_call: false,
    performance_score: 94.2
  },
  {
    id: "dev_04",
    name: "Priya Sharma",
    role: "Oracle Financials Developer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    skills: ["Oracle PL/SQL", "General Ledger", "Audit Compliance", "REST API"],
    erp_modules: ["GENERAL_LEDGER", "PROCUREMENT"],
    active_tickets: 2,
    max_capacity: 5,
    historical_mttr_hours: 2.4,
    on_call: true,
    performance_score: 97.5
  },
  {
    id: "dev_05",
    name: "Devi Developer",
    role: "Fullstack & AI Automation Lead",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Devi",
    skills: ["PostgreSQL", "Node.js", "React", "AI Pipelines", "ERP Systems"],
    erp_modules: ["INVOICING", "PAYROLL", "INVENTORY", "GENERAL_LEDGER"],
    active_tickets: 2,
    max_capacity: 5,
    historical_mttr_hours: 1.5,
    on_call: true,
    performance_score: 99.2
  }
];

/**
 * Canonical embedded-ERP inventory baseline. This is the single source of truth used by
 * BOTH the startup migration (server/db/store.js) and "Reset Demo Environment"
 * (server/services/demoResetService.js) so a reset always restores the exact state the
 * demo scenarios were designed against.
 */
export const erpInventoryBaseline = [
  { id: "inv_wha_w1_sk902", warehouse: "WH-A", bin: "W1", sku: "SK-902",      product_name: "Industrial Motor Assembly",  available_qty: 84,  reserved_qty: 12, reorder_threshold: 25 },
  { id: "inv_wha_w2_sk902", warehouse: "WH-A", bin: "W2", sku: "SK-902",      product_name: "Industrial Motor Assembly",  available_qty: 12,  reserved_qty: 4,  reorder_threshold: 25 },
  { id: "inv_wha_w2_cell",  warehouse: "WH-A", bin: "W2", sku: "CELL-21700",  product_name: "Li-Ion Battery Cell 21700",  available_qty: 340, reserved_qty: 60, reorder_threshold: 100 },
  { id: "inv_whb_b4_pcb",   warehouse: "WH-B", bin: "B4", sku: "PCB-TURB-01", product_name: "Turbine Controller PCB",      available_qty: 18,  reserved_qty: 15, reorder_threshold: 20 }
];

export const erpInventory = [
  {
    warehouse: "WH-A",
    bin: "W2",
    product: "Industrial Motor Assembly",
    sku: "SK-902",
    available_qty: 84,
    reserved_qty: 12,
    reorder_level: 25,
    status: "HEALTHY",
    last_movement: "2026-08-26T09:30:00Z"
  },
  {
    warehouse: "WH-A",
    bin: "W1",
    product: "Li-Ion Battery Cell 21700",
    sku: "CELL-21700",
    available_qty: 340,
    reserved_qty: 60,
    reorder_level: 100,
    status: "HEALTHY",
    last_movement: "2026-08-26T10:15:00Z"
  },
  {
    warehouse: "WH-B",
    bin: "B4",
    product: "Turbine Controller PCB",
    sku: "PCB-TURB-01",
    available_qty: 18,
    reserved_qty: 15,
    reorder_level: 20,
    status: "LOW_STOCK_ALERT",
    last_movement: "2026-08-26T08:45:00Z"
  }
];

export const erpOrders = [
  {
    order_id: "SO-1092",
    customer: "Acme Corp",
    type: "SALES_ORDER",
    amount: 14500.00,
    status: "SYNC_FAILED",
    created_at: "2026-08-26T09:10:00Z"
  },
  {
    order_id: "SO-1093",
    customer: "Tesla Energy Supply",
    type: "SALES_ORDER",
    amount: 48900.00,
    status: "PROCESSING",
    created_at: "2026-08-26T10:00:00Z"
  }
];

export const erpProduction = [
  {
    line_id: "LINE-01",
    line_name: "Assembly Line 1",
    machine: "CNC-Rotary-04",
    status: "TELEMETRY_CRITICAL",
    temperature: "94.2°C",
    vibration_hz: 184,
    active_work_order: "WO-4402"
  },
  {
    line_id: "LINE-02",
    line_name: "SMT Surface Mount Line",
    machine: "SMT-PickPlace-01",
    status: "RUNNING",
    temperature: "42.0°C",
    vibration_hz: 12,
    active_work_order: "WO-4405"
  }
];

export const erpProcurement = [
  {
    po_id: "PO-9041",
    supplier: "Apex Engineering Ltd",
    items_count: 5,
    total: 125000.00,
    status: "VALIDATION_FAILED",
    submitted_by: "David Kim"
  },
  {
    po_id: "PO-9042",
    supplier: "Global Silicon Supplies",
    items_count: 12,
    total: 34000.00,
    status: "APPROVED",
    submitted_by: "Sarah Connor"
  }
];

export const tickets = [
  {
    id: "INC-79613-6322",
    ticket_number: "INC-79613-6322",
    correlation_id: "ERP-INV-W2-20260826-1042",
    title: "[INVENTORY] ERR_STOCK_NEG: Negative quantity violation during bin transfer",
    reporter: "ERP Operator (Mike Ross)",
    assigned_dev_id: "dev_03",
    assigned_dev_name: "Marcus Vance",
    reviewer_name: "Sarah Chen",
    resolution_owner: "Marcus Vance",
    erp_module: "INVENTORY",
    severity: "P3_LOW",
    status: "IN_PROGRESS",
    vague_user_input: "Warehouse operator attempted to transfer 100 units from W1 to W2, but only 84 units were available. ERP validation failed with ERR_STOCK_NEG.",
    structured_description: "Bin transfer validation failed due to cached inventory balance mismatch between Redis cache node and PostgreSQL source of truth.",
    reproduction_steps: [
      "Open ERP Workspace → Inventory Module → Bin Transfer",
      "Select Product: Industrial Motor Assembly (SKU: SK-902)",
      "Set From: Bin W1 (Available: 84 units), To: Bin W2",
      "Enter Transfer Quantity: 100 units",
      "Click Submit Bin Transfer → Observe ERR_STOCK_NEG exception"
    ],
    expected_behavior: "ERP validates transfer quantity against real-time DB inventory stock prior to committing transfer.",
    actual_behavior: "Stale Redis cache read leads to negative quantity constraint failure during SQL commit.",
    ocr_findings: {
      extracted_error_code: "ERR_STOCK_NEG",
      detected_component: "BinTransferGrid",
      annotated_screenshot_text: "ERROR: Constraint violation stock_qty >= 0 breached for SKU SK-902 in bin W2."
    },
    duplicate_check: { is_duplicate: false, similarity_score: 0.14 },
    ai_confidence: 0.65,
    ai_root_cause: "Stale cache read before transfer validation (Redis key `inv_stock:SK-902` out of sync with DB balance).",
    ai_suggested_patch: "EXEC redis-cli DEL inv_stock:SK-902 && SELECT sync_inventory_cache('SK-902');",
    business_impact_score: 6,
    affected_warehouse: "WH-A / W2",
    affected_process: "Warehouse stock movement",
    sla_remaining_minutes: 240,
    created_at: "2026-08-26T10:42:00Z"
  },
  {
    id: "INC-2026-8904",
    ticket_number: "INC-8904",
    correlation_id: "ERP-ORD-SO1092-20260826-0915",
    title: "[ORDERS] ERR_ORDER_SYNC: Order synchronization timeout for Sales Order #SO-1092",
    reporter: "Sales Desk (Emma Watson)",
    assigned_dev_id: "dev_01",
    assigned_dev_name: "Alex Mercer",
    reviewer_name: "Marcus Vance",
    resolution_owner: "Alex Mercer",
    erp_module: "ORDERS",
    severity: "P1_HIGH",
    status: "REMEDIATION_PENDING",
    vague_user_input: "Customer Acme Corp sales order #SO-1092 timed out while syncing to the fulfillment gateway.",
    structured_description: "Order processing service failed to receive socket acknowledgment from fulfillment gateway within 3000ms SLA window.",
    reproduction_steps: [
      "Open Sales Orders → Select SO-1092",
      "Click Sync Order to Warehouse",
      "Observe 3000ms HTTP gateway timeout ERR_ORDER_SYNC"
    ],
    expected_behavior: "Order payload propagates to warehouse queue in < 500ms.",
    actual_behavior: "Gateway connection socket hangs and drops connection.",
    ocr_findings: {
      extracted_error_code: "ERR_ORDER_SYNC",
      detected_component: "OrderSyncGateway",
      annotated_screenshot_text: "HTTP 504: Gateway Timeout for Sales Order SO-1092 Sync Endpoint."
    },
    duplicate_check: { is_duplicate: false, similarity_score: 0.08 },
    ai_confidence: 0.88,
    ai_root_cause: "Missing connection pool retry policy on OrderSyncGateway HTTP client.",
    ai_suggested_patch: "UPDATE erp_gateway_config SET retry_attempts = 3, timeout_ms = 5000 WHERE service = 'OrderSync';",
    business_impact_score: 8,
    affected_warehouse: "WH-A / Delivery Queue",
    affected_process: "Sales Order Fulfillment",
    sla_remaining_minutes: 45,
    created_at: "2026-08-26T09:15:00Z"
  },
  {
    id: "INC-2026-8905",
    ticket_number: "INC-8905",
    correlation_id: "ERP-PRD-CNC04-20260826-0830",
    title: "[PRODUCTION] ERR_MACHINE_HEALTH: Machine telemetry unavailable for CNC-Rotary-04",
    reporter: "Shop Floor Supervisor (Carlos Ruiz)",
    assigned_dev_id: "dev_02",
    assigned_dev_name: "Sarah Jenkins",
    reviewer_name: "Priya Sharma",
    resolution_owner: "Sarah Jenkins",
    erp_module: "PRODUCTION",
    severity: "P0_CRITICAL",
    status: "VERIFICATION",
    vague_user_input: "Assembly Line 1 CNC machine telemetry stopped responding and temperature metric spiked to 94.2°C!",
    structured_description: "MQTT sensor telemetry stream disconnected due to buffer overflow on edge IoT collector node.",
    reproduction_steps: [
      "Open Shop Floor Monitor → Line 1 Assembly",
      "Check telemetry node CNC-Rotary-04",
      "Observe offline status & ERR_MACHINE_HEALTH alert"
    ],
    expected_behavior: "Telemetry collector streams 10Hz sensor metrics back to ERP Digital Twin.",
    actual_behavior: "Collector service drops buffer and raises critical alarm.",
    ocr_findings: {
      extracted_error_code: "ERR_MACHINE_HEALTH",
      detected_component: "IoTCollectorDaemon",
      annotated_screenshot_text: "CRITICAL: Telemetry buffer overrun on socket port 1883 for CNC-Rotary-04."
    },
    duplicate_check: { is_duplicate: false, similarity_score: 0.05 },
    ai_confidence: 0.92,
    ai_root_cause: "IoT collector ring buffer size exceeded during high-frequency vibration sampling.",
    ai_suggested_patch: "ALTER SYSTEM SET iot_buffer_size_mb = 128; SELECT pg_reload_conf();",
    business_impact_score: 9,
    affected_warehouse: "Plant 1 / Assembly Line 1",
    affected_process: "Automated Machining & Line Safety",
    sla_remaining_minutes: 18,
    created_at: "2026-08-26T08:30:00Z"
  },
  {
    id: "INC-2026-8906",
    ticket_number: "INC-8906",
    correlation_id: "ERP-PROC-PO9041-20260826-1010",
    title: "[PROCUREMENT] ERR_PO_VALIDATION: Purchase order validation failure for PO #PO-9041",
    reporter: "Procurement Officer (David Kim)",
    assigned_dev_id: "dev_04",
    assigned_dev_name: "Priya Sharma",
    reviewer_name: "Alex Mercer",
    resolution_owner: "Priya Sharma",
    erp_module: "PROCUREMENT",
    severity: "P2_MEDIUM",
    status: "TRIAGED",
    vague_user_input: "Purchase order PO-9041 for Apex Engineering failed vendor tax validation.",
    structured_description: "Procurement approval workflow rejected PO commit due to missing vendor VAT identification number in schema check.",
    reproduction_steps: [
      "Open Procurement → Purchase Orders → PO-9041",
      "Click Submit for Approval",
      "Observe ERR_PO_VALIDATION error popup"
    ],
    expected_behavior: "Validation checks vendor master record and routes to Procurement Manager.",
    actual_behavior: "Validation throws null reference exception on optional vendor VAT field.",
    ocr_findings: {
      extracted_error_code: "ERR_PO_VALIDATION",
      detected_component: "POApprovalForm",
      annotated_screenshot_text: "ERROR: Vendor VAT ID null for Vendor ID Apex-01 in PO schema validator."
    },
    duplicate_check: { is_duplicate: false, similarity_score: 0.10 },
    ai_confidence: 0.82,
    ai_root_cause: "Strict non-null assertion on optional foreign vendor VAT ID in schema `po_schema_v2`.",
    ai_suggested_patch: "ALTER TABLE vendor_master ALTER COLUMN vat_id DROP NOT NULL;",
    business_impact_score: 5,
    affected_warehouse: "Procurement Office",
    affected_process: "Vendor Raw Material Purchasing",
    sla_remaining_minutes: 180,
    created_at: "2026-08-26T10:10:00Z"
  },
  {
    id: "INC-2026-8907",
    ticket_number: "INC-8907",
    correlation_id: "ERP-SYS-AUTH-20260826-0745",
    title: "[AUTH] ERR_AUTH_SERVICE: Authentication service timeout on SSO token refresh",
    reporter: "IT Operations (System Monitor)",
    assigned_dev_id: "dev_03",
    assigned_dev_name: "Marcus Vance",
    reviewer_name: "Sarah Jenkins",
    resolution_owner: "Marcus Vance",
    erp_module: "AUTH",
    severity: "P1_HIGH",
    status: "ASSIGNED",
    vague_user_input: "Users experienced login delays and 504 Gateway errors when renewing JWT session tokens.",
    structured_description: "Auth service redis connection pool exhausted during shift change peak login traffic.",
    reproduction_steps: [
      "Simulate 50 concurrent user token refresh requests",
      "Observe latency spike > 5000ms",
      "Receive ERR_AUTH_SERVICE gateway failure"
    ],
    expected_behavior: "JWT refresh executes in < 50ms per session.",
    actual_behavior: "Redis pool max limit reached, blocking worker threads.",
    ocr_findings: {
      extracted_error_code: "ERR_AUTH_SERVICE",
      detected_component: "AuthServiceGateway",
      annotated_screenshot_text: "ERR 504: Auth Service connection pool timeout."
    },
    duplicate_check: { is_duplicate: false, similarity_score: 0.11 },
    ai_confidence: 0.90,
    ai_root_cause: "Max connections setting in auth redis client configured to default 10 instead of 200.",
    ai_suggested_patch: "UPDATE auth_config SET redis_max_connections = 200 WHERE service = 'auth';",
    business_impact_score: 8,
    affected_warehouse: "All Facilities",
    affected_process: "Enterprise Identity & Single Sign-On",
    sla_remaining_minutes: 90,
    created_at: "2026-08-26T07:45:00Z"
  }
];

export const knowledgeBase = [
  {
    id: "kb_101",
    title: "Resolving ERR_STOCK_NEG Negative Quantity Violation during Bin Transfers",
    erp_module: "INVENTORY",
    error_code: "ERR_STOCK_NEG",
    solution: "Invalidate stale Redis stock cache key `inv_stock:<SKU>` and trigger database balance sync function `sync_inventory_cache(sku)` before executing transfer validation.",
    confidence: 0.96,
    tags: ["Inventory", "Redis", "Bin Transfer", "Cache Sync"]
  },
  {
    id: "kb_102",
    title: "Handling ERR_ORDER_SYNC Timeout on Fulfillment Gateway",
    erp_module: "ORDERS",
    error_code: "ERR_ORDER_SYNC",
    solution: "Increase gateway HTTP socket timeout to 5000ms and configure exponential backoff retry policy for outbound sales order synchronization payloads.",
    confidence: 0.94,
    tags: ["Orders", "Gateway", "Timeout", "HTTP Retry"]
  },
  {
    id: "kb_103",
    title: "Fixing ERR_MACHINE_HEALTH IoT Telemetry Buffer Overrun",
    erp_module: "PRODUCTION",
    error_code: "ERR_MACHINE_HEALTH",
    solution: "Expand MQTT daemon ring buffer allocation to 128MB and restart IoT collector daemon to clear backpressured sensor streams.",
    confidence: 0.92,
    tags: ["Production", "IoT", "Telemetry", "MQTT"]
  },
  {
    id: "kb_104",
    title: "Resolving ERR_PO_VALIDATION Null Reference in Procurement Approval",
    erp_module: "PROCUREMENT",
    error_code: "ERR_PO_VALIDATION",
    solution: "Mark optional vendor fields (VAT ID / tax registration) as nullable in purchase order schema validator `po_schema_v2`.",
    confidence: 0.89,
    tags: ["Procurement", "Purchase Order", "Validation", "Schema"]
  },
  {
    id: "kb_105",
    title: "Handling ERR_AUTH_SERVICE Connection Pool Exhaustion",
    erp_module: "AUTH",
    error_code: "ERR_AUTH_SERVICE",
    solution: "Increase auth service Redis connection pool limit to 200 connections and enable connection idle timeout recycling.",
    confidence: 0.95,
    tags: ["Auth", "Redis", "Connection Pool", "JWT"]
  },
  {
    id: "kb_106",
    title: "Reconciling ERR_TAX_VAL_402 Invoice Tax and Amount Totals That Do Not Balance",
    erp_module: "INVOICING",
    error_code: "ERR_TAX_VAL_402",
    problem: "Posting an invoice fails because the entered tax amount does not balance against the computed tax (subtotal multiplied by the applicable tax rate), so the invoice totals do not reconcile.",
    root_cause: "The tax amount on the invoice header was entered or imported manually and drifted from the line-item subtotal multiplied by the tax rate.",
    solution: "Recompute the tax base as subtotal * tax_rate, replace the invoice header tax amount with the computed value so header and line totals balance, and re-post the invoice.",
    confidence: 0.93,
    tags: ["Invoicing", "Tax", "Reconciliation", "Balance", "Amount Mismatch", "Totals"]
  },
  {
    id: "kb_107",
    title: "Resolving ERR_MATERIAL_SHORTAGE When a Production Run Cannot Be Released",
    erp_module: "PRODUCTION",
    error_code: "ERR_MATERIAL_SHORTAGE",
    problem: "A production run is rejected at release because a bill-of-materials component does not have enough available stock in the issuing bin to cover the run quantity.",
    root_cause: "Component stock in the issuing warehouse bin is below the quantity the production order needs; upstream replenishment or a goods receipt has not been posted.",
    solution: "Post the outstanding goods receipt or create a replenishment transfer for the short component into the issuing bin, confirm available_qty now covers the run, then re-release the production order.",
    confidence: 0.90,
    tags: ["Production", "Bill of Materials", "Component Stock", "Shortage", "Replenishment"]
  },
  {
    id: "kb_109",
    title: "Resolving ERR_STOCK_NEG When a Bin Transfer Quantity Exceeds Available Stock",
    erp_module: "INVENTORY",
    error_code: "ERR_STOCK_NEG",
    problem: "A warehouse bin transfer is rejected because the requested transfer quantity is greater than the available quantity in the source bin, which would drive the balance negative.",
    root_cause: "The transfer was keyed for more units than the source bin actually holds; available_qty in the source bin is lower than the requested move quantity.",
    solution: "Reduce the transfer quantity to at most the available balance in the source bin, or replenish the source bin (inbound receipt / replenishment transfer) so available_qty covers the move, then re-submit the bin transfer. Always confirm available_qty before transferring.",
    confidence: 0.95,
    tags: ["Inventory", "Bin Transfer", "Stock", "Negative Quantity", "Available Quantity", "Replenishment"]
  },
  {
    id: "kb_108",
    title: "Fixing ERR_PO_MISMATCH Goods Receipt Quantity Over Purchase Order Quantity",
    erp_module: "PROCUREMENT",
    error_code: "ERR_PO_MISMATCH",
    problem: "A goods receipt is rejected because the received quantity exceeds the ordered quantity on the purchase order beyond the allowed over-delivery tolerance.",
    root_cause: "The received quantity keyed at the dock is greater than the PO line quantity and the over-delivery tolerance on the PO line is set to zero.",
    solution: "Either raise the over-delivery tolerance on the PO line to cover the excess and re-post the receipt, or split the receipt so the posted quantity matches the PO line quantity and return or hold the surplus.",
    confidence: 0.9,
    tags: ["Procurement", "Purchase Order", "Goods Receipt", "Three-Way Match", "Quantity", "Tolerance"]
  }
];
