# 🤖 IncidentAI — AI Features, Status & Roadmap

> **Status:** Active Development · Hackathon Build — Websys Gooru 2026  
> **Last updated:** 2026-07-30 · Commit `00310c2`

---

## Overview

IncidentAI is an ERP Support Intelligence Engine that uses a **multi-layer AI pipeline** — LLM reasoning (Groq/Claude), Voyage AI vector embeddings, pgvector semantic search, and Tesseract.js OCR — to autonomously triage, diagnose, route, and resolve enterprise ERP incidents.

Every AI feature follows a **graceful degradation contract**: if no API key is configured or a call fails for any reason, the system silently falls back to a deterministic rule-based equivalent. The app never breaks because an AI provider is unavailable.

---

## ✅ Completed (Shipped)

### 1. Severity Scoring Engine
**File:** `server/services/severityService.js` · **Status: ✅ Live**

| Mode | Method |
|---|---|
| **AI Mode** | LLM JSON-schema constrained classification (`P0_CRITICAL` → `P3_LOW`) with reasoning |
| **Fallback** | Weighted keyword scoring + ERP module base impact table |

- Classifies by **business impact**, not emotional tone
- Returns structured `reasons[]` array for explainability
- SLA target automatically set from severity tier (15 / 45 / 120 / 240 min)

---

### 2. Root Cause & Patch Predictor
**File:** `server/services/rootCauseService.js` · **Status: ✅ Live**

| Mode | Method |
|---|---|
| **AI Mode** | LLM diagnoses root cause + proposes concrete SQL/code patch with calibrated confidence |
| **Fallback** | Signature lookup table (5 known ERP error patterns) + generic template |

- ERP-convention-aware prompts (SAP ABAP, Odoo ORM, Oracle PL/SQL, NetSuite SuiteScript)
- Confidence score (0–1) attached to every prediction

---

### 3. Duplicate Detection (3-Layer Pipeline)
**File:** `server/services/duplicateService.js` · **Status: ✅ Live**

```
Layer 1: TF-IDF cosine similarity  →  cheap candidate shortlist
Layer 2: pgvector cosine distance  →  semantic vector ranking (Voyage AI embeddings)
Layer 3: LLM reranking             →  semantic judgment on the shortlist
```

- Error code exact-match boost (`+0.35` to cosine score)
- 30-second TTL cache to avoid burning API calls on rapid re-checks
- Returns `is_duplicate`, `top_match`, `related[]`, `reasoning`

---

### 4. RAG Knowledge Hub
**File:** `server/services/knowledgeService.js` · **Status: ✅ Live**

```
Retrieve: TF-IDF or pgvector candidate articles
Generate: LLM semantic reranking with why_relevant per article
```

- Search-as-you-type with 60-second TTL cache
- Module-affinity boost (`+0.15`) when article ERP module matches ticket
- Falls back to pure TF-IDF ranking when LLM unavailable

---

### 5. AI Developer Copilot — SSE Streaming + Multi-Turn Memory
**File:** `server/services/copilotService.js`  
**Routes:** `POST /api/copilot/chat` (blocking) · `POST /api/copilot/stream` (SSE)  
**Status: ✅ Live**

- **Real-time token streaming** via SSE — tokens render live into the chat bubble
- **Multi-turn conversation memory** — last 10 turns passed as `history[]` on every request
- Full ticket context injected into system prompt (root cause, patch, OCR findings, routing)
- Intent-matched fallback (root cause / patch / postmortem / assignment) when LLM unavailable

```
Server → Client: text/event-stream
data: {"chunk": "Row lock contention"}
data: {"chunk": " on emp_tax_deductions_2026"}
data: [DONE]
```

---

### 6. AI Patch Preview & Safety Guardrails
**File:** `server/services/patchPreviewService.js` · **Status: ✅ Live**

| Mode | Method |
|---|---|
| **AI Mode** | LLM reviews its own suggested patch — affected tables, risk score, rollback plan, execution steps |
| **Fallback** | Regex table extraction + severity/module-based risk heuristic |

- Financial module detection (`PAYROLL`, `GENERAL_LEDGER`) triggers dual sign-off warning
- 60-second TTL cache per `ticket_id + patch` hash

---

### 7. AI Decision Explainability Matrix
**File:** `server/services/explainabilityService.js` · **Status: ✅ Live**

- Surfaces **why** every AI decision was made — severity, routing, duplicate match, KB matches
- `ai_generated` flag on every field distinguishes real LLM output from rule-based fallback
- **AI Mode:** LLM synthesizes a plain-English narrative from the structured explainability JSON
- **Fallback:** Template-based sentence assembly

---

### 8. Business Impact & Financial Loss Engine
**File:** `server/services/businessImpactService.js` · **Status: ✅ Live**

