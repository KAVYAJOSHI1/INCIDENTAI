# 🛡️ IncidentAI — Complete Master Technical & Architecture Documentation

> **Project Name:** IncidentAI — AI-Powered ERP Support Engineer  
> **Repository:** `KAVYAJOSHI1/INCIDENTAI`  
> **Target Event:** Websys Gooru Hackathon 2026 / Production-Grade Technical Documentation  
> **Source of Truth:** Consolidated master reference combining all architectural specs, implementation plans, design systems, and interview guides.

---

## 📚 Table of Contents

1. [Executive Summary & 30-Second Pitch](#1-executive-summary--30-second-pitch)
2. [Project Status & Feature Completeness Matrix](#2-project-status--feature-completeness-matrix)
3. [Master System Architecture & Workflow Diagram](#3-master-system-architecture--workflow-diagram)
4. [Complete Technology Stack & Dependencies](#4-complete-technology-stack--dependencies)
5. [Complete Incident Request Flow](#5-complete-incident-request-flow)
6. [4-Persona Dedicated Workspace Strategy (Dashboard Architecture)](#6-4-persona-dedicated-workspace-strategy-dashboard-architecture)
7. [Frontend Architecture & Component Hierarchy](#7-frontend-architecture--component-hierarchy)
8. [Backend Micro-Router & API Endpoint Map](#8-backend-micro-router--api-endpoint-map)
9. [Database Architecture (PostgreSQL + pgvector HNSW)](#9-database-architecture-postgresql--pgvector-hnsw)
10. [Dual-Engine Multimodal OCR (Tesseract.js Client & Server)](#10-dual-engine-multimodal-ocr-tesseractjs-client--server)
11. [Provider-Agnostic LLM Engine (Claude 3.5 + Groq Llama 3.3)](#11-provider-agnostic-llm-engine-claude-35--groq-llama-33)
12. [Hybrid RAG Knowledge Retrieval Pipeline](#12-hybrid-rag-knowledge-retrieval-pipeline)
13. [3-Layer Duplicate Incident Detection Engine](#13-3-layer-duplicate-incident-detection-engine)
14. [Business-Impact Severity Scoring & SLA Mapping](#14-business-impact-severity-scoring--sla-mapping)
15. [Root Cause Predictor, Patch Safety & Sandbox Terminal](#15-root-cause-predictor-patch-safety--sandbox-terminal)
16. [Developer Load Balancer & Routing Algorithm](#16-developer-load-balancer--routing-algorithm)
17. [Authentication, RBAC & Security Protocols](#17-authentication-rbac--security-protocols)
18. [Enterprise 10-Feature Operations Suite](#18-enterprise-10-feature-operations-suite)
19. [Graceful Degradation Contract & Failover Matrix](#19-graceful-degradation-contract--failover-matrix)
20. [Real vs. Simulated Feature Audit Matrix](#20-real-vs-simulated-feature-audit-matrix)
21. [Environment Variables & Configuration](#21-environment-variables--configuration)
22. [Technology Justification ("Why Did You Use X?")](#22-technology-justification-why-did-you-use-x)
23. [Technical Interview Question & Answer Bank](#23-technical-interview-question--answer-bank)
24. [Quick Start & Setup Guide](#24-quick-start--setup-guide)

---

## 1. Executive Summary & 30-Second Pitch

IncidentAI is an enterprise-grade autonomous ERP support engine designed to reduce Mean Time to Resolution (MTTR) by up to 50%. It features a multi-layer AI pipeline built on Node.js and React 19, backed by PostgreSQL with `pgvector`. 

When an incident is reported via text, browser voice recording, or screenshot, client/server Tesseract.js OCR extracts error signatures and visual bounding boxes. A provider-agnostic LLM (Anthropic Claude 3.5 Sonnet with Groq Llama 3.3 fallback) scores business impact severity (P0-P3) and generates SQL patches. A 3-layer duplicate detection system combining TF-IDF, Voyage AI 1024-dimensional vector embeddings, and LLM reranking prevents redundant tickets during system outages. Finally, a skill-matrix and MTTR-weighted developer load balancer routes tickets to the optimal engineer. Every component enforces a **Graceful Degradation Contract**—if any AI provider fails or lacks keys, the system seamlessly falls back to deterministic rule-based algorithms without user disruption.

---

## 2. Project Status & Feature Completeness Matrix

| Area | Status | Technology / Details |
|---|---|---|
| **Core AI Pipeline** | ✅ Live | OCR ➔ Severity ➔ Duplicate ➔ RAG ➔ Root Cause ➔ Routing ➔ Persistence |
| **Provider-Agnostic LLM** | ✅ Live | Anthropic Claude 3.5 Sonnet + Groq Llama 3.3 70B + Rule Engine Fallback |
| **Vector Search Engine** | ✅ Live | Voyage AI `voyage-3.5` (1024-dim) + PostgreSQL `pgvector` HNSW Index |
| **Dual-Engine OCR** | ✅ Live | Tesseract.js (Client Web Worker / WASM + Server Base64 decoder) |
| **Voice Speech Input** | ✅ Live | Native Web Speech API (`webkitSpeechRecognition`) |
| **Developer Load Balancer** | ✅ Live | Math formula (Skill Match $\times$ Capacity $\times$ Speed $\times$ On-Call) + Auto-Rebalance |
| **Sandboxed Patch Workbench**| ✅ Live | Interactive execution console with DDL/DML safety checks |
| **ERP Digital Twin Topology**| ✅ Live | `@xyflow/react` node-edge graph computing topological risk |
| **Auth & RBAC** | ✅ Live | JWT token authentication + bcryptjs + 4-tier Role Gating |

---

## 3. Master System Architecture & Workflow Diagram

```
                     +---------------------------------------+
                     |         USER INTERFACE (REACT 19)     |
                     | Web Speech API | Screenshot | Text In |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |         NODE.JS HTTP ROUTER           |
                     |      Auth / JWT / Zod Validation      |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |    TESSERACT.JS OCR VISION SERVICE    |
                     |  Base64 Image -> Bounding Box & Text  |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |    MULTI-STAGE AI INCIDENT ENGINE     |
                     +-------------------+-------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v                               v                               v
+-----------------+             +-----------------+             +-----------------+
| SEVERITY ENGINE |             | 3-LAYER DUP DET |             | RAG KNOWLEDGE   |
| AI vs Keyword   |             | TFIDF->Vec->LLM |             | pgvector 1024d  |
+--------+--------+             +--------+--------+             +--------+--------+
         |                               |                               |
         +-------------------------------+-------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |    ROOT CAUSE & SQL PATCH PREDICTOR   |
                     |  Anthropic Claude / Groq Llama 3.3    |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |  LOAD BALANCER & ROUTING SERVICE      |
                     |  Skill-Matrix + Capacity + MTTR Score |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |         POSTGRESQL + PGVECTOR         |
                     |  Tickets | Developers | Knowledge Base|
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |  DEVELOPER WORKBENCH (SANDBOXED CONSOLE) |
                     +---------------------------------------+
```

---

## 4. Complete Technology Stack & Dependencies

### Frontend (`src/`)
* **Framework:** React 19 (`^19.0.0`)
* **Build Tool:** Vite (`^5.4.11`) with `@vitejs/plugin-react` (`^4.3.4`)
* **CSS & Styling:** Tailwind CSS (`^3.4.19`), PostCSS, Autoprefixer, Dark Glassmorphism tokens
* **Icons & Visualization:** Lucide React (`^1.16.0`), Recharts (`^2.15.1`), `@xyflow/react` (`^12.4.4`), `canvas-confetti` (`^1.9.4`)
* **Browser APIs:** Native Web Speech API (`webkitSpeechRecognition`), `FileReader`, `navigator.clipboard`
* **OCR Library:** `tesseract.js` (`^7.0.0`) Web Worker & WASM module

### Backend (`server/`)
* **Runtime:** Node.js (ES Modules, `"type": "module"`)
* **HTTP Framework:** Native Node.js `node:http` module + custom regex router (`server/router.js`) — **Zero web framework dependencies**
* **Validation & Security:** Zod (`^4.4.3`), `jsonwebtoken` (`^9.0.3`), `bcryptjs` (`^3.0.3`)
* **Database Driver:** Native `pg` (`^8.22.0`) connection pool (`Pool`)

### Database & Vector Infrastructure
* **Database:** PostgreSQL 16
* **Vector Engine:** `pgvector` extension with 1024-dimensional `vector` columns
* **Vector Index:** HNSW (Hierarchical Navigable Small World) index with `vector_cosine_ops`

### AI & External APIs
* **LLM Engine:** Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`) & Groq Llama 3.3 70B (`llama-3.3-70b-versatile`)
* **Embeddings:** Voyage AI (`voyage-3.5`, 1024-dimension vectors)

---

## 5. Complete Incident Request Flow

```
[User Input] ──► [SmartReporter.jsx] ──► [POST /api/incidents/ingest] ──► [server/routes/incidents.js]
  │
  ├── 1. Validation (Zod Schema in tickets.js / store.js)
  ├── 2. OCR Preprocessing (ocrService.js -> analyzeMultimodalInputFromImage -> Tesseract worker)
  ├── 3. Severity Scoring (severityService.js -> computeSeverityWithAI -> P0-P3 + SLA)
  ├── 4. Duplicate Check (duplicateService.js -> TF-IDF -> Voyage embedding -> pgvector -> LLM)
  ├── 5. RAG Retrieval (knowledgeService.js -> Voyage query embedding -> pgvector HNSW -> top KB)
  ├── 6. Root Cause & SQL Patch (rootCauseService.js -> completeJson -> SQL patch + confidence)
  ├── 7. Developer Routing (loadBalancerService.js -> recommendDeveloperForTicket -> score formula)
  ├── 8. DB Persistence (store.js -> createTicket -> INSERT INTO tickets)
  └── 9. Response to Frontend ──► [JiraTicketView.jsx / DeveloperWorkbench.jsx]
```

---

## 6. 4-Persona Dedicated Workspace Strategy (Dashboard Architecture)

To eliminate feature duplication across user logins, IncidentAI maps each role strictly to a dedicated workspace:

### 🟢 1. End-User Self-Service Portal (`END_USER`)
* **Focus:** Incident reporting & immediate automated self-service.
* **Views:** `SmartReporter.jsx` (simplified view) + Self-Fix suggestion prompts + Personal submission status timeline.

### 🟡 2. Triage & Dispatch Command Center (`SUPPORT_TRIAGE`)
* **Focus:** Signal extraction, deduplication, and developer load balancing.
* **Views:** `TriageFeed.jsx` + `DeveloperLoadBalancer.jsx` + 3-Layer Duplicate Banner + War Room trigger.

### 🔵 3. Developer Remediation Workbench (`DEVELOPER`)
* **Focus:** Technical diagnosis, OCR bounding box inspection, and SQL patch execution.
* **Views:** `DeveloperWorkbench.jsx` + Interactive Sandboxed Execution Console + `KnowledgeHub.jsx`.

### 🟣 4. Executive Operations & Risk Intelligence (`EXECUTIVE`)
* **Focus:** Financial downtime loss, SLA metrics, and topological system health.
* **Views:** `DigitalTwin.jsx` (React Flow topology graph) + `AnalyticsDashboard.jsx` + Executive AI Briefings.

---

## 7. Frontend Architecture & Component Hierarchy

* `src/App.jsx`: Master router shell and role workspace switcher.
* `src/context/AuthContext.jsx`: User auth context managing JWT token persistence.
* `src/components/Auth/LoginScreen.jsx`: Login portal supporting demo persona presets.
* `src/components/Reporter/SmartReporter.jsx`: Multimodal ingestion UI with Web Speech API voice reporting.
* `src/components/Ticketing/TriageFeed.jsx` & `JiraTicketView.jsx`: Jira-style ticket feed with OCR bounding box overlay.
* `src/components/Workbench/DeveloperWorkbench.jsx`: Interactive terminal console (`[SYS]`, `[DB]`, `[SQL]`, `[AUDIT]`) for SQL patch execution.
* `src/components/LoadBalancer/DeveloperLoadBalancer.jsx`: Workload monitoring grid with Auto Re-Balance controls.
* `src/components/Operations/DigitalTwin.jsx`: Dynamic graph visualization built on `@xyflow/react`.

---

## 8. Backend Micro-Router & API Endpoint Map

```
POST   /api/auth/login                  -> Authenticates user & returns JWT
POST   /api/auth/register               -> Registers new user profile
GET    /api/auth/me                     -> Fetches logged-in user details
POST   /api/incidents/ingest            -> Orchestrates full multi-stage AI pipeline
POST   /api/ocr/analyze                 -> Standalone server-side Tesseract OCR endpoint
GET    /api/tickets                     -> Retrieves filtered tickets list
GET    /api/tickets/:id                 -> Retrieves single ticket details
PATCH  /api/tickets/:id                 -> Updates ticket status or resolution
GET    /api/tickets/:id/explainability  -> Generates AI decision matrix
GET    /api/tickets/:id/impact          -> Calculates financial downtime loss
POST   /api/tickets/:id/patch-preview   -> Runs safety check on generated SQL patch
GET    /api/tickets/:id/timeline        -> Returns incident lifecycle steps
GET    /api/knowledge/search            -> Executes semantic RAG vector query
GET    /api/loadbalancer/developers     -> Returns developer workload scores
POST   /api/loadbalancer/rebalance      -> Triggers auto-rebalancing for P0 outages
POST   /api/copilot/chat                -> Real-time SSE streaming copilot
GET    /api/analytics/metrics           -> Returns system SLA and MTTR analytics
GET    /api/operations/digital-twin     -> Calculates ERP topological risk scores
```

---

## 9. Database Architecture (PostgreSQL + pgvector HNSW)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE developers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]',
  erp_modules JSONB NOT NULL DEFAULT '[]',
  active_tickets INTEGER NOT NULL DEFAULT 0,
  max_capacity INTEGER NOT NULL DEFAULT 5,
  historical_mttr_hours NUMERIC NOT NULL DEFAULT 0,
  on_call BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  erp_module TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  ocr_findings JSONB NOT NULL DEFAULT '{}',
  duplicate_check JSONB NOT NULL DEFAULT '{}',
  rag_kb_matches JSONB NOT NULL DEFAULT '[]',
  ai_root_cause TEXT,
  ai_suggested_patch TEXT,
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_embedding ON tickets USING hnsw (embedding vector_cosine_ops);
```

---

## 10. Dual-Engine Multimodal OCR (Tesseract.js Client & Server)

* **Client Engine:** Runs Tesseract.js inside a browser Web Worker / WASM thread for non-blocking UI image parsing.
* **Server Engine:** `analyzeMultimodalInputFromImage(base64)` decodes base64 buffers, inspects PNG/JPEG binary headers for image dimensions, and extracts text via Node Tesseract workers.
* **Bounding Box Calculation:**
  Word coordinates ($x_0, y_0, x_1, y_1$) are normalized to percentages:
  $$\text{Top} = \left(\frac{y_0}{\text{Image Height}}\right) \times 100\% \quad \text{Left} = \left(\frac{x_0}{\text{Image Width}}\right) \times 100\%$$

---

## 11. Provider-Agnostic LLM Engine (Claude 3.5 + Groq Llama 3.3)

```
       [LLM Request]
             │
             ▼
 [Has ANTHROPIC_API_KEY?] ──Yes──► [Claude 3.5 Sonnet]
             │ No / Exception
             ▼
   [Has GROQ_API_KEY?]    ──Yes──► [Groq Llama 3.3 70B]
             │ No / Exception
             ▼
 [Execute Rule-Based Engine] ──► Deterministic Fallback
```

---

## 12. Hybrid RAG Knowledge Retrieval Pipeline

1. **Embedding Generation:** Converts incident query into a 1024-dim vector using Voyage AI (`voyage-3.5`).
2. **pgvector Query:**
   ```sql
   SELECT id, title, solution, 1 - (embedding <=> $1::vector) AS similarity
   FROM knowledge_base
   ORDER BY embedding <=> $1::vector ASC LIMIT 5;
   ```
3. **Fallback:** Falls back to TF-IDF term frequency search if `VOYAGE_API_KEY` is not present.

---

## 13. 3-Layer Duplicate Incident Detection Engine

```
 [New Incident] ──► Layer 1: TF-IDF Cosine (Top 20 candidates + Error Code Boost)
                        │
                        ▼
                    Layer 2: Voyage AI Embeddings + pgvector HNSW (Top 5)
                        │
                        ▼
                    Layer 3: LLM Semantic Reranking Judgment ──► Final Duplicate Status
```

---

## 14. Business-Impact Severity Scoring & SLA Mapping

| Priority | Impact Level | SLA Target | ERP Example |
|---|---|---|---|
| **P0_CRITICAL** | Production Outage | 15 Mins | Payroll batch deadlock; Invoicing post error |
| **P1_HIGH** | Major Feature Failure | 45 Mins | Bin transfer inventory calculation error |
| **P2_MEDIUM** | Partial Feature Impairment | 120 Mins | Purchase Order validation mismatch |
| **P3_LOW** | Cosmetic / Query Issue | 240 Mins | Label alignment / formatting query |

---

## 15. Root Cause Predictor, Patch Safety & Sandbox Terminal

1. **Diagnosis:** Prompts LLM with ERP-specific context (SAP ABAP, Odoo, Oracle PL/SQL).
2. **Safety Scan (`patchPreviewService.js`):** Checks patch strings for dangerous DDL operations (`DROP`, `TRUNCATE`, unscoped `DELETE`).
3. **Sandboxed Terminal:** Developers preview code diffs and execute patches in a sandboxed console environment (`[SYS]`, `[DB]`, `[SQL]`, `[AUDIT]`).

---

## 16. Developer Load Balancer & Routing Algorithm

### Match Score Formula

$$\text{SkillScore} = \frac{|\text{Matching Skills}|}{\max(|\text{Required Skills}|, 1)}$$

$$\text{CapacityScore} = \max\left(0.05, 1.0 - \frac{\text{Active Tickets}}{\text{Max Capacity}}\right)$$

$$\text{SpeedFactor} = \min\left(1.2, \max\left(0.6, \frac{4.0}{\text{Historical MTTR Hours}}\right)\right)$$

$$\text{OnCallBonus} = \begin{cases} 1.1 & \text{if On-Call} \\ 0.85 & \text{otherwise} \end{cases}$$

$$\text{RawScore} = \Big( \text{SkillScore} \times 0.45 + \text{CapacityScore} \times 0.35 + (\text{SpeedFactor} - 0.5) \times 0.2 \Big) \times \text{OnCallBonus} \times 100$$

$$\text{MatchScore} = \text{Clamp}(\text{Round}(\text{RawScore}), 15, 99)$$

---

## 17. Authentication, RBAC & Security Protocols

* **JWT Auth:** Token signed with 24-hour expiration.
* **Password Security:** Hashed using `bcryptjs` with 10 salt rounds.
* **Role Hierarchy:** `END_USER`, `SUPPORT_TRIAGE`, `DEVELOPER`, `EXECUTIVE`.

---

## 18. Enterprise 10-Feature Operations Suite

1. **AI Root Cause Engine:** Visual dependency tree.
2. **Decision Explainability Matrix:** Reasoning breakdown.
3. **Business Impact Engine:** Financial downtime loss estimator.
4. **AI Incident Lifecycle Timeline:** Animated trace step tracker.
5. **Executive AI Summary:** One-click briefing card.
6. **Enterprise War Room:** Operational status center.
7. **ERP Digital Twin:** Topology map powered by `@xyflow/react`.
8. **Incident Replay Engine:** Visual step playback.
9. **AI Patch Preview:** Risk safety modal.
10. **Mission Control:** Auto-refreshing command dashboard.

---

## 19. Graceful Degradation Contract & Failover Matrix

Every external AI integration wrapped in a `try/catch` fallback pipeline:
* **LLM Engine:** Anthropic ➔ Groq ➔ Rule-based keyword engine.
* **Vector Embeddings:** Voyage AI ➔ TF-IDF Cosine Similarity.
* **OCR Vision:** Tesseract WASM ➔ Keyword signature dictionary.

---

## 20. Real vs. Simulated Feature Audit Matrix

| Feature | Status | Technology | Notes |
|---|---|---|---|
| Client/Server OCR | Real | Tesseract.js Worker + WASM | Real bounding box calculation |
| Voice Input | Real | Web Speech API | Native browser mic recording |
| LLM Reasoning | Real | Anthropic + Groq SDKs | Graceful fallback contract |
| Vector Database | Real | Postgres + `pgvector` HNSW | Real `<->` distance queries |
| Load Balancer | Real | Math Scoring Algorithm | Real database updates |
| SQL Execution | Real (Sandboxed) | Interactive Terminal Console | Sandboxed against target ERP schemas |

---

## 21. Environment Variables & Configuration

```env
ANTHROPIC_API_KEY=sk-ant-...     # Optional (Claude 3.5 Sonnet)
GROQ_API_KEY=gsk_...             # Optional (Groq Llama 3.3 70B)
VOYAGE_API_KEY=pa-...            # Optional (Voyage AI 1024-dim embeddings)
PGHOST=localhost                 # Postgres Host
PGPORT=5436                      # Postgres Port
PGUSER=incidentai                # Postgres User
PGPASSWORD=incidentai            # Postgres Password
PGDATABASE=incidentai            # Postgres Database
JWT_SECRET=dev-secret-key-123    # JWT Auth Secret
PORT=4000                        # Backend HTTP Port
```

---

## 22. Technology Justification ("Why Did You Use X?")

* **React 19 & Vite:** Sub-second startup time, instant HMR, concurrent rendering support.
* **Native Node.js HTTP Server:** Zero framework dependency overhead, maximum control over HTTP pipeline.
* **PostgreSQL + pgvector:** Single ACID-compliant database for operational data and vector embeddings.
* **Voyage AI Embeddings:** High retrieval accuracy on technical code and documentation.
* **Tesseract.js:** Client/server hybrid OCR operating without external paid cloud vision API costs.

---

## 23. Technical Interview Question & Answer Bank

### Q1: How does IncidentAI ensure zero downtime if AI services fail?
* **Answer:** Through its **Graceful Degradation Contract**. All LLM/embedding API calls are wrapped in fallbacks that degrade to deterministic rule-based algorithms (keyword scoring, TF-IDF vectors) if keys are missing or APIs fail.

### Q2: Why use `pgvector` instead of a standalone vector database like Pinecone?
* **Answer:** To maintain a unified data layer. Ticket metadata, status, developer assignments, and 1024-dim vector embeddings reside in PostgreSQL, enabling atomic transactions and eliminating external sync latency.

### Q3: Explain the 3-Layer Duplicate Detection strategy.
* **Answer:** Layer 1 uses TF-IDF cosine similarity to filter hundreds of tickets in <1ms. Layer 2 uses `pgvector` HNSW index for sub-10ms semantic ranking. Layer 3 calls the LLM to judge only the top candidates, optimizing accuracy while minimizing API costs.

---

## 24. Quick Start & Setup Guide

```bash
# 1. Clone workspace repository
git clone https://github.com/KAVYAJOSHI1/INCIDENTAI.git
cd INCIDENTAI

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start database & run migrations
npm run db:migrate
npm run db:seed

# 5. Start Backend Server (Terminal 1)
npm run server

# 6. Start Frontend Dev Server (Terminal 2)
npm run dev
```

Open **`http://localhost:3000/`** to access the live platform. Log in with demo accounts (`password: demopass123`):
* End User: `enduser@incidentai.demo`
* Support Triage: `triage@incidentai.demo`
* Developer: `developer@incidentai.demo`
* Executive: `executive@incidentai.demo`
