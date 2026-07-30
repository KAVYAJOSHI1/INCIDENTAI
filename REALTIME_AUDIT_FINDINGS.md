# 🔍 Real-Time Audit — Simulated, Static & Fake Data Findings

> **Goal:** Catalog every place in the app that returns canned/fake data, renders static/decorative mock content, or fails to reflect live backend state — as opposed to the *intentional* AI-fallback pattern (real LLM call attempted first, deterministic rule-based logic only when no API key or the call fails), which is documented in `AI_FEATURES_README.md` and is NOT a finding here.
>
> **Status:** Findings only — nothing in this doc has been implemented yet. Use the checkboxes to track fixes.
>
> **How this was produced:** Full codebase audit (grep + read across `src/` and `server/`) looking for hardcoded/canned data, decorative mock UI, and missing live-refresh behavior.

---

## 🔴 TIER 1 — Outright Fake (returns canned/wrong data unconditionally)

### [ ] 1.1 Voice input returns a hardcoded transcript — no speech-to-text exists at all
**File:** `src/components/Reporter/SmartReporter.jsx:175-183`

```js
const handleVoiceInput = () => {
  setIsRecording(true);
  setTimeout(() => {
    const voiceText = "Voice Transcript: Billing user encountered error ERR_TAX_VAL_402 while trying to post invoice for government customer account.";
    setInputText(voiceText);
    setIsRecording(false);
    handleSimulatedScan(voiceText);
  }, 1500);
};
```

No microphone is ever opened — confirmed via repo-wide grep for `SpeechRecognition`, `MediaRecorder`, `getUserMedia`, `webkitSpeech`, `whisper`, `transcri*` (zero matches). The 1500ms `setTimeout` exists purely to make a fixed string look like it was recorded. Every user, every time, gets the same invoicing tax error transcript.

**Fix options (needs a decision — not purely mechanical):**
- Browser `SpeechRecognition` API — free, no new key, Chrome/Edge only, ~20 lines
- Server-side Whisper/Deepgram — cross-browser, needs a new API key + has per-use cost
- Remove the feature entirely rather than ship something fake or half-real

---

### [ ] 1.2 "Execute Patch & Resolve" executes no SQL — confetti + a timer
**File:** `src/components/Workbench/DeveloperWorkbench.jsx:92-95`

```js
const handleExecutePatch = () => {
  setIsPatchExecuted(true);
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  setTimeout(() => onResolveTicket(ticket.id), 1200);
};
```

The button is labeled "Execute Patch" and flips to "Patch Applied & Resolved!", but no SQL is sent anywhere. The only patch-related route in the whole app is `GET /api/tickets/:id/patch-preview` (`server/routes/ticketInsights.js:69`) — there is no execution endpoint, no DB write of the patch, no result captured. It just marks the ticket `RESOLVED` after an arbitrary 1.2s delay.

**Fix options (needs a decision):**
- Relabel honestly for now — rename button to "Mark Resolved", stop implying SQL runs, until a real execution path (sandboxed DB, dry-run, approval step, rollback) is designed
- Actually wire it to the app's own dev Postgres instance (not a production ERP) — real, but risky: bad AI-generated SQL could corrupt demo data
- Leave as-is, deprioritize

---

### [ ] 1.3 OCR classifier silently defaults every unrecognized incident to an invoicing tax error
**File:** `server/services/ocrService.js:64-98`

```js
let bestSignature = ERROR_SIGNATURES[0];   // == INVOICING / ERR_TAX_VAL_402
let bestHits = 0;
for (const signature of ERROR_SIGNATURES) { ... if (hits > bestHits) {...} }
const confidence = bestHits > 0 ? Math.min(0.98, 0.55 + bestHits * 0.12) : 0.35;
```

When **zero** keywords match, the function doesn't return "unknown" — it silently returns `ERROR_SIGNATURES[0]` (`ERR_TAX_VAL_402` / `INVOICING` / `PostInvoiceButton`) with a fabricated bounding box. Submit "the printer is on fire" and you get a confident-looking invoicing tax-validation ticket. This poisons everything downstream (title, root cause, routing, business impact) via `ticketService.js:86-103`.

**Fix:** Add an `UNKNOWN` signature/module and return it when `bestHits === 0`; surface "unclassified — needs manual triage" in the UI instead of a fabricated match.

