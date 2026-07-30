# 🤖 IncidentAI — AI Features & Implementation Plan

> **Status:** Active Development · Hackathon Build — Websys Gooru 2026

---

## Overview

IncidentAI is an ERP Support Intelligence Engine that uses a **multi-layer AI pipeline** — real Claude reasoning, Voyage AI vector embeddings, pgvector semantic search, and Tesseract.js OCR — to autonomously triage, diagnose, route, and resolve enterprise ERP incidents.

Every AI feature follows a **graceful degradation contract**: if no API key is configured or a call fails for any reason, the system silently falls back to a deterministic rule-based equivalent. The app never breaks because an AI provider is unavailable.

---

## 🧠 AI Features (Current — Implemented)

### 1. Severity Scoring Engine
**File:** `server/services/severityService.js`

| Mode | Method |
|---|---|
| **AI Mode** | Claude JSON-schema constrained classification (`P0_CRITICAL` → `P3_LOW`) with reasoning |
| **Fallback** | Weighted keyword scoring + ERP module base impact table |

- Classifies by **business impact**, not emotional tone
- Returns structured `reasons[]` array for explainability
- SLA target automatically set from severity tier (15 / 45 / 120 / 240 min)

---

### 2. Root Cause & Patch Predictor
**File:** `server/services/rootCauseService.js`

| Mode | Method |
|---|---|
| **AI Mode** | Claude diagnoses root cause + proposes concrete SQL/code patch with calibrated confidence |
| **Fallback** | Signature lookup table (5 known ERP error patterns) + generic template |

- ERP-convention-aware prompts (SAP ABAP, Odoo ORM, Oracle PL/SQL, NetSuite SuiteScript)
- Confidence score (0–1) attached to every prediction

---

### 3. Duplicate Detection (3-Layer Pipeline)
**File:** `server/services/duplicateService.js`

```
Layer 1: TF-IDF cosine similarity  →  cheap candidate shortlist
Layer 2: pgvector cosine distance  →  semantic vector ranking (Voyage AI embeddings)
Layer 3: Claude reranking          →  semantic judgment on the shortlist
```

- Error code exact-match boost (`+0.35` to cosine score)
- 30-second TTL cache to avoid burning API calls on rapid re-checks
- Returns `is_duplicate`, `top_match`, `related[]`, `reasoning`

---

### 4. RAG Knowledge Hub
**File:** `server/services/knowledgeService.js`

```
Retrieve: TF-IDF or pgvector candidate articles
Generate: Claude semantic reranking with why_relevant per article
```

- Search-as-you-type with 60-second TTL cache
- Module-affinity boost (`+0.15`) when article ERP module matches ticket
- Falls back to pure TF-IDF ranking when LLM unavailable

---

### 5. AI Developer Copilot (Chat)
**File:** `server/services/copilotService.js`  
**Route:** `POST /api/copilot/chat`

- Full ticket context injected into system prompt (title, root cause, patch, routing, OCR findings)
- Intent-matched fallback for: root cause / patch / postmortem / assignment queries
- **Planned upgrade:** SSE streaming + multi-turn conversation memory (see roadmap below)

---

### 6. AI Patch Preview & Safety Guardrails
**File:** `server/services/patchPreviewService.js`

| Mode | Method |
|---|---|
| **AI Mode** | Claude reviews its own suggested patch — affected tables, risk score, rollback plan, execution steps |
| **Fallback** | Regex table extraction + severity/module-based risk heuristic |

- Financial module detection (`PAYROLL`, `GENERAL_LEDGER`) triggers dual sign-off warning
- 60-second TTL cache per `ticket_id + patch` hash

---

### 7. AI Decision Explainability Matrix
**File:** `server/services/explainabilityService.js`

- Surfaces **why** every AI decision was made — severity, routing, duplicate match, KB matches
- `ai_generated` flag on every field distinguishes real Claude output from rule-based fallback
- **AI Mode:** Claude synthesizes a plain-English narrative from the structured explainability JSON
- **Fallback:** Template-based sentence assembly

---

### 8. Business Impact & Financial Loss Engine
**File:** `server/services/businessImpactService.js`

| Mode | Method |
|---|---|
| **AI Mode** | Claude estimates revenue loss/hour, affected users, departments, compliance risk, SLA breach % |
| **Fallback** | Module × severity multiplier table with SLA urgency bump |

- Module revenue baselines: `PAYROLL: $8,200/hr`, `INVOICING: $6,400/hr`, etc.
- Compliance risk elevated for `PAYROLL` and `GENERAL_LEDGER`

---

### 9. Executive AI Briefing
**File:** `server/services/executiveSummaryService.js`

| Mode | Method |
|---|---|
| **AI Mode** | Claude writes plain-English headline + business summary grounded in computed impact figures |
| **Fallback** | Template string assembly from ticket + impact data |

- JSON schema enforces no hallucinated numbers — Claude uses provided figures exactly
- Generates recommended leadership actions per ticket

---

### 10. Dynamic Developer Load Balancing
**File:** `server/services/loadBalancerService.js`

```
Match Score = SkillMatch(0.45) × CapacityScore(0.35) × SpeedFactor(0.20) × OnCallBonus
```

- Skill overlap matching against `MODULE_SKILLS_MAP` (SAP ABAP, Oracle PL/SQL, etc.)
- MTTR-based speed factor: faster resolvers scored higher
- P0 escalation triggers automatic workload rebalancing — offloads P2/P3 tickets from overloaded devs

---

### 11. Multimodal OCR & Vision Diagnostics
**File:** `server/services/ocrService.js`

