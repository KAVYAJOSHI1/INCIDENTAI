# IncidentAI — Live Demonstration Runbook

> One connected system: **ERP failure → incident → AI investigation → developer decision →
> safe remediation → verification → resolution / rollback.**
> Everything the presenter clicks changes real Postgres state. Refresh the browser at any
> point and the state persists.

---

## 0. Start-up (once, before the audience is in the room)

```bash
# Terminal 1 — database (already running in most setups)
cd ~/Desktop/INCIDENTAI
docker compose up -d db                 # pgvector/pg16 on :5436

# Terminal 2 — backend API (:4000)
npm run server

# Terminal 3 — frontend (:3000)
npm run dev

# Reset to a known baseline (also available as a button in the UI)
#   -> log in as Developer, open Digital Twin, click "Reset Demo Environment"
```

Log in at `http://localhost:3000` with:

| Persona | Email | Password |
|---|---|---|
| Developer (does the work) | `developer@incidentai.demo` | `demopass123` |
| Executive (monitors only) | `executive@incidentai.demo` | `demopass123` |

**Before every run:** Digital Twin → **Reset Demo Environment**. This deterministically
restores the 5 baseline incidents and the ERP inventory quantities, and clears every
incident/transaction the previous run created. The knowledge base is preserved.

---

## 1. The presentation flow (≈ 3–5 min per scenario)

### DEMO 1 — Happy path (ERP failure → resolved)

| Step | Action | What to say | Result on screen |
|---|---|---|---|
| 1 | **Digital Twin** screen | "This is the Smart Manufacturing ERP. Inventory here is real, mutable database state." | Live stock table, module topology |
| 2 | Click **Demo Failure Scenarios → "Negative Stock / Inventory"** | "A warehouse operator tries to move 100 units of a motor assembly from a bin that only holds 84." | Red card: *ERP transaction REJECTED — incident persisted*, with correlation ID |
| 3 | Click **Open in IncidentAI** (or open **Incident Queue** — the incident is already there; a 🔔 toast also appears) | "The ERP rejected the transaction and automatically raised an incident. Same correlation ID on both sides." | Incident Workspace opens on **Overview** |
| 4 | Point at the **AI Investigation Pipeline** strip | "MCP reads live ERP data. RAG searches past incidents. The LLM combines both. Then a human decides." | Pipeline strip, current stage highlighted |
| 5 | **Overview & Summary** tab | "What happened — in plain language, plus the reproduction steps." | Plain-language report + repro steps |
| 6 | **Impact & Risks** tab | "Why it matters — affected warehouse, process, SLA." | Business impact, SLA countdown |
| 7 | **AI Diagnosis & Evidence** tab | "How the AI reached its conclusion — four clearly separated blocks." | 1 · **Confirmed Facts** (live MCP: *SK-902 @ WH-A/W1: 84 available*), 2 · **Historical Evidence** (RAG match + %), 3 · **AI Inference** (hypothesis + confidence), 4 · **Recommendation** |
| 8 | **Remediation Plan** tab | "The AI proposes a fix. Nothing runs without a developer." | Root cause, proposed action, **Approve / Reject** |
| 9 | Click **Approve Patch Remediation** | "I approve." | Status → APPROVED |
| 10 | **Verification Engine** tab → **Run Validation Suite** | "Five automated checks — syntax, unit tests, module constraints, cross-module regression, and reproduction of the original error." | Checks step RUNNING → PASS, **5/5 passed**, labelled *SIMULATED VERIFICATION ENVIRONMENT* |
| 11 | Click **Apply Patch & Resolve Incident** | "Verification passed, so I apply it." | Status → **RESOLVED**, version v1.0.0 → v1.0.1 |
| 12 | **Lifecycle Timeline** tab | "Every actor and state change is in an immutable audit trail." | INCIDENT CREATED → PATCH APPROVED → VERIFICATION PASSED → PATCH APPLIED |

**Optional:** refresh the browser — still RESOLVED.

---

### DEMO 2 — Safety path (verification fails → rollback)

| Step | Action | What to say | Result |
|---|---|---|---|
| 1 | Digital Twin → **"Production Material Shortage"** | "A production run needs 30 turbine PCBs; only 18 are in stock. The line can't be released." | Incident created (PRODUCTION / `ERR_MATERIAL_SHORTAGE`) |
| 2 | Open incident → **Remediation Plan** → **Approve** | "I approve the proposed fix." | Status → APPROVED |
| 3 | **Verification Engine** → **DEMO FAILURE SIMULATION** | "This is a labelled demo control. It forces verification to fail so I can show the safety path." | 2/5 checks pass, status → VERIFICATION_FAILED, *Rollback required* |
| 4 | On the same tab, **Trigger Emergency Rollback**, enter a reason, confirm | "IncidentAI does not declare success just because a patch was applied. Verification failed, so we roll back." | Status → **ROLLED_BACK**, version restored to v1.0.0; the safeguard card turns amber |
| 5 | Same tab → **Return to Remediation Loop** | "The developer revises the patch and re-enters the loop." | Status → **IN_PROGRESS**, pipeline resets to the diagnosis stage |
| 6 | **Lifecycle Timeline** | "The full chain is recorded, with the actor on every step." | INCIDENT CREATED → PATCH APPROVED → VERIFICATION FAILED → ROLLBACK INITIATED → ROLLBACK SUCCESSFUL → RETURNED TO REMEDIATION |

---

### DEMO 3 — AI does not blindly trust RAG (knowledge-mismatch safety)

