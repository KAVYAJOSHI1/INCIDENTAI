# 🏢 INCIDENTAI — ERP Support Engine
## Automated ERP Error Diagnostics, Smart Ticketing & Dynamic Developer Load Balancing

> **Repository Path:** `/home/lenovo/Desktop/INCIDENTAI`

---

## 📌 Problem Overview

ERP systems (SAP, NetSuite, Odoo, Oracle ERP) run mission-critical enterprise workflows like invoicing, inventory, payroll, and accounting. When end-users encounter errors:
- Non-technical users submit vague, unhelpful bug reports (e.g. *"Invoicing button is broken!"*).
- Support engineers waste hours manually parsing logs, asking for screenshots, and determining which developer should fix it.
- Developers get unequally burdened with tickets without taking skill match or active workload into account.

---

## 🎯 Solution Architecture & Core Modules

**IncidentAI** bridges non-technical users, support triage, and developer allocation into one unified AI platform:

### 1. 🔍 Multimodal OCR & Error Diagnostics Engine
- **Screenshot & Log Parsing**: Ingests ERP error popups, stack traces, and invoice PDFs using Vision OCR.
- **Vague Report Translator**: Converts non-technical complaints into structured diagnostic packages (Extracts: Module, Error Code, Input Payload, Stack Trace).
- **Instant Self-Fix Advisor**: Identifies user configuration mistakes (e.g., missing tax registration number or invalid currency format) to resolve issues instantly without opening a ticket.

### 2. 🏷️ Smart Ticket Auto-Generation & Categorization
- **Auto-Classifies ERP Module**: Identifies whether the issue belongs to `Invoicing`, `Inventory`, `Payroll`, `General Ledger`, or `Procurement`.
- **Severity Scoring**: Assigns priority levels (`P0 Critical`, `P1 High`, `P2 Medium`, `P3 Low`) based on business impact (e.g., payment gateway failure = P0 vs invoice styling typo = P3).
- **AI Root Cause & Patch Predictor**: Recommends probable root cause and generates suggested SQL queries or code patches for developers.

### 3. ⚖️ Dynamic Developer Load Balancing & Routing
- **Skill Matrix Matching**: Matches ticket technical requirements (e.g. SAP ABAP, Postgres SQL, Python/Odoo) to developer skillsets.
- **Real-Time Capacity Tracker**: Calculates developer workload capacity based on active tickets, SLA deadlines, and historical Mean Time to Resolution (MTTR).
- **Optimal Routing Formula**:
  $$\text{Match Score} = S_{\text{match}} \times \left(1 - \frac{W_{\text{active}}}{W_{\text{max}}}\right) \times \text{EfficiencyScore}$$
- **Dynamic Re-Balancing**: Auto-reassigns lower priority tickets when a critical P0 outage strikes an already busy developer.

### 4. 💻 Developer Command Center & AI Copilot Workspace
- **Developer Workboard**: View assigned tickets, SLA timers, and affected ERP modules.
- **AI Developer Assistant**: Offers 1-click explanation of obscure ERP tracebacks, code diff previews, and auto-generated ticket resolution summaries.
- **Team Workload Heatmap**: Visual dashboard showing team bandwidth, open vs resolved tickets, and MTTR trends.

### 5. 🎬 Quick Scenario Simulator Mode
Preset scenario triggers for one-click product demos:
- ⚡ **Scenario 1**: *Odoo Invoicing Tax Exemption Validation Error (P1)*
- ⚡ **Scenario 2**: *SAP Payroll Processing Deadlock Outage (P0)* — Triggers dynamic load rebalancing!
- ⚡ **Scenario 3**: *NetSuite Inventory Stock Quantity Discrepancy (P2)*

---

## 🛠️ Technology Stack

- **Frontend**: React + Vite
- **Styling**: Modern Vanilla CSS with dark glassmorphism styling, clean custom UI components, responsive grids
- **State Management**: Reactive state store with mock live webhooks/telemetry
- **Visualizations & Charts**: Custom CSS Gauges, Workload Heatmaps, Metric Cards, Recharts
- **AI Integration**: Gemini API for Vision OCR, diagnostic triage, root cause prediction, and developer copilot

---

## 🗺️ Execution Roadmap

