import React, { useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, Mic, FileText, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Scan, ShieldCheck, Loader2 } from 'lucide-react';
import { analyzeOcrPreview } from '../../services/apiClient';

const ERROR_CODE_PATTERN = /ERR[_-]?[A-Z0-9_]{3,}/i;

// Tesseract.js v5+ disables every output except `text` by default — word-level bounding
// boxes require the lower-level createWorker() API with `blocks: true` requested explicitly;
// the one-shot Tesseract.recognize() helper has no way to ask for them.
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

export default function SmartReporter({ onSubmitIncident }) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  // Real pixel-level OCR (Tesseract.js) state — only populated for actual image uploads
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageNaturalSize, setImageNaturalSize] = useState(null);
  const [isRealOcrRunning, setIsRealOcrRunning] = useState(false);
  const [realOcrProgress, setRealOcrProgress] = useState(0);
  const [realOcrRawText, setRealOcrRawText] = useState('');
  const [realWordBoxPx, setRealWordBoxPx] = useState(null);
  const imagePreviewUrlRef = useRef(null);

  useEffect(() => () => {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
  }, []);

  // Sample quick scenarios
  const sampleInputs = [
    { label: "SAP Invoicing Tax Error", text: "The post invoice button threw ERR_TAX_VAL_402 for Customer 904. Tax exemption code is missing." },
    { label: "Payroll Batch Timeout", text: "Payroll batch frozen at employee 450 with ERR_PAYROLL_DEADLOCK timeout on table emp_tax_deductions." },
    { label: "Warehouse Bin Transfer", text: "Negative quantity violation ERR_STOCK_NEG when transferring SKU SK-902 in Bin B4." }
  ];

  const handleSimulatedScan = async (textToScan) => {
    setIsScanning(true);
    setOcrResult(null);

    try {
      const result = await analyzeOcrPreview({ text: textToScan, fileName: selectedFile?.name });
      setOcrResult(result);
    } catch (err) {
      console.error('OCR preview failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const resetRealOcrState = () => {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    imagePreviewUrlRef.current = null;
    setImagePreviewUrl(null);
    setImageNaturalSize(null);
    setRealOcrRawText('');
    setRealWordBoxPx(null);
  };

  const runRealImageOcr = async (file) => {
    const url = URL.createObjectURL(file);
    imagePreviewUrlRef.current = url;
    setImagePreviewUrl(url);
    setImageNaturalSize(null);
    setRealWordBoxPx(null);
    setIsRealOcrRunning(true);
    setRealOcrProgress(0);

    let extractedText = '';
    try {
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setRealOcrProgress(Math.round(m.progress * 100));
        }
      });
      let data;
      try {
        ({ data } = await worker.recognize(file, {}, { text: true, blocks: true }));
      } finally {
        await worker.terminate();
      }

      extractedText = (data.text || '').trim();
      setRealOcrRawText(extractedText);

      const errorCodeWord = flattenWords(data.blocks).find((w) => ERROR_CODE_PATTERN.test(w.text));
      if (errorCodeWord?.bbox) setRealWordBoxPx(errorCodeWord.bbox);
    } catch (err) {
      console.error('Tesseract OCR failed:', err);
    } finally {
      setIsRealOcrRunning(false);
    }

    const effectiveText = inputText.trim() || extractedText;
    if (!inputText.trim() && extractedText) setInputText(extractedText);
    await handleSimulatedScan(effectiveText || file.name);
  };

  const handleFileSelected = (file) => {
    if (!file) return;
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      runRealImageOcr(file);
    } else {
      resetRealOcrState();
      handleSimulatedScan(inputText || file.name);
    }
  };

  const handleVoiceInput = () => {
    setIsRecording(true);
    setTimeout(() => {
      const voiceText = "Voice Transcript: Billing user encountered error ERR_TAX_VAL_402 while trying to post invoice for government customer account.";
      setInputText(voiceText);
      setIsRecording(false);
      handleSimulatedScan(voiceText);
    }, 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText && !selectedFile) return;
    onSubmitIncident({
      text: inputText.trim() || undefined,
      fileName: selectedFile?.name,
      ocrRawText: realOcrRawText || undefined
    });
  };

  const realBoundingBoxPercent = realWordBoxPx && imageNaturalSize
    ? {
        left: `${(realWordBoxPx.x0 / imageNaturalSize.width) * 100}%`,
        top: `${(realWordBoxPx.y0 / imageNaturalSize.height) * 100}%`,
        width: `${((realWordBoxPx.x1 - realWordBoxPx.x0) / imageNaturalSize.width) * 100}%`,
        height: `${((realWordBoxPx.y1 - realWordBoxPx.y0) / imageNaturalSize.height) * 100}%`
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="surface p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-module">
                <Sparkles className="w-3 h-3 inline mr-1" /> OCR Vision Reporter
              </span>
            </div>
            <h2 className="text-xl font-bold text-heading">Smart ERP Incident Diagnostic Reporter</h2>
            <p className="text-body-color text-sm mt-1">
              Upload an ERP error screenshot for real Tesseract.js pixel-level text extraction, or describe the issue / voice it in. AI auto-extracts error codes and triages the issue.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Quick Fill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-color font-semibold">Quick Sample Reports:</span>
        {sampleInputs.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputText(sample.text);
              resetRealOcrState();
              setSelectedFile(null);
              handleSimulatedScan(sample.text);
            }}
            className="btn-secondary text-xs py-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--accent)]" /> {sample.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload & Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Drag & Drop Zone */}
          <div className="surface p-5 flex flex-col justify-between" style={{ borderStyle: 'dashed' }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-body-color flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[var(--accent)]" /> Upload ERP Screenshot / Log
                </label>
                {selectedFile && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> File Loaded
                  </span>
                )}
              </div>

              <div className="py-8 text-center flex flex-col items-center justify-center cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft-bg)] flex items-center justify-center mb-3 text-[var(--accent)]">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-heading">Drag ERP screenshot or trace log here</p>
                <p className="text-xs text-muted-color mt-1">Images run through real Tesseract.js OCR. Also supports PDF, .LOG stack traces.</p>

                <input
                  type="file"
                  onChange={(e) => handleFileSelected(e.target.files[0])}
                  className="mt-3 text-xs text-muted-color file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)] cursor-pointer"
                />
              </div>
            </div>

            {/* Voice Recording Button */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
              <span className="text-xs text-muted-color font-medium">Have a vague complaint? Voice it:</span>
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isRecording}
                className={isRecording ? 'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-rose-500 text-white animate-pulse' : 'btn-secondary text-xs py-1.5'}
              >
                <Mic className="w-4 h-4" /> {isRecording ? 'Listening...' : 'Voice Record'}
              </button>
            </div>
          </div>

          {/* Right: Problem Description */}
          <div className="surface p-5 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-body-color mb-2">
                Non-Technical Problem Summary
              </label>
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (e.target.value.length > 10 && !isScanning) {
                    handleSimulatedScan(e.target.value);
                  }
                }}
                placeholder="Describe what happened e.g. 'The post invoice button gave a red error pop-up when billing customer Acme Corp...'"
                className="input-field w-full h-40 p-3 text-sm resize-none font-sans"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-color">
                {isRealOcrRunning
                  ? `Tesseract.js scanning image pixels... ${realOcrProgress}%`
                  : isScanning
                    ? 'AI vision classifying extracted text...'
                    : 'AI auto-extracts module & error codes'}
              </span>
              <button
                type="submit"
                disabled={!inputText && !selectedFile}
                className="btn-primary"
              >
                Triage Incident <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Multimodal OCR & Vision Diagnostics Box */}
      {ocrResult && (
        <div className="callout callout-blue p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-sm font-bold text-heading">
                {imagePreviewUrl ? 'Tesseract.js Real OCR + AI Vision Classification' : 'Multimodal Vision & OCR AI Findings'}
              </h3>
            </div>
            <span className="badge-module">{ocrResult.erp_module} MODULE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="surface-muted p-3">
              <span className="text-muted-color block font-semibold mb-1">Extracted Error Symbol:</span>
              <code className="text-rose-600 dark:text-rose-400 font-bold text-sm">{ocrResult.extracted_error_code}</code>
            </div>

            <div className="surface-muted p-3">
              <span className="text-muted-color block font-semibold mb-1">Detected Component:</span>
              <span className="text-accent-color font-mono">&lt;{ocrResult.detected_ui_component}/&gt;</span>
            </div>

            <div className="surface-muted p-3">
              <span className="text-muted-color block font-semibold mb-1">Vision Coordinates:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                {realBoundingBoxPercent ? `Real pixel bbox (Tesseract)` : `BBox Top: ${ocrResult.bounding_box.top}`}
              </span>
            </div>
          </div>

          {/* Real uploaded image + real OCR bounding box, or the synthetic canvas fallback */}
          <div className="relative w-full h-56 surface-muted overflow-hidden flex items-center justify-center p-4">
            {imagePreviewUrl ? (
              <>
                <img
                  src={imagePreviewUrl}
                  alt="Uploaded ERP screenshot"
                  onLoad={(e) => setImageNaturalSize({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {isRealOcrRunning && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white text-xs font-mono">
                    <Loader2 className="w-6 h-6 animate-spin" /> Scanning pixels with Tesseract.js... {realOcrProgress}%
                  </div>
                )}
                {realBoundingBoxPercent && (
                  <div
                    style={realBoundingBoxPercent}
                    className="absolute border-2 border-rose-500 bg-rose-500/10 rounded"
                  />
                )}
              </>
            ) : (
              <>
                <div className="text-muted-color text-xs font-mono select-none">
                  [SIMULATED ERP WORKSPACE CANVAS: {ocrResult.erp_module}_FORM_VIEW]
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: ocrResult.bounding_box.top,
                    left: ocrResult.bounding_box.left,
                    width: ocrResult.bounding_box.width,
                    height: ocrResult.bounding_box.height,
                  }}
                  className="border-2 border-rose-500 bg-rose-500/10 rounded-lg flex items-center justify-between px-3 py-1"
                >
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-300 font-mono">
                    VISION OCR DETECTED: {ocrResult.extracted_error_code}
                  </span>
                  <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                    CRITICAL BOUNDING BOX
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Raw Tesseract.js Extracted Text */}
          {realOcrRawText && (
            <div className="surface-muted p-3">
              <span className="text-muted-color block font-semibold mb-1 text-xs">Raw Tesseract.js Extracted Text:</span>
              <pre className="text-[11px] text-body-color font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">{realOcrRawText}</pre>
            </div>
          )}

          {/* Instant Self-Fix Advisor Card */}
          {ocrResult.suggested_self_fix && (
            <div className="callout callout-emerald p-4 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">{ocrResult.suggested_self_fix.title}</h4>
                <p className="text-xs mt-1 opacity-90">{ocrResult.suggested_self_fix.description}</p>
                <ol className="list-decimal list-inside text-xs mt-2 space-y-1 opacity-80">
                  {ocrResult.suggested_self_fix.steps.map((step, sIdx) => (
                    <li key={sIdx}>{step}</li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => alert("Self-Resolution recorded! No developer ticket created.")}
                  className="mt-3 btn-emerald text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Self-Resolved (Cancel Ticket)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
