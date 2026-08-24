# 🛡️ IncidentAI — Master System Architecture & Technical Integration Specification

> **Project Name:** IncidentAI — AI-Powered ERP Support Engineer & Incident Resolution System  
> **Repository:** `KAVYAJOSHI1/INCIDENTAI`  
> **Target Event:** Websys Gooru Hackathon 2026 / Production-Grade Architecture Master Specification  
> **Source of Truth:** Consolidated master technical documentation combining all architectural specs, pipeline redesigns, codebase audits, MCP tool suites, and ERP integration blueprints into a **single unified reference document**.

---

## 📚 Table of Contents

1. [Executive Summary & Core Product Goal](#1-executive-summary--core-product-goal)
2. [Complete System Topology & Master Architecture Diagram](#2-complete-system-topology--master-architecture-diagram)
3. [Full Technology Stack & Dependencies](#3-full-technology-stack--dependencies)
4. [Real vs. Simulated Codebase Audit Matrix](#4-real-vs-simulated-codebase-audit-matrix)
5. [Complete Multimodal Request Flow & Canonical Incident Model](#5-complete-multimodal-request-flow--canonical-incident-model)
6. [4-Persona Workspace Strategy & UI Architecture](#6-4-persona-workspace-strategy--ui-architecture)
7. [Dual-Engine Multimodal OCR (Tesseract.js Client & Server)](#7-dual-engine-multimodal-ocr-tesseractjs-client--server)
8. [Provider-Agnostic LLM Engine (Claude 3.5 + Groq Llama 3.3)](#8-provider-agnostic-llm-engine-claude-35--groq-llama-33)
9. [Exact Duplicate Check vs. 3-Layer Duplicate Detection Engine](#9-exact-duplicate-check-vs-3-layer-duplicate-detection-engine)
10. [Hybrid RAG Knowledge Retrieval Pipeline (Voyage AI + pgvector)](#10-hybrid-rag-knowledge-retrieval-pipeline-voyage-ai--pgvector)
11. [Model Context Protocol (MCP) & 10 Read-Only ERP Tool Suite](#11-model-context-protocol-mcp--10-read-only-erp-tool-suite)
12. [RAG + MCP + LLM Evidence-Grounded Reasoning Engine](#12-rag--mcp--llm-evidence-grounded-reasoning-engine)
13. [Verified Self-Service Decision Engine](#13-verified-self-service-decision-engine)
14. [Developer Load Balancer & Routing Algorithm](#14-developer-load-balancer--routing-algorithm)
15. [Enriched Ticket Persistence & Sandboxed Patch Workbench](#15-enriched-ticket-persistence--sandboxed-patch-workbench)
16. [Developer Verification Lifecycle & RAG Knowledge Writeback](#16-developer-verification-lifecycle--rag-knowledge-writeback)
17. [Enterprise Operations Suite & ERP Digital Twin Topology](#17-enterprise-operations-suite--erp-digital-twin-topology)
18. [Smart Manufacturing ERP Integration Architecture](#18-smart-manufacturing-erp-integration-architecture)
19. [Context-Aware ERP Reporting Widget & Auto-Metadata Capture](#19-context-aware-erp-reporting-widget--auto-metadata-capture)
20. [Cross-System Authentication, JWT Trust & RBAC Mapping](#20-cross-system-authentication-jwt-trust--rbac-mapping)
21. [Observability, Metrics, Logging & Distributed Tracing](#21-observability-metrics-logging--distributed-tracing)
22. [Graceful Degradation Contract & Failover Matrix](#22-graceful-degradation-contract--failover-matrix)
23. [Important System Constraints & Accuracy Rules](#23-important-system-constraints--accuracy-rules)
24. [Exhaustive Integration Test Suite (Tests A through N)](#24-exhaustive-integration-test-suite-tests-a-through-n)
25. [Environment Variables & Port Configuration Matrix](#25-environment-variables--port-configuration-matrix)
26. [Technical Interview Question & Answer Bank](#26-technical-interview-question--answer-bank)
27. [Quick Start & Setup Guide](#27-quick-start--setup-guide)

---

## 1. Executive Summary & Core Product Goal

IncidentAI is **NOT** a simple chatbot. It is an **autonomous, enterprise-grade AI-powered ERP incident intelligence and resolution system** designed to reduce Mean Time to Resolution (MTTR) by up to 50%.

### The Core Problem
ERP users (across accounting, inventory, procurement, and manufacturing) encounter complex validation errors but lack the technical vocabulary to describe them.
* *Vague Input:* "My invoice isn't working. There is some red error on screen."
* *Input Formats:* Unstructured text, browser voice clips, UI screenshots, terminal error logs, or page routing metadata.

### The Autonomous Solution
IncidentAI transforms vague inputs into an evidence-grounded, technical incident lifecycle:
1. **Extracts** visual and text signatures via hybrid client/server OCR (Tesseract.js).
2. **Standardizes** metadata into a Canonical Structured Incident object via task-specific LLM context extraction.
3. **Executes** deterministic exact duplicate checks before expensive semantic operations.
4. **Retrieves** historical organizational knowledge via RAG (`pgvector` HNSW + Voyage AI 1024-dim embeddings).
5. **Inspects** live ERP microservices state using controlled, read-only Model Context Protocol (MCP) tools.
6. **Triangulates** current incident + RAG historical knowledge + MCP live system evidence through LLM reasoning.
7. **Self-Services** verified known issues with safe, step-by-step user guidance (skipping developer assignment).
8. **Escalates & Routes** unresolved or critical (P0/P1) incidents to the optimal developer using a multi-factor load balancer.
9. **Captures** developer-verified resolutions and automatically writes them back to the RAG knowledge base for future incident self-resolution.

---

## 2. Complete System Topology & Master Architecture Diagram

```
                                  SMART MANUFACTURING ERP PLATFORM
                                 (Next.js 15 Frontend - Port 3000)
                                                 │
                                     [ 🚨 Report Issue Widget ]
                                                 │
                                                 ▼
                                     ERP Express API Gateway
                                    (JWT / RBAC / Port 5000)
                                                 │
                                                 ▼
                                     INCIDENT AI INGESTION API
                                  (Node.js Micro-Router - Port 4000)
                                                 │
                                                 ▼
                                      DUAL-ENGINE TESSERACT OCR
                                  (Base64 Image -> Text & Bounding Box)
                                                 │
                                                 ▼
                                       AI CONTEXT EXTRACTION
                                   (Task-Specific LLM Micro-Prompt)
                                                 │
                                                 ▼
                                     CANONICAL STRUCTURED INCIDENT
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
              DETERMINISTIC EXACT DUP CHECK                 VOYAGE AI EMBEDDINGS (1024d)
                         │                                               │
                         │                                               ▼
                         │                                       PGVECTOR HNSW RAG
                         │                                               │
                         │                                               ▼
                         │                                      HISTORICAL KNOWLEDGE
                         │                                               │
                         └───────────────────────┬───────────────────────┘
                                                 ▼
                                        LLM REASONING ENGINE
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         │                                               │
                         ▼                                               ▼
                    RAG CONTEXT                                      MCP SERVER
               (Historical Verified)                            (Live ERP Gateway)
                         │                                               │
                         └───────────────────────┬───────────────────────┘
                                                 ▼
                                       SELF-SERVICE EVALUATOR
                                                 │
             ┌───────────────────────────────────┴───────────────────────────────────┐
             ▼                                                                       ▼
   [PATH A: SAFE VERIFIED DUP]                                             [PATH B: DEVELOPER ESCALATION]
             │                                                                       │
             ▼                                                                       ▼
   LLM EXPLANATION GENERATOR                                                DEVELOPER LOAD BALANCER
             │                                                         (Skill x Capacity x Speed x OnCall)
             ▼                                                                       │
      USER SELF-SERVICE                                                              ▼
   (Steps + Confidence + Source)                                              ENRICHED JIRA-STYLE TICKET
                                                                                     │
                                                                                     ▼
                                                                            DEVELOPER WORKBENCH
                                                                        (Sandbox SQL + Diagnostics)
                                                                                     │
                                                                                     ▼
                                                                           DEVELOPER RESOLUTION
                                                                    (PENDING_VERIFIED -> VERIFIED)
                                                                                     │
                                                                                     ▼
                                                                           VERIFIED KB WRITEBACK
                                                                     (Auto-Indexed into pgvector)
                                                                                     │
                                                                                     ▼
                                                                            FUTURE RAG RETRIEVAL

  ┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
  │ INCIDENT CONTROL CENTER (IT Operations)      │        │ EXECUTIVE DASHBOARD (Admin & C-Suite)        │
  │ Live Tracing, Overrides, MCP Audit Logs      │        │ Financial Downtime, MTTR, Digital Twin Graph │
  └──────────────────────────────────────────────┘        └──────────────────────────────────────────────┘
```

---

## 3. Full Technology Stack & Dependencies

### Frontend Subsystem (`src/` & `erp/frontend/`)
* **Framework:** React 19 (`^19.0.0`) & Next.js 15 App Router (`next: ^15.0.0`)
* **Build Tooling:** Vite (`^5.4.11`) with `@vitejs/plugin-react` & Next.js TurboPack
* **Styling & Design System:** Tailwind CSS (`^3.4.19`), PostCSS, Autoprefixer, Dark Glassmorphism Design Tokens
* **UI Controls & Visualization:** Lucide React (`^1.16.0`), Recharts (`^2.15.1`), `@xyflow/react` (`^12.4.4`), `canvas-confetti` (`^1.9.4`), TanStack Query, Zustand
* **Browser APIs:** Web Speech API (`webkitSpeechRecognition`), `FileReader`, HTML5 Canvas
* **OCR Library:** `tesseract.js` (`^7.0.0`) Web Worker & WASM execution module

### Backend Subsystem (`server/` & `erp/backend/`)
* **IncidentAI Runtime:** Node.js (ES Modules, `"type": "module"`)
* **IncidentAI Router:** Native Node.js `node:http` module + custom regex router (`server/router.js`) — **Zero web framework overhead**
* **ERP API Gateway:** Node.js & Express (`gateway/src/index.ts`) with `http-proxy-middleware` & Redis rate limiting
* **ERP Microservices:** Go 1.22 + Fiber Web Framework + GORM ORM (`backend/services/`)
* **Validation & Security:** Zod (`^4.4.3`), `jsonwebtoken` (`^9.0.3`), `bcryptjs` (`^3.0.3`)
* **Database Drivers:** Native `pg` (`^8.22.0`) connection pool (`Pool`) & GORM Postgres driver

### Database & Vector Infrastructure
* **Databases:** PostgreSQL 16 (Port `5435` for ERP; Port `5436` for IncidentAI)
* **Vector Engine:** PostgreSQL `pgvector` extension with 1024-dimensional `vector` columns
* **Vector Index:** HNSW (Hierarchical Navigable Small World) index with `vector_cosine_ops`
* **Cache & Event Bus:** Redis 7.2 Stack (Port `6375`) & Confluent Apache Kafka (Port `9092`)
* **Document Storage:** MinIO S3-Compatible Object Store (Port `9000`)

### AI & External Cloud APIs
* **Primary LLM:** Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
* **Fallback LLM:** Groq Llama 3.3 70B (`llama-3.3-70b-versatile`)
* **Embedding Model:** Voyage AI (`voyage-3.5`, 1024-dimension floating point vectors)

---

## 4. Real vs. Simulated Codebase Audit Matrix

| # | Pipeline / Architecture Component | Status | Codebase File Location | Implementation Details |
|---|---|---|---|---|
| 1 | **SmartReporter Frontend Flow** | **REAL** | `src/components/Reporter/SmartReporter.jsx` | React UI capturing text, Web Speech voice, screenshot uploads, and submitting to `POST /api/incidents/ingest`. |
| 2 | **Incident Ingestion API** | **REAL** | `server/routes/incidents.js`, `server/services/ticketService.js` | Native HTTP API endpoint `POST /api/incidents/ingest` executing `runIncidentIngestPipeline()`. |
| 3 | **Dual-Engine OCR Processing** | **REAL** | `server/services/ocrService.js`, Tesseract Web Worker | Client Web Worker + server-side Base64 decoder extracting raw text and bounding boxes. |
| 4 | **Provider-Agnostic LLM Engine** | **REAL** | `server/services/llmService.js` | Multi-SDK failover attempting Anthropic Claude 3.5 Sonnet first, Groq Llama 3.3 second, and rule engine third. |
| 5 | **Severity Scoring Engine** | **REAL** | `server/services/severityService.js` | Business impact calculator returning P0-P3 priorities, SLA targets, and reasoning. |
| 6 | **3-Layer Duplicate Detection** | **REAL** | `server/services/duplicateService.js` | Layer 1 TF-IDF lexical filtering ➔ Layer 2 Voyage AI vector distance ➔ Layer 3 LLM semantic reranking. |
| 7 | **Vector Embeddings & RAG** | **REAL** | `server/services/embeddingService.js`, `knowledgeService.js` | Voyage AI API (`voyage-3.5`) generating 1024-dim vectors queried via `<->` cosine distance on `pgvector` HNSW index. |
| 8 | **Developer Load Balancer** | **REAL** | `server/services/loadBalancerService.js` | Formula scoring developers: $(\text{Skill} \times 0.45 + \text{Capacity} \times 0.35 + \text{Speed} \times 0.2) \times \text{OnCallBonus}$. |
| 9 | **Sandboxed Patch Workbench** | **REAL** | `server/services/patchPreviewService.js`, `DeveloperWorkbench.jsx` | DDL safety check scanning for `DROP`/`TRUNCATE` + terminal console (`[SYS]`, `[DB]`, `[SQL]`, `[AUDIT]`). |
| 10| **Auth & RBAC Enforcement** | **REAL** | `server/services/authService.js`, `server/middleware/auth.js` | JWT token auth with bcrypt password hashing and 4-tier role enforcement (`END_USER`, `SUPPORT_TRIAGE`, `DEVELOPER`, `EXECUTIVE`). |
| 11| **ERP API Gateway (Node/TS)** | **REAL** | `erp/gateway/src/index.ts`, `proxy.ts` | Express gateway on Port 5000 proxying requests to Go microservices with `X-Correlation-ID` & JWT headers. |
| 12| **ERP Go Microservices** | **REAL** | `erp/backend/services/` | Auth (8080), Inventory (8081), Procurement (8082), Finance (8083), Intelligence (8084), Production (8085). |
| 13| **ERP Frontend Portal** | **REAL** | `erp/frontend/src/app/` | Next.js 15 industrial control panel with dashboard routes for Inventory, Procurement, Finance, Production. |
| 14| **Observability Telemetry** | **REAL** | `erp/infra/observability/` | Prometheus metrics, Grafana dashboards (Port 3000), Loki log aggregation, Jaeger distributed tracing (Port 16686). |
| 15| **Model Context Protocol (MCP)**| **SPECIFIED**| `TECHNICAL_INTEGRATION_REPORT.md` | Read-only MCP server calling ERP API Gateway (Port 5000) defined; UI simulated when live services are offline. |
| 16| **Verified Knowledge Writeback**| **SPECIFIED**| `server/db/store.js` (`addKnowledgeArticle`) | DB helpers exist; automatic gating on developer `VERIFIED` status is fully specified. |

---

## 5. Complete Multimodal Request Flow & Canonical Incident Model

```
[User Input: Text / Voice / Screenshot / ERP Context]
                         │
                         ▼
        [POST /api/incidents/ingest (Port 4000)]
                         │
                         ▼
  1. OCR Signature Extraction (ocrService.js -> Tesseract.js)
  2. Context Extraction LLM Prompt -> Canonical Structured Incident Object
  3. Deterministic Exact Duplicate Check (Normalized Error Code + Module)
  4. Vector Embedding Generation (embeddingService.js -> Voyage AI 1024d)
  5. pgvector HNSW RAG Search (knowledgeService.js -> Historical KB Matches)
  6. Read-Only MCP ERP Inspection (MCP Server -> ERP Gateway Port 5000)
  7. LLM Grounded Reasoning (llmService.js -> Root Cause & Resolution)
  8. Self-Service vs. Developer Routing Evaluator
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
 [PATH A: SAFE VERIFIED DUP]            [PATH B: DEVELOPER ESCALATION]
 Render Resolution Guide                Calculate Developer Load Match Score
 Return Source Incident & Confidence    Persist Enriched Jira-Style Ticket
 Skip Developer Assignment              Open Sandboxed Workbench Terminal
```

### The Canonical Structured Incident Object
All ingested data is consolidated into a single object reused across all pipeline stages:

```javascript
const CanonicalStructuredIncident = {
  incident_id: "INC-2026-9041",
  title: "[Finance] TAX_VALIDATION_ERROR: Invoice INV-1042 post failure",
  erp: "Smart Manufacturing ERP",
  module: "Finance",
  page: "/finance/invoices/INV-1042",
  record_id: "INV-1042",
  component: "InvoicingLedgerPost",
  user_action: "Post Invoice",
  error_code: "TAX_VALIDATION_ERROR",
  error_message: "Customer tax configuration missing for state CA",
  user_problem: "Cannot post invoice INV-1042 due to validation popup",
  expected_behavior: "System should compute sales tax and record journal entry",
  actual_behavior: "System triggers TAX_VALIDATION_ERROR and aborts thread",
  technical_context: "Postgres table finance.invoices missing tax_id reference",
  reporter: { id: "USR-9941", email: "accountant@smart-erp.io", role: "finance_manager" },
  ocr_findings: { raw_text: "...", bounding_box: { top: 24.5, left: 12.0, width: 65.0, height: 18.2 } },
  timestamps: { created_at: "2026-08-23T14:30:00Z" }
};
```

---

## 6. 4-Persona Workspace Strategy & UI Architecture

IncidentAI eliminates duplicate UI clutter by strictly gating features across 4 dedicated role personas:

### 🟢 1. End-User Self-Service Portal (`END_USER`)
* **Focus:** Contextual incident reporting & automated step-by-step self-resolution.
* **Views:** Embedded `[ 🚨 Report Issue ]` ERP Modal + Self-Fix Resolution Guides + Submission History Timeline.

### 🟡 2. Triage & Dispatch Command Center (`SUPPORT_TRIAGE`)
* **Focus:** Incident signal triage, duplicate detection, and developer workload monitoring.
* **Views:** `TriageFeed.jsx` + `DeveloperLoadBalancer.jsx` + 3-Layer Duplicate Banner + Manual Re-route Controls.

### 🔵 3. Developer Remediation Workbench (`DEVELOPER`)
* **Focus:** Technical diagnosis, OCR bounding box inspection, and SQL patch execution.
* **Views:** `DeveloperWorkbench.jsx` + Sandboxed Execution Console (`[SYS]`, `[DB]`, `[SQL]`, `[AUDIT]`) + `KnowledgeHub.jsx`.

### 🟣 4. Executive Operations & Risk Intelligence (`EXECUTIVE`)
* **Focus:** Financial downtime loss, MTTR SLA compliance, and system topology.
* **Views:** `DigitalTwin.jsx` (`@xyflow/react` topology graph) + `AnalyticsDashboard.jsx` + Executive AI Briefings.

---

## 7. Dual-Engine Multimodal OCR (Tesseract.js Client & Server)

Tesseract.js runs on both client (browser Web Worker / WASM thread) and server (`analyzeMultimodalInputFromImage`).

### Boundaries & Constraints
* **Input:** PNG/JPEG/WebP image or Base64 byte string.
* **Output:** Raw text, character confidence, detected error codes, visual bounding box coordinates ($x_0, y_0, x_1, y_1$).
* **Normalized Bounding Box Formula:**
  $$\text{Top} = \left(\frac{y_0}{\text{Image Height}}\right) \times 100\% \quad \text{Left} = \left(\frac{x_0}{\text{Image Width}}\right) \times 100\%$$
* **Non-Goals:** OCR does **NOT** infer root cause, compute severity, route developers, or generate fixes.

---

## 8. Provider-Agnostic LLM Engine (Claude 3.5 + Groq Llama 3.3)

```
        [LLM Call Request]
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

### JSON Schema Output Enforcement
Anthropic calls use `output_config.format` with JSON Schema validation. Groq calls use `response_format: { type: "json_object" }` with inline system schema prompts.

---

## 9. Exact Duplicate Check vs. 3-Layer Duplicate Detection Engine

### 1. Exact Duplicate Check (Deterministic)
Executed BEFORE vector embeddings or LLM calls. Compares `normalized_error_code` + `erp` + `module` + `record_id`.
* *Rule:* Vector embedding similarity score $\ge 0.85$ does **NOT** equal an exact duplicate. Exact duplicates represent identical system failures.

### 2. Hybrid 3-Layer Semantic Duplicate Filter
For complex incidents requiring semantic judgment:
```
[Canonical Incident] ──► Layer 1: TF-IDF Lexical Cosine (Top 20 candidates in <1ms)
                               │
                               ▼
                           Layer 2: Voyage AI 1024d Embedding + pgvector HNSW (Top 5 in <10ms)
                               │
                               ▼
                           Layer 3: LLM Reranking Judgment (Strict JSON Output)
```

---

## 10. Hybrid RAG Knowledge Retrieval Pipeline (Voyage AI + pgvector)

1. **Embedding Generation:** Incident query is vectorised into a 1024-dim floating point array via Voyage AI (`voyage-3.5`).
2. **pgvector Query:**
   ```sql
   SELECT id, title, solution, 1 - (embedding <=> $1::vector) AS similarity
   FROM knowledge_base
   WHERE verified = true AND erp_module = $2
   ORDER BY embedding <=> $1::vector ASC LIMIT 5;
   ```
3. **Lexical Fallback:** Falls back to TF-IDF cosine similarity if `VOYAGE_API_KEY` is not present.

---

## 11. Model Context Protocol (MCP) & 10 Read-Only ERP Tool Suite

MCP provides the LLM with controlled access to **live ERP system state**:

* **RAG:** *"What have we seen before?"* (Historical Knowledge)
* **MCP:** *"What can we safely inspect right now?"* (Live ERP Context)

```
[ IncidentAI LLM ] ──► MCP Client ──► MCP Server (JSON-RPC)
                                           │
                                           ▼
                                 ERP Express API Gateway
                                (Port 5000 — JWT & RBAC)
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
             Auth Svc (8080)        Inv Svc (8081)         Fin Svc (8083)
```

### The 10 Read-Only ERP MCP Tools
1. `get_invoice(invoice_id)`: GET `/api/finance/invoices/:id`
2. `get_customer(customer_id)`: GET `/api/finance/customers/:id`
3. `get_inventory(product_id)`: GET `/api/inventory/stock/:id`
4. `get_product(product_id)`: GET `/api/inventory/products/:id`
5. `get_purchase_order(po_id)`: GET `/api/procurement/orders/:id`
6. `get_production_order(order_id)`: GET `/api/production/runs/:id`
7. `get_service_health(service_name)`: GET `/health`
8. `get_recent_errors(service_name)`: GET `/api/observability/loki/logs`
9. `get_transaction(tx_id)`: GET `/api/finance/ledger/:id`
10. `get_configuration(module_name)`: GET `/api/config/:module`

*Forbidden Tools:* `execute_arbitrary_sql`, `run_shell_command`, `delete_record`, `modify_production_database`.

---

## 12. RAG + MCP + LLM Evidence-Grounded Reasoning Engine

Triangulation yields evidence-grounded incident analysis:

$$\text{Diagnosis} = \text{RAG (Past Knowledge)} + \text{MCP (Live ERP Facts)} + \text{LLM Reasoning}$$

### Grounding Evidence Hierarchy
* 🟢 **FACT:** Real-time state returned by live MCP ERP tool call.
* 🔵 **HISTORICAL EVIDENCE:** Retrieved RAG vector match from past resolved incidents.
* 🟣 **INFERENCE:** LLM reasoning hypothesis.
* ⚪ **UNKNOWN:** Missing information not present in context.

---

## 13. Verified Self-Service Decision Engine

Self-service bypasses developer assignment **ONLY IF ALL 6 CONDITIONS PASS**:
1. Exact or high-confidence duplicate exists.
2. Matched previous incident status is `VERIFIED`.
3. Resolution action is safe for self-service.
4. Incident severity is non-critical (P2 or P3).
5. No live MCP evidence contradicts the historical resolution.
6. P0/P1 critical incidents are **NEVER** auto-self-resolved.

---

## 14. Developer Load Balancer & Routing Algorithm

Unresolved incidents are assigned to the optimal developer via a multi-factor formula:

$$\text{SkillScore} = \frac{|\text{Matching Skills}|}{\max(|\text{Required Skills}|, 1)}$$

$$\text{CapacityScore} = \max\left(0.05, 1.0 - \frac{\text{Active Tickets}}{\text{Max Capacity}}\right)$$

$$\text{SpeedFactor} = \min\left(1.2, \max\left(0.6, \frac{4.0}{\text{Historical MTTR Hours}}\right)\right)$$

$$\text{OnCallBonus} = \begin{cases} 1.1 & \text{if Developer is On-Call} \\ 0.85 & \text{otherwise} \end{cases}$$

$$\text{RawScore} = \Big( \text{SkillScore} \times 0.45 + \text{CapacityScore} \times 0.35 + (\text{SpeedFactor} - 0.5) \times 0.2 \Big) \times \text{OnCallBonus} \times 100$$

$$\text{MatchScore} = \text{Clamp}(\text{Round}(\text{RawScore}), 15, 99)$$

---

## 15. Enriched Ticket Persistence & Sandboxed Patch Workbench

When escalated, IncidentAI persists an **Enriched Jira-Style Ticket** containing:
* Canonical ERP Metadata & Page Context.
* OCR Visual Bounding Box Overlay.
* Badged Evidence Panels (Live MCP Evidence vs. Historical RAG vs. AI Inference).
* AI Diagnostic Root Cause & Proposed SQL Patch String.
* Patch Safety Classification (`LOW`, `MEDIUM`, `HIGH`).

### Sandboxed Workbench Console
Developers preview code diffs and test SQL patches in an interactive console (`[SYS]`, `[DB]`, `[SQL]`, `[AUDIT]`) backed by `patchPreviewService.js` DDL safety scans. Direct, non-interactive execution against production is hard-blocked.

---

## 16. Developer Verification Lifecycle & RAG Knowledge Writeback

To protect vector database quality, resolution capture follows a strict verification state flow:

```
Developer Fix Submission ──► Status: PENDING_VERIFICATION
                                    │
                            ┌───────┴───────┐
                            ▼               ▼
                       [VERIFIED]      [REJECTED]
                            │               │
                            ▼               ▼
                    Auto-Index to DB     Discard
                    & Voyage 1024d Vector
```

---

## 17. Enterprise Operations Suite & ERP Digital Twin Topology

1. **Incident Control Center:** IT Operations oversight console for monitoring live pipeline traces (`RECEIVED` ➔ `EXTRACTING` ➔ `DUPLICATE` ➔ `RAG` ➔ `MCP` ➔ `ROUTED`), overriding assignments, and inspecting MCP audit trails.
2. **Executive Dashboard:** Management briefing portal tracking financial downtime loss, SLA compliance, MTTR trends, and ERP module risk status.
3. **ERP Digital Twin Topology:** Interactive node-edge graph powered by `@xyflow/react` calculating topological risk across ERP microservices.

---

## 18. Smart Manufacturing ERP Integration Architecture

IncidentAI attaches to the existing ERP repository as a complementary intelligence layer:

```
project-root/
│
├── erp/                           # Smart Manufacturing ERP Repository
│   ├── backend/                   # Go Microservices (auth, inventory, procurement, finance, etc.)
│   ├── frontend/                  # Next.js 15 Web Portal
│   ├── gateway/                   # Express API Gateway (Port 5000)
│   └── infra/                     # Postgres (5435), Redis (6375), Kafka (9092), MinIO (9000)
│
├── incident-ai/                   # IncidentAI Repository
│   ├── server/                    # Node.js Router & AI Pipeline (Port 4000)
│   ├── src/                       # React 19 Incident AI Dashboards & Workbench
│   └── docker-compose.yml         # IncidentAI Postgres + pgvector (Port 5436)
│
└── integration/                   # Cross-System Integration Layer
    ├── mcp-server/                # Read-Only MCP Server (Calls ERP Gateway Port 5000)
    └── erp-widget/                # Embedded React "Report Issue" Modal
```

---

## 19. Context-Aware ERP Reporting Widget & Auto-Metadata Capture

A global button `[ 🚨 Report Issue ]` embedded in `frontend/src/components/DashboardLayout.tsx` automatically extracts Next.js router context:

```json
{
  "erp_platform": "Smart Manufacturing ERP",
  "module": "Finance",
  "page_route": "/finance/invoices/INV-1042",
  "record_id": "INV-1042",
  "user_action": "Post Invoice",
  "error_code": "TAX_VALIDATION_ERROR",
  "user_id": "USR-9941",
  "user_email": "accountant@smart-erp.io",
  "user_role": "finance_manager",
  "timestamp": "2026-08-23T14:30:00Z"
}
```

---

## 20. Cross-System Authentication & Independent Dual-System RBAC Architecture

IncidentAI and the Smart Manufacturing ERP maintain **two completely independent RBAC domains**:

1. **ERP Business RBAC (System of Record):** Owns ERP business roles (`viewer`, `finance_manager`, `inventory_manager`, `procurement_specialist`, `production_manager`, `admin`, etc.) controlling access to ERP business functions and microservices.
2. **IncidentAI RBAC (Intelligence Layer):** Owns native personas (`END_USER`, `SUPPORT_TRIAGE`, `DEVELOPER`, `EXECUTIVE`) controlling access to IncidentAI internal portals.

> [!IMPORTANT]
> **INDEPENDENCE RULE:**  
> ERP authentication proves *"This is an authenticated ERP user reporting an issue"*. The ERP user role (`X-User-Role`) is transmitted inside `erp_context` strictly as non-authoritative incident metadata for diagnostic AI reasoning.  
> **An ERP role never grants or maps to an IncidentAI staff persona.** Access to the Developer Workbench, Triage Control Center, or Executive Dashboard requires native IncidentAI authorization.

---

## 21. Observability, Metrics, Logging & Distributed Tracing

* **Prometheus Metrics:** IncidentAI exports ingestion counters and MCP tool execution latency to the ERP Prometheus stack.
* **Loki Log Aggregation:** Structured JSON application logs are collected by Loki.
* **Jaeger Distributed Tracing:** Propagates `X-Correlation-ID` across IncidentAI pipeline stages and downstream MCP HTTP calls.

---

## 22. Graceful Degradation Contract & Failover Matrix

| Subsystem | Primary Provider | Tier 1 Failover | Tier 2 Failover | User Experience Impact |
|---|---|---|---|---|
| **LLM Reasoning** | Anthropic Claude 3.5 Sonnet | Groq Llama 3.3 70B | Rule-Based Keyword Engine | System degrades to deterministic rules; zero downtime. |
| **Vector Embeddings**| Voyage AI `voyage-3.5` (1024d) | In-Memory TF-IDF Cosine | SQL String Search | Retrieval precision drops slightly; processing completes. |
| **Live ERP Inspection**| MCP Server (JSON-RPC) | Isolated Mock MCP Sandbox | Bypass MCP ➔ Fallback to RAG + Context | Badge displayed: `⚠️ Live ERP Connection Offline`. |
| **OCR Processing** | Tesseract WASM (Client) | Server Base64 Tesseract Node Buffer | Raw User Text Ingestion | Image parsing falls back to user-typed description. |

---

## 23. Important System Constraints & Accuracy Rules

### What System Components DO NOT Do
1. OCR does **NOT** infer root cause or business severity.
2. Embeddings do **NOT** prove two incidents are exact duplicates.
3. RAG does **NOT** generate code by itself; it provides context.
4. LLM outputs are **NOT** guaranteed correct without verification.
5. Unverified resolutions are **NEVER** written to the RAG knowledge base.
6. MCP evidence is **NEVER** claimed unless a tool was executed.
7. AI SQL patches are **NEVER** executed automatically on production.

---

## 24. Exhaustive Integration Test Suite (Tests A through N)

* **Test A:** New Incident + No RAG Match ➔ *Branch: DEVELOPER*
* **Test B:** Exact Duplicate + Verified Resolution ➔ *Branch: SELF-SERVICE*
* **Test C:** Semantic Duplicate + Unverified Resolution ➔ *Branch: DEVELOPER*
* **Test D:** RAG Match + MCP Confirmation ➔ *Branch: Grounded High-Confidence Diagnosis*
* **Test E:** RAG Match + MCP Contradiction ➔ *Branch: DEVELOPER*
* **Test F:** No RAG + MCP Evidence ➔ *Branch: DEVELOPER*
* **Test G:** MCP Server Unavailable ➔ *Branch: Fallback to RAG + UI Warning Badge*
* **Test H:** LLM Provider Unavailable ➔ *Branch: Fallback to Rule Engine*
* **Test I:** Voyage API Unavailable ➔ *Branch: Fallback to TF-IDF Cosine*
* **Test J:** P0 Critical Incident ➔ *Branch: CRITICAL ESCALATION (Bypasses Self-Service)*
* **Test K:** Unsafe SQL Patch Generated ➔ *Branch: Sandbox DDL Scanner Block*
* **Test L:** Malformed LLM JSON ➔ *Branch: Retry & Rule Engine Fallback*
* **Test M:** Duplicate KB Writeback ➔ *Branch: Deduplication Check Blocks Insert*
* **Test N:** Verified Resolution ➔ *Branch: Auto-Embed & Index in pgvector*

---

## 25. Environment Variables & Port Configuration Matrix

```env
# AI Service Keys
ANTHROPIC_API_KEY=sk-ant-...     # Optional (Claude 3.5 Sonnet)
GROQ_API_KEY=gsk_...             # Optional (Groq Llama 3.3 70B)
VOYAGE_API_KEY=pa-...            # Optional (Voyage AI 1024-dim embeddings)

# IncidentAI Infrastructure (Port 4000 & DB 5436)
PORT=4000
PGHOST=localhost
PGPORT=5436
PGUSER=incidentai
PGPASSWORD=incidentai
PGDATABASE=incidentai
JWT_SECRET=dev-secret-key-123

# Smart Manufacturing ERP Gateway (Port 5000 & DB 5435)
ERP_GATEWAY_URL=http://localhost:5000
ERP_PGPORT=5435
```

---

## 26. Technical Interview Question & Answer Bank

### Q1: How does IncidentAI guarantee zero downtime during AI API outages?
* **Answer:** Via its **Graceful Degradation Contract**. Every external AI API call is wrapped in a multi-tier fallback pipeline (Anthropic ➔ Groq ➔ Rule Engine; Voyage AI ➔ TF-IDF). The app never crashes when cloud AI services fail.

### Q2: Why use `pgvector` inside PostgreSQL instead of Pinecone or Qdrant?
* **Answer:** Unified data architecture. Tickets, developer load scores, knowledge base articles, and 1024-dim vector embeddings reside in a single ACID-compliant PostgreSQL database, eliminating external synchronization latency.

### Q3: How does IncidentAI inspect live ERP systems safely without risking data corruption?
* **Answer:** Through **Model Context Protocol (MCP)** read-only tool calls routed via the ERP API Gateway (`http://localhost:5000`). The LLM cannot execute raw SQL or shell commands; it can only invoke approved read-only HTTP endpoints.

---

## 27. Quick Start & Setup Guide

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
