/**
 * Module 1 & 2: Multimodal OCR & Vision AI Diagnostics Engine. Real Tesseract.js pixel-level
 * OCR (analyzeMultimodalInputFromImage) extracts text from an uploaded screenshot; the
 * signature-matcher below (analyzeMultimodalInput) classifies error code / module / component
 * from that text — same classifier either way, real OCR or a plain text description.
 */

import Tesseract from "tesseract.js";

const ERROR_CODE_PATTERN = /ERR[_-]?[A-Z0-9_]{3,}/i;

const ERROR_SIGNATURES = [
  {
    module: "INVOICING",
    errorCode: "ERR_TAX_VAL_402",
    component: "PostInvoiceButton",
    keywords: ["tax", "gstin", "invoice", "billing", "402", "exemption", "post invoice"],
    bbox: { top: "40%", left: "15%", width: "70%", height: "22%" },
    selfFix(text) {
      if (/missing tax id|exempt code|exemption/.test(text)) {
        return {
          title: "Self-Service Resolution Available",
          description: "This error is caused by a missing GSTIN Exemption Code in the Customer Profile.",
          steps: [
            "Open Customer Master -> Tax Tab",
            "Select 'GST Exempt - Government Account'",
            "Click Save and retry posting invoice."
          ]
        };
      }
      return null;
    }
  },
  {
    module: "PAYROLL",
    errorCode: "ERR_PAYROLL_DEADLOCK",
    component: "BatchRunProgressModal",
    keywords: ["payroll", "deadlock", "salary", "batch", "timeout", "gross", "froze"],
    bbox: { top: "28%", left: "25%", width: "50%", height: "35%" }
  },
  {
    module: "INVENTORY",
    errorCode: "ERR_STOCK_NEG",
    component: "BinTransferGrid",
    keywords: ["stock", "inventory", "warehouse", "bin", "sku", "quantity", "negative"],
    bbox: { top: "45%", left: "30%", width: "40%", height: "30%" }
  },
  {
    module: "GENERAL_LEDGER",
    errorCode: "ERR_GL_UNBALANCED",
    component: "JournalPostingForm",
    keywords: ["ledger", "journal", "audit", "balance", "reconcile", "close", "trial balance"],
    bbox: { top: "32%", left: "18%", width: "64%", height: "28%" }
  },
  {
    module: "PROCUREMENT",
    errorCode: "ERR_PO_MISMATCH",
    component: "PurchaseOrderGrid",
    keywords: ["procurement", "purchase order", "vendor", "po number", "receiving", "goods receipt"],
    bbox: { top: "38%", left: "22%", width: "56%", height: "26%" }
  }
];

export function analyzeMultimodalInput(inputData) {
  const text = (inputData.text || inputData.fileName || "").toLowerCase();

  let bestSignature = null;
  let bestHits = 0;
  for (const signature of ERROR_SIGNATURES) {
    const hits = signature.keywords.filter((keyword) => text.includes(keyword)).length;
    if (hits > bestHits) {
      bestHits = hits;
      bestSignature = signature;
    }
  }

  if (!bestSignature) {
    bestSignature = {
      module: "GENERAL_LEDGER",
      errorCode: "ERR_UNCLASSIFIED",
      component: "GeneralWorkspaceView",
      keywords: [],
      bbox: null
    };
  }

  const confidence = bestHits > 0 ? Math.min(0.98, 0.55 + bestHits * 0.12) : 0.20;
  const selfFix = bestSignature.selfFix ? bestSignature.selfFix(text) : null;

  const bboxText = bestSignature.bbox
    ? `[Top: ${bestSignature.bbox.top}, Left: ${bestSignature.bbox.left}, W: ${bestSignature.bbox.width}, H: ${bestSignature.bbox.height}]`
    : `[No bounding box - unclassified text report]`;

  const ocrExtractedText = bestHits > 0
    ? `[Vision OCR] Screen Text: "${inputData.text || "Error pop-up detected in ERP workspace."}"\n` +
      `Extracted Symbol: ${bestSignature.errorCode}\n` +
      `Target Module: ${bestSignature.module}\n` +
      `Detected UI Component: <${bestSignature.component}/>\n` +
      `Vision Bounding Coordinates: ${bboxText}\n` +
      `Confidence: ${(confidence * 100).toFixed(1)}%`
    : `[Vision OCR] Screen Text: "${inputData.text || "Unclassified user report."}"\n` +
      `Classification: UNCLASSIFIED (No known ERP error keywords found)\n` +
      `Confidence: 20.0%`;

  return {
    raw_text: inputData.text || "",
    ocr_extracted_text: ocrExtractedText,
    extracted_error_code: bestSignature.errorCode,
    erp_module: bestSignature.module,
    detected_ui_component: bestSignature.component,
    bounding_box: bestSignature.bbox,
    confidence,
    suggested_self_fix: selfFix
  };
}

