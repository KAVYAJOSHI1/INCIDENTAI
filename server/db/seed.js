/**
 * Seeds Postgres from the original mock dataset (server/db/seedData.js). Safe to
 * re-run: skips seeding (unless --force) if the tickets table already has rows, so
 * it won't regenerate embeddings or clobber real data on an already-seeded DB.
 *
 * The individual seed routines live in server/db/seedHelpers.js so "Reset Demo
 * Environment" can reuse them at runtime.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./postgres.js";
import { seedDevelopers, seedBaselineTickets, seedKnowledgeBase, seedUsers } from "./seedHelpers.js";
import { erpInventoryBaseline } from "./seedData.js";

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");
const force = process.argv.includes("--force");

async function main() {
  const pool = getPool();
  await pool.query(fs.readFileSync(schemaPath, "utf8"));

  if (!force) {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM tickets");
    if (rows[0].count > 0) {
      console.log(`[seed] tickets table already has ${rows[0].count} rows — skipping (pass --force to re-seed)`);
      await pool.end();
      return;
    }
  } else {
    console.log("[seed] --force: clearing tickets / remediation / audit / erp_transactions; restoring inventory baseline");
    await pool.query("DELETE FROM audit_log");
    await pool.query("DELETE FROM remediation");
    await pool.query("DELETE FROM erp_transactions");
    await pool.query("DELETE FROM tickets");
    await pool.query("DELETE FROM knowledge_base");
    for (const inv of erpInventoryBaseline) {
      await pool.query(
        `INSERT INTO erp_inventory (id, warehouse, bin, sku, product_name, available_qty, reserved_qty, reorder_threshold, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
         ON CONFLICT (warehouse, bin, sku) DO UPDATE SET
           available_qty = EXCLUDED.available_qty, reserved_qty = EXCLUDED.reserved_qty,
           reorder_threshold = EXCLUDED.reorder_threshold, product_name = EXCLUDED.product_name, updated_at = now()`,
        [inv.id, inv.warehouse, inv.bin, inv.sku, inv.product_name, inv.available_qty, inv.reserved_qty, inv.reorder_threshold]
      );
    }
  }

  await seedDevelopers();
  await seedBaselineTickets();
  await seedKnowledgeBase();
  await seedUsers();

  console.log("[seed] done");
  await pool.end();
}

main().catch((err) => {
  console.error("[seed] failed:", err.message);
  process.exit(1);
});