| Step | Action | What to say | Result |
|---|---|---|---|
| 1 | Digital Twin → **"Ledger Imbalance — Knowledge-Mismatch Safety Case"** (amber *AI SAFETY* badge) | "A journal entry is rejected — debits 45,000 vs credits 44,100. There is no matching knowledge-base article for this ledger failure." | Incident created (GENERAL_LEDGER / `ERR_GL_UNBALANCED`) |
| 2 | Open incident → **AI Diagnosis & Evidence** | "The Historical Evidence block is explicit: no precedent. IncidentAI will not invent one." | ⚠ *No historical incident or knowledge-base article matches this GENERAL_LEDGER failure* |
| 3 | **Remediation Plan** tab | "Because there's no grounded precedent and it's a high-severity financial incident, IncidentAI blocks automatic remediation." | 🔴 **Potential Knowledge Base Mismatch — Automatic Execution: BLOCKED**, Risk: HIGH, *Human review required* |

Contrast with Demo 1: there the RAG block showed a real ≥ 94 % same-module match, so the
plan proceeded normally. Same engine, different evidence, safe behaviour either way.

---

## 2. The 5 demo scenarios

| Scenario | Module | Error code | Real operation that fails | RAG behaviour |
|---|---|---|---|---|
| Negative Stock / Inventory | INVENTORY | `ERR_STOCK_NEG` | Bin transfer of 100 units of SK-902 from a bin with 84 | Strong same-module match (kb_109) |
| Production Material Shortage | PRODUCTION | `ERR_MATERIAL_SHORTAGE` | Production run needs 30 × PCB-TURB-01, only 18 in WH-B/B4 | Strong same-module match (kb_107) |
| Purchase Order Receipt Mismatch | PROCUREMENT | `ERR_PO_MISMATCH` | Goods receipt of 620 against a PO for 500, zero over-delivery tolerance | Strong same-module match (kb_108) |
| Invoice / Tax Validation Error | INVOICING | `ERR_TAX_VAL_402` | Header tax 1,800.00 vs computed 1,530.00 on an 18,000.00 subtotal | Strong same-module match (kb_106) |
| Ledger Imbalance (AI-safety) | GENERAL_LEDGER | `ERR_GL_UNBALANCED` | Journal entry debits ≠ credits | **No match → auto-remediation blocked** |

Every scenario: validates against live embedded-ERP DB state under a row lock (inventory
ones) or a business rule, persists a `REJECTED` row in `erp_transactions`, then ingests
the incident through the same pipeline as the manual console — preserving transaction ID,
correlation ID, module and error code. A repeat failure with the same correlation ID does
**not** create a second incident.

---

## 3. What is REAL vs SIMULATED (say this if a judge asks)

| Component | Status |
|---|---|
| ERP transaction validation & rejection | **REAL** — Postgres row-locked checks in the embedded ERP |
| Incident ingestion, correlation, dedupe | **REAL** — one incident per correlation ID, persisted |
| Incident state machine (approve/verify/apply/rollback/return) | **REAL** — enforced server-side, invalid transitions return HTTP 409 |
| MCP — current ERP facts | **REAL DATA** — read live from the embedded ERP DB (labelled *LIVE ERP (embedded)*). Falls back to the real Smart Manufacturing ERP Gateway when that is running. |
| RAG retrieval | **REAL** — pgvector cosine + TF-IDF fallback + LLM re-rank over a local index |
| AI diagnosis / confidence / fact-vs-inference separation | **REAL** — Groq / Anthropic with a deterministic rule-based fallback |
| KB module-mismatch / no-precedent guardrail | **REAL** — blocks auto-remediation, requires human review |
| Audit trail | **REAL** — immutable append-only rows, survive restart |
| RBAC (Developer vs Executive) | **REAL** — Executive gets HTTP 403 on trigger / reset / approve / verify / apply / rollback |
| 5-stage verification | **REAL logic, SIMULATED target** — checks are derived from the incident's module / error code / dependency tree; the build/CI environment is simulated (labelled *SIMULATED VERIFICATION ENVIRONMENT*) |
| Rollback | **REAL DB state & version change, SIMULATED deploy payload** |
| "Simulate Verification Failure" button | **Explicit demo control** — labelled as such |
| Git connector, Observability/telemetry | **SIMULATED / DEMO CONNECTOR** — labelled in the Integration Hub |
| External Smart Manufacturing ERP Gateway | **Not required for the demo.** IncidentAI runs entirely off its own embedded ERP. |

---

## 4. Timing

- **Scenario trigger → incident + diagnosis: ~3–8 s.** The scenario panel shows an
  "AI investigation in progress… Ns" banner the whole time (reading MCP, searching RAG,
  reasoning). If a provider is slow, each LLM step times out to the deterministic
  rule-based engine, so the incident always appears within ~15 s.
- **Reset Demo Environment: ~3 s.**
- The incident queue polls every 5 s on the Digital Twin / Queue screens, so a
  freshly-triggered incident also pops a 🔔 toast within a few seconds.

## 5. Troubleshooting

- **State looks wrong / leftover incidents** — Digital Twin → **Reset Demo Environment**.
- **A diagnosis shows lower confidence / a generic root cause** — the LLM was briefly
  unavailable and the rule-based fallback ran. It is still grounded in the real MCP + RAG
  evidence and clearly reflects the lower confidence. Reset and retry for the LLM version.
- **`VOYAGE_API_KEY` rate-limited** — expected; RAG runs on TF-IDF + LLM re-rank, which is
  what the scenarios are tuned for. Set `VOYAGE_MAX_RETRIES=2` in `.env` only if the key
  has real quota. No action needed otherwise.
- **No internet on the demo machine** — fonts fall back to the system font, avatars hide
  cleanly; the whole demo still works (nothing on the ERP→incident→resolution path needs
  the network).