| Mode | Method |
|---|---|
| **AI Mode** | LLM estimates revenue loss/hour, affected users, departments, compliance risk, SLA breach % |
| **Fallback** | Module × severity multiplier table with SLA urgency bump |

- Module revenue baselines: `PAYROLL: $8,200/hr`, `INVOICING: $6,400/hr`, etc.
- Compliance risk elevated for `PAYROLL` and `GENERAL_LEDGER`

---

### 9. Executive AI Briefing
**File:** `server/services/executiveSummaryService.js` · **Status: ✅ Live**

| Mode | Method |
|---|---|
| **AI Mode** | LLM writes plain-English headline + business summary grounded in computed impact figures |
| **Fallback** | Template string assembly from ticket + impact data |

- JSON schema enforces no hallucinated numbers — LLM uses provided figures exactly
- Generates recommended leadership actions per ticket

---

### 10. Dynamic Developer Load Balancing + AI Reasoning
**File:** `server/services/loadBalancerService.js` · **Status: ✅ Live**

```
Match Score = SkillMatch(0.45) × CapacityScore(0.35) × SpeedFactor(0.20) × OnCallBonus
```

- `recommendDeveloperForTicket()` — deterministic math formula (always available)
- `recommendDeveloperWithAI()` — LLM reranks top 3 math candidates with nuanced reasoning
- P0 escalation triggers automatic workload rebalancing — offloads P2/P3 from overloaded devs

---

### 11. Multimodal OCR & Vision Diagnostics
**File:** `server/services/ocrService.js` · **Status: ⚠️ Simulated**

| Mode | Method |
|---|---|
| **Current** | Keyword signature matching on submitted text (not real image reading) |
| **Planned** | Real Tesseract.js server-side OCR on uploaded screenshot images |

- Extracts: `error_code`, `erp_module`, `detected_ui_component`, `bounding_box`, `confidence`
- Self-fix suggestions generated for known resolvable errors (e.g. missing GSTIN exemption)

---

### 12. Vector Embeddings (Voyage AI + pgvector)
**File:** `server/services/embeddingService.js` · **Status: ✅ Architecture Live (needs VOYAGE_API_KEY)**

- Model: `voyage-3.5`, 1024 dimensions — matches `vector(1024)` columns in `schema.sql`
- Query embedding cached for 60 seconds (prevents re-embedding on search-as-you-type)
- Separate `input_type`: `"query"` vs `"document"` for proper retrieval optimization
- Falls back to TF-IDF cosine similarity when `VOYAGE_API_KEY` not set

---

## 📋 Things To Do (Pending Changes)

> Ordered by priority. These are the remaining tasks to reach full real-time AI mode.

### 🔴 P1 — Critical (Breaks AI Mode)

#### [ ] Wire Groq as LLM Provider in `llmService.js`
- **Why:** `GROQ_API_KEY` is now in `.env` and `groq-sdk` is installed, but `llmService.js` still only checks for `ANTHROPIC_API_KEY`. All AI features are in fallback mode.
- **What:** Rewrite `llmService.js` to be provider-agnostic:
  - Try Anthropic first (if `ANTHROPIC_API_KEY` set)
  - Fall back to Groq (if `GROQ_API_KEY` set) using `llama-3.3-70b-versatile`
  - For JSON output: use Groq's `response_format: { type: "json_object" }` + schema in system prompt
  - For streaming: use `groq.chat.completions.create({ stream: true })`
- **Files:** `server/services/llmService.js`, `server/utils/loadEnv.js`

#### [ ] Update `.env.example` with Groq key
- Add `GROQ_API_KEY=gsk_...` to `.env.example` so future devs know it's needed
- **File:** `.env.example`

---

### 🟡 P2 — Important (Improves Realism)

#### [ ] Real Tesseract.js OCR (server-side)
- **Why:** `ocrService.js` fakes OCR by matching keywords from text input — it never reads an actual image
- **What:**
  - Accept `base64` image data in `POST /api/ocr/analyze` request body
  - Run `tesseract.js` (already installed) on the decoded image bytes
  - Pass extracted text through existing error-signature classifier
  - Return real bounding box coordinates from Tesseract word-level data
- **Files:** `server/services/ocrService.js`, `server/routes/ocr.js`, `server/utils/schemas.js`

#### [ ] Image Upload in SmartReporter UI
- **Why:** Currently Reporter only accepts text — users can't upload a real screenshot
- **What:** Add drag-and-drop / file picker for image files; send as base64 to `/api/ocr/analyze`
- **File:** `src/components/Reporter/SmartReporter.jsx`

