/**
 * Postgres connection pool. Connection details come from DATABASE_URL, or the
 * individual PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE vars (all default to the
 * docker-compose values in .env.example) if DATABASE_URL isn't set.
 */

import "../utils/loadEnv.js";
import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    pool = new Pool(
      process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.PGHOST || "localhost",
            port: Number(process.env.PGPORT || 5432),
            user: process.env.PGUSER || "incidentai",
            password: process.env.PGPASSWORD || "incidentai",
            database: process.env.PGDATABASE || "incidentai"
          }
    );
  }
  return pool;
}

export function query(text, params) {
  return getPool().query(text, params);
}

export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