---

### [ ] 1.4 Hardcoded bounding boxes presented as real "Vision Coordinates"
**File:** `server/services/ocrService.js:18, 39, 46, 53, 60`

```js
bbox: { top: "40%", left: "15%", width: "70%", height: "22%" }  // one fixed rectangle per module
```

For any text-only report — or any image where Tesseract finds no `ERR_` token — these fixed percentages are emitted as `bounding_box` and rendered as "Vision Coordinates" / `VISION OCR DETECTED`. Nothing was actually detected; it's a per-module constant.

**Credit where due:** `analyzeMultimodalInputFromImage` (`ocrService.js:172-186`) *does* compute a genuine word-level bbox from real Tesseract output when an error code is found in an uploaded image — that path is real and already shipped. This finding is specifically about the fallback that isn't labeled as a fallback.

**Fix:** Either return `bounding_box: null` when it's not a real detection (and hide the overlay), or clearly relabel it as "Typical UI Region (reference layout, not detected)" rather than "Vision OCR Detected".

---

### [ ] 1.5 The "SIMULATED ERP WORKSPACE CANVAS"
**File:** `src/components/Reporter/SmartReporter.jsx:382-405`

Renders `[SIMULATED ERP WORKSPACE CANVAS: {module}_FORM_VIEW]` with an absolutely-positioned rose overlay box (using the static bbox from 1.4) labeled `VISION OCR DETECTED` / `CRITICAL BOUNDING BOX` — a fake screenshot with a fake detection overlay, shown whenever no real image was uploaded. At least the code's own label says "SIMULATED", but the UI treatment (red box, "DETECTED", "CRITICAL") reads as a real finding.

**Fix:** Delete the fake-canvas branch; show a clean empty/neutral state ("No screenshot provided — classification based on description text") instead.

---

### [ ] 1.6 Fabricated "dependency tree" pointing at source files that don't exist
**File:** `server/services/rootCauseTreeService.js:5-13, 19`

```js
const DEPENDENCY_SIGNATURES = {
  ERR_TAX_VAL_402: { service: "InvoicingService", file: "invoicing/taxValidator.js",
                     function: "validateGstinExemption()", table: "cust_master_tax", ... }, ...
};
const humanErrorLikelihood = /missing|exempt|config|.../.test(ticket.ai_root_cause || "") ? 0.35 : 0.15;
```

A 5-row lookup table of invented service/file/function/table names, rendered in the UI as a real code-dependency graph. These paths exist in no repo. `human_error_likelihood` is a two-valued constant (0.35 or 0.15) dressed up as a probability. Unlike other services, there is **no** `buildDependencyTreeWithAI` counterpart — this table is the *only* implementation, not a fallback.

**Fix:** Requires new external service/infrastructure — genuine dependency mapping needs static analysis or APM/tracing integration against the actual ERP codebase. Short-term: label the tree as "illustrative example" rather than a real analysis, or replace with an LLM-generated best-guess (`ai_generated: true/false` flag, same pattern as everything else) instead of a static table.

---

### [ ] 1.7 Incident Replay fabricates API calls and SQL queries that were never observed
**File:** `server/services/replayService.js:10-21`

