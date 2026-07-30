# 🔬 OCR Real Implementation Plan — IncidentAI

> **Goal:** Replace the simulated keyword-matching OCR with full end-to-end real Tesseract.js image reading.  
> **Current state after audit:** The code is ~70% done. The backend `analyzeMultimodalInputFromImage()` is written and the route checks for `imageBase64`. The frontend runs Tesseract in-browser. But **they are not connected to each other** — the image base64 is never sent to the backend.

---

## 🔍 Exact Current State (What Exists vs What's Missing)

### ✅ Already Implemented (Do NOT rewrite)

| File | What's done |
|---|---|
| `server/services/ocrService.js` | `analyzeMultimodalInputFromImage(imageBase64)` exists — runs server-side Tesseract, extracts real text, maps to error signature, returns real bounding boxes |
| `server/routes/ocr.js` | Route already checks `if (input.imageBase64)` → calls `analyzeMultimodalInputFromImage()` |
| `server/utils/schemas.js` | `incidentInputSchema` has `imageBase64` field added |
| `src/components/Reporter/SmartReporter.jsx` | Runs **client-side** Tesseract.js on uploaded image (progress bar, word bbox, raw text display) |

### ❌ What's Missing (The Actual Gap)

The frontend runs Tesseract in the browser but **never sends the image base64 to the backend**.

In `SmartReporter.jsx`, `handleSubmit()` sends:
```js
onSubmitIncident({
  text: inputText.trim() || undefined,
  fileName: selectedFile?.name,
  ocrRawText: realOcrRawText || undefined   // ← only sends extracted text, not the image
})
```

And in `src/services/apiClient.js`, `analyzeOcrPreview()` sends:
```js
request("/ocr/analyze", { method: "POST", body: JSON.stringify(payload) })
// payload = { text, fileName }  ← imageBase64 NEVER included
```

So the backend Tesseract code (`analyzeMultimodalInputFromImage`) **is never called**. The route always falls through to `analyzeMultimodalInput()` (keyword matching).

---

## 📋 Exact Changes To Make

### Fix 1 — `src/components/Reporter/SmartReporter.jsx`

**In `runRealImageOcr(file)` function** — after client Tesseract finishes, convert file to base64 and call `analyzeOcrPreview` with `imageBase64`:

```js
// After worker.terminate(), convert the file to base64
const base64 = await new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result); // result = "data:image/png;base64,..."
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Call backend with imageBase64 so server-side Tesseract runs
const result = await analyzeOcrPreview({ imageBase64: base64 });
setOcrResult(result);
```

**Remove the trailing `await handleSimulatedScan(...)` call** at line 109 — it's redundant now since we're calling `analyzeOcrPreview` directly.

**Location:** `runRealImageOcr()` — lines 73–110 in `SmartReporter.jsx`

---

### Fix 2 — `src/services/apiClient.js`

`analyzeOcrPreview` currently strips `imageBase64` from payload. Ensure it passes through:

```js
// Current (broken — imageBase64 silently ignored if large):
export const analyzeOcrPreview = (payload) =>
  request("/ocr/analyze", { method: "POST", body: JSON.stringify(payload) }).then((d) => d.ocr);

// No change needed to this function — it already passes the full payload object.
// Verify: confirm Content-Type is application/json and base64 string is not being truncated.
```

**Action:** Just verify this is passing `imageBase64` through. If payload is too large (>4MB), add a size check warning to the UI.

---

### Fix 3 — `src/components/Reporter/SmartReporter.jsx` — `handleSubmit()`

When submitting the incident, also pass `imageBase64` so the backend `ticketService` can use real OCR results:

```js
const handleSubmit = (e) => {
  e.preventDefault();
  if (!inputText && !selectedFile) return;

  // Convert file to base64 for backend OCR on submission
  if (selectedFile?.type.startsWith('image/') && !realOcrRawText) {
    // OCR not done yet — wait
    return;
  }

  onSubmitIncident({
    text: inputText.trim() || realOcrRawText || undefined,
    fileName: selectedFile?.name,
    imageBase64: imageBase64State || undefined,   // ← add this
    ocrRawText: realOcrRawText || undefined
  });
};
```

**Add state:** `const [imageBase64State, setImageBase64State] = useState(null);`  
**Set it** in `runRealImageOcr()` after `reader.readAsDataURL()` resolves.

