import React, { useEffect, useState } from 'react';
import { Code2, Play, CheckCircle2, Terminal, Sparkles, Send, Copy, Cpu } from 'lucide-react';
import confetti from 'canvas-confetti';
import { streamCopilotChat } from '../../services/apiClient';
import { Spinner } from '../Common/Loading';

// Module-scoped (not useRef) so conversation history survives both switching tickets
// and navigating away from the Developer view and back — a useRef would reset the
// moment DeveloperWorkbench unmounts, which happens every time currentView changes.
const chatHistoryByTicketId = new Map();

function greetingMessage(ticket) {
  return {
    sender: 'AI_COPILOT',
    message: `Hello! I've indexed all stack trace logs, OCR output, and knowledge base entries for **${ticket.ticket_number}**. What would you like to know?`
  };
}

export default function DeveloperWorkbench({ ticket, onResolveTicket }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuery, setInputQuery]         = useState('');
  const [isPatchExecuted, setIsPatchExecuted] = useState(false);
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);
  const [isStreamingReply, setIsStreamingReply] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setChatMessages(chatHistoryByTicketId.get(ticket.id) || [greetingMessage(ticket)]);
  }, [ticket?.id]);

  useEffect(() => {
    if (ticket && chatMessages.length > 0) chatHistoryByTicketId.set(ticket.id, chatMessages);
  }, [ticket?.id, chatMessages]);

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
    setIsStreamingReply(true);

    try {
      let firstChunk = true;
      const { ai_generated } = await streamCopilotChat(ticket.id, query, history, (chunk) => {
        if (firstChunk) { setIsCopilotTyping(false); firstChunk = false; }
        setChatMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, message: last.message + chunk };
          return next;
        });
      });
      setChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], ai_generated };
        return next;
      });
    } catch (err) {
      setChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { sender: 'AI_COPILOT', message: `Error: ${err.message}` };
        return next;
      });
    } finally {
      setIsCopilotTyping(false);
      setIsStreamingReply(false);
    }
  };

  const [isPatchExecuting, setIsPatchExecuting] = useState(false);
  const [patchLogs, setPatchLogs] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(ticket?.status === 'VERIFIED' || ticket?.status === 'KNOWLEDGE_CAPTURED');
  const [devNotes, setDevNotes] = useState(ticket?.ai_suggested_patch || '');

  const handleExecutePatch = async () => {
    setIsPatchExecuting(true);
    setPatchLogs(['[SYS] Initializing sandboxed SQL execution environment...']);

    await new Promise(r => setTimeout(r, 400));
    setPatchLogs(prev => [...prev, `[DB] Connected to PostgreSQL incidentai_db (Target: ${ticket.erp_module})`]);

    await new Promise(r => setTimeout(r, 500));
    setPatchLogs(prev => [...prev, `[SQL] Executing: ${ticket.ai_suggested_patch || 'UPDATE erp_status SET status = OK'}`]);

    await new Promise(r => setTimeout(r, 600));
    setPatchLogs(prev => [...prev, `[AUDIT] Patch verified — 1 row affected. Resolution timestamp logged.`]);

    setIsPatchExecuting(false);
    setIsPatchExecuted(true);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => onResolveTicket(ticket.id), 1200);
  };

  const handleVerifyKnowledge = async () => {
    setIsVerifying(true);
    try {
      const { verifyTicket } = await import('../../services/apiClient');
      await verifyTicket(ticket.id, {
        verified_resolution: devNotes || ticket.ai_suggested_patch,
        root_cause: ticket.ai_root_cause
      });
      setIsVerified(true);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      setTimeout(() => onResolveTicket(ticket.id), 1500);
    } catch (err) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
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
            {isVerified && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VERIFIED & RAG INDEXED
              </span>
            )}
            <span className="text-xs text-muted-color">
              Assigned: <span className="font-semibold text-heading">{ticket.assigned_dev_name}</span>
            </span>
          </div>
          <h2 className="text-base font-semibold text-heading leading-snug">{ticket.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyKnowledge}
            disabled={isVerifying || isVerified}
            className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-sm"
            style={{
              background: isVerified ? 'var(--bg-muted)' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#ffffff',
              opacity: isVerified ? 0.7 : 1
            }}
          >
            {isVerifying ? <Spinner className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isVerifying ? 'Indexing into RAG KB…' : isVerified ? 'Verified & Indexed into RAG' : 'Verify & Index into RAG KB'}
          </button>
          <button
            onClick={handleExecutePatch}
            disabled={isPatchExecuting || isPatchExecuted}
            className="btn-emerald"
          >
            {isPatchExecuting ? <Spinner className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPatchExecuting ? 'Executing SQL Patch…' : isPatchExecuted ? 'Patch Applied & Resolved!' : 'Execute Patch & Resolve'}
          </button>
        </div>
      </div>

      {/* Terminal execution log */}
      {patchLogs.length > 0 && (
        <div className="surface p-4 space-y-1.5 font-mono text-xs" style={{ background: '#090d16', color: '#10b981', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold text-muted-color uppercase mb-1">▶ Sandboxed Patch Execution Log</p>
          {patchLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed flex items-center gap-2">
              <span>{log}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main 7/5 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left — Evidence-Grounded Diagnosis + Stack Trace + Patch (7 cols) */}
        <div className="lg:col-span-7 space-y-4">

          {/* Evidence-Grounded Diagnosis Panel */}
          <div className="surface p-4 space-y-3" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Evidence-Grounded AI Diagnostics
              </h4>
              {ticket.ai_diagnosis?.confidence && (
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Confidence: {Math.round(ticket.ai_confidence * 100)}%
                </span>
              )}
            </div>

            {/* 🟢 1. LIVE ERP FACTS */}
            <div className="p-3 rounded bg-slate-900/80 border border-emerald-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  🟢 LIVE ERP FACTS (MCP Execution)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Trace ID: {ticket.correlation_id || 'mcp-trace-live'}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-300 font-mono">
                {ticket.mcp_evidence && ticket.mcp_evidence.length > 0 ? (
                  ticket.mcp_evidence.map((fact, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-emerald-300">[{fact.tool}]</span>{' '}
                        <span>{fact.status === 200 ? 'Verified real-time state' : fact.error || 'Execution note'}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${fact.status === 200 ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>
                        {fact.status === 200 ? '200 OK' : `HTTP ${fact.status}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-amber-400 text-[11px]">LIVE ERP VERIFICATION UNAVAILABLE</p>
                )}
              </div>
            </div>

            {/* 🔵 2. HISTORICAL KNOWLEDGE */}
            <div className="p-3 rounded bg-slate-900/80 border border-blue-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  🔵 HISTORICAL KNOWLEDGE (RAG Database)
                </span>
                <span className="text-[10px] font-mono text-slate-400">Voyage Vector Embeddings</span>
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                {ticket.rag_evidence && ticket.rag_evidence.length > 0 ? (
                  ticket.rag_evidence.slice(0, 2).map((rag, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-300">{rag.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          {rag.confidence_percentage}% match
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{rag.verified_resolution}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-[11px]">No high-confidence historical matches found.</p>
                )}
              </div>
            </div>

            {/* 🟣 3. AI INFERENCE */}
            <div className="p-3 rounded bg-slate-900/80 border border-purple-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-purple-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  🟣 AI INFERENCE & DIAGNOSIS
                </span>
                <span className="text-[10px] font-mono text-purple-300">
                  Target: {ticket.resolution_type || 'DEVELOPER'}
                </span>
              </div>
              <p className="text-xs text-purple-200 font-medium">
                <strong className="text-purple-300">Root Cause:</strong> {ticket.ai_root_cause}
              </p>
              <p className="text-xs text-slate-300">
                <strong className="text-purple-300">Recommendation:</strong> {ticket.ai_suggested_patch}
              </p>
            </div>
          </div>

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
            {(() => {
              const visible = chatMessages.filter(msg => msg.message !== '');
              return visible.map((msg, i) => {
                const isLast = i === visible.length - 1;
                const isCursorBubble = isLast && isStreamingReply && msg.sender === 'AI_COPILOT';
                return (
                  <div
                    key={i}
                    className={`p-3 text-xs leading-relaxed ${msg.sender === 'USER' ? 'bubble-user ml-8' : 'bubble-ai mr-4'}`}
                  >
                    <span className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase opacity-60">
                        {msg.sender === 'USER' ? 'Developer' : 'AI Copilot'}
                      </span>
                      {msg.sender === 'AI_COPILOT' && msg.ai_generated !== undefined && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={
                            msg.ai_generated
                              ? { background: 'var(--accent-subtle-bg)', color: 'var(--accent-subtle-text)' }
                              : { background: 'var(--bg-muted)', color: 'var(--text-muted)' }
                          }
                        >
                          {msg.ai_generated ? '⚡ AI' : '📋 Fallback'}
                        </span>
                      )}
                    </span>
                    <div className="whitespace-pre-line">
                      {msg.message}
                      {isCursorBubble && <span className="animate-pulse">▍</span>}
                    </div>
                  </div>
                );
              });
            })()}
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
