/**
 * Seeds Postgres from the original mock dataset (server/db/seedData.js). Safe to
 * re-run: skips seeding (unless --force) if the tickets table already has rows, so
 * it won't regenerate embeddings or clobber real data on an already-seeded DB.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, query } from "./postgres.js";
import { developers, tickets, knowledgeBase } from "./seedData.js";
import { addTicket, addKnowledgeArticle, createUser } from "./store.js";
import { hashPassword } from "../services/authService.js";

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");
const force = process.argv.includes("--force");

// One demo login per role, all sharing the same password, so a fresh checkout can be
// logged into immediately without registering. Never use these for a real deployment.
const DEMO_PASSWORD = "demopass123";
const DEMO_USERS = [
  { id: "user_demo_enduser", email: "enduser@incidentai.demo", name: "Dana Reporter", role: "END_USER" },
  { id: "user_demo_triage", email: "triage@incidentai.demo", name: "Tariq Triage", role: "SUPPORT_TRIAGE" },
  { id: "user_demo_developer", email: "developer@incidentai.demo", name: "Devi Developer", role: "DEVELOPER" },
  { id: "user_demo_executive", email: "executive@incidentai.demo", name: "Erin Executive", role: "EXECUTIVE" }
];

async function seedDevelopers() {
  for (const dev of developers) {
    await query(
      `INSERT INTO developers (id, name, role, avatar, skills, erp_modules, active_tickets, max_capacity, historical_mttr_hours, on_call, performance_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [
        dev.id, dev.name, dev.role, dev.avatar,
        JSON.stringify(dev.skills), JSON.stringify(dev.erp_modules),
        dev.active_tickets, dev.max_capacity, dev.historical_mttr_hours, dev.on_call, dev.performance_score
      ]
    );
  }
  console.log(`[seed] ${developers.length} developers`);
}

async function seedTickets() {
  for (const t of tickets) {
    await addTicket({
      id: t.id,
      ticket_number: t.ticket_number,
      title: t.title,
      reporter: t.reporter,
      assigned_dev_id: t.assigned_dev_id,
      assigned_dev_name: t.assigned_dev_name,
      erp_module: t.erp_module,
      severity: t.severity,
      status: t.status,
      vague_user_input: t.vague_user_input,
      structured_description: t.structured_description,
      reproduction_steps: t.reproduction_steps,
      expected_behavior: t.expected_behavior,
      actual_behavior: t.actual_behavior,
      ocr_findings: t.ocr_findings,
      severity_analysis: {},
      duplicate_check: t.duplicate_check,
      rag_kb_matches: [],
      developer_routing: {},
      ai_root_cause: t.ai_root_cause,
      ai_suggested_patch: t.ai_suggested_patch,
      ai_confidence: 0.85,
      sla_remaining_minutes: t.sla_remaining_minutes,
      pipeline_timings_ms: {},
      created_at: t.created_at,
      resolved_at: t.resolved_at || null
    });
  }
  console.log(`[seed] ${tickets.length} tickets`);
}

async function seedKnowledgeBase() {
  for (const article of knowledgeBase) {
    await addKnowledgeArticle(article);
  }
  console.log(`[seed] ${knowledgeBase.length} knowledge base articles`);
}

async function seedUsers() {
  const password_hash = await hashPassword(DEMO_PASSWORD);
  for (const user of DEMO_USERS) {
    await createUser({ ...user, password_hash });
  }
  console.log(`[seed] ${DEMO_USERS.length} demo users (password: "${DEMO_PASSWORD}" for all)`);
}

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
  }

  await seedDevelopers();
  await seedTickets();
  await seedKnowledgeBase();
  await seedUsers();

  console.log("[seed] done");
  await pool.end();
}

main().catch((err) => {
  console.error("[seed] failed:", err.message);
  process.exit(1);
});
