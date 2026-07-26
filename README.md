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

## 🗺️ Roadmap & Upcoming System Enhancements

To make every interface a deep production-level system, the following interface-specific enhancements are planned:

### 1. Smart Reporter & OCR Vision AI Interface
- **Web Speech API Speech-to-Text**: Real browser microphone audio transcription for voice bug reports.
- **Interactive Canvas Bounding Box Annotator**: Dynamic polygon drawing tool on uploaded ERP screenshots highlighting exact error code locations.

### 2. Support Triage & Jira Ticket View Interface
- **Interactive Ticket Spec Editor**: Modal to edit summaries, override severity levels (`P0` to `P3`), and re-tag ERP modules.
- **Export Ticket Payloads**: One-click export of structured ticket payloads in JSON and Markdown formats.

### 3. Developer Workbench & Copilot Interface
- **Interactive Patch Execution Terminal**: Live console window displaying real-time execution logs (`[CONNECTING TO DB...]`, `[EXECUTING SQL...]`, `[0 ERRORS]`).
- **Editable SQL/Code Patch Sandbox**: Code editor allowing engineers to modify AI-suggested SQL patches prior to running.
- **Export Post-Mortem Report**: Downloadable incident resolution post-mortem reports.

### 4. RAG Knowledge Base & Analytics Interfaces
- **Interactive Node Inspection on AI Pipeline Flow**: Clicking nodes in the React Flow visualizer opens raw JSON data payloads passing through that pipeline step.
- **Persistent Database Adapter**: Swap in-memory store for PostgreSQL + `pgvector` HNSW indexes.

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
                └────────────────────────────────────────────────────────┘
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
