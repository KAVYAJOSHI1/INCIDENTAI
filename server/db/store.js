/**
 * Postgres-backed data store (server/db/schema.sql). Every export here is async —
 * callers must await. Embeddings are generated via embeddingService when
 * VOYAGE_API_KEY is configured; ticket/article rows are written with a NULL
 * embedding otherwise, and duplicate/knowledge search fall back to TF-IDF.
 */

import { query } from "./postgres.js";
import { embedDocuments, toVectorLiteral } from "../services/embeddingService.js";

// Ensure Phase 6 + remediation lifecycle columns exist on database startup
(async function migrateSchema() {
  try {
    await query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS mcp_evidence JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS rag_evidence JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS ai_diagnosis JSONB NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS correlation_id TEXT,
      ADD COLUMN IF NOT EXISTS resolution_type TEXT,
      ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS reviewer_name TEXT,
      ADD COLUMN IF NOT EXISTS resolution_owner TEXT,
      ADD COLUMN IF NOT EXISTS business_impact_score NUMERIC,
      ADD COLUMN IF NOT EXISTS affected_warehouse TEXT,
      ADD COLUMN IF NOT EXISTS affected_process TEXT,
      ADD COLUMN IF NOT EXISTS remediation_status TEXT,
      ADD COLUMN IF NOT EXISTS patch_version TEXT,
      ADD COLUMN IF NOT EXISTS verification_result JSONB;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS remediation (
        ticket_id TEXT PRIMARY KEY,
        ticket_number TEXT,
        plan JSONB NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'PROPOSED',
        approved_by TEXT,
        approved_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        verification_result JSONB,
        applied_by TEXT,
        applied_at TIMESTAMPTZ,
        reverted_at TIMESTAMPTZ,
        rollback_reason TEXT,
        current_version TEXT,
        target_version TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        actor TEXT,
        action TEXT NOT NULL,
        previous_state TEXT,
        new_state TEXT,
        patch_version TEXT,
        verification_result TEXT,
        rollback_status TEXT,
        details TEXT,
        synthetic BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_incident ON audit_log (incident_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);`);

    // ── Embedded ERP operational state — REAL, database-backed (not a frontend mock) ──
    await query(`
      CREATE TABLE IF NOT EXISTS erp_inventory (
        id TEXT PRIMARY KEY,
        warehouse TEXT NOT NULL,
        bin TEXT NOT NULL,
        sku TEXT NOT NULL,
        product_name TEXT NOT NULL,
        available_qty INTEGER NOT NULL DEFAULT 0,
        reserved_qty INTEGER NOT NULL DEFAULT 0,
        reorder_threshold INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (warehouse, bin, sku)
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS erp_transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        sku TEXT, from_bin TEXT, to_bin TEXT, warehouse TEXT, qty INTEGER,
        status TEXT NOT NULL,
        reason TEXT,
        incident_id TEXT,
        actor TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    // Seed operational master data (idempotent — demo values, but the rows are real).
    await query(`
      INSERT INTO erp_inventory (id, warehouse, bin, sku, product_name, available_qty, reserved_qty, reorder_threshold) VALUES
        ('inv_wha_w1_sk902',  'WH-A', 'W1', 'SK-902',      'Industrial Motor Assembly',  84,  12, 25),
        ('inv_wha_w2_sk902',  'WH-A', 'W2', 'SK-902',      'Industrial Motor Assembly',  12,   4, 25),
        ('inv_wha_w2_cell',   'WH-A', 'W2', 'CELL-21700',  'Li-Ion Battery Cell 21700', 340,  60, 100),
        ('inv_whb_b4_pcb',    'WH-B', 'B4', 'PCB-TURB-01',  'Turbine Controller PCB',    18,  15, 20)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Collapse to the two supported personas — remove legacy demo accounts entirely.
    await query(`DELETE FROM users WHERE role NOT IN ('DEVELOPER','EXECUTIVE');`);

    // Reconcile legacy rows where status/remediation_status drifted apart before the
    // authoritative state machine existed (e.g. status=TRIAGED but remediation_status=APPROVED).
    await query(`
      UPDATE tickets SET status = CASE remediation_status
        WHEN 'APPLIED'  THEN 'RESOLVED'
        WHEN 'VERIFIED' THEN 'VERIFICATION'
        ELSE remediation_status END
      WHERE remediation_status IN ('APPROVED','VERIFIED','APPLIED','ROLLED_BACK','VERIFICATION_FAILED')
        AND status IN ('TRIAGED','NEW','ASSIGNED');
    `);
  } catch (err) {
    // Ignore migration error if DB connecting later
  }
})();

function rowToUser(row) {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    name: row.name,
    role: row.role,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

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
    reviewer_name: row.reviewer_name || row.reviewer || 'Sarah Chen',
    resolution_owner: row.resolution_owner || row.assigned_dev_name || 'Marcus Vance',
    erp_context: row.erp_context,
    assigned_dev_id: row.assigned_dev_id,
    assigned_dev_name: row.assigned_dev_name,
    erp_module: row.erp_module,
    severity: row.severity,
    status: row.status,
    remediation_status: row.remediation_status || null,
    patch_version: row.patch_version || null,
    verification_result: row.verification_result || null,
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
    ai_generated: row.ai_generated != null ? Boolean(row.ai_generated) : true,
    mcp_evidence: row.mcp_evidence || [],
    rag_evidence: row.rag_evidence || [],
    ai_diagnosis: row.ai_diagnosis || {},
    correlation_id: row.correlation_id || null,
    resolution_type: row.resolution_type || null,
    requires_human_review: row.requires_human_review ?? true,
    business_impact_score: row.business_impact_score != null ? Number(row.business_impact_score) : 6,
    affected_warehouse: row.affected_warehouse || null,
    affected_process: row.affected_process || null,
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
      mcp_evidence, rag_evidence, ai_diagnosis, correlation_id, erp_context, resolution_type, requires_human_review,
      embedding, created_at, resolved_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)
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
      JSON.stringify(ticket.mcp_evidence || []),
      JSON.stringify(ticket.rag_evidence || []),
      JSON.stringify(ticket.ai_diagnosis || {}),
      ticket.correlation_id || null,
      JSON.stringify(ticket.erp_context || {}),
      ticket.resolution_type || null,
      ticket.requires_human_review ?? true,
      toVectorLiteral(embedding),
      ticket.created_at || new Date().toISOString(),
      ticket.resolved_at || null
    ]
  );

  return rowToTicket(rows[0]);
}

const TICKET_JSON_COLUMNS = new Set(["reproduction_steps", "ocr_findings", "severity_analysis", "duplicate_check", "rag_kb_matches", "developer_routing", "pipeline_timings_ms", "mcp_evidence", "rag_evidence", "ai_diagnosis", "verification_result"]);
const TICKET_COLUMNS = new Set([
  "ticket_number", "title", "reporter", "reviewer_name", "resolution_owner", "assigned_dev_id", "assigned_dev_name", "erp_module", "severity", "status",
  "vague_user_input", "structured_description", "expected_behavior", "actual_behavior",
  "ai_root_cause", "ai_suggested_patch", "ai_confidence", "sla_remaining_minutes", "resolved_at",
  "correlation_id", "resolution_type", "requires_human_review", "business_impact_score", "affected_warehouse", "affected_process",
  "remediation_status", "patch_version",
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
  const embeddingText = [article.title, article.problem, article.root_cause, article.solution].filter(Boolean).join("\n");
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

export async function createUser(user) {
  const { rows } = await query(
    "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [user.id, user.email.toLowerCase(), user.password_hash, user.name, user.role]
  );
  return rowToUser(rows[0]);
}

export async function getUserByEmail(email) {
  const { rows } = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function getUserById(id) {
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

/* ─────────────────────────  Remediation plan persistence  ───────────────────────── */

function rowToRemediation(row) {
  if (!row) return null;
  return {
    ticket_id: row.ticket_id,
    ticket_number: row.ticket_number,
    plan: row.plan || {},
    status: row.status,
    approved_by: row.approved_by || null,
    approved_at: row.approved_at instanceof Date ? row.approved_at.toISOString() : row.approved_at,
    rejected_at: row.rejected_at instanceof Date ? row.rejected_at.toISOString() : row.rejected_at,
    rejection_reason: row.rejection_reason || null,
    verification_result: row.verification_result || null,
    applied_by: row.applied_by || null,
    applied_at: row.applied_at instanceof Date ? row.applied_at.toISOString() : row.applied_at,
    reverted_at: row.reverted_at instanceof Date ? row.reverted_at.toISOString() : row.reverted_at,
    rollback_reason: row.rollback_reason || null,
    current_version: row.current_version || null,
    target_version: row.target_version || null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export async function getRemediationRow(ticketId) {
  const { rows } = await query(
    `SELECT r.* FROM remediation r
     LEFT JOIN tickets t ON (t.id = r.ticket_id OR t.ticket_number = r.ticket_id)
     WHERE r.ticket_id = $1 OR t.id = $1 OR t.ticket_number = $1
     LIMIT 1`,
    [ticketId]
  );
  return rowToRemediation(rows[0]);
}

const REMEDIATION_JSON_COLUMNS = new Set(["plan", "verification_result"]);
const REMEDIATION_COLUMNS = new Set([
  "ticket_number", "plan", "status", "approved_by", "approved_at", "rejected_at", "rejection_reason",
  "verification_result", "applied_by", "applied_at", "reverted_at", "rollback_reason",
  "current_version", "target_version"
]);

export async function upsertRemediationRow(ticketId, fields) {
  const existing = await getRemediationRow(ticketId);
  const keys = Object.keys(fields).filter((k) => REMEDIATION_COLUMNS.has(k));

  if (!existing) {
    const cols = ["ticket_id", ...keys];
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const values = [ticketId, ...keys.map((k) => (REMEDIATION_JSON_COLUMNS.has(k) ? JSON.stringify(fields[k]) : fields[k]))];
    // Concurrent first-touch (e.g. remediation + patch fetched in parallel) must not
    // race on the primary key — insert idempotently, then read back the winner.
    const { rows } = await query(
      `INSERT INTO remediation (${cols.join(", ")}) VALUES (${placeholders.join(", ")})
       ON CONFLICT (ticket_id) DO NOTHING RETURNING *`,
      values
    );
    if (rows[0]) return rowToRemediation(rows[0]);
    return getRemediationRow(ticketId);
  }

  if (keys.length === 0) return existing;
  const setClause = [...keys.map((k, i) => `${k} = $${i + 2}`), "updated_at = now()"].join(", ");
  const values = keys.map((k) => (REMEDIATION_JSON_COLUMNS.has(k) ? JSON.stringify(fields[k]) : fields[k]));
  const { rows } = await query(`UPDATE remediation SET ${setClause} WHERE ticket_id = $1 RETURNING *`, [existing.ticket_id, ...values]);
  return rowToRemediation(rows[0]);
}

/* ─────────────────────────  Audit trail persistence  ───────────────────────── */

function rowToAudit(row) {
  return {
    id: row.id,
    incident_id: row.incident_id,
    actor: row.actor,
    action: row.action,
    previous_state: row.previous_state,
    new_state: row.new_state,
    patch_version: row.patch_version,
    verification_result: row.verification_result,
    rollback_status: row.rollback_status,
    details: row.details,
    synthetic: row.synthetic === true,
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function insertAuditEvent(entry) {
  const { rows } = await query(
    `INSERT INTO audit_log (id, incident_id, actor, action, previous_state, new_state, patch_version, verification_result, rollback_status, details, synthetic)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      entry.id,
      entry.incident_id || "UNKNOWN",
      entry.actor || null,
      entry.action,
      entry.previous_state || null,
      entry.new_state || null,
      entry.patch_version || null,
      entry.verification_result || null,
      entry.rollback_status || null,
      entry.details || "",
      entry.synthetic === true
    ]
  );
  return rowToAudit(rows[0]);
}

export async function listAuditByIncident(incidentId) {
  const { rows } = await query(
    `SELECT a.* FROM audit_log a
     LEFT JOIN tickets t ON (t.id = a.incident_id OR t.ticket_number = a.incident_id)
     WHERE a.incident_id = $1 OR t.id = $1 OR t.ticket_number = $1
     ORDER BY a.created_at ASC`,
    [incidentId]
  );
  return rows.map(rowToAudit);
}

export async function listAuditAll(limit = 50) {
  const { rows } = await query(`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1`, [limit]);
  return rows.map(rowToAudit);
}

/* ─────────────────────────  Embedded ERP operational state  ───────────────────────── */

function rowToInventory(row) {
  return {
    id: row.id,
    warehouse: row.warehouse,
    bin: row.bin,
    sku: row.sku,
    product_name: row.product_name,
    available_qty: Number(row.available_qty),
    reserved_qty: Number(row.reserved_qty),
    reorder_threshold: Number(row.reorder_threshold),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export async function listInventory() {
  const { rows } = await query("SELECT * FROM erp_inventory ORDER BY warehouse, bin, sku");
  return rows.map(rowToInventory);
}

export async function getInventoryRow(client, { warehouse, bin, sku }) {
  const runner = client || { query };
  const { rows } = await runner.query(
    "SELECT * FROM erp_inventory WHERE warehouse = $1 AND bin = $2 AND sku = $3 FOR UPDATE",
    [warehouse, bin, sku]
  );
  return rows[0] ? rowToInventory(rows[0]) : null;
}

export async function adjustInventory(client, { warehouse, bin, sku, product_name, delta }) {
  const runner = client || { query };
  const { rows } = await runner.query(
    `INSERT INTO erp_inventory (id, warehouse, bin, sku, product_name, available_qty, updated_at)
     VALUES ($1, $2, $3, $4, $5, GREATEST($6, 0), now())
     ON CONFLICT (warehouse, bin, sku)
     DO UPDATE SET available_qty = erp_inventory.available_qty + $6, updated_at = now()
     RETURNING *`,
    [`inv_${warehouse}_${bin}_${sku}`.toLowerCase().replace(/[^a-z0-9_]/g, ""), warehouse, bin, sku, product_name || sku, delta]
  );
  return rowToInventory(rows[0]);
}

export async function recordErpTransaction(client, tx) {
  const runner = client || { query };
  const { rows } = await runner.query(
    `INSERT INTO erp_transactions (id, type, sku, from_bin, to_bin, warehouse, qty, status, reason, incident_id, actor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [tx.id, tx.type, tx.sku || null, tx.from_bin || null, tx.to_bin || null, tx.warehouse || null, tx.qty ?? null,
     tx.status, tx.reason || null, tx.incident_id || null, tx.actor || null]
  );
  return rows[0];
}

export async function updateErpTransaction(id, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const { rows } = await query(`UPDATE erp_transactions SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...keys.map((k) => patch[k])]);
  return rows[0] || null;
}

export async function listErpTransactions(limit = 25) {
  const { rows } = await query("SELECT * FROM erp_transactions ORDER BY created_at DESC LIMIT $1", [limit]);
  return rows;
}
