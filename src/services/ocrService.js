/**
 * Multimodal OCR & Vision Error Parsing Engine (PaddleOCR / Vision AI simulator)
 */

export function analyzeMultimodalInput(inputData) {
  const text = (inputData.text || inputData.fileName || "").toLowerCase();

  // Pattern matchers
  let module = "INVOICING";
  let errorCode = "ERR_INV_400";
  let component = "SubmitInvoiceButton";
  let bbox = { top: "35%", left: "20%", width: "55%", height: "25%" };
  let selfFix = null;

  if (text.includes("tax") || text.includes("gstin") || text.includes("invoice") || text.includes("billing") || text.includes("402")) {
    module = "INVOICING";
    errorCode = "ERR_TAX_VAL_402";
    component = "PostInvoiceButton";
    bbox = { top: "40%", left: "15%", width: "70%", height: "22%" };

    if (text.includes("missing tax id") || text.includes("exempt code")) {
      selfFix = {
        title: "Self-Service Resolution Available",
        description: "This error is caused by a missing GSTIN Exemption Code in the Customer Profile.",
        steps: [
          "Open Customer Master -> Tax Tab",
          "Select 'GST Exempt - Government Account'",
          "Click Save and retry posting invoice."
        ]
      };
    }
  } else if (text.includes("payroll") || text.includes("deadlock") || text.includes("salary") || text.includes("batch") || text.includes("timeout")) {
    module = "PAYROLL";
    errorCode = "ERR_PAYROLL_DEADLOCK";
    component = "BatchRunModal";
    bbox = { top: "28%", left: "25%", width: "50%", height: "35%" };
  } else if (text.includes("stock") || text.includes("inventory") || text.includes("warehouse") || text.includes("bin") || text.includes("sku")) {
    module = "INVENTORY";
    errorCode = "ERR_STOCK_NEG";
    component = "BinTransferGrid";
    bbox = { top: "45%", left: "30%", width: "40%", height: "30%" };
  } else if (text.includes("ledger") || text.includes("journal") || text.includes("audit") || text.includes("balance")) {
    module = "GENERAL_LEDGER";
    errorCode = "ERR_GL_UNBALANCED";
    component = "JournalPostingForm";
    bbox = { top: "32%", left: "18%", width: "64%", height: "28%" };
  }

  const ocrExtractedText = `[PaddleOCR Processed] Screen Text: "${inputData.text || 'Error pop-up detected in ERP workspace.'}"
Extracted Symbol: ${errorCode}
Target Module: ${module}
Detected UI Component: <${component}/>
Vision Bounding Coordinates: [Top: ${bbox.top}, Left: ${bbox.left}, W: ${bbox.width}, H: ${bbox.height}]`;

  return {
    raw_text: inputData.text || "",
    ocr_extracted_text: ocrExtractedText,
    extracted_error_code: errorCode,
    erp_module: module,
    detected_ui_component: component,
    bounding_box: bbox,
    suggested_self_fix: selfFix
  };
}
