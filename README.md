# 🛡️ IncidentAI — AI-Powered ERP Support Engineer

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![UI Style](https://img.shields.io/badge/Design-Glassmorphism-8B5CF6?style=flat-square)](https://github.com/KAVYAJOSHI1/INCIDENTAI)
[![AI Engine](https://img.shields.io/badge/AI-Rule--Based%20%2B%20Real%20OCR-06B6D4?style=flat-square)](https://github.com/KAVYAJOSHI1/INCIDENTAI)
[![License](https://img.shields.io/badge/License-MIT-green.style=flat-square)](#license)

> *Automated ERP Error Diagnostics, Smart Ticketing & Dynamic Developer Load Balancing*

---

## 📌 Problem Overview

ERP platforms (SAP, NetSuite, Odoo, Oracle ERP) handle mission-critical business processes like invoicing, inventory, payroll, and accounting. When end-users encounter errors, resolution is hindered by inefficient manual ticketing:
- Non-technical users submit vague bug reports (*"Invoicing button is broken!"*).
- Support engineers spend significant time manually triaging and asking for screenshots.
- Developers get unequally burdened without taking skill match, active ticket load, or MTTR history into account.

**IncidentAI** bridges non-technical users, support triage, and developer allocation into one unified AI platform.

---

## 🎨 Premium Dark Glassmorphism Design System & Dashboards

IncidentAI features a state-of-the-art enterprise design system crafted for high visual impact and executive presentation:

- **Theme Palette**: Deep space dark mode (`#090D16`, `#0F172A`, `#1E1B4B`) paired with vivid HSL accent gradients (Indigo `#6366F1`, Cyan `#06B6D4`, Emerald `#10B981`, Rose `#F43F5E`).
- **Glassmorphism Panels**: Custom frosted-glass panels (`backdrop-filter: blur(16px)` with `border: 1px solid rgba(255,255,255,0.1)`).
- **Micro-Animations & Status Pulses**: Animated pulse indicators, capacity progress bars, live ticker feeds, and celebratory confetti upon patch resolution.
- **Unified Role Dashboard Portals**:
  1. **Smart Incident Reporter**: Multimodal dropzone + vision error bounding box overlay.
  2. **Support Triage Feed**: Jira-style ticket view + pgvector duplicate detection banner.
  3. **Developer Workbench**: Stack trace inspector, editable SQL patch sandbox, and AI Copilot chat.
  4. **Executive Analytics**: Recharts MTTR area charts, module heatmaps, and severity distribution.
  5. **React Flow Pipeline Visualizer**: Animated AI node graph.
  6. **Enterprise War Room**: Live operations status cards and system pulse indicators.
  7. **ERP Digital Twin**: Visual topology map of microservices and failure probabilities.
  8. **Mission Control**: Executive auto-refreshing command center.

---

## 📊 Project Status

**Working end-to-end as a functional MVP (~90% of that target).** A real Node.js backend (`server/`, zero external dependencies) implements all 7 core modules plus the 10-feature Enterprise Roadmap below with genuine logic, and the React frontend is fully wired to it — no client-side mocks remain. Submitting an incident runs the full pipeline server-side: OCR classification → severity scoring → duplicate detection → RAG knowledge search → developer routing → ticket creation, all persisted in the running backend and reflected live across every role view.

**Against the full enterprise SaaS vision (`SAAS_ARCHITECTURE_SPEC.md`): roughly 35–40%.** The module *logic and plumbing* is real and complete; what's still simulated is the infrastructure underneath it.

### ✅ Done

| Area | Status |
|---|---|
| All 7 core module UIs | Done — Premium Dark Glassmorphism design system & dynamic dashboards |
| Backend logic for all 7 core modules | Done — TF-IDF cosine duplicate/RAG search, weighted severity scoring, load-balancer formula + dynamic rebalancing, analytics |
| Real OCR Engine | Done — image uploads run through actual Tesseract.js pixel-level text extraction (Web Worker + WASM), with a real word-level bounding box drawn over the uploaded screenshot when an error code is found. Non-image files (PDF/.log) still use the text-based classifier. |
| 10-feature Enterprise Roadmap (backend + UI) | Done — see section below |
| Frontend ↔ backend integration | Done — every action (submit, assign, resolve, merge, rebalance, copilot chat, KB search/add) hits the real API |
| UI polish | Done — fixed Tailwind CSS never being wired up (it was inert since day one), added loading skeletons and proper empty states across every panel, made the navbar and AI Insights tabs scroll on mobile instead of overflowing |
| Build/deploy plumbing | Done — fixed `vite preview` missing the `/api` proxy (only `server.proxy` existed, not `preview.proxy`), which broke every API call under a production build |
| Real AI reasoning | Done — severity scoring, root cause prediction, and the developer copilot chat now call the real Claude API (`@anthropic-ai/sdk`, `claude-opus-4-8`) via `server/services/llmService.js`. **Requires `ANTHROPIC_API_KEY`** (copy `.env.example` to `.env`) — without a key, or on any API failure, each one transparently falls back to its original deterministic rule-based logic, so the app never breaks either way. Check `ai_generated: true/false` on the response to see which path served a given result. |
| RAG duplicate detection & knowledge search | Done — retrieve-then-rerank: TF-IDF still does cheap first-pass candidate retrieval (`findDuplicateTickets` / `searchKnowledgeBase`), then Claude semantically judges/ranks that shortlist (`findDuplicateTicketsWithAI` / `searchKnowledgeBaseWithAI`), catching duplicates and relevant articles worded completely differently that lexical similarity alone would miss or under-score. Same graceful fallback to pure TF-IDF without a key. Not real vector embeddings (no embeddings provider configured) — this is LLM-as-reranker over a lexical shortlist, not a semantic vector index. |
| MVP readiness | Ready |

### ⏳ Left for production readiness

| Area | Gap |
|---|---|
| **Persistence** | Backend is in-memory, resets on restart. Needs Postgres + `pgvector` in place of the TF-IDF cosine similarity used today. |
| **AI coverage** | Real Claude reasoning now covers severity, root cause, copilot chat, duplicate detection, and knowledge search (see above) — the 10-feature roadmap's explainability/business-impact/executive-summary services are still template-based, not LLM-generated. |
| **Auth & RBAC** | The role switcher is a client-side toggle only — no real accounts, sessions, or server-side permission checks. |
| **API hardening** | Minimal input validation, no rate limiting, permissive `*` CORS. |
| **Testing** | No automated tests anywhere (frontend or backend). |
| **Ops** | No logging/monitoring, no containerization, no env-based config beyond `PORT`. |
| **Deployment** | Kept as final step — needs hosting for API + static build of frontend behind HTTPS. |

---

## 🚀 Enterprise 10-Feature Architecture Roadmap

To scale **IncidentAI** into a 10/10 Enterprise SaaS product (Microsoft Azure + ServiceNow + Datadog + GitHub Copilot experience), the architecture specifies the following 10 advanced modules.

**Status: all 10 implemented**, same zero-dependency backend pattern as the core 7 modules. Features 1, 2, 3, 4, 5, 8, 9 are ticket-scoped and appear as a new **Enterprise AI Insights** tab strip at the bottom of every ticket in the Support Triage view. Features 6, 7, 10 are standalone live dashboards, added as navbar roles **6. War Room**, **7. Digital Twin**, and **8. Mission Control** (auto-refresh every 5–8s).

```
========================================================================================
                          INCIDENTAI ENTERPRISE PLATFORM MAP
========================================================================================

 ┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
 │ 1. AI ROOT CAUSE ENGINE   │ ───► │ 2. DECISION EXPLAINABILITY│ ───► │ 3. BUSINESS IMPACT ENGINE │
 │ (Dependency Tree & Code)  │      │ (Score % & Reasoning)     │      │ ($/hr Revenue Loss & SLA) │
 └───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
               │                                  │                                  │
               ▼                                  ▼                                  ▼
 ┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
 │ 4. AI INCIDENT TIMELINE   │ ───► │ 5. EXECUTIVE AI SUMMARY   │ ───► │ 6. ENTERPRISE WAR ROOM    │
 │ (Animated Workflow Steps) │      │ ("Explain to Executive")  │      │ (Live Ops & System Pulse) │
 └───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
               │                                  │                                  │
               ▼                                  ▼                                  ▼
 ┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
 │ 7. ERP DIGITAL TWIN       │ ───► │ 8. INCIDENT REPLAY ENGINE │ ───► │ 9. AI PATCH PREVIEW       │
 │ (Live Topology & Health)  │      │ (Visual Step Playback)    │      │ (Rollback & Risk Score)   │
 └───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
                                                  │
                                                  ▼
                                    ┌───────────────────────────┐
                                    │ 10. MISSION CONTROL       │
                                    │ (Command Center Dashboard)│
                                    └───────────────────────────┘
```

### 1. 🌲 AI Root Cause Engine
Interactive visual dependency tree mapping root cause, file name, function name, ERP module, suspected trigger, dependency chain, confidence score, and human error likelihood.

### 2. 💡 AI Decision Explainability Matrix
Explicit reasoning breakdowns for every AI decision:
- **Severity**: Why `P0 Critical` (Payroll affected, Production environment, DB lock).
- **Developer Routing**: Why `Sarah` (48 similar incidents solved, 27% workload, 1.3h MTTR).
- **Duplicate Match**: Why `89%` (Error code, stack trace, OCR symbol match).

### 3. 📉 Business Impact & Financial Loss Engine
Real-time financial and operational loss predictor showing estimated revenue loss ($/hr), affected users, impacted departments, compliance risk level, and SLA breach probability.

### 4. ⏳ Animated AI Incident Lifecycle Timeline
Visual step-by-step progress tracking:  
`Incident Created ➔ OCR Diagnostics ➔ Vision Analysis ➔ Duplicate Search ➔ Knowledge Retrieval ➔ Root Cause ➔ Dev Assigned ➔ Patch Generated ➔ Resolved`.

### 5. 👔 Executive AI Summary ("Explain to Executive")
One-click executive briefing card generating non-technical business summaries, financial exposure risks, resolution ETAs, and recommended leadership actions.

### 6. 🚨 Enterprise War Room Operations Center
Real-time live operations center featuring status cards for all enterprise ERP modules (Payroll, Inventory, Finance, Sales), live activity feeds, critical incident tickers, and animated system pulse indicators.

### 7. 🗺️ ERP Digital Twin System Topology
Visual interactive map of interconnected ERP microservices and modules displaying green/yellow/red health statuses, failure predictions, and active incident overlaps.

### 8. 🎬 Incident Replay Engine
Step-by-step visual replay engine animating:  
`User Action ➔ API Call ➔ SQL Query ➔ ERP Service ➔ Failure Point ➔ AI Diagnosis ➔ Resolution`.

### 9. 🛡️ AI Patch Preview & Safety Guardrails
Pre-execution safety modal displaying affected files, estimated success %, rollback plan, side effect warnings, risk scores, and step-by-step execution steps.

### 10. 🎛️ Mission Control Command Center
Unified auto-refreshing dashboard tracking live incidents, developer capacity, AI queue latency, knowledge base hits, system health, daily cost savings, and team MTTR.

---

## 🌟 7 Core AI Modules

```
                ┌────────────────────────────────────────────────────────┐
                │          1. SMART MULTIMODAL INCIDENT REPORTER         │
                │     (Drag & Drop Screenshots, Logs, Voice Recording)   │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │             2. OCR + VISION AI DIAGNOSTICS             │
                │  (PaddleOCR Symbol Extractor & Error Red Bounding Box) │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │         3. JIRA-STYLE TICKET GENERATOR & SEVERITY      │
                │    (Auto-Title, Steps, Expected/Actual, Root Cause)    │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │         4. PGVECTOR DUPLICATE DETECTION ENGINE         │
                │        (85% Semantic Similarity Match & 1-Click Merge) │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │           5. RAG KNOWLEDGE BASE VECTOR HUB             │
                │   (Indexed Past Resolutions, Runbooks & Confidence %)  │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │       6. DYNAMIC DEVELOPER LOAD BALANCER & ROUTING     │
                │ (Skill Match x Active Capacity Gauge x MTTR Speed Algo)│
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │    7. EXECUTIVE ANALYTICS & REACT FLOW AI PIPELINE     │
                │    (MTTR Reduction Charts, Heatmap, Execution Graph)   │
                └───────────────────────────┬────────────────────────────┘
```

### Module Details
1. **Smart Incident Reporter**: Ingests ERP error screenshots, PDF invoices, `.log` stack traces, and simulated voice recordings. Includes an **Instant Self-Fix Advisor** for user configuration mistakes.
2. **OCR + Vision AI Diagnostic Engine**: Extracts exact error codes (e.g. `ERR_TAX_VAL_402`, `ERR_PAYROLL_DEADLOCK`, `ERR_STOCK_NEG`), detects UI components (`<PostInvoiceButton/>`), and draws dynamic red bounding box overlays on screenshots.
3. **Jira-Style AI Ticket Generator**: Produces structured tickets complete with Title, Steps to Reproduce, Severity Badges (`P0 Critical` to `P3 Low`), Expected vs Actual behavior, and AI-predicted Root Cause Analysis.
4. **pgvector Duplicate Detection Engine**: Calculates semantic vector similarity distance and displays an alert banner (*"89% Match with active ticket INC-8840"*) with a 1-click **Merge Duplicate** button.
5. **RAG Knowledge Base Vector Hub**: Semantic vector search across historical ticket resolutions and SOP runbooks with confidence scoring.
6. **Dynamic Developer Load Balancer**: Routes tickets using a real-time match formula based on developer skills (`SAP ABAP`, `Odoo/Python`, `PostgreSQL`, `Oracle PL/SQL`), active workload capacity (`3/5 tickets`), and MTTR speed metrics. Includes **Auto Re-Balance** controls.
7. **Executive Analytics & AI Execution Pipeline**: Features MTTR reduction area charts (`1.9 hrs vs 8.2 hrs manual`), ERP module error heatmap bar charts, severity pie charts, and an interactive **React Flow AI Execution Pipeline** node graph.

---

## 🛠️ Technology Stack

**Frontend**
- React 19 + Vite 5
- Tailwind CSS 3 (utility classes) + hand-written CSS design tokens (Dark Glassmorphism theme, gradients, badges, animations)
- Lucide Icons, Recharts (analytics), `@xyflow/react` (React Flow pipeline/topology diagrams), `canvas-confetti`
- `tesseract.js` — real in-browser OCR (Web Worker + WASM) for uploaded screenshots

**Backend** (`server/`)
- Plain Node.js `http` server — otherwise zero external dependencies, no framework
- `@anthropic-ai/sdk` (`claude-opus-4-8`) for real AI reasoning on severity scoring, root cause prediction, copilot chat, and RAG reranking (`server/services/llmService.js`) — requires `ANTHROPIC_API_KEY`, falls back to deterministic logic without it
- In-memory data store (`server/db/`) seeded with sample developers, tickets, and knowledge base articles
- Custom TF-IDF cosine similarity engine (`server/utils/textSimilarity.js`) for first-pass candidate retrieval, with Claude re-ranking the shortlist for duplicate detection and knowledge search — not real vector embeddings
- Rule/keyword-based classifier for OCR text interpretation (module/error-code extraction)

**Not yet integrated**: no database (Postgres/pgvector), no auth — see the gaps table below.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation & Running Locally

The app is two processes: the backend API (`server/`) and the Vite frontend. Both need to be running.

```bash
# 1. Clone the repository
git clone https://github.com/KAVYAJOSHI1/INCIDENTAI.git
cd INCIDENTAI

# 2. Install dependencies
npm install

# 3. (Optional) Enable real Claude reasoning — copy .env.example to .env and add your key.
# Without this step the backend runs fine, just with rule-based logic instead of live AI.
cp .env.example .env

# 4. Start the backend API (terminal 1)
npm run server
# -> IncidentAI backend listening on http://localhost:4000

# 5. Start the Vite development server (terminal 2)
npm run dev
```

Open your browser and navigate to **`http://localhost:3000/`**. The frontend proxies all `/api/*` requests to the backend (see `vite.config.js`), so both must be running for the app to load data.

---

## 🎬 Product Walkthrough

1. **Quick Scenario Triggers**: Click any sample scenario button in the top navbar (`SAP Tax Error (P1)`, `Payroll Deadlock (P0)`, or `Inventory Cache (P2)`) to submit a fully worked incident in one click.
2. **End-User Reporter View**: Upload a screenshot for real Tesseract.js OCR extraction, or click **Voice Record**, to watch the Vision Engine extract text and display the bounding box on the error pop-up.
3. **Support Triage View**: Switch to role **2. Support Triage Feed** to view the Jira-style ticket, AI root cause analysis, the **pgvector >85% Duplicate Match Banner**, and the Enterprise AI Insights panel (root cause tree, explainability, business impact, timeline, executive summary, replay, patch preview).
4. **Developer Workbench View**: Switch to role **3. Developer Workbench** to view the stack trace, chat with the **IncidentAI Copilot**, and click **Execute AI Patch** to trigger resolution confetti.
5. **Analytics & AI Pipeline Flow**: Switch to roles **4. Executive Analytics** and **5. AI Pipeline Flow** for MTTR reduction analytics and the live React Flow execution pipeline diagram.
6. **Enterprise Operations**: Switch to roles **6. War Room**, **7. Digital Twin**, and **8. Mission Control** for live, auto-refreshing operational dashboards.

---

## 📄 Architecture Specifications

For full database schema specifications, RBAC matrix, API documentation, and component breakdowns, see [SAAS_ARCHITECTURE_SPEC.md](SAAS_ARCHITECTURE_SPEC.md) and [INCIDENT_AI_PROJECT_PLAN.md](INCIDENT_AI_PROJECT_PLAN.md).

---

## 👤 Author & License

Developed by **Kavya Joshi** ([@KAVYAJOSHI1](https://github.com/KAVYAJOSHI1)).  
Licensed under the [MIT License](LICENSE).