- [x] **Phase 1: Architecture & UI Shell Setup** — Configure Vite + React, create CSS design system variables & glassmorphic layout.
- [x] **Phase 2: Ingestion & OCR Diagnostics Engine** — Build screenshot parser dropzone & vague query enhancer.
- [x] **Phase 3: Smart Ticket Classification & Root Cause Engine** — Build auto-categorization & P0-P3 severity matrix.
- [x] **Phase 4: Dynamic Developer Load Balancing System** — Implement developer skill matrix, workload gauges, and routing algorithm.
- [x] **Phase 5: Developer Command Center & AI Copilot** — Build code fix previewer, SLA timers, and post-mortem generator.
- [x] **Phase 6: Interactive Scenario Simulator & Polish** — Add 1-click sample scenarios, quick-access preset panel, and polished micro-animations.
- [x] **Phase 7: Live Anthropic Claude API Integration & RAG Reranking** — Connected real Claude API (`claude-opus-4-8`) for severity scoring, root cause prediction, copilot chat, and RAG candidate reranking with graceful rule-based fallbacks.
- [x] **Phase 8: Real Browser Tesseract.js OCR Engine** — Replaced mock OCR with Web Worker + WASM pixel-level text extraction and bounding box detection.
- [x] **Phase 9: 10 Enterprise AI Features Architecture** — Implemented Root Cause Tree, Decision Explainability, Business Impact ($/hr), Timeline, Executive Briefing, War Room, Digital Twin, Replay Engine, Patch Safety Preview, and Mission Control.

---

## 🔮 Sequential Execution Roadmap for Enterprise Production Readiness

Follow this exact sequence for implementation:

### 📍 Phase 10: Complete LLM Coverage Across All Enterprise Services
> **Goal:** Upgrade remaining template-based services to use live Claude AI reasoning.
- [x] **Task 10.1**: Refactored `server/services/explainabilityService.js` to call `llmService.completeJson()` for a dynamic decision narrative synthesizing severity/routing/duplicate/KB signals.
- [x] **Task 10.2**: Refactored `server/services/businessImpactService.js` to use Claude for real-time financial loss estimation, compliance risk analysis, and SLA breach probability.
- [x] **Task 10.3**: Refactored `server/services/executiveSummaryService.js` to generate dynamic non-technical executive briefings and mitigation action plans via LLM.
- [x] **Task 10.4**: Refactored `server/services/patchPreviewService.js` (the AI Patch Preview & Safety Guardrails service) to evaluate suggested SQL patch safety, risk scores, and rollback steps using LLM reasoning.
- [x] **Task 10.5**: `server/utils/simpleCache.js` now also caches the Task 10.1–10.4 LLM calls to keep repeated ticket-insight requests instant.

### 📍 Phase 11: PostgreSQL & `pgvector` Database Persistence Layer
> **Goal:** Replace in-memory array database (`server/db/inMemoryStore.js`) with production-grade PostgreSQL storage.
- [ ] **Task 11.1**: Design PostgreSQL SQL schemas for `tickets`, `users`, `developer_profiles`, `knowledge_articles`, `incidents`, and `audit_logs`.
- [ ] **Task 11.2**: Enable `pgvector` extension and add vector column (`vector(1536)`) for ticket & knowledge base embeddings.
- [ ] **Task 11.3**: Create database client (`server/db/postgres.js`) using `pg` connection pool to execute queries.
- [ ] **Task 11.4**: Replace `inMemoryStore.js` methods with async PostgreSQL queries and transaction management.
- [ ] **Task 11.5**: Create database migration and initial seed scripts (`server/db/seed.js`).

### 📍 Phase 12: Authentication, Security & Server-Side RBAC
> **Goal:** Replace client-side role toggle with real security, authentication, and permission enforcement.
- [ ] **Task 12.1**: Add user registration, login (`/api/auth/login`), and JWT token generation using `bcrypt` and `jsonwebtoken`.
- [ ] **Task 12.2**: Implement authentication middleware (`server/middleware/authMiddleware.js`) to verify Bearer JWT tokens on protected routes.
- [ ] **Task 12.3**: Implement Role-Based Access Control (RBAC) middleware enforcing permissions per role (`END_USER`, `SUPPORT_TRIAGE`, `DEVELOPER`, `EXECUTIVE`).
- [ ] **Task 12.4**: Add Zod request body validation schemas for ticket creation, copilot chat, and user updates.
- [ ] **Task 12.5**: Add API rate limiting middleware to prevent prompt injection and API key quota exhaustion.

### 📍 Phase 13: Containerization & DevOps Setup
> **Goal:** Containerize the full stack for zero-friction deployment on any cloud host.
- [ ] **Task 13.1**: Write multi-stage production `Dockerfile` for Vite React frontend with Nginx web server.
- [ ] **Task 13.2**: Write `Dockerfile` for Node.js API backend server.
- [ ] **Task 13.3**: Write `docker-compose.yml` orchestrating API server, Nginx frontend, and PostgreSQL + `pgvector` database container.
- [ ] **Task 13.4**: Implement `/api/health` endpoint with database and LLM API status checks.

### 📍 Phase 14: Automated Testing Suite & CI/CD Pipeline
> **Goal:** Ensure 100% reliability with automated tests and CI workflows.
- [ ] **Task 14.1**: Set up Vitest test runner for backend service testing.
- [ ] **Task 14.2**: Add unit tests for developer load balancing formula, severity matrix, and TF-IDF candidate matching.
- [ ] **Task 14.3**: Add API endpoint integration tests using `supertest`.
- [ ] **Task 14.4**: Create GitHub Actions CI workflow (`.github/workflows/ci.yml`) to automatically test and build on every push.

---
*IncidentAI Team*