---

### Fix 4 — `server/services/ticketService.js`

When ingesting a new incident, if `imageBase64` is present in the payload, use `analyzeMultimodalInputFromImage()` instead of `analyzeMultimodalInput()`:

```js
// In the ingestIncident() function, replace:
const ocrFindings = analyzeMultimodalInput(inputData);

// With:
const ocrFindings = inputData.imageBase64
  ? await analyzeMultimodalInputFromImage(inputData.imageBase64)
  : analyzeMultimodalInput(inputData);
```

**Import:** Add `analyzeMultimodalInputFromImage` to the import from `ocrService.js`.

---

### Fix 5 — `server/utils/schemas.js` (verify)

Confirm `incidentInputSchema` already accepts `imageBase64`:

```js
export const incidentInputSchema = z.object({
  text: z.string().trim().min(1).optional(),
  fileName: z.string().trim().min(1).optional(),
  reporter: z.string().trim().min(1).optional(),
  imageBase64: z.string().optional(),      // ← must be present
  ocrRawText: z.string().optional()        // ← must be present
}).refine((v) => v.text || v.fileName || v.imageBase64, {
  message: 'Request body must include "text", "fileName", or "imageBase64"'
});
```

---

## 🧪 How To Test After Fix

### Test 1 — API level (curl)
Take any image (e.g. `sample_erp_error.png` in the repo root), encode it, POST:

```bash
BASE64=$(base64 -w 0 sample_erp_error.png)
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"developer@incidentai.demo","password":"demopass123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:4000/api/ocr/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"data:image/png;base64,$BASE64\"}" \
  | python3 -m json.tool
```

**Expected response:**
```json
{
  "ocr": {
    "raw_text": "...actual text Tesseract extracted from image pixels...",
    "ocr_extracted_text": "[Tesseract.js Server-Side OCR]\n<real text here>...",
    "extracted_error_code": "ERR_...",
    "erp_module": "...",
    "ocr_confidence": 0.87,
    "bounding_box": { "top": "41.2%", "left": "14.8%", ... }   ← real pixel coords
  }
}
```

**If it still returns** `[Vision OCR] Screen Text:` prefix (not `[Tesseract.js Server-Side OCR]`) — the `imageBase64` is not reaching the backend.

---

### Test 2 — UI level
1. Go to **Reporter** tab at http://localhost:3000
2. Log in as `developer@incidentai.demo / demopass123`
3. Upload `sample_erp_error.png` (in repo root)
4. Watch progress bar: `Tesseract.js scanning image pixels... XX%`
5. After scan completes:
   - OCR result box should show `Tesseract.js Real OCR + AI Vision Classification` header (not `Multimodal Vision & OCR AI Findings`)
   - **"Raw Tesseract.js Extracted Text"** section should show real pixel-extracted text
   - **Bounding box** on the image preview should be real word-level coordinates (not hardcoded percentages)
6. Check browser **Network tab** → `/api/ocr/analyze` request body must contain `imageBase64` field

---

## ✅ Definition of Done

| Check | Condition |
|---|---|
| Backend Tesseract called | `ocr_extracted_text` starts with `[Tesseract.js Server-Side OCR]` |
| Real text extracted | `raw_text` contains actual words from the image (not empty) |
| Real bounding box | `bounding_box` values differ per image, not hardcoded percentages |
| `ocr_confidence` present | Field is a number (e.g. `0.87`), not `null` |
| Ticket uses real OCR | After submitting, ticket's `ocr_findings.raw_text` = real extracted text |

---

## ⚠️ Known Edge Cases To Handle

| Case | How to handle |
|---|---|
| Image too large (>5MB base64 ~6.7MB JSON) | Add client-side size check; show warning if file > 4MB |
| Non-English ERP screenshot | Tesseract defaults to `eng`; good enough for error codes |
| Low quality / blurry screenshot | Tesseract will extract partial text; keyword classifier still runs on whatever it gets |
| No error code found in image | Falls back to keyword confidence 0.35 — still creates ticket |
| Tesseract slow on server | `createWorker()` takes ~2s first call; subsequent calls reuse the binary |

---

*This doc covers exactly what is broken and what 4 specific file changes fix it.*  
*All other OCR infrastructure (server function, route, schema, UI canvas) is already built.*
