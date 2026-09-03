/**
 * Embedded Smart Manufacturing ERP — Inventory operations.
 *
 * Master data (bins, SKUs, quantities) is SEEDED, but every operation here is REAL:
 * it reads current stock from Postgres under a row lock, validates the business rule
 * (available_qty >= requested), and either commits the mutation or rejects the
 * transaction and ingests a persisted IncidentAI incident with full correlation
 * context. No state change is ever simulated in the frontend.
 */

import crypto from "node:crypto";
import { withTransaction } from "../db/postgres.js";
import {
  listInventory,
  getInventoryRow,
  adjustInventory,
  recordErpTransaction,
  updateErpTransaction,
  getTicketById
} from "../db/store.js";
import { runIncidentIngestPipeline } from "./ticketService.js";

export async function getInventorySnapshot() {
  const inventory = await listInventory();
  return {
    inventory,
    generated_at: new Date().toISOString(),
    source: "Smart Manufacturing ERP (embedded)",
    is_live_processing: true
  };
}

/**
 * Executes a warehouse bin transfer against real database stock.
 * @returns {Promise<{status:'COMPLETED'|'REJECTED', transaction, inventory?, incident?, message}>}
 */
export async function executeBinTransfer({ warehouse = "WH-A", sku, from_bin, to_bin, qty, actor = "Smart Manufacturing ERP" }) {
  const quantity = Number(qty);
  const txId = `ERP-TX-${Date.now()}-${crypto.randomInt(1000, 9999)}`;

  if (!sku || !from_bin || !to_bin) {
    throw new Error("Transfer requires sku, from_bin and to_bin");
  }
  if (from_bin === to_bin) {
    throw new Error("Source and destination bins must differ");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Transfer quantity must be a positive number");
  }

  // 1-2-3. Read current stock under a lock and evaluate the constraint atomically.
  const evaluation = await withTransaction(async (client) => {
    const source = await getInventoryRow(client, { warehouse, bin: from_bin, sku });
    if (!source) {
      throw new Error(`No stock record for SKU ${sku} in ${warehouse}/${from_bin}`);
    }
    const available = source.available_qty;

    if (quantity > available) {
      // 4-5. Reject the ERP transaction, persist the failure event.
      const tx = await recordErpTransaction(client, {
        id: txId,
        type: "BIN_TRANSFER",
        sku,
        from_bin,
        to_bin,
        warehouse,
        qty: quantity,
        status: "REJECTED",
        reason: `Stock constraint violated: requested ${quantity} > available ${available} (ERR_STOCK_NEG)`,
        actor
      });
      return { rejected: true, tx, source, available };
    }

    // 6. Valid: mutate real inventory state.
    const updatedSource = await adjustInventory(client, {
      warehouse, bin: from_bin, sku, product_name: source.product_name, delta: -quantity
    });
    const updatedDest = await adjustInventory(client, {
      warehouse, bin: to_bin, sku, product_name: source.product_name, delta: quantity
    });
    const tx = await recordErpTransaction(client, {
      id: txId,
      type: "BIN_TRANSFER",
      sku,
      from_bin,
      to_bin,
      warehouse,
      qty: quantity,
      status: "COMPLETED",
      reason: `Transferred ${quantity} units ${from_bin} → ${to_bin}`,
      actor
    });
    return { rejected: false, tx, updatedSource, updatedDest };
  });

  if (!evaluation.rejected) {
    return {
      status: "COMPLETED",
      transaction: evaluation.tx,
      inventory: await listInventory(),
      message: `Transfer completed: ${quantity} units of ${sku} moved ${from_bin} → ${to_bin}. ${from_bin} now ${evaluation.updatedSource.available_qty}, ${to_bin} now ${evaluation.updatedDest.available_qty}.`
    };
  }

  // 6-9. Rejected → ingest a real, persisted IncidentAI incident (outside the tx so the
  // rejection record is already committed and the incident carries a stable correlation id).
  const incidentText =
    `ERR_STOCK_NEG — Warehouse bin transfer rejected. Attempted to move ${quantity} units of SKU ${sku} ` +
    `from Bin ${from_bin} (available ${evaluation.available}) to Bin ${to_bin} in ${warehouse}. ` +
    `Stock constraint available_qty >= 0 would be breached.`;

  const ticket = await runIncidentIngestPipeline({
    text: incidentText,
    reporter: "Smart Manufacturing ERP",
    erp_context: {
      erp: "Smart Manufacturing ERP",
      module: "INVENTORY",
      route: "/inventory/bin-transfers",
      record_id: evaluation.tx.id,
      correlation_id: evaluation.tx.id,
      warehouse,
      bin_from: from_bin,
      bin_to: to_bin,
      sku,
      qty: quantity,
      available_qty: evaluation.available,
      error_code: "ERR_STOCK_NEG",
      source_transaction_status: "REJECTED"
    }
  });

  await updateErpTransaction(evaluation.tx.id, { incident_id: ticket.id });

  return {
    status: "REJECTED",
    transaction: { ...evaluation.tx, incident_id: ticket.id },
    incident: {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      status: ticket.status,
      severity: ticket.severity,
      title: ticket.title,
      assigned_dev_name: ticket.assigned_dev_name,
      correlation_id: ticket.correlation_id
    },
    message: `ERP rejected the transfer (${quantity} > ${evaluation.available}). Incident ${ticket.ticket_number} created and persisted.`
  };
}

export async function getIncidentForTransaction(txIncidentId) {
  return txIncidentId ? getTicketById(txIncidentId) : null;
}
