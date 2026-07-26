/**
 * Seed data mirrors src/store/mockDatabase.js schema so the backend can later replace the frontend mocks 1:1.
 */

export const developers = [
  {
    id: "dev_01",
    name: "Alex Mercer",
    role: "Senior SAP ABAP Specialist",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    skills: ["SAP ABAP", "PostgreSQL", "Accounting Logic", "General Ledger"],
    erp_modules: ["INVOICING", "GENERAL_LEDGER"],
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
    skills: ["Python", "Odoo ORM", "Payroll Engine", "Tax Engine"],
    erp_modules: ["PAYROLL", "INVOICING"],
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
    skills: ["PostgreSQL", "SQL Tuning", "Inventory Indexing", "NetSuite SuiteScript"],
    erp_modules: ["INVENTORY", "PROCUREMENT"],
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
  }
];

export const tickets = [
  {
    id: "INC-2026-8901",
    ticket_number: "INC-8901",
    title: "[INVOICING] ERR_TAX_VAL_402: Customer GSTIN Exemption Code Missing on Post",
    reporter: "John Doe (Finance Operator)",
    assigned_dev_id: "dev_01",
    assigned_dev_name: "Alex Mercer",
    erp_module: "INVOICING",
    severity: "P1_HIGH",
    status: "IN_PROGRESS",
    vague_user_input: "The billing button turned red when posting invoice for Customer #904!",
    structured_description: "Invoice posting pipeline thrown exception `ERR_TAX_VAL_402`. Missing required GSTIN exemption mapping in customer master records table `cust_master_tax`.",
    reproduction_steps: [
      "Navigate to Invoicing -> Outstanding Billing",
      "Select Customer Record #904 (Acme Corp)",
      "Click 'Post Invoice & Generate PDF'"
    ],
    expected_behavior: "Invoice generates PDF and creates journal entry in General Ledger.",
    actual_behavior: "Validation fails with error pop-up: ERR_TAX_VAL_402.",
    ocr_findings: {
      extracted_error_code: "ERR_TAX_VAL_402",
      detected_component: "PostInvoiceButton",
      annotated_screenshot_text: "ERROR 402: Tax Exemption Code null for Cust ID 904 in SAP Post Engine."
    },
    duplicate_check: { is_duplicate: false, similarity_score: 0.12 },
    ai_root_cause: "Missing `tax_exempt_code` constraint in `cust_master_tax` table for non-taxable corporate accounts.",
    ai_suggested_patch: "UPDATE cust_master_tax SET tax_exempt_code = 'GST_EXEMPT_A1' WHERE cust_id = 904;",
    sla_remaining_minutes: 42,
    created_at: "2026-07-26T09:15:00Z"
  },
  {
    id: "INC-2026-8902",
    ticket_number: "INC-8902",
    title: "[PAYROLL] ERR_PAYROLL_DEADLOCK: Thread Timeout During Gross Salary Calculation",
    reporter: "Sarah Connor (HR Admin)",
    assigned_dev_id: "dev_02",
    assigned_dev_name: "Sarah Jenkins",
    erp_module: "PAYROLL",
    severity: "P0_CRITICAL",
    status: "TRIAGED",
    vague_user_input: "Payroll batch run froze at employee 450 and crashed!",
    structured_description: "Batch payroll calculation process timed out due to row lock contention on table `emp_tax_deductions_2026` during tax bracket recalculation.",
    reproduction_steps: [
      "Open HR -> Monthly Payroll Run",
      "Select Batch #2026-Q3-JULY",
      "Execute Batch Processing"
    ],
    expected_behavior: "Batch payroll completes for 2,400 employees in under 3 minutes.",
    actual_behavior: "Process hangs for 120 seconds and terminates with DB deadlock exception.",
    ocr_findings: {
      extracted_error_code: "ERR_PAYROLL_DEADLOCK",
      detected_component: "BatchRunProgressModal",
      annotated_screenshot_text: "FATAL: Deadlock detected on PG process 4102 locked by process 4108."
    },
    duplicate_check: { is_duplicate: true, duplicate_of: "INC-2026-8840", similarity_score: 0.89 },
    ai_root_cause: "Unindexed bulk update on `emp_tax_deductions_2026` causing table locks during parallel batch threads.",
    ai_suggested_patch: "CREATE INDEX CONCURRENTLY idx_tax_deduct_emp ON emp_tax_deductions_2026 (emp_id, tax_year);",
    sla_remaining_minutes: 15,
    created_at: "2026-07-26T10:40:00Z"
  },
  {
    id: "INC-2026-8903",
    ticket_number: "INC-8903",
    title: "[INVENTORY] ERR_STOCK_NEG: Negative Quantity Violation on Warehouse #4 Transfer",
    reporter: "Mike Ross (Logistics Supervisor)",
    assigned_dev_id: "dev_03",
    assigned_dev_name: "Marcus Vance",
    erp_module: "INVENTORY",
    severity: "P2_MEDIUM",
    status: "ASSIGNED",
    vague_user_input: "Warehouse stock item SK-902 shows wrong count when moving bins.",
    structured_description: "Bin transfer validation failed due to cached inventory balance mismatch between Redis cache node and PostgreSQL source of truth.",
    reproduction_steps: [
      "Open Inventory -> Bin Transfers",
      "Select SKU SK-902",
      "Transfer 50 units from Bin A1 to Bin B4"
    ],
    expected_behavior: "Bin balance updates seamlessly.",
    actual_behavior: "System rejects transfer claiming stock count is -5.",
    ocr_findings: {
      extracted_error_code: "ERR_STOCK_NEG",
      detected_component: "BinTransferGrid",
      annotated_screenshot_text: "ERROR: Constraint violation stock_qty >= 0 breached for SKU SK-902."
    },
    duplicate_check: { is_duplicate: false, similarity_score: 0.24 },
    ai_root_cause: "Stale Redis cache key `inv_stock:SK-902` not invalidated during previous PO receipt.",
    ai_suggested_patch: "EXEC redis-cli DEL inv_stock:SK-902 && SELECT sync_inventory_cache('SK-902');",
    sla_remaining_minutes: 110,
    created_at: "2026-07-26T11:05:00Z"
  },
  {
    id: "INC-2026-8850",
    ticket_number: "INC-8850",
    title: "[GENERAL_LEDGER] ERR_GL_UNBALANCED: Multi-Currency Journal Batch Mismatch",
    reporter: "Elena Petrova (Controller)",
    assigned_dev_id: "dev_04",
    assigned_dev_name: "Priya Sharma",
    erp_module: "GENERAL_LEDGER",
    severity: "P1_HIGH",
    status: "RESOLVED",
    vague_user_input: "The ledger won't close, it says numbers don't add up.",
    structured_description: "Journal entry batch posted with mismatched debit/credit totals due to currency rounding in multi-currency conversion.",
    reproduction_steps: [
      "Open General Ledger -> Period Close",
      "Run trial balance for FY2026-Q2",
      "Attempt to post closing journal batch"
    ],
    expected_behavior: "Trial balance closes with debit/credit totals equal.",
    actual_behavior: "System rejects close with ERR_GL_UNBALANCED across 3 currency pairs.",
    ocr_findings: {
      extracted_error_code: "ERR_GL_UNBALANCED",
      detected_component: "JournalPostingForm",
      annotated_screenshot_text: "ERROR: Batch totals unbalanced by 0.03 across EUR/USD/INR conversion."
    },
    duplicate_check: { is_duplicate: false, similarity_score: 0.08 },
    ai_root_cause: "Journal entry batch posted with mismatched debit/credit totals due to currency rounding in multi-currency conversion.",
    ai_suggested_patch: "UPDATE gl_journal_lines SET amount = ROUND(amount, 2) WHERE batch_id = 'FY2026Q2-CLOSE';",
    sla_remaining_minutes: 0,
    created_at: "2026-07-24T08:00:00Z",
    resolved_at: "2026-07-24T09:54:00Z"
  }
];

