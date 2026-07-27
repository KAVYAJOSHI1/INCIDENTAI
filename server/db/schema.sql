-- IncidentAI Postgres schema. Applied automatically by docker-compose on first
-- container start (mounted into /docker-entrypoint-initdb.d); run manually via
-- `npm run db:migrate` against an existing database.

CREATE EXTENSION IF NOT EXISTS vector;

-- Voyage AI voyage-3.5 default output dimension. Populated by embeddingService
-- when VOYAGE_API_KEY is configured; left NULL otherwise (TF-IDF fallback still works).
-- Change this value (and re-run) if you switch embedding models/dimensions.
CREATE TABLE IF NOT EXISTS developers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT,
  skills JSONB NOT NULL DEFAULT '[]',
  erp_modules JSONB NOT NULL DEFAULT '[]',
  active_tickets INTEGER NOT NULL DEFAULT 0,
  max_capacity INTEGER NOT NULL DEFAULT 5,
  historical_mttr_hours NUMERIC NOT NULL DEFAULT 0,
  on_call BOOLEAN NOT NULL DEFAULT FALSE,
  performance_score NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  reporter TEXT,
  assigned_dev_id TEXT REFERENCES developers(id),
  assigned_dev_name TEXT,
  erp_module TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  vague_user_input TEXT,
  structured_description TEXT,
  reproduction_steps JSONB NOT NULL DEFAULT '[]',
  expected_behavior TEXT,
  actual_behavior TEXT,
  ocr_findings JSONB NOT NULL DEFAULT '{}',
  severity_analysis JSONB NOT NULL DEFAULT '{}',
  duplicate_check JSONB NOT NULL DEFAULT '{}',
  rag_kb_matches JSONB NOT NULL DEFAULT '[]',
  developer_routing JSONB NOT NULL DEFAULT '{}',
  ai_root_cause TEXT,
  ai_suggested_patch TEXT,
  ai_confidence NUMERIC,
  sla_remaining_minutes INTEGER,
  pipeline_timings_ms JSONB NOT NULL DEFAULT '{}',
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_erp_module ON tickets (erp_module);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_dev_id ON tickets (assigned_dev_id);
-- Cosine-distance ANN index; only useful once rows have embeddings populated.
CREATE INDEX IF NOT EXISTS idx_tickets_embedding ON tickets USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  erp_module TEXT NOT NULL,
  error_code TEXT,
  solution TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.8,
  tags JSONB NOT NULL DEFAULT '[]',
  embedding VECTOR(1024)
);

CREATE INDEX IF NOT EXISTS idx_kb_erp_module ON knowledge_base (erp_module);
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS pipeline_traces (
  id SERIAL PRIMARY KEY,
  trace JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
