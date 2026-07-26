# 🏛️ IncidentAI — Enterprise Single-Project Architecture & Specification
## AI-Powered ERP Support Engineer (Websys Gooru Hackathon Blueprint)

> **Product Name:** IncidentAI  
> **Tagline:** AI-Powered ERP Support Engineer  
> **Project Structure:** Single Unified Codebase (`/home/lenovo/Desktop/INCIDENTAI`)

---

## 1. 📂 Single-Project Unified Directory Structure

Everything runs within a single unified project repository for simple 1-command startup, instant demo reliability, and seamless hackathon presentation:

```
INCIDENTAI/
├── src/
│   ├── components/
│   │   ├── Common/              # Navbar, Sidebar, Role Switcher, UI Glassmorphic System
│   │   ├── Reporter/            # Module 1 & 2: Multimodal OCR, Screenshot & Voice Reporter
│   │   ├── Ticketing/           # Module 3 & 4: Jira-Style Generator & Duplicate Detection
│   │   ├── Knowledge/           # Module 5: RAG Vector Knowledge Base Hub
│   │   ├── LoadBalancer/        # Module 6: Developer Recommendation & Workload Matrix
│   │   ├── Workbench/           # Developer Workbench & AI Patch Copilot
│   │   ├── Analytics/           # Module 7: Executive Dashboard, Heatmap & MTTR Metrics
│   │   └── Pipeline/            # Interactive React Flow AI Execution Pipeline Visualizer
│   ├── services/
│   │   ├── aiService.js         # Gemini Vision, Triage, and Chat API Service
│   │   ├── ocrService.js        # Multimodal OCR & Image Annotation Parser
│   │   ├── ragService.js        # Embedding Search & Duplicate Detection Engine
│   │   └── loadBalancer.js      # Dynamic Developer Routing Algorithm
│   ├── store/
│   │   └── mockDatabase.js      # Unified In-Memory / Local Storage Database Store
│   ├── styles/
│   │   └── index.css            # Dark Glassmorphism CSS Design Tokens & Animations
│   ├── App.jsx                  # Main Application Shell & Role Routing
│   └── main.jsx                 # Entry Point
├── public/                      # Sample ERP screenshots, invoices, & stack trace logs
├── INCIDENT_AI_PROJECT_PLAN.md  # Hackathon Execution Roadmap
├── SAAS_ARCHITECTURE_SPEC.md    # Product Architecture Specification
├── package.json                 # Unified Dependencies
└── vite.config.js               # Vite Development Configuration
```

---

## 2. 🗄️ Unified Data Model Schema

The application uses a unified reactive data store that mimics PostgreSQL + pgvector schemas in a single project architecture:

### 2.1 `Users` & `DeveloperProfiles`
```json
{
  "id": "dev_01",
  "name": "Sarah Jenkins",
  "email": "sarah@websys.io",
  "role": "DEVELOPER",
  "skills": ["SAP ABAP", "PostgreSQL", "Accounting Logic"],
  "erp_modules": ["INVOICING", "GENERAL_LEDGER"],
  "active_tickets": 2,
  "max_capacity": 5,
  "historical_mttr_hours": 3.2,
  "on_call": true,
  "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
}
```

### 2.2 `Tickets` Schema
```json
{
  "id": "INC-2026-8921",
  "title": "[INVOICING] ERR_TAX_VAL_402: Customer GSTIN Validation Failed on Post",
  "reporter": "Finance User (John)",
  "assigned_dev_id": "dev_01",
  "erp_module": "INVOICING",
  "severity": "P1_HIGH",
  "status": "ASSIGNED",
  "vague_user_input": "The post invoice button broke with red tax error!",
  "structured_description": "During invoice post execution, GSTIN validation failed due to missing tax code field in customer master record.",
  "reproduction_steps": ["Open Invoicing Module", "Select Customer #904", "Click Post Invoice"],
  "expected": "Invoice posts successfully to General Ledger",
  "actual": "Red validation error popup ERR_TAX_VAL_402",
  "ocr_findings": {
    "extracted_error_code": "ERR_TAX_VAL_402",
    "detected_component": "PostInvoiceButton",
    "annotated_screenshot": "/samples/err_tax_402.png"
  },
  "duplicate_check": {
    "is_duplicate": false,
    "similarity_score": 0.12
  },
  "ai_root_cause": "Missing tax exemption code in customer profile table `cust_master_tax`.",
  "ai_suggested_patch": "UPDATE customer_master SET tax_exempt_code = 'DEFAULT_EXEMPT' WHERE customer_id = 904;",
  "created_at": "2026-07-26T11:00:00Z"
}
```

---

## 3. 🔐 Single-App Role Portal Switching

Users can seamlessly switch between roles via a top bar role toggle:
1. **End User View**: Multimodal Reporter + Self-Fix Wizard.
2. **Support Triage View**: All Incidents Feed, Duplicate Detector, Routing Adjuster.
3. **Developer View**: Assigned Workbench, Stack Trace Inspector, AI Patch Copilot.
4. **Admin / Executive View**: Analytics Heatmap, Team Workload Balancer, React Flow AI Pipeline Visualizer.

---

## 4. ⚡ 7 Core AI Modules (Single-App Architecture)

| Module | Feature | Implementation |
|---|---|---|
| **Module 1** | **Smart Incident Reporter** | Drag & drop screenshots, PDFs, logs + Voice Input simulator |
| **Module 2** | **OCR + Vision AI** | Text extraction, stack trace parsing, auto-drawing red bounding boxes on error popups |
| **Module 3** | **Jira-Style AI Ticket Generator** | Auto-generating Title, Description, Steps, Expected/Actual, Root Cause |
| **Module 4** | **Duplicate Detection Engine** | Vector similarity scoring comparing incoming tickets to past active tickets |
| **Module 5** | **RAG Knowledge Base Engine** | Semantic search across historical ticket resolutions & documentation |
| **Module 6** | **Developer Recommendation AI** | Dynamic skill-matching + live workload capacity load balancing algorithm |
| **Module 7** | **Analytics & Execution Pipeline** | Module error heatmaps, MTTR reduction charts, and React Flow AI pipeline graph |

---
*Single-Project Enterprise Specification for IncidentAI*
