/**
 * Demo Incident Factory
 * =====================
 * A small registry of realistic Smart Manufacturing ERP failures a presenter can trigger
 * with one click. Every scenario runs a REAL operation against IncidentAI's embedded ERP
 * state (server/db/erp_inventory + erp_transactions), fails a genuine business rule, persists
 * the rejected transaction, and then ingests the incident through the SAME pipeline used by
 * the manual Digital Twin console (ticketService.runIncidentIngestPipeline) — OCR/keyword
 * classification, severity, duplicate detection, RAG retrieval, live MCP facts, LLM diagnosis
 * and an audit event. Nothing here fabricates an incident or an AI claim.
 *
 * Scenario 5 (GL journal imbalance) is deliberately a module with no matching knowledge-base
 * article, so RAG surfaces a low-relevance cross-module hit and the existing safety guardrail
 * (remediationService.buildRemediationPlan → kb_mismatch_detected) blocks auto-remediation.
 */

import crypto from "node:crypto";
import { withTransaction } from "../db/postgres.js";
import {
  listInventory,
  recordErpTransaction,
  updateErpTransaction
} from "../db/store.js";
import { executeBinTransfer } from "./erpInventoryService.js";
import { runIncidentIngestPipeline } from "./ticketService.js";

function txId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
}

function incidentSummary(ticket) {
  return {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    status: ticket.status,
    severity: ticket.severity,
    title: ticket.title,
    erp_module: ticket.erp_module,
    assigned_dev_name: ticket.assigned_dev_name,
    correlation_id: ticket.correlation_id
  };
}

/**
 * Shared tail for the transaction-only scenarios (PO / invoice / journal): persist the
 * rejected transaction, ingest the incident, back-link the two.
 */
async function rejectAndIngest({ tx, incidentText, erpContext }) {
  const recorded = await withTransaction((client) => recordErpTransaction(client, tx));
  const ticket = await runIncidentIngestPipeline({
    text: incidentText,
    reporter: "Smart Manufacturing ERP",
    erp_context: { erp: "Smart Manufacturing ERP", source: "erp-backend-auto", ...erpContext, correlation_id: recorded.id }
  });
  await updateErpTransaction(recorded.id, { incident_id: ticket.id });
  return {
    transaction: { ...recorded, incident_id: ticket.id },
    incident: incidentSummary(ticket)
  };
}

/* ───────────────────────── Scenario 1 — Negative stock ───────────────────────── */

async function runNegativeStock() {
  const result = await executeBinTransfer({
    warehouse: "WH-A",
    sku: "SK-902",
    from_bin: "W1",
    to_bin: "W2",
    qty: 100,
    actor: "Smart Manufacturing ERP"
  });
  // executeBinTransfer already ingests the incident on rejection.
  return {
    transaction: result.transaction,
    incident: { ...result.incident, erp_module: "INVENTORY" },
    message: result.message
  };
}

/* ─────────────────── Scenario 2 — Production material shortage ─────────────────── */

async function runMaterialShortage() {
  const warehouse = "WH-B";
  const bin = "B4";
  const sku = "PCB-TURB-01";
  const required = 30;
  const workOrder = `WO-${crypto.randomInt(4400, 4499)}`;

  // Read current component stock from the embedded ERP (real, mutable DB state).
  const inventory = await listInventory();
  const row = inventory.find((r) => r.warehouse === warehouse && r.bin === bin && r.sku === sku);
  const available = row ? row.available_qty : 0;
  const product = row?.product_name || sku;

  const tx = {
    id: txId("ERP-PRD"),
    type: "PRODUCTION_RUN_RELEASE",
    sku,
    warehouse,
    from_bin: bin,
    qty: required,
    status: "REJECTED",
    reason: `Material shortage: production run ${workOrder} needs ${required} units of ${sku} in ${warehouse}/${bin}, only ${available} available (ERR_MATERIAL_SHORTAGE)`,
    actor: "Smart Manufacturing ERP",
    metadata: { work_order: workOrder, component_sku: sku, required_qty: required, available_qty: available, product }
  };

  const incidentText =
    `ERR_MATERIAL_SHORTAGE — Production run ${workOrder} could not be released. The bill of materials ` +
    `requires ${required} units of component ${sku} (${product}) issued from ${warehouse}/${bin}, ` +
    `but only ${available} units are available. Assembly line release was blocked by the ` +
    `production material availability check.`;

  return rejectAndIngest({
    tx,
    incidentText,
    erpContext: {
      module: "PRODUCTION",
      route: "/production/run-release",
      record_id: tx.id,
      work_order: workOrder,
      component_sku: sku,
      warehouse,
      bin,
      required_qty: required,
      available_qty: available,
      error_code: "ERR_MATERIAL_SHORTAGE",
      source_transaction_status: "REJECTED"
    }
  });
}

