import React, { useState } from 'react';
import { Upload, Mic, FileText, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Scan, ShieldCheck } from 'lucide-react';
import { analyzeMultimodalInput } from '../../services/ocrService';

export default function SmartReporter({ onSubmitIncident }) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  // Sample quick scenarios
  const sampleInputs = [
    { label: "SAP Invoicing Tax Error", text: "The post invoice button threw ERR_TAX_VAL_402 for Customer 904. Tax exemption code is missing." },
    { label: "Payroll Batch Timeout", text: "Payroll batch frozen at employee 450 with ERR_PAYROLL_DEADLOCK timeout on table emp_tax_deductions." },
    { label: "Warehouse Bin Transfer", text: "Negative quantity violation ERR_STOCK_NEG when transferring SKU SK-902 in Bin B4." }
  ];

  const handleSimulatedScan = (textToScan) => {
    setIsScanning(true);
    setOcrResult(null);

    setTimeout(() => {
      const result = analyzeMultimodalInput({ text: textToScan, fileName: selectedFile?.name });
      setOcrResult(result);
      setIsScanning(false);
    }, 900);
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
      text: inputText,
      file: selectedFile,
      ocrFindings: ocrResult
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="glass-panel p-6 border-indigo-500/30 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Module 1 & 2: OCR Vision Reporter
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Smart ERP Incident Diagnostic Reporter</h2>
            <p className="text-slate-400 text-sm mt-1">
              Upload an ERP error screenshot, log file, or voice recording. Vision AI will auto-extract error codes and triage the issue.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Quick Fill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-semibold">Quick Sample Reports:</span>
        {sampleInputs.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputText(sample.text);
              handleSimulatedScan(sample.text);
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all font-medium flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" /> {sample.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload & Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Drag & Drop Zone */}
          <div className="glass-panel p-5 flex flex-col justify-between border-dashed border-2 border-indigo-500/30 hover:border-indigo-500/60 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-400" /> Upload ERP Screenshot / Log
                </label>
                {selectedFile && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> File Loaded
                  </span>
                )}
              </div>

              <div className="py-8 text-center flex flex-col items-center justify-center cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-3 text-indigo-400 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Drag ERP screenshot or trace log here</p>
                <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, PDF, .LOG stack traces</p>
                
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      handleSimulatedScan(inputText || e.target.files[0].name);
                    }
                  }}
                  className="mt-3 text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Voice Recording Button */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Have a vague complaint? Voice it:</span>
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isRecording}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isRecording 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                <Mic className="w-4 h-4" /> {isRecording ? 'Listening...' : 'Voice Record'}
              </button>
            </div>
          </div>

          {/* Right: Problem Description */}
          <div className="glass-panel p-5 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
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
                className="w-full h-40 bg-slate-900/80 border border-white/10 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none font-sans"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {isScanning ? 'OCR & Vision AI scanning input...' : 'AI auto-extracts module & error codes'}
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
        <div className="glass-panel p-5 border-indigo-500/40 bg-indigo-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Multimodal Vision & OCR AI Findings</h3>
            </div>
            <span className="badge-module">{ocrResult.erp_module} MODULE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-white/10">
              <span className="text-slate-400 block font-semibold mb-1">Extracted Error Symbol:</span>
              <code className="text-rose-400 font-bold text-sm">{ocrResult.extracted_error_code}</code>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-white/10">
              <span className="text-slate-400 block font-semibold mb-1">Detected Component:</span>
              <span className="text-indigo-300 font-mono">&lt;{ocrResult.detected_ui_component}/&gt;</span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-white/10">
              <span className="text-slate-400 block font-semibold mb-1">Vision Coordinates:</span>
              <span className="text-emerald-400 font-mono">BBox Top: {ocrResult.bounding_box.top}</span>
            </div>
          </div>

          {/* Interactive Bounding Box Screenshot Simulator */}
          <div className="relative w-full h-44 bg-slate-950 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center p-4">
            <div className="text-slate-600 text-xs font-mono select-none">
              [SIMULATED ERP WORKSPACE CANVAS: {ocrResult.erp_module}_FORM_VIEW]
            </div>

            {/* Bounding Box Overlay */}
            <div
              style={{
                position: 'absolute',
                top: ocrResult.bounding_box.top,
                left: ocrResult.bounding_box.left,
                width: ocrResult.bounding_box.width,
                height: ocrResult.bounding_box.height,
              }}
              className="border-2 border-rose-500 bg-rose-500/10 rounded-lg flex items-center justify-between px-3 py-1 shadow-lg shadow-rose-500/20 animate-pulse"
            >
              <span className="text-[10px] font-bold text-rose-300 font-mono">
                🚨 VISION OCR DETECTED: {ocrResult.extracted_error_code}
              </span>
              <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                CRITICAL BOUNDING BOX
              </span>
            </div>
          </div>

          {/* Instant Self-Fix Advisor Card */}
          {ocrResult.suggested_self_fix && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">{ocrResult.suggested_self_fix.title}</h4>
                <p className="text-xs text-slate-300 mt-1">{ocrResult.suggested_self_fix.description}</p>
                <ol className="list-decimal list-inside text-xs text-slate-400 mt-2 space-y-1">
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
