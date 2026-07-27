/**
 * Applies server/db/schema.sql against DATABASE_URL / PG* env vars. Idempotent
 * (every statement is CREATE ... IF NOT EXISTS) — safe to re-run.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./postgres.js";

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");

async function main() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  const pool = getPool();
  await pool.query(sql);
  console.log("[migrate] schema applied");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] failed:", err.message);
  process.exit(1);
});
