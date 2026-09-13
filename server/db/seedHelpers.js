/**
 * Shared seed routines used by BOTH the one-shot seeder (server/db/seed.js) and the
 * runtime "Reset Demo Environment" action (server/services/demoResetService.js).
 *
 * This module has NO top-level side effects — importing it never touches the database —
 * so it is safe to import into the live server process.
 */

import { query } from "./postgres.js";
import { developers, tickets, knowledgeBase } from "./seedData.js";
import { addTicket, addKnowledgeArticle, createUser } from "./store.js";
import { hashPassword } from "../services/authService.js";

export const DEMO_PASSWORD = "demopass123";
export const DEMO_USERS = [
  { id: "user_demo_developer", email: "developer@incidentai.demo", name: "Devi Developer", role: "DEVELOPER" },
  { id: "user_demo_executive", email: "executive@incidentai.demo", name: "Erin Executive", role: "EXECUTIVE" }
];

export async function seedDevelopers() {
  for (const dev of developers) {
    await query(
      `INSERT INTO developers (id, name, role, avatar, skills, erp_modules, active_tickets, max_capacity, historical_mttr_hours, on_call, performance_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET active_tickets = EXCLUDED.active_tickets`,
      [
        dev.id, dev.name, dev.role, dev.avatar,
        JSON.stringify(dev.skills), JSON.stringify(dev.erp_modules),
        dev.active_tickets, dev.max_capacity, dev.historical_mttr_hours, dev.on_call, dev.performance_score
      ]
    );
  }
  console.log(`[seed] ${developers.length} developers`);
}

/** Insert the canonical baseline tickets (fixed ids + fixed lifecycle states). */
export async function seedBaselineTickets() {
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
      correlation_id: t.correlation_id || null,
      pipeline_timings_ms: {},
      created_at: t.created_at,
      resolved_at: t.resolved_at || null
    });
  }
  console.log(`[seed] ${tickets.length} baseline tickets`);
}

/** Seed KB articles. With { onlyMissing: true } it inserts only ids not already present. */
export async function seedKnowledgeBase({ onlyMissing = false } = {}) {
  let added = 0;
  for (const article of knowledgeBase) {
    if (onlyMissing) {
      const { rows } = await query("SELECT 1 FROM knowledge_base WHERE id = $1", [article.id]);
      if (rows.length) continue;
    }
    await addKnowledgeArticle(article);
    added += 1;
  }
  console.log(`[seed] ${added} knowledge base articles${onlyMissing ? " (missing only)" : ""}`);
  return added;
}

export async function seedUsers() {
  const password_hash = await hashPassword(DEMO_PASSWORD);
  for (const user of DEMO_USERS) {
    try {
      await createUser({ ...user, password_hash });
    } catch {
      /* already exists */
    }
  }
  console.log(`[seed] ${DEMO_USERS.length} demo users`);
}