/* ─────────────────── Scenario 3 — Purchase-order receipt mismatch ─────────────────── */

async function runPoQuantityMismatch() {
  const po = `PO-${crypto.randomInt(9040, 9099)}`;
  const orderedQty = 500;
  const receivedQty = 620;
  const tolerancePct = 0; // over-delivery tolerance on the PO line
  const allowed = Math.floor(orderedQty * (1 + tolerancePct / 100));

  const tx = {
    id: txId("ERP-PROC"),
    type: "GOODS_RECEIPT",
    sku: "BRKT-STL-88",
    status: "REJECTED",
    qty: receivedQty,
    reason: `Goods receipt rejected for ${po}: received ${receivedQty} exceeds ordered ${orderedQty} (allowed ${allowed}, over-delivery tolerance ${tolerancePct}%) (ERR_PO_MISMATCH)`,
    actor: "Smart Manufacturing ERP",
    metadata: { po, ordered_qty: orderedQty, received_qty: receivedQty, over_delivery_tolerance_pct: tolerancePct, supplier: "Apex Engineering Ltd" }
  };

  const incidentText =
    `ERR_PO_MISMATCH — Goods receipt for purchase order ${po} was rejected during three-way match. ` +
    `The received quantity keyed at the dock was ${receivedQty} units, but the purchase order line was ` +
    `for ${orderedQty} units with a zero over-delivery tolerance. The receiving posting was blocked ` +
    `because received quantity exceeds the ordered quantity.`;

  return rejectAndIngest({
    tx,
    incidentText,
    erpContext: {
      module: "PROCUREMENT",
      route: "/procurement/goods-receipt",
      record_id: tx.id,
      po,
      ordered_qty: orderedQty,
      received_qty: receivedQty,
      over_delivery_tolerance_pct: tolerancePct,
      error_code: "ERR_PO_MISMATCH",
      source_transaction_status: "REJECTED"
    }
  });
}

/* ─────────────────── Scenario 4 — Invoice tax validation ─────────────────── */

async function runInvoiceTaxMismatch() {
  const invoice = `INV-${crypto.randomInt(1100, 1199)}`;
  const subtotal = 18000.0;
  const taxRate = 0.085;
  const computedTax = Math.round(subtotal * taxRate * 100) / 100; // 1530.00
  const enteredTax = 1800.0;                                       // drifted header value

  const tx = {
    id: txId("ERP-FIN"),
    type: "INVOICE_POST",
    status: "REJECTED",
    reason: `Invoice ${invoice} rejected: header tax ${enteredTax.toFixed(2)} does not reconcile with computed tax ${computedTax.toFixed(2)} (subtotal ${subtotal.toFixed(2)} x ${(taxRate * 100).toFixed(1)}%) (ERR_TAX_VAL_402)`,
    actor: "Smart Manufacturing ERP",
    metadata: { invoice, subtotal, tax_rate: taxRate, computed_tax: computedTax, entered_tax: enteredTax, customer: "Acme Corp" }
  };

  const incidentText =
    `ERR_TAX_VAL_402 — Posting invoice ${invoice} failed tax validation. The invoice header tax amount is ` +
    `${enteredTax.toFixed(2)} but the computed tax on a subtotal of ${subtotal.toFixed(2)} at ${(taxRate * 100).toFixed(1)}% ` +
    `is ${computedTax.toFixed(2)}. The header tax and the line totals do not balance, so the invoice could not be posted.`;

  return rejectAndIngest({
    tx,
    incidentText,
    erpContext: {
      module: "INVOICING",
      route: "/invoicing/post",
      record_id: tx.id,
      invoice,
      subtotal,
      tax_rate: taxRate,
      computed_tax: computedTax,
      entered_tax: enteredTax,
      error_code: "ERR_TAX_VAL_402",
      source_transaction_status: "REJECTED"
    }
  });
}

