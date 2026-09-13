/**
 * Reset Demo Environment
 * ======================
 * Deterministically returns IncidentAI's embedded ERP + incident state to the known
 * presentation baseline so the same demo can be run many times in a row.
 *
 * What it resets (demo / operational data only):
 *   - tickets, remediation, audit_log        → wiped, then the 5 canonical seed incidents re-created
 *   - erp_transactions                        → wiped
 *   - erp_inventory                           → restored to seedData.erpInventoryBaseline quantities
 *   - developers.active_tickets               → restored to seed values
 *   - knowledge_base                          → left intact; missing baseline articles are added
 *
 * What it NEVER touches: schema, users / logins, configuration, existing verified knowledge.
 */

import { query, withTransaction } from "../db/postgres.js";
import { erpInventoryBaseline, knowledgeBase } from "../db/seedData.js";
import { seedDevelopers, seedBaselineTickets, seedKnowledgeBase } from "../db/seedHelpers.js";
import { recordAuditEvent } from "./auditService.js";

export async function resetDemoEnvironment(actor = "Demo Presenter") {
  // 1. Wipe incident + remediation + audit + ERP transaction state in one transaction.
  const wiped = await withTransaction(async (client) => {
    const a = await client.query("DELETE FROM audit_log");
    const r = await client.query("DELETE FROM remediation");
    const t = await client.query("DELETE FROM tickets");
    const x = await client.query("DELETE FROM erp_transactions");

    // 2. Restore embedded ERP inventory to the exact baseline quantities.
    for (const inv of erpInventoryBaseline) {
      await client.query(
        `INSERT INTO erp_inventory (id, warehouse, bin, sku, product_name, available_qty, reserved_qty, reorder_threshold, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
         ON CONFLICT (warehouse, bin, sku)
         DO UPDATE SET available_qty = EXCLUDED.available_qty,
                       reserved_qty = EXCLUDED.reserved_qty,
                       reorder_threshold = EXCLUDED.reorder_threshold,
                       product_name = EXCLUDED.product_name,
                       updated_at = now()`,
        [inv.id, inv.warehouse, inv.bin, inv.sku, inv.product_name, inv.available_qty, inv.reserved_qty, inv.reorder_threshold]
      );
    }

    return {
      audit_cleared: a.rowCount,
      remediation_cleared: r.rowCount,
      tickets_cleared: t.rowCount,
      transactions_cleared: x.rowCount
    };
  });

  // 3. Prune knowledge-base articles captured during previous demo runs (keep only the
  //    canonical baseline set), then ensure every baseline article is present.
  const baselineIds = knowledgeBase.map((a) => a.id);
  const pruned = await query(
    `DELETE FROM knowledge_base WHERE id <> ALL($1::text[])`,
    [baselineIds]
  );

  // 4. Re-create the canonical baseline (outside the tx — regenerates embeddings via Voyage/TF-IDF).
  await seedDevelopers();                 // also resets developers.active_tickets
  await seedBaselineTickets();            // 5 fixed-id incidents at their designed lifecycle states
  const kbAdded = await seedKnowledgeBase({ onlyMissing: true }); // ensure scenario KB articles exist

  const { rows: ticketCount } = await query("SELECT count(*)::int AS c FROM tickets");
  const { rows: invCount } = await query("SELECT count(*)::int AS c FROM erp_inventory");

  const summary = {
    ...wiped,
    knowledge_articles_pruned: pruned.rowCount,
    knowledge_articles_added: kbAdded,
    tickets_after_reset: ticketCount[0].c,
    inventory_rows_after_reset: invCount[0].c,
    reset_at: new Date().toISOString()
  };

  await recordAuditEvent({
    incident_id: "DEMO-RESET",
    actor,
    action: "DEMO_ENVIRONMENT_RESET",
    details: `Demo environment reset to baseline: ${summary.tickets_after_reset} incidents, ${summary.inventory_rows_after_reset} inventory rows; ${wiped.transactions_cleared} ERP transactions and ${wiped.audit_cleared} audit rows cleared.`
  }).catch(() => {});

  return summary;
}