#### [ ] Blinking Cursor in Copilot Streaming Bubble
- **Why:** While tokens are streaming, the bubble shows partial text but no visual cue that it's still writing
- **What:** Append a CSS `animate-pulse` blinking `|` cursor to the last AI bubble while `isCopilotTyping` is true; hide it when stream ends
- **File:** `src/components/Workbench/DeveloperWorkbench.jsx`

---

### 🟢 P3 — Polish (Nice to Have)

#### [ ] Persist Copilot History Across Ticket Navigation
- **Why:** Switching tickets resets the entire chat log even if you come back to the same ticket
- **What:** Store `chatMessages` per `ticket.id` in a `useRef` map so history survives tab switches

#### [ ] `ai_generated` Badge in Copilot Bubble
- **Why:** User can't tell if a reply came from real Groq/Claude or from the rule-based fallback
- **What:** Show a small `⚡ AI` or `📋 Fallback` pill below each AI bubble based on `reply.ai_generated`

#### [ ] Voyage AI Embeddings via Groq-compatible Embedding Model
- **Why:** `VOYAGE_API_KEY` is not set — pgvector semantic search falls back to TF-IDF
- **What:** Add Groq embedding support or swap to a free embedding provider (e.g. `nomic-embed-text` via Ollama, or OpenRouter)

#### [ ] Regenerate Exposed Groq API Key
- **Why:** The key was shared in a chat session — treat it as potentially compromised
- **What:** Go to [console.groq.com](https://console.groq.com) → API Keys → Delete old key → Create new → update `.env`

---

## 🏗️ Architecture: AI Decision Flow

```
User reports incident (text / screenshot)
         │
         ▼
  [OCR / Vision Layer]  ←── Tesseract.js + Signature Classifier    ⚠️ simulated
         │
         ▼
  [Severity Engine]  ←── Groq/Claude JSON schema / Keyword fallback  ✅ live
         │
         ▼
  [Duplicate Check]  ←── TF-IDF → pgvector → LLM reranker           ✅ live
         │
         ▼
  [Root Cause + Patch]  ←── LLM ERP-domain reasoning                 ✅ live
         │
         ▼
  [Developer Routing]  ←── Math formula + LLM reranking              ✅ live
         │
         ▼
  [RAG Knowledge Hub]  ←── pgvector search → LLM reranker            ✅ live
         │
         ▼
  [Business Impact]  ←── LLM / Module-severity table                 ✅ live
         │
         ▼
  [Executive Summary]  ←── LLM plain-English briefing                ✅ live
         │
         ▼
  [Explainability]  ←── LLM narrative / Template fallback            ✅ live
         │
         ▼
  [Copilot Chat]  ←── SSE streaming + multi-turn memory              ✅ live
```

---

## ⚙️ Environment Variables

```env
# LLM — use either Groq (free) or Anthropic (paid)
GROQ_API_KEY=gsk_...          # Free at console.groq.com — uses llama-3.3-70b-versatile
ANTHROPIC_API_KEY=sk-ant-...  # Paid — uses claude-opus-5 (checked first if both present)

# Vector embeddings (optional — falls back to TF-IDF if not set)
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

> The app is fully functional with **no API keys at all** — everything falls back to deterministic rule-based logic.

---

## 📊 AI Feature Rating (Current State)

| Feature | Score | Status |
|---|---|---|
| Graceful Degradation Architecture | ⭐⭐⭐⭐⭐ 10/10 | ✅ Live |
| SSE Streaming Copilot | ⭐⭐⭐⭐⭐ 10/10 | ✅ Live |
| Multi-Turn Conversation Memory | ⭐⭐⭐⭐⭐ 10/10 | ✅ Live |
| Duplicate Detection (3-layer) | ⭐⭐⭐⭐⭐ 9/10 | ✅ Live |
| Severity Scoring | ⭐⭐⭐⭐½ 9/10 | ✅ Live |
| RAG Knowledge Hub | ⭐⭐⭐⭐½ 8.5/10 | ✅ Live |
| Vector Embeddings (pgvector) | ⭐⭐⭐⭐½ 8.5/10 | ✅ Live (needs VOYAGE_API_KEY) |
| Patch Preview & Guardrails | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| AI Explainability Matrix | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| Business Impact Engine | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| Executive AI Briefing | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| AI Load Balancer | ⭐⭐⭐⭐ 8/10 | ✅ Live (needs LLM key) |
| Groq Provider Integration | ⭐ 1/10 | 🔴 TODO — key added, not wired |
| OCR (simulated) | ⭐⭐ 4/10 | 🟡 TODO — real Tesseract pending |
| **Overall** | **⭐⭐⭐⭐ 8.5/10** | |

---

*Built for Websys Gooru Hackathon 2026 · KAVYAJOSHI1/INCIDENTAI*
