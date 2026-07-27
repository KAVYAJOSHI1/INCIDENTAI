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

## 🔮 Phase 10: Production Readiness Roadmap (Next Steps)

- [ ] **1. PostgreSQL & `pgvector` Persistence Layer** — Migrate in-memory data store (`server/db/inMemoryStore.js`) to a persistent PostgreSQL database with `pgvector` embeddings for semantic vector search.
- [x] **2. Full LLM Reasoning across Remaining Enterprise Services** — Wired Claude API into `explainabilityService.js` (decision narrative), `businessImpactService.js` (impact estimate), `executiveSummaryService.js` (briefing prose), and `patchPreviewService.js` (patch risk review), each with a deterministic fallback and `ai_generated` flag, matching the severity/duplicate/knowledge pattern.
- [ ] **3. Authentication & Server-Side RBAC** — Replace client-side role toggle with real JWT/Session authentication, password hashing, and server-side RBAC authorization middleware.
- [ ] **4. Containerization & Docker Orchestration** — Add `Dockerfile` and `docker-compose.yml` for unified single-command deployment of API server, Vite/Nginx frontend, and PostgreSQL + pgvector DB.
- [ ] **5. Automated Testing Suite & API Schema Validation** — Implement Vitest / Supertest integration suites for backend routes, Zod input validation schemas, and React component tests.

---
*IncidentAI Team*