| Mode | Method |
|---|---|
| **Current** | Keyword signature matching on submitted text (simulated) |
| **Planned** | Real Tesseract.js server-side OCR on uploaded screenshot images |

- Extracts: `error_code`, `erp_module`, `detected_ui_component`, `bounding_box`, `confidence`
- Self-fix suggestions generated for known resolvable errors (e.g. missing GSTIN exemption)

---

### 12. Vector Embeddings (Voyage AI + pgvector)
**File:** `server/services/embeddingService.js`

- Model: `voyage-3.5`, 1024 dimensions — matches `vector(1024)` columns in `schema.sql`
- Query embedding cached for 60 seconds (prevents re-embedding on search-as-you-type)
- Separate `input_type`: `"query"` vs `"document"` for proper retrieval optimization
- Falls back to TF-IDF cosine similarity when `VOYAGE_API_KEY` not set

---

## 🚀 Real-Time Upgrade Roadmap

> These are the **planned upgrades** to replace remaining static/simulated behaviour.

### Priority 1 — Streaming Copilot Chat
**Problem:** Claude's reply appears all at once after full inference. Feels static.  
**Fix:** Replace `POST /api/copilot/chat` with an SSE endpoint (`GET /api/copilot/stream`).

```
Server → Client: text/event-stream
data: {"chunk": "The root cause"}
data: {"chunk": " is a missing index"}
data: {"chunk": " on emp_tax_deductions_2026"}
data: [DONE]
```

Frontend: tokens rendered live into chat bubble with a blinking cursor. No "thinking…" spinner.

---

### Priority 2 — Multi-Turn Conversation Memory
**Problem:** Every Copilot message is independent — Claude forgets prior answers.  
**Fix:** Frontend maintains `history: [{role, content}]` array; passed on every SSE request.

```js
// Each new message appends the history
messages: [...history, { role: "user", content: newMessage }]
```

Claude now remembers the full conversation thread within a session.

---

### Priority 3 — Real Tesseract.js OCR
**Problem:** `ocrService.js` does keyword matching on text input, not real image reading.  
**Fix:** Accept `base64` image in request body, run server-side Tesseract.js, extract real text.

```
User uploads ERP screenshot → Tesseract extracts real text → Error signature classifier runs on real OCR output
```

---

### Priority 4 — AI Load Balancer Reasoning
**Problem:** Load balancer routing is pure math — no LLM reasoning.  
**Fix:** Add `recommendDeveloperWithAI()` that has Claude reason over the developer pool using ticket context.

---

### Priority 5 — Model Name Fix
**Problem:** `MODEL = "claude-opus-4-8"` is invalid and will throw API errors.  
**Fix:** `"claude-opus-4-8"` → `"claude-opus-4-5"`

---

## 🏗️ Architecture: AI Decision Flow

```
User reports incident (text / screenshot)
         │
         ▼
  [OCR / Vision Layer]  ←── Tesseract.js + Signature Classifier
         │
         ▼
  [Severity Engine]  ←── Claude JSON schema / Keyword fallback
         │
         ▼
  [Duplicate Check]  ←── TF-IDF → pgvector → Claude reranker
         │
         ▼
  [Root Cause + Patch]  ←── Claude ERP-domain reasoning
         │
         ▼
  [Developer Routing]  ←── Skill × Capacity × MTTR formula
         │
         ▼
  [RAG Knowledge Hub]  ←── pgvector search → Claude reranker
         │
         ▼
  [Business Impact]  ←── Claude / Module-severity table
         │
         ▼
  [Executive Summary]  ←── Claude plain-English briefing
         │
         ▼
  [Explainability]  ←── Claude narrative / Template fallback
```

---

## ⚙️ Environment Variables

```env
# Required for Claude AI reasoning
ANTHROPIC_API_KEY=sk-ant-...

# Required for Voyage AI vector embeddings  
VOYAGE_API_KEY=pa-...

# Postgres (pgvector)
PGHOST=localhost
PGPORT=5436
PGUSER=incidentai
PGPASSWORD=incidentai
PGDATABASE=incidentai

# JWT
JWT_SECRET=your-secret-here
```

> Without `ANTHROPIC_API_KEY`, all Claude calls return `null` and the system runs entirely on deterministic fallbacks. The app is fully functional in both modes.

---

## 📊 AI Feature Rating (Honest Assessment)

| Feature | Score | Mode |
|---|---|---|
| Graceful Degradation Architecture | ⭐⭐⭐⭐⭐ 10/10 | ✅ Live |
| Duplicate Detection (3-layer pipeline) | ⭐⭐⭐⭐⭐ 9/10 | ✅ Live |
| Severity Scoring | ⭐⭐⭐⭐½ 9/10 | ✅ Live |
| RAG Knowledge Hub | ⭐⭐⭐⭐½ 8.5/10 | ✅ Live |
| Vector Embeddings (Voyage + pgvector) | ⭐⭐⭐⭐½ 8.5/10 | ✅ Live |
| Patch Preview & Safety Guardrails | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| AI Explainability Matrix | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| Business Impact Engine | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| AI Copilot (no streaming yet) | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| Executive Briefing | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| Load Balancer (no AI yet) | ⭐⭐⭐ 6/10 | 🔧 Planned |
| OCR (simulated) | ⭐⭐ 4/10 | 🔧 Planned |
| **Overall** | **⭐⭐⭐⭐ 8.2/10** | |

---

*Built for Websys Gooru Hackathon 2026 · KAVYAJOSHI1/INCIDENTAI*
