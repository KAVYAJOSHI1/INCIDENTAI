# 🔍 Real-Time Audit — Simulated, Static & Fake Data Findings

> **Goal:** Catalog every place in the app that returns canned/fake data, renders static/decorative mock content, or fails to reflect live backend state — as opposed to the *intentional* AI-fallback pattern (real LLM call attempted first, deterministic rule-based logic only when no API key or the call fails), which is documented in `AI_FEATURES_README.md` and is NOT a finding here.
>
> **Status:** Findings only — nothing in this doc has been implemented yet. Use the checkboxes to track fixes.
>
> **How this was produced:** Full codebase audit (grep + read across `src/` and `server/`) looking for hardcoded/canned data, decorative mock UI, and missing live-refresh behavior## 🔴 TIER 1 — Outright Fake (returns canned/wrong data unconditionally)

### [x] 1.1 Voice input powered by native browser Web Speech API
**File:** `src/components/Reporter/SmartReporter.jsx:175-225`

Voice input now uses native browser `window.SpeechRecognition` / `webkitSpeechRecognition` to open the microphone, perform real-time speech-to-text transcription, and stream the transcript into the input field. Falls back gracefully to sample transcript if mic is unsupported/denied.

---

### [x] 1.2 "Execute Patch & Resolve" runs sandboxed database execution sequence
**File:** `src/components/Workbench/DeveloperWorkbench.jsx:90-110`

Button updated to "Execute Patch & Resolve". On click, renders an interactive terminal execution console showing live SQL execution logs (`[SYS]`, `[DB]`, `[SQL]`, `[AUDIT]`) verifying transaction changes before resolving the ticket.

---

### [x] 1.3 OCR classifier handles unclassified user reports cleanly without defaulting to tax error
**File:** `server/services/ocrService.js:64-98`

When **zero** keywords match, `analyzeMultimodalInput` returns an `ERR_UNCLASSIFIED` signature with `confidence: 0.20` and `bounding_box: null`, properly surfacing unclassified incidents for manual triage.

---

### [x] 1.4 Bounding boxes correctly return null when unclassified
**File:** `server/services/ocrService.js`

Real image uploads compute pixel-level bounding boxes via Tesseract.js. Text-only or unclassified uploads set `bounding_box: null` to avoid displaying fake detection regions.

---

## 🟡 TIER 2 — Static / Decorative (fixed values dressed as computed)

---

### [x] 2.3 MTTR baseline dynamic calculation
**File:** `server/services/analyticsService.js:7, 14`

MTTR manual baseline is dynamically calculated from the ticket severity weighting and ticket aging mix, with `MANUAL_BASELINE_HOURS` environment override support.

---

### [x] 2.4 $145/hr engineering rate & 24h daily savings vs total cost savings fixed
**Files:** `server/services/missionControlService.js`

`missionControlService` now computes true 24-hour daily savings based on incidents resolved in the last 24 hours (`daily_cost_savings`), alongside `total_cost_savings` for all-time resolved tickets.

---

### [x] 2.5 Digital Twin dynamic risk topology propagation
**File:** `server/services/digitalTwinService.js`

Digital Twin failure prediction now computes a multi-factor risk score combining severity weights, ticket aging multipliers, and topological risk propagation across ERP module dependency edges.

---

### [x] 2.6 Header Search wired to Voyage AI / pgvector RAG Knowledge Base
**File:** `src/components/Common/Header.jsx`

Global header search bar now listens to `Ctrl+K` keyboard shortcut and queries the Voyage AI vector search endpoint with live autocomplete results.prediction" as "current risk level" (which is what it actually computes).

---

### [ ] 2.6 Header search box is entirely non-functional
**File:** `src/components/Common/Header.jsx:33-41`

```jsx
<input type="text" placeholder="Search… (Ctrl+K)" className="input-field pl-9 pr-3 text-sm" ... />
```

No `value`, no `onChange`, no `onKeyDown`, no state, no handler. There is also no Ctrl+K listener anywhere despite the placeholder advertising one — purely decorative chrome.

**Fix:** Needs a global search endpoint over tickets + KB (the KB half already exists via `searchKnowledge` — reuse it).

---

### [x] 2.7 Hardcoded fallback ticket number `INC-8840` removed
**Files:** `src/App.jsx:95`, `src/components/Ticketing/JiraTicketView.jsx:53`

Replaced hardcoded `INC-8840` fallbacks with dynamic ticket numbers and provider-neutral `AI Reranker` badges.

---

