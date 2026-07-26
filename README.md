# 🛡️ IncidentAI — AI-Powered ERP Support Engineer

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![UI Style](https://img.shields.io/badge/Design-Glassmorphism-8B5CF6?style=flat-square)](https://github.com/KAVYAJOSHI1/INCIDENTAI)
[![AI Engine](https://img.shields.io/badge/AI-Gemini%20Vision%20%2B%20RAG-06B6D4?style=flat-square)](https://github.com/KAVYAJOSHI1/INCIDENTAI)
[![License](https://img.shields.io/badge/License-MIT-green.style=flat-square)](#license)

> **Websys Gooru Hackathon Project**  
> *Automated ERP Error Diagnostics, Smart Ticketing & Dynamic Developer Load Balancing*

---

## 📌 Problem Overview

ERP platforms (SAP, NetSuite, Odoo, Oracle ERP) handle mission-critical business processes like invoicing, inventory, payroll, and accounting. When end-users encounter errors, resolution is hindered by inefficient manual ticketing:
- Non-technical users submit vague bug reports (*"Invoicing button is broken!"*).
- Support engineers spend significant time manually triaging and asking for screenshots.
- Developers get unequally burdened without taking skill match, active ticket load, or MTTR history into account.

**IncidentAI** bridges non-technical users, support triage, and developer allocation into one unified AI platform.

---

## 📊 Project Status

**Working end-to-end** — a real Node.js backend (`server/`, zero external dependencies) implements all 7 modules below with genuine logic, and the React frontend is fully wired to it (no more client-side mocks). Submitting an incident runs the full pipeline server-side: OCR classification → severity scoring → duplicate detection → RAG knowledge search → developer routing → ticket creation, all persisted in the running backend and reflected live across every role view.

| Area | Status |
|---|---|
| All 7 module UIs | ✅ Done |
| Backend logic for all 7 modules | ✅ Done — TF-IDF cosine duplicate/RAG search, weighted severity scoring, load-balancer formula + dynamic rebalancing, analytics | 
| Frontend ↔ backend integration | ✅ Done — every action (submit, assign, resolve, merge, rebalance, copilot chat, KB search/add) hits the real API |
| Hackathon demo readiness | ✅ Ready |

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

- **Frontend Framework**: React 19 + Vite 5
- **Styling**: Vanilla CSS Modern Dark Glassmorphism, CSS Grid, Custom Color Tokens
- **Icons & Graphics**: Lucide Icons
- **Data Visualizations**: Recharts
- **Pipeline Visualizer**: `@xyflow/react` (React Flow)
- **Effects**: `canvas-confetti`
- **AI Triage Integration**: Gemini Vision & Language API Pipeline, PaddleOCR simulator, pgvector HNSW embedding search simulator

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

# 3. Start the backend API (terminal 1)
npm run server
# -> IncidentAI backend listening on http://localhost:4000

# 4. Start the Vite development server (terminal 2)
npm run dev
```

Open your browser and navigate to **`http://localhost:3000/`**. The frontend proxies all `/api/*` requests to the backend (see `vite.config.js`), so both must be running for the app to load data.

---

## 🎬 Hackathon Presentation Walkthrough Steps

1. **Preset Scenario Triggers**: Click any quick demo button in the top navbar (`SAP Tax Error (P1)`, `Payroll Deadlock (P0)`, or `Inventory Cache (P2)`).
2. **End-User Reporter View**: Upload a screenshot or click **Voice Record** to watch the OCR Vision Engine extract text and display the red bounding box on the error pop-up.
3. **Support Triage View**: Switch to role **2. Support Triage Feed** to view the Jira-style ticket, AI root cause analysis, and the **pgvector >85% Duplicate Match Banner**.
4. **Developer Workbench View**: Switch to role **3. Developer Workbench** to view the stack trace, chat with the **IncidentAI Copilot**, and click **Execute AI Patch** to trigger celebratory resolution confetti!
5. **Analytics & AI Pipeline Flow**: Switch to roles **4. Executive Analytics** and **5. AI Pipeline Flow** to present MTTR reduction analytics and the live React Flow execution pipeline diagram.

---

## 📄 Architecture Specifications

For full database schema specifications, RBAC matrix, API documentation, and component breakdowns, see [SAAS_ARCHITECTURE_SPEC.md](SAAS_ARCHITECTURE_SPEC.md) and [INCIDENT_AI_PROJECT_PLAN.md](INCIDENT_AI_PROJECT_PLAN.md).

---

## 👤 Author & License

Developed by **Kavya Joshi** ([@KAVYAJOSHI1](https://github.com/KAVYAJOSHI1)) for Websys Gooru Hackathon.  
Licensed under the [MIT License](LICENSE).