export const knowledgeBase = [
  {
    id: "kb_101",
    title: "Resolving ERR_TAX_VAL_402 Exemption Code Missing in SAP Billing",
    erp_module: "INVOICING",
    error_code: "ERR_TAX_VAL_402",
    solution: "Ensure non-taxable customers have `tax_exempt_code` populated in `cust_master_tax`. Execute update statement or check Master Data configuration in Finance settings.",
    confidence: 0.96,
    tags: ["SAP", "Invoicing", "Tax", "GSTIN"]
  },
  {
    id: "kb_102",
    title: "Handling PostgreSQL Deadlocks during Large Payroll Batches",
    erp_module: "PAYROLL",
    error_code: "ERR_PAYROLL_DEADLOCK",
    solution: "Add composite index on `(emp_id, tax_year)` to avoid full table lock during tax recalculation batch updates. Set `statement_timeout = 30000ms`.",
    confidence: 0.94,
    tags: ["PostgreSQL", "Payroll", "Lock Contention", "Index"]
  },
  {
    id: "kb_103",
    title: "Redis Inventory Cache Sync for Negative Quantity Violations",
    erp_module: "INVENTORY",
    error_code: "ERR_STOCK_NEG",
    solution: "Flush invalid Redis SKU key and trigger database cache sync function `sync_inventory_cache(sku_code)`.",
    confidence: 0.91,
    tags: ["Inventory", "Redis", "Cache Invalidating", "Odoo"]
  },
  {
    id: "kb_104",
    title: "Fixing Multi-Currency Rounding Mismatches on GL Period Close",
    erp_module: "GENERAL_LEDGER",
    error_code: "ERR_GL_UNBALANCED",
    solution: "Round journal line amounts to 2 decimal places before batch posting and reconcile FX conversion rate snapshot at time of entry.",
    confidence: 0.89,
    tags: ["Oracle", "General Ledger", "Currency", "Rounding"]
  },
  {
    id: "kb_105",
    title: "Reconciling PO vs Goods Receipt Quantity Mismatches",
    erp_module: "PROCUREMENT",
    error_code: "ERR_PO_MISMATCH",
    solution: "Mark purchase order as PARTIALLY_RECEIVED when goods receipt quantity is less than ordered quantity, then re-trigger the 3-way match.",
    confidence: 0.87,
    tags: ["NetSuite", "Procurement", "3-Way Match"]
  }
];