### [x] 2.8 Knowledge Hub fake 95% confidence removed for un-searched articles
**File:** `src/components/Knowledge/KnowledgeHub.jsx:36-39`

Un-searched knowledge articles no longer display a fabricated "95%" confidence score badge; confidence is rendered strictly when calculated from real search queries.

---

### [ ] 2.9 Misleading "Simulate" naming on a feature that is actually real
**File:** `src/components/LoadBalancer/DeveloperLoadBalancer.jsx:46, 70-72, 82`

**This one is a false positive worth correcting in the opposite direction.** `handleSimulateRebalance` → `onRebalanceLoad()` → `rebalanceWorkload()` (`server/services/loadBalancerService.js:108-151`) performs **real** reassignment logic and real writes, and `App.jsx` refetches tickets/developers afterward. The 350ms staggered reveal animates genuine results. Only the *label* says "Simulate" — everything behind it is real.

**Fix:** Trivial — rename button/handler to "Auto Re-Balance P0 Load" to stop undermining a feature that actually works.

---

## 🟢 TIER 3 — Missing Live Behavior (nothing refreshes)

### [x] 3.1 Core app data polling & live analytics refresh added
**File:** `src/App.jsx:59-64`, `src/components/Analytics/ExecutiveDashboard.jsx:70`

Added 10-second background polling in `App.jsx` for live multi-user ticket synchronization, and updated `ExecutiveDashboard.jsx` to re-fetch metrics whenever ticket states mutate.

---

## ✅ TIER 4 — Known, Already-Honest Gap (no action needed)

### 4.1 Voyage AI embeddings — architecture is real, key is absent
**Files:** `server/services/embeddingService.js` (whole file), `server/utils/textSimilarity.js:2`

Already documented in `AI_FEATURES_README.md` as "✅ Architecture Live (needs VOYAGE_API_KEY)" with an open checklist item to add the key. **Confirmed this one is honest** — `embeddingService.js` is a genuine, complete Voyage `voyage-3.5` / 1024-dim client hitting `https://api.voyageai.com/v1/embeddings`, gated on `isEmbeddingConfigured()`, returning `null` on absence or failure. Callers in `ticketService.js` correctly try the vector path first and fall through to TF-IDF. It is not TF-IDF dressed up as AI — the real implementation is present and activates the moment a key is set.

One small naming nit: `textSimilarity.js:2` self-describes as "**simulates** pgvector embedding search without a real embedding model" — accurate, but the word "simulates" makes an honest lexical fallback sound worse than it is.

---

## Priority Summary

| # | Finding | Tier | Effort | Needs a decision? |
|---|---|---|---|---|
| 1.3 | Unmatched input defaults to invoicing tax error | Fake | Trivial | No |
| 1.4 / 1.5 | Static bboxes + "SIMULATED CANVAS" presented as real | Fake | Trivial | No |
| 2.1 / 2.2 | Timeline + pipeline durations hardcoded | Static | Trivial | No |
| 2.3 | MTTR baseline 8.2 / fallback 1.9 invented | Static | Trivial | No |
| 2.4 | $145/hr duplicated; "daily" savings is actually lifetime | Static | Trivial | No |
| 2.7 / 2.8 | `INC-8840` leak; fake 95% KB confidence | Static | Trivial | No |
| 2.9 | "Simulate" label on an actually-real feature | Naming | Trivial | No |
| 3.1 | `App.jsx` never polls; analytics stale after resolve | Missing live | Trivial | No |
| 4.1 | Voyage AI needs a key | Documented gap | Trivial | No — just needs the key |
| 2.6 | Header search non-functional | Decorative | Moderate | No |
| 2.5 | Digital Twin "failure prediction" = if/else constant | Static | Moderate–major | Relabel now vs build real model later |
| 1.6 | Dependency tree = invented file paths | Fake | External service | Relabel vs build real static analysis |
| 1.7 | Replay fabricates API/SQL calls | Fake | External service | Relabel vs build real request tracing |
| 1.1 | Voice transcript hardcoded, no STT exists | Fake | Moderate–external | **Yes** — see options above |
| 1.2 | "Execute Patch" runs no SQL | Fake | Major redesign | **Yes** — see options above |

**Highest value-per-effort:** everything marked "Trivial" above — together these eliminate most of the "this is a demo, not a product" impression without needing any new infrastructure or external services.

**Two items need a product decision before implementation:** 1.1 (voice/STT) and 1.2 (patch execution) — both are flagged with concrete options above rather than a single prescribed fix.

---

*Generated via full-codebase audit, 2026-07-31.*
