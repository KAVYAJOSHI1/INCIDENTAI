import React, { useState } from 'react';
import { Code2, Play, CheckCircle2, MessageSquare, Terminal, Sparkles, Send, Copy, ShieldAlert, Cpu } from 'lucide-react';
import confetti from 'canvas-confetti';
import { copilotChat } from '../../services/apiClient';
import { Spinner } from '../Common/Loading';

export default function DeveloperWorkbench({ ticket, onResolveTicket }) {
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "AI_COPILOT",
      message: `Hello Engineer! I am **IncidentAI Copilot**. I have indexed all stack trace logs, OCR screenshots, and pgvector knowledge entries for **${ticket?.ticket_number || 'INC-8901'}**. How can I help you resolve this?`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isPatchExecuted, setIsPatchExecuted] = useState(false);
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);

  if (!ticket) {
    return (
      <div className="surface p-12 text-center max-w-xl mx-auto space-y-4">
        <Code2 className="w-12 h-12 text-[var(--accent)] mx-auto" />
        <h3 className="text-lg font-bold text-heading">No Ticket Selected</h3>
        <p className="text-xs text-muted-color">Select a ticket from the Support Feed to open the Developer Workbench.</p>
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
    setIsCopilotTyping(true);

    try {
      const copilotReply = await copilotChat(ticket.id, query);
      setChatMessages((prev) => [...prev, copilotReply]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: "AI_COPILOT", message: `Error contacting IncidentAI Copilot: ${err.message}` }]);
    } finally {
      setIsCopilotTyping(false);
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
      <div className="surface p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-accent-color bg-[var(--accent-soft-bg)] px-2 py-0.5 rounded border" style={{ borderColor: 'var(--accent-soft-border)' }}>
              {ticket.ticket_number}
            </span>
            <span className="badge-module">{ticket.erp_module}</span>
            <span className="text-xs font-semibold text-body-color">Assigned Dev: <strong>{ticket.assigned_dev_name}</strong></span>
          </div>
          <h2 className="text-lg font-bold text-heading">{ticket.title}</h2>
        </div>

        <button
          onClick={handleExecutePatch}
          disabled={isPatchExecuted}
          className="btn-emerald text-xs"
        >
          <Play className="w-4 h-4" /> {isPatchExecuted ? 'Patch Executed & Resolved!' : 'Execute AI Patch & Resolve Ticket'}
        </button>
      </div>

      {/* Main Grid: Code/Trace Inspection + AI Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stack Trace & Code Inspection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stack Trace / Diagnostic Viewer */}
          <div className="surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-body-color flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[var(--accent)]" /> Extracted Stack Trace & OCR Diagnostics
              </h3>
              <span className="text-[10px] text-faint-color font-mono">PADDLE_OCR_V2</span>
            </div>

            <pre className="surface-muted p-4 text-body-color text-xs font-mono overflow-x-auto leading-relaxed max-h-56">
              {ticket.ocr_findings?.ocr_extracted_text || ticket.structured_description}
            </pre>
          </div>

          {/* AI Proposed Code / SQL Patch */}
          <div className="callout callout-purple p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4" /> AI-Generated Patch Fix (SQL / ORM Code)
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(ticket.ai_suggested_patch)}
                className="text-[11px] text-muted-color hover:text-heading flex items-center gap-1 surface-muted px-2 py-1"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>

            <pre className="bg-[var(--bg-surface)] p-4 rounded-lg border text-emerald-600 dark:text-emerald-400 text-xs font-mono overflow-x-auto" style={{ borderColor: 'var(--border-default)' }}>
              {ticket.ai_suggested_patch}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] opacity-80">Target Database: PostgreSQL / ERP Ledger</span>
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
        <div className="lg:col-span-5 surface p-5 flex flex-col justify-between h-[540px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-heading">IncidentAI Developer Copilot</h3>
              </div>
              <span className="text-[10px] bg-[var(--accent-soft-bg)] text-accent-color font-mono font-bold px-2 py-0.5 rounded">
                RAG ACTIVE
              </span>
            </div>

            {/* Quick Prompts */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <button
                onClick={() => setInputQuery("Why did this happen?")}
                className="text-[10px] surface-muted hover:bg-[var(--bg-muted-hover)] text-body-color px-2 py-1 rounded"
              >
                Why did this happen?
              </button>
              <button
                onClick={() => setInputQuery("Show SQL patch")}
                className="text-[10px] surface-muted hover:bg-[var(--bg-muted-hover)] text-body-color px-2 py-1 rounded"
              >
                Show SQL patch
              </button>
              <button
                onClick={() => setInputQuery("Draft postmortem")}
                className="text-[10px] surface-muted hover:bg-[var(--bg-muted-hover)] text-body-color px-2 py-1 rounded"
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
                    msg.sender === "USER" ? "bubble-user ml-6" : "bubble-ai mr-4 font-sans"
                  }`}
                >
                  <span className="text-[9px] font-bold text-muted-color block mb-1 uppercase">
                    {msg.sender === "USER" ? "Developer" : "AI Copilot"}
                  </span>
                  <div className="whitespace-pre-line">{msg.message}</div>
                </div>
              ))}
              {isCopilotTyping && (
                <div className="p-3 rounded-xl text-xs bubble-ai mr-4 flex items-center gap-2">
                  <Spinner className="w-3.5 h-3.5" /> AI Copilot is typing...
                </div>
              )}
            </div>
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-default)' }}>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Copilot about stack trace or fix..."
              className="input-field flex-1 px-3 py-2 text-xs"
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
