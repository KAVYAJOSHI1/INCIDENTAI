/**
 * Postgres-backed data store (server/db/schema.sql). Every export here is async —
 * callers must await. Embeddings are generated via embeddingService when
 * VOYAGE_API_KEY is configured; ticket/article rows are written with a NULL
 * embedding otherwise, and duplicate/knowledge search fall back to TF-IDF.
 */

import { query } from "./postgres.js";
import { embedDocuments, toVectorLiteral } from "../services/embeddingService.js";

function rowToDeveloper(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    skills: row.skills,
    erp_modules: row.erp_modules,
    active_tickets: row.active_tickets,
    max_capacity: row.max_capacity,
    historical_mttr_hours: Number(row.historical_mttr_hours),
    on_call: row.on_call,
    performance_score: Number(row.performance_score)
  };
}

function rowToTicket(row) {
  return {
    id: row.id,
    ticket_number: row.ticket_number,
    title: row.title,
    reporter: row.reporter,
    assigned_dev_id: row.assigned_dev_id,
    assigned_dev_name: row.assigned_dev_name,
    erp_module: row.erp_module,
    severity: row.severity,
    status: row.status,
    vague_user_input: row.vague_user_input,
    structured_description: row.structured_description,
    reproduction_steps: row.reproduction_steps,
    expected_behavior: row.expected_behavior,
    actual_behavior: row.actual_behavior,
    ocr_findings: row.ocr_findings,
    severity_analysis: row.severity_analysis,
    duplicate_check: row.duplicate_check,
    rag_kb_matches: row.rag_kb_matches,
    developer_routing: row.developer_routing,
    ai_root_cause: row.ai_root_cause,
    ai_suggested_patch: row.ai_suggested_patch,
    ai_confidence: row.ai_confidence != null ? Number(row.ai_confidence) : null,
    sla_remaining_minutes: row.sla_remaining_minutes,
    pipeline_timings_ms: row.pipeline_timings_ms,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    resolved_at: row.resolved_at instanceof Date ? row.resolved_at.toISOString() : row.resolved_at
  };
}

function rowToArticle(row) {
  return {
    id: row.id,
    title: row.title,
    erp_module: row.erp_module,
    error_code: row.error_code,
    solution: row.solution,
    confidence: Number(row.confidence),
    tags: row.tags
  };
}

export async function listDevelopers() {
  const { rows } = await query("SELECT * FROM developers ORDER BY id");
  return rows.map(rowToDeveloper);
}

export async function getDeveloperById(id) {
  const { rows } = await query("SELECT * FROM developers WHERE id = $1", [id]);
  return rows[0] ? rowToDeveloper(rows[0]) : null;
}

const DEVELOPER_COLUMNS = new Set(["name", "role", "avatar", "skills", "erp_modules", "active_tickets", "max_capacity", "historical_mttr_hours", "on_call", "performance_score"]);
const JSON_DEVELOPER_COLUMNS = new Set(["skills", "erp_modules"]);

