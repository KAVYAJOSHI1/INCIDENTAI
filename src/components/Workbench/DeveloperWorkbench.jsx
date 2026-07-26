import React, { useState } from 'react';
import { Code2, Play, CheckCircle2, MessageSquare, Terminal, Sparkles, Send, Copy, ShieldAlert, Cpu } from 'lucide-react';
import confetti from 'canvas-confetti';
import { copilotChat } from '../../services/apiClient';

export default function DeveloperWorkbench({ ticket, onResolveTicket }) {
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "AI_COPILOT",
      message: `Hello Engineer! I am **IncidentAI Copilot**. I have indexed all stack trace logs, OCR screenshots, and pgvector knowledge entries for **${ticket?.ticket_number || 'INC-8901'}**. How can I help you resolve this?`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isPatchExecuted, setIsPatchExecuted] = useState(false);

  if (!ticket) {
    return (
      <div className="glass-panel p-12 text-center max-w-xl mx-auto space-y-4">
        <Code2 className="w-12 h-12 text-indigo-400 mx-auto animate-bounce" />
        <h3 className="text-lg font-bold text-white">No Ticket Selected</h3>
        <p className="text-xs text-slate-400">Select a ticket from the Support Feed to open the Developer Workbench.</p>
      </div>
    );
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const userMsg = { sender: "USER", message: inputQuery };
    const query = inputQuery;
    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');

    try {
      const copilotReply = await copilotChat(ticket.id, query);
      setChatMessages((prev) => [...prev, copilotReply]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: "AI_COPILOT", message: `Error contacting IncidentAI Copilot: ${err.message}` }]);
    }
  };

  const handleExecutePatch = () => {
    setIsPatchExecuted(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      onResolveTicket(ticket.id);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Workbench Header */}
      <div className="glass-panel p-5 border-indigo-500/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
              {ticket.ticket_number}
            </span>
            <span className="badge-module">{ticket.erp_module}</span>
            <span className="text-xs font-semibold text-slate-300">Assigned Dev: <strong>{ticket.assigned_dev_name}</strong></span>
          </div>
          <h2 className="text-lg font-bold text-white">{ticket.title}</h2>
        </div>

        <button
          onClick={handleExecutePatch}
          disabled={isPatchExecuted}
          className="btn-emerald text-xs shadow-lg shadow-emerald-500/20"
        >
          <Play className="w-4 h-4" /> {isPatchExecuted ? 'Patch Executed & Resolved!' : 'Execute AI Patch & Resolve Ticket'}
        </button>
      </div>

      {/* Main Grid: Code/Trace Inspection + AI Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stack Trace & Code Inspection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stack Trace / Diagnostic Viewer */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" /> Extracted Stack Trace & OCR Diagnostics
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">PADDLE_OCR_V2</span>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl border border-white/10 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed max-h-56">
              {ticket.ocr_findings?.ocr_extracted_text || ticket.structured_description}
            </pre>
          </div>

          {/* AI Proposed Code / SQL Patch */}
          <div className="glass-panel p-5 space-y-3 border-purple-500/30 bg-purple-950/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" /> AI-Generated Patch Fix (SQL / ORM Code)
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(ticket.ai_suggested_patch)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl border border-purple-500/40 text-emerald-400 text-xs font-mono overflow-x-auto">
              {ticket.ai_suggested_patch}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">Target Database: PostgreSQL / ERP Ledger</span>
              <button
                onClick={handleExecutePatch}
                disabled={isPatchExecuted}
                className="btn-emerald text-xs py-1.5 px-3"
              >
                <Play className="w-3.5 h-3.5" /> Run Patch
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Developer Copilot Chat (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-5 flex flex-col justify-between h-[540px] border-indigo-500/30">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">IncidentAI Developer Copilot</h3>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded">
                RAG ACTIVE
              </span>
            </div>

            {/* Quick Prompts */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <button
                onClick={() => setInputQuery("Why did this happen?")}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-white/10"
              >
                Why did this happen?
              </button>
              <button
                onClick={() => setInputQuery("Show SQL patch")}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-white/10"
              >
                Show SQL patch
              </button>
              <button
                onClick={() => setInputQuery("Draft postmortem")}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-white/10"
              >
                Draft postmortem
              </button>
            </div>

            {/* Chat Log */}
            <div className="mt-4 space-y-3 overflow-y-auto max-h-[340px] pr-2">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    msg.sender === "USER"
                      ? "bg-indigo-600/30 text-white ml-6 border border-indigo-500/30"
                      : "bg-slate-900/80 text-slate-200 mr-4 border border-white/10 font-sans"
                  }`}
                >
                  <span className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">
                    {msg.sender === "USER" ? "Developer" : "AI Copilot"}
                  </span>
                  <div className="whitespace-pre-line">{msg.message}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Copilot about stack trace or fix..."
              className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button type="submit" className="btn-primary text-xs py-2 px-3">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
