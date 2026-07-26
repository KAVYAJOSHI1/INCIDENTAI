/**
 * Module 1 & 2: Multimodal OCR & Vision AI Diagnostics Engine (signature-matcher simulator for PaddleOCR/Gemini Vision).
 */

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

  let bestSignature = ERROR_SIGNATURES[0];
  let bestHits = 0;
  for (const signature of ERROR_SIGNATURES) {
    const hits = signature.keywords.filter((keyword) => text.includes(keyword)).length;
    if (hits > bestHits) {
      bestHits = hits;
      bestSignature = signature;
    }
  }

  const confidence = bestHits > 0 ? Math.min(0.98, 0.55 + bestHits * 0.12) : 0.35;
  const selfFix = bestSignature.selfFix ? bestSignature.selfFix(text) : null;

  const ocrExtractedText =
    `[Vision OCR] Screen Text: "${inputData.text || "Error pop-up detected in ERP workspace."}"\n` +
    `Extracted Symbol: ${bestSignature.errorCode}\n` +
    `Target Module: ${bestSignature.module}\n` +
    `Detected UI Component: <${bestSignature.component}/>\n` +
    `Vision Bounding Coordinates: [Top: ${bestSignature.bbox.top}, Left: ${bestSignature.bbox.left}, W: ${bestSignature.bbox.width}, H: ${bestSignature.bbox.height}]\n` +
    `Confidence: ${(confidence * 100).toFixed(1)}%`;

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
