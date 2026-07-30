import React, { useState } from 'react';
import { Code2, Play, CheckCircle2, Terminal, Sparkles, Send, Copy, Cpu } from 'lucide-react';
import confetti from 'canvas-confetti';
import { streamCopilotChat } from '../../services/apiClient';
import { Spinner } from '../Common/Loading';

export default function DeveloperWorkbench({ ticket, onResolveTicket }) {
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'AI_COPILOT',
      message: `Hello! I've indexed all stack trace logs, OCR output, and knowledge base entries for **${ticket?.ticket_number || 'INC-0001'}**. What would you like to know?`
    }
  ]);
  const [inputQuery, setInputQuery]         = useState('');
  const [isPatchExecuted, setIsPatchExecuted] = useState(false);
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);

  if (!ticket) {
    return (
      <div className="surface flex flex-col items-center justify-center p-16 text-center max-w-lg mx-auto">
        <Code2 className="w-10 h-10 mb-4" style={{ color: 'var(--accent)' }} />
        <h3 className="text-base font-semibold text-heading mb-1">No Ticket Selected</h3>
        <p className="text-sm text-muted-color">Select a ticket from the Triage Feed to open the Developer Workbench.</p>
      </div>
    );
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    const userMsg = { sender: 'USER', message: inputQuery };
    const query = inputQuery;

    // Multi-turn memory: carry the last few turns as conversation history (skip the
    // static greeting bubble), capped so the request stays small.
    const history = chatMessages
      .slice(1)
      .slice(-10)
      .map(m => ({ role: m.sender === 'USER' ? 'user' : 'assistant', content: m.message }));

    setChatMessages(prev => [...prev, userMsg, { sender: 'AI_COPILOT', message: '' }]);
    setInputQuery('');
    setIsCopilotTyping(true);

    try {
      let firstChunk = true;
      await streamCopilotChat(ticket.id, query, history, (chunk) => {
        if (firstChunk) { setIsCopilotTyping(false); firstChunk = false; }
        setChatMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, message: last.message + chunk };
          return next;
        });
      });
    } catch (err) {
      setChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { sender: 'AI_COPILOT', message: `Error: ${err.message}` };
        return next;
      });
    } finally {
      setIsCopilotTyping(false);
    }
  };

  const handleExecutePatch = () => {
    setIsPatchExecuted(true);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => onResolveTicket(ticket.id), 1200);
  };

  const QUICK_PROMPTS = ['Why did this happen?', 'Show SQL patch', 'Draft postmortem', 'List affected users'];

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* Workbench header bar */}
      <div className="surface px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <code
              className="text-xs font-mono font-bold px-2 py-0.5 rounded"
              style={{
                background: 'var(--accent-subtle-bg)',
                color: 'var(--accent-subtle-text)',
                border: '1px solid var(--accent-subtle-bd)'
              }}
            >
              {ticket.ticket_number}
            </code>
            <span className="badge-module">{ticket.erp_module}</span>
            <span className="text-xs text-muted-color">
              Assigned: <span className="font-semibold text-heading">{ticket.assigned_dev_name}</span>
            </span>
          </div>
          <h2 className="text-base font-semibold text-heading leading-snug">{ticket.title}</h2>
        </div>
        <button
          onClick={handleExecutePatch}
          disabled={isPatchExecuted}
          className="btn-emerald"
        >
          <Play className="w-3.5 h-3.5" />
          {isPatchExecuted ? 'Patch Applied & Resolved!' : 'Execute Patch & Resolve'}
        </button>
      </div>

      {/* Main 7/5 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left — Stack trace + Patch (7 cols) */}
        <div className="lg:col-span-7 space-y-4">

          {/* Stack trace / OCR output */}
          <div className="surface">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold text-muted-color uppercase tracking-wide flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Stack Trace & OCR Diagnostics
              </p>
              <span className="text-[10px] font-mono text-faint-color">TESSERACT_v7 + PADDLE_OCR</span>
            </div>
            <pre
              className="px-5 py-4 text-xs font-mono leading-relaxed overflow-x-auto"
              style={{
                color: 'var(--text-body)',
                background: 'var(--bg-subtle)',
                maxHeight: '220px',
                overflowY: 'auto'
              }}
            >
              {ticket.ocr_findings?.ocr_extracted_text || ticket.structured_description}
            </pre>
          </div>

          {/* AI Patch */}
          <div className="surface">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold text-muted-color uppercase tracking-wide flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                AI-Generated Patch
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(ticket.ai_suggested_patch)}
                className="btn-ghost"
                style={{ fontSize: '11px', height: '28px' }}
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre
              className="px-5 py-4 text-xs font-mono leading-relaxed overflow-x-auto"
              style={{
                color: 'var(--green)',
                background: 'var(--bg-subtle)',
                maxHeight: '220px',
                overflowY: 'auto'
              }}
            >
              {ticket.ai_suggested_patch}
            </pre>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-xs text-muted-color">Target: PostgreSQL / ERP Ledger</span>
              <button
                onClick={handleExecutePatch}
                disabled={isPatchExecuted}
                className="btn-emerald"
                style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
              >
                <Play className="w-3.5 h-3.5" />
                Run Patch
              </button>
            </div>
          </div>
        </div>

        {/* Right — Copilot (5 cols) */}
        <div className="lg:col-span-5 surface flex flex-col" style={{ minHeight: '500px', maxHeight: '600px' }}>

          {/* Copilot header */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold text-heading">AI Developer Copilot</p>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded font-mono"
              style={{ background: 'var(--accent-subtle-bg)', color: 'var(--accent-subtle-text)', border: '1px solid var(--accent-subtle-bd)' }}
            >
              RAG ACTIVE
            </span>
          </div>

          {/* Quick prompts */}
          <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setInputQuery(p)}
                className="btn-ghost text-xs"
                style={{ height: '26px', padding: '0 10px' }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat log */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3" style={{ minHeight: 0 }}>
            {chatMessages.filter(msg => msg.message !== '').map((msg, i) => (
              <div
                key={i}
                className={`p-3 text-xs leading-relaxed ${msg.sender === 'USER' ? 'bubble-user ml-8' : 'bubble-ai mr-4'}`}
              >
                <span className="block text-[10px] font-bold uppercase mb-1 opacity-60">
                  {msg.sender === 'USER' ? 'Developer' : 'AI Copilot'}
                </span>
                <div className="whitespace-pre-line">{msg.message}</div>
              </div>
            ))}
            {isCopilotTyping && (
              <div className="bubble-ai mr-4 p-3 flex items-center gap-2 text-xs">
                <Spinner className="w-3.5 h-3.5" />
                Copilot is thinking…
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="px-4 py-3 flex items-center gap-2 shrink-0"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              placeholder="Ask about root cause, SQL patch, postmortem…"
              className="input-field flex-1 px-3"
              style={{ height: '34px', fontSize: '12px' }}
            />
            <button type="submit" className="btn-primary" style={{ height: '34px', padding: '0 12px' }}>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