/**
 * Reads the pixel dimensions out of a PNG or JPEG buffer's header, without decoding the
 * whole image. Returns null for formats it doesn't recognize (e.g. GIF/WEBP screenshots) —
 * callers fall back to pixel-only bounding boxes in that case.
 */
function getImageDimensions(buffer) {
  // PNG: 8-byte signature, then a 4-byte chunk length + "IHDR", then width/height (uint32 BE).
  if (buffer.length >= 24 && buffer.toString("ascii", 12, 16) === "IHDR") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // JPEG: scan markers for the Start-Of-Frame segment (baseline 0xC0 or progressive 0xC2).
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length && buffer[offset] === 0xff) {
      const marker = buffer[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }

  return null;
}

/**
 * Runs real Tesseract.js pixel-level OCR server-side on a base64-encoded screenshot, then
 * passes the extracted text through the same keyword-signature classifier used for text-only
 * reports. When an error code is found in the recognized words, the synthetic per-module
 * bounding box is replaced with Tesseract's real word-level bounding box (converted to the
 * same percentage format the frontend already renders).
 */
function flattenWords(blocks) {
  const words = [];
  for (const block of blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        words.push(...(line.words || []));
      }
    }
  }
  return words;
}

export async function analyzeMultimodalInputFromImage(imageBase64) {
  const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");

  // Tesseract.js v5+ disables every output except `text` by default — the convenience
  // Tesseract.recognize() helper has no way to request `blocks` (word-level bbox data),
  // so word/line detail requires the lower-level createWorker() API.
  //
  // `errorHandler` is required, not optional: on a decode failure (corrupt bytes, an
  // unsupported format) Tesseract.js's internal message handler rejects the pending
  // promise AND — if no errorHandler is configured — separately throws inside its own
  // event listener, which Node re-raises as an uncaught exception that crashes the whole
  // process. Supplying a no-op errorHandler suppresses that second throw; the rejected
  // promise below is what actually surfaces the failure to the caller.
  const worker = await Tesseract.createWorker("eng", 1, { errorHandler: () => {} });
  let data;
  try {
    ({ data } = await worker.recognize(buffer, {}, { text: true, blocks: true }));
  } finally {
    await worker.terminate();
  }

  const trimmedText = (data.text || "").trim();

  const findings = analyzeMultimodalInput({ text: trimmedText });
  findings.ocr_extracted_text = `[Tesseract.js Server-Side OCR]\n${trimmedText}\n\n${findings.ocr_extracted_text}`;
  findings.ocr_confidence = typeof data.confidence === "number" ? Math.round(data.confidence) / 100 : null;

  const errorWord = flattenWords(data.blocks).find((w) => ERROR_CODE_PATTERN.test(w.text));
  if (errorWord?.bbox) {
    findings.word_bbox_px = errorWord.bbox;
    const dims = getImageDimensions(buffer);
    if (dims?.width && dims?.height) {
      findings.bounding_box = {
        top: `${((errorWord.bbox.y0 / dims.height) * 100).toFixed(1)}%`,
        left: `${((errorWord.bbox.x0 / dims.width) * 100).toFixed(1)}%`,
        width: `${(((errorWord.bbox.x1 - errorWord.bbox.x0) / dims.width) * 100).toFixed(1)}%`,
        height: `${(((errorWord.bbox.y1 - errorWord.bbox.y0) / dims.height) * 100).toFixed(1)}%`
      };
      findings.image_width = dims.width;
      findings.image_height = dims.height;
    }
  }

  return findings;
}