/* ─────────── Scenario 5 — General-ledger journal imbalance (RAG safety case) ─────────── */

async function runJournalImbalance() {
  const je = `JE-${crypto.randomInt(70000, 79999)}`;
  const debits = 45000.0;
  const credits = 44100.0;

  const tx = {
    id: txId("ERP-GL"),
    type: "JOURNAL_POST",
    status: "REJECTED",
    reason: `Journal entry ${je} rejected by the general ledger: total debits ${debits.toFixed(2)} do not equal total credits ${credits.toFixed(2)} (ERR_GL_UNBALANCED)`,
    actor: "Smart Manufacturing ERP",
    metadata: { journal_entry: je, total_debits: debits, total_credits: credits, difference: Math.round((debits - credits) * 100) / 100 }
  };

  const incidentText =
    `ERR_GL_UNBALANCED — General ledger journal entry ${je} was rejected during posting. The total debits ` +
    `are ${debits.toFixed(2)} and the total credits are ${credits.toFixed(2)}, so the entry does not balance ` +
    `and the trial balance would be out of balance. The ledger posting was blocked.`;

  return rejectAndIngest({
    tx,
    incidentText,
    erpContext: {
      module: "GENERAL_LEDGER",
      route: "/ledger/journal-post",
      record_id: tx.id,
      journal_entry: je,
      total_debits: debits,
      total_credits: credits,
      error_code: "ERR_GL_UNBALANCED",
      source_transaction_status: "REJECTED"
    }
  });
}

/* ───────────────────────────── Registry ───────────────────────────── */

export const DEMO_SCENARIOS = [
  {
    id: "negative-stock",
    label: "Negative Stock / Inventory",
    module: "INVENTORY",
    error_code: "ERR_STOCK_NEG",
    description: "Warehouse bin transfer of 100 units of SK-902 from W1 (only 84 available). ERP rejects the transfer; an incident is created.",
    run: runNegativeStock
  },
  {
    id: "material-shortage",
    label: "Production Material Shortage",
    module: "PRODUCTION",
    error_code: "ERR_MATERIAL_SHORTAGE",
    description: "Production run needs 30 turbine controller PCBs from WH-B/B4 (only 18 in stock). The run cannot be released; an incident is created.",
    run: runMaterialShortage
  },
  {
    id: "po-quantity-mismatch",
    label: "Purchase Order Receipt Mismatch",
    module: "PROCUREMENT",
    error_code: "ERR_PO_MISMATCH",
    description: "Goods receipt of 620 units against a purchase order for 500 with zero over-delivery tolerance. Receiving is blocked; an incident is created.",
    run: runPoQuantityMismatch
  },
  {
    id: "invoice-tax-mismatch",
    label: "Invoice / Tax Validation Error",
    module: "INVOICING",
    error_code: "ERR_TAX_VAL_402",
    description: "Invoice header tax of 1800.00 does not reconcile with the computed tax of 1530.00 on an 18,000.00 subtotal. Posting fails; an incident is created.",
    run: runInvoiceTaxMismatch
  },
  {
    id: "journal-imbalance",
    label: "Ledger Imbalance — Knowledge-Mismatch Safety Case",
    module: "GENERAL_LEDGER",
    error_code: "ERR_GL_UNBALANCED",
    description: "Journal entry with debits 45,000.00 vs credits 44,100.00 is rejected. There is no matching knowledge-base article, so IncidentAI flags a potential knowledge-base mismatch and blocks auto-remediation.",
    run: runJournalImbalance
  }
];

export function listDemoScenarios() {
  return DEMO_SCENARIOS.map(({ id, label, module, error_code, description }) => ({ id, label, module, error_code, description }));
}

export async function triggerDemoScenario(id) {
  const scenario = DEMO_SCENARIOS.find((s) => s.id === id);
  if (!scenario) return null;
  const result = await scenario.run();
  return {
    scenario: { id: scenario.id, label: scenario.label, module: scenario.module, error_code: scenario.error_code },
    ...result
  };
}
