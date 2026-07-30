# 🤖 IncidentAI — AI Features, Status & Roadmap

> **Status:** Active Development · Hackathon Build — Websys Gooru 2026  
> **Last updated:** 2026-07-30

---

## Overview

IncidentAI is an ERP Support Intelligence Engine that uses a **multi-layer AI pipeline** — provider-agnostic LLM reasoning (Anthropic Claude, falling back to Groq), Voyage AI vector embeddings, pgvector semantic search, and Tesseract.js OCR (client-side upload + server-side base64) — to autonomously triage, diagnose, route, and resolve enterprise ERP incidents.

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

- **Real-time token streaming** via SSE — tokens render live into the chat bubble with a blinking cursor while writing
- **Multi-turn conversation memory** — last 10 turns passed as `history[]` on every request
- **Per-ticket chat history persists** across ticket switches and view navigation (module-level cache keyed by `ticket.id` — survives the Workbench unmounting when you leave the Developer view)
- **`⚡ AI` / `📋 Fallback` badge** on every reply, driven by the stream's terminal `ai_generated` flag
- Full ticket context injected into system prompt (root cause, patch, OCR findings, routing)
- Intent-matched fallback (root cause / patch / postmortem / assignment) when LLM unavailable

```
Server → Client: text/event-stream
data: {"chunk": "Row lock contention"}
data: {"chunk": " on emp_tax_deductions_2026"}
data: {"done": true, "ai_generated": true}
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
**Files:** `server/services/ocrService.js`, `src/components/Reporter/SmartReporter.jsx` · **Status: ✅ Live**

| Path | Method |
|---|---|
| **Client-side (upload UI)** | Real Tesseract.js OCR runs in-browser on the uploaded screenshot via `createWorker` + `blocks: true` output, extracting genuine pixel-level text and a real word-level bounding box for the error code |
| **Server-side (API)** | `POST /api/ocr/analyze` accepts `imageBase64`; runs the same real Tesseract.js OCR server-side (also via `createWorker`) for non-browser clients, decoding PNG/JPEG header bytes to convert the pixel bbox into the same percentage format the UI renders |
| **Classifier (either path)** | Real extracted text is passed through the shared keyword-signature classifier to produce `error_code`, `erp_module`, `detected_ui_component`, `confidence` |

- Both paths use `createWorker(...).recognize(image, {}, { blocks: true })` — the one-shot `Tesseract.recognize()` convenience helper silently omits word/bbox data by default in Tesseract.js v5+, which was the root cause of bounding boxes never rendering
- The real extracted text (not just the synthetic signature summary) is threaded all the way into the created ticket's `ocr_findings`
- Self-fix suggestions generated for known resolvable errors (e.g. missing GSTIN exemption)

---

### 12. Vector Embeddings (Voyage AI + pgvector)
**File:** `server/services/embeddingService.js` · **Status: ✅ Architecture Live (needs VOYAGE_API_KEY)**

- Model: `voyage-3.5`, 1024 dimensions — matches `vector(1024)` columns in `schema.sql`
- Query embedding cached for 60 seconds (prevents re-embedding on search-as-you-type)
- Separate `input_type`: `"query"` vs `"document"` for proper retrieval optimization
- Falls back to TF-IDF cosine similarity when `VOYAGE_API_KEY` not set

---

### 13. Provider-Agnostic LLM Backend (Anthropic + Groq)
**File:** `server/services/llmService.js` · **Status: ✅ Live**

- Tries Anthropic (`claude-opus-5`) first when `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` is set
- Falls back to Groq (`llama-3.3-70b-versatile`) when Anthropic is unset **or** an Anthropic call fails — on either a missing key or a runtime error (auth, rate limit, network)
- `completeJson`: Anthropic uses `output_config.format` (schema-guaranteed JSON); Groq uses `response_format: { type: "json_object" }` with the schema described in the system prompt, since structured-outputs support varies by Groq model
- `streamText`: Anthropic's native stream, or Groq's `stream: true` chat completion — never stitches a second provider's output onto a partially-streamed reply if the first provider fails mid-stream
- Every export still returns `null` (never throws) when no provider is configured or every configured provider fails, preserving the app-wide graceful-degradation contract

---

## 📋 Things To Do (Pending Changes)

> Ordered by priority. Everything from the previous P1/P2 list has shipped — remaining items are lower-priority polish plus one action only a human can take.

### 🟢 P3 — Polish (Nice to Have)

#### [ ] Voyage AI Embeddings via Groq-compatible Embedding Model
- **Why:** `VOYAGE_API_KEY` is not set — pgvector semantic search falls back to TF-IDF
- **What:** Add Groq embedding support or swap to a free embedding provider (e.g. `nomic-embed-text` via Ollama, or OpenRouter)

#### [ ] Regenerate Exposed Groq API Key
- **Why:** The key was shared in a chat session — treat it as potentially compromised
- **What:** Go to [console.groq.com](https://console.groq.com) → API Keys → Delete old key → Create new → update `.env`
- **Note:** This is an account action only a human with console.groq.com access can take — not something an agent can do on your behalf

---

## 🏗️ Architecture: AI Decision Flow

```
User reports incident (text / screenshot)
         │
         ▼
  [OCR / Vision Layer]  ←── Real Tesseract.js (client + server) + Signature Classifier  ✅ live
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

> The app is fully functional with **no API keys at all** — everything falls back to deterministic rule-based logic. With only `GROQ_API_KEY` set (free), every LLM-backed feature runs in real AI mode.

---

## 📊 AI Feature Rating (Current State)

| Feature | Score | Status |
|---|---|---|
| Graceful Degradation Architecture | ⭐⭐⭐⭐⭐ 10/10 | ✅ Live |
| Provider-Agnostic LLM Backend (Anthropic + Groq) | ⭐⭐⭐⭐⭐ 10/10 | ✅ Live |
| SSE Streaming Copilot | ⭐⭐⭐⭐⭐ 10/10 | ✅ Live |
| Multi-Turn Conversation Memory | ⭐⭐⭐⭐⭐ 10/10 | ✅ Live |
| Real OCR (client + server-side Tesseract.js) | ⭐⭐⭐⭐⭐ 9/10 | ✅ Live |
| Duplicate Detection (3-layer) | ⭐⭐⭐⭐⭐ 9/10 | ✅ Live |
| Severity Scoring | ⭐⭐⭐⭐½ 9/10 | ✅ Live |
| RAG Knowledge Hub | ⭐⭐⭐⭐½ 8.5/10 | ✅ Live |
| Vector Embeddings (pgvector) | ⭐⭐⭐⭐½ 8.5/10 | ✅ Live (needs VOYAGE_API_KEY) |
| Patch Preview & Guardrails | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| AI Explainability Matrix | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| Business Impact Engine | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| Executive AI Briefing | ⭐⭐⭐⭐ 8/10 | ✅ Live |
| AI Load Balancer | ⭐⭐⭐⭐ 8/10 | ✅ Live (needs LLM key) |
| **Overall** | **⭐⭐⭐⭐⭐ 9.2/10** | |

---

*Built for Websys Gooru Hackathon 2026 · KAVYAJOSHI1/INCIDENTAI*