```js
{ id: "api_call", label: "API Call", detail: `POST /api/${String(ticket.erp_module).toLowerCase()}/${ticket.ocr_findings?.detected_ui_component || "action"}` },
{ id: "sql_query", label: "SQL Query", detail: `Query against \`${extractPrimaryTable(ticket.ai_suggested_patch)}\`` },
```

Marketed as "step-by-step playback from user action to resolution." No request log, trace, or audit table is ever read. The "API Call" is a template string built from the module name; the "SQL Query" is regex-scraped out of the AI's *suggested fix*, not from anything that actually ran.

**Fix:** Requires new external service — real replay needs request tracing / audit-log ingestion. Short-term: relabel as "Reconstructed Timeline (inferred, not measured)".

---

## 🟡 TIER 2 — Static / Decorative (fixed values dressed as computed)

### [ ] 2.1 Timeline durations are mostly hardcoded milliseconds
**File:** `server/services/timelineService.js:17-24`

```js
pushStep("vision",    "Vision Analysis & Bounding Box", 60);
pushStep("duplicate", "Duplicate Search (pgvector)",    90);
pushStep("knowledge", "Knowledge Retrieval (RAG)",      80);
pushStep("assigned",  `Developer Assigned...`,          50);
pushStep("patch",     "Patch Generated",                40);
```

Only `ocr` and `severity` come from real `pipeline_timings_ms` (and even those fall back to `?? 120` / `?? 40`) — the other five stages are literal constants. Timestamps are synthesized by accumulating these fictions onto `created_at`, then presented as a measured lifecycle.

**Fix:** `ticketService.js` already has a `t0` cursor for `ocr`/`severity` — instrument every pipeline stage (duplicate check, KB search, routing, root cause, business impact) the same way and persist all of them.

---

### [ ] 2.2 Pipeline trace stages hardcoded to `status: "complete"` with no timings
**File:** `server/services/analyticsService.js:44-56`

All 7 nodes carry a literal `status: "complete"`; `duplicate`, `knowledge`, `routing`, `ingest`, and `ticket` have **no** `duration_ms` at all. The frontend (`AIPipelineVisualizer.jsx:59`) titles this "Live AI Execution Pipeline Diagram" / "Actual backend execution trace" — but a stage can never render as failed or skipped, because the status is a string literal. (The component itself is honest — it genuinely fetches from the backend; the backend data is what's canned.)

**Fix:** Same instrumentation fix as 2.1, plus recording per-stage success/failure instead of a hardcoded `"complete"`.

---

### [ ] 2.3 MTTR baseline and the fallback MTTR number are invented
**File:** `server/services/analyticsService.js:7, 14`

```js
const MANUAL_BASELINE_HOURS = 8.2;
const avgHours = resolved.length ? (real computation) : 1.9;
```

`8.2` is the denominator for the headline "−X% vs manual" KPI on the Executive Dashboard — a made-up number with no source. When **zero** tickets have been resolved, `avgHours` falls back to `1.9`, so a brand-new install displays "Avg MTTR 1.9h, −77% vs manual" for work that never happened.

**Fix:** Return `null` when there's no resolved-ticket data (render "—" in the UI instead of a fake number); make `MANUAL_BASELINE_HOURS` a configurable org setting rather than a code constant.

---

### [ ] 2.4 "$145/hr engineering rate" hardcoded in two places, driving a headline ROI figure
**Files:** `src/components/Analytics/ExecutiveDashboard.jsx:18` (`const HOURLY_ENG_RATE = 145;`) and `server/services/missionControlService.js:9` (`const HOURLY_ENGINEERING_RATE = 145;`)

"Estimated Savings" and "Daily Cost Savings" are `hoursSaved × 145`. The constant is duplicated frontend/backend (drift risk) and isn't configurable.

**Additional bug:** `missionControlService.js:39` labels the field `daily_cost_savings`, and `MissionControl.jsx:38` renders it as **"Daily Cost Savings"**, but `hoursSaved` is computed from `summary.resolved_count` — the **all-time** resolved count. The number shown is lifetime savings mislabeled as daily, and it only ever grows.

**Fix:** Move the rate to config/env (single source of truth); fix the "daily" window with a real `created_at >= now() - 24h` filter, or relabel as "Total Cost Savings".

---

### [ ] 2.5 Digital Twin "failure prediction" is a 3-value constant, and the topology is hand-drawn
**File:** `server/services/digitalTwinService.js:8-14, 24`

```js
const TOPOLOGY_EDGES = [ { source: "INVOICING", target: "GENERAL_LEDGER" }, ... ];  // hand-written
const failurePrediction = hasP0 ? 0.8 : hasP1 ? 0.4 : Math.min(0.25, openTickets.length * 0.05);
```

The UI (`DigitalTwin.jsx:35, 54`) renders `"{n}% failure risk"` under the banner "failure prediction." There is no model, no time series, no history — it's `if P0 then 80%`, a restatement of current severity rather than a prediction. The 5 edges are a hardcoded guess at ERP module dependencies; `NODE_POSITIONS` (`DigitalTwin.jsx:13-19`) is a fixed 5-key map, so the graph silently breaks for any module outside the hardcoded list.

**Fix:** Moderate-to-major — real failure prediction needs historical incident time-series + a model; real topology needs ERP config/dependency discovery. Short-term: relabel "failure prediction" as "current risk level" (which is what it actually computes).

---

### [ ] 2.6 Header search box is entirely non-functional
**File:** `src/components/Common/Header.jsx:33-41`

```jsx
<input type="text" placeholder="Search… (Ctrl+K)" className="input-field pl-9 pr-3 text-sm" ... />
```

No `value`, no `onChange`, no `onKeyDown`, no state, no handler. There is also no Ctrl+K listener anywhere despite the placeholder advertising one — purely decorative chrome.

**Fix:** Needs a global search endpoint over tickets + KB (the KB half already exists via `searchKnowledge` — reuse it).

---

### [ ] 2.7 Hardcoded fallback ticket number `INC-8840` shown to users
**Files:** `src/App.jsx:95`, `src/components/Ticketing/JiraTicketView.jsx:53`

```js
alert(`Ticket ${sourceTicketId} merged into parent ticket ${targetTicketId || 'INC-8840'}!`)
// and:
{ticket.duplicate_check.top_match?.ticket?.ticket_number || 'INC-8840'}
```

A leftover demo ticket ID surfaces as the "parent ticket" whenever the real match is missing — users are told their ticket merged into a ticket that doesn't exist.

**Fix:** Render "—" / suppress the merge affordance entirely when there's no real match.

---

### [ ] 2.8 Knowledge Hub invents 95% confidence for un-scored articles
**File:** `src/components/Knowledge/KnowledgeHub.jsx:36-39`

```js
confidence_percentage: Math.round((a.confidence || 0.95) * 100)
```

In the default (no search query) listing, every article with no stored confidence renders a confident "95%" badge that was never computed.

**Fix:** Omit the badge entirely when there's no real score, rather than defaulting to a high fake number.

---

### [ ] 2.9 Misleading "Simulate" naming on a feature that is actually real
**File:** `src/components/LoadBalancer/DeveloperLoadBalancer.jsx:46, 70-72, 82`

**This one is a false positive worth correcting in the opposite direction.** `handleSimulateRebalance` → `onRebalanceLoad()` → `rebalanceWorkload()` (`server/services/loadBalancerService.js:108-151`) performs **real** reassignment logic and real writes, and `App.jsx` refetches tickets/developers afterward. The 350ms staggered reveal animates genuine results. Only the *label* says "Simulate" — everything behind it is real.

**Fix:** Trivial — rename button/handler to "Auto Re-Balance P0 Load" to stop undermining a feature that actually works.

---

## 🟢 TIER 3 — Missing Live Behavior (nothing refreshes)

### [ ] 3.1 Core app data never polls — tickets and analytics are fetched exactly once per session
**File:** `src/App.jsx:59-64`

```js
useEffect(() => {
  if (!user) return undefined;
  const signal = { cancelled: false };
  loadInitialData({ signal });
  return () => { signal.cancelled = true; };
}, [user, loadInitialData]);
```

There is no `setInterval`, `EventSource`, or `WebSocket` anywhere in `App.jsx` (confirmed by repo grep). `loadInitialData` fires once when `user` becomes non-null; every subsequent update is a local optimistic mutation after a user action (`setTickets(prev => prev.map(...))`, `setTickets(prev => [newTicket, ...prev])`). If a second user — or the seeded backend — changes anything, this session never learns about it without a full page reload.

**Consequence for Analytics:** `ExecutiveDashboard.jsx:61-70` re-fetches only on `[tickets.length]`. Resolving a ticket changes `status` but not array length, so MTTR/savings/severity-distribution figures do **not** refresh after the exact event that should move them.

**Counterpoint — the Operations pages already do this correctly:** `WarRoom.jsx:21` (`setInterval(load, 5000)`), `MissionControl.jsx:13` (5000ms), `DigitalTwin.jsx:28` (8000ms) genuinely poll and are backend-driven; their "auto-refreshes every 5 seconds" claims are accurate. The inconsistency is that the *primary* ticket/analytics views don't do what the secondary dashboards already do.

**Fix:** Add polling to `App.jsx` (mirror the Operations pages' `setInterval` pattern) and change `ExecutiveDashboard.jsx`'s dependency array from `[tickets.length]` to `[tickets]`. For a more real solution, replace polling with SSE/WebSocket push (the backend already has an SSE pattern from `POST /api/copilot/stream` to model this on).

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