export async function updateDeveloper(id, patch) {
  const keys = Object.keys(patch).filter((k) => DEVELOPER_COLUMNS.has(k));
  if (keys.length === 0) return getDeveloperById(id);

  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => (JSON_DEVELOPER_COLUMNS.has(k) ? JSON.stringify(patch[k]) : patch[k]));

  const { rows } = await query(`UPDATE developers SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
  return rows[0] ? rowToDeveloper(rows[0]) : null;
}

export async function listTickets(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
  if (filters.severity) { values.push(filters.severity); conditions.push(`severity = $${values.length}`); }
  if (filters.erp_module) { values.push(filters.erp_module); conditions.push(`erp_module = $${values.length}`); }
  if (filters.assigned_dev_id) { values.push(filters.assigned_dev_id); conditions.push(`assigned_dev_id = $${values.length}`); }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await query(`SELECT * FROM tickets ${whereClause} ORDER BY created_at DESC`, values);
  return rows.map(rowToTicket);
}

export async function getTicketById(id) {
  const { rows } = await query("SELECT * FROM tickets WHERE id = $1 OR ticket_number = $1", [id]);
  return rows[0] ? rowToTicket(rows[0]) : null;
}

export async function addTicket(ticket) {
  const embeddingText = [ticket.title, ticket.structured_description, ticket.vague_user_input].filter(Boolean).join("\n");
  const [embedding] = (await embedDocuments([embeddingText])) || [null];

  const { rows } = await query(
    `INSERT INTO tickets (
      id, ticket_number, title, reporter, assigned_dev_id, assigned_dev_name, erp_module, severity, status,
      vague_user_input, structured_description, reproduction_steps, expected_behavior, actual_behavior,
      ocr_findings, severity_analysis, duplicate_check, rag_kb_matches, developer_routing,
      ai_root_cause, ai_suggested_patch, ai_confidence, sla_remaining_minutes, pipeline_timings_ms,
      embedding, created_at, resolved_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
    RETURNING *`,
    [
      ticket.id,
      ticket.ticket_number,
      ticket.title,
      ticket.reporter,
      ticket.assigned_dev_id,
      ticket.assigned_dev_name,
      ticket.erp_module,
      ticket.severity,
      ticket.status,
      ticket.vague_user_input,
      ticket.structured_description,
      JSON.stringify(ticket.reproduction_steps || []),
      ticket.expected_behavior,
      ticket.actual_behavior,
      JSON.stringify(ticket.ocr_findings || {}),
      JSON.stringify(ticket.severity_analysis || {}),
      JSON.stringify(ticket.duplicate_check || {}),
      JSON.stringify(ticket.rag_kb_matches || []),
      JSON.stringify(ticket.developer_routing || {}),
      ticket.ai_root_cause,
      ticket.ai_suggested_patch,
      ticket.ai_confidence,
      ticket.sla_remaining_minutes,
      JSON.stringify(ticket.pipeline_timings_ms || {}),
      toVectorLiteral(embedding),
      ticket.created_at || new Date().toISOString(),
      ticket.resolved_at || null
    ]
  );

  return rowToTicket(rows[0]);
}

const TICKET_JSON_COLUMNS = new Set(["reproduction_steps", "ocr_findings", "severity_analysis", "duplicate_check", "rag_kb_matches", "developer_routing", "pipeline_timings_ms"]);
const TICKET_COLUMNS = new Set([
  "ticket_number", "title", "reporter", "assigned_dev_id", "assigned_dev_name", "erp_module", "severity", "status",
  "vague_user_input", "structured_description", "expected_behavior", "actual_behavior",
  "ai_root_cause", "ai_suggested_patch", "ai_confidence", "sla_remaining_minutes", "resolved_at",
  ...TICKET_JSON_COLUMNS
]);

export async function updateTicket(id, patch) {
  const keys = Object.keys(patch).filter((k) => TICKET_COLUMNS.has(k));
  if (keys.length === 0) return getTicketById(id);

  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => (TICKET_JSON_COLUMNS.has(k) ? JSON.stringify(patch[k]) : patch[k]));

  const { rows } = await query(`UPDATE tickets SET ${setClause} WHERE id = $1 OR ticket_number = $1 RETURNING *`, [id, ...values]);
  return rows[0] ? rowToTicket(rows[0]) : null;
}

export async function listKnowledgeBase() {
  const { rows } = await query("SELECT * FROM knowledge_base ORDER BY id");
  return rows.map(rowToArticle);
}

export async function addKnowledgeArticle(article) {
  const embeddingText = [article.title, article.solution].filter(Boolean).join("\n");
  const [embedding] = (await embedDocuments([embeddingText])) || [null];

  const { rows } = await query(
    `INSERT INTO knowledge_base (id, title, erp_module, error_code, solution, confidence, tags, embedding)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [article.id, article.title, article.erp_module, article.error_code, article.solution, article.confidence, JSON.stringify(article.tags || []), toVectorLiteral(embedding)]
  );

  return rowToArticle(rows[0]);
}

export async function recordPipelineTrace(trace) {
  const { rows } = await query("INSERT INTO pipeline_traces (trace) VALUES ($1) RETURNING *", [JSON.stringify(trace)]);
  return rows[0].trace;
}

export async function listPipelineTraces(limit = 10) {
  const { rows } = await query("SELECT trace FROM pipeline_traces ORDER BY created_at DESC LIMIT $1", [limit]);
  return rows.map((r) => r.trace);
}
