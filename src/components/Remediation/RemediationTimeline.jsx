import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, Sparkles, Terminal, FileCode, ShieldAlert, RotateCcw } from 'lucide-react';

export default function RemediationTimeline({ auditLogs = [], ticket }) {
  const formatTime = (ts) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '15:02:00';
    }
  };

  const defaultEvents = [
    { time: '15:02:10', title: 'Incident detected', detail: `Received error payload in ${ticket?.erp_module || 'INVENTORY'} module`, icon: ShieldAlert, color: 'text-amber-400' },
    { time: '15:03:05', title: 'AI diagnosis generated', detail: `Confidence: ${Math.round((ticket?.ai_confidence || 0.65) * 100)}%`, icon: Sparkles, color: 'text-purple-400' },
    { time: '15:03:22', title: 'Root cause identified', detail: ticket?.ai_root_cause || 'Stale cache read before transfer validation', icon: Terminal, color: 'text-accent-subtle-text' },
    { time: '15:04:15', title: 'Remediation proposed', detail: 'Invalidate inventory cache & refresh stock validation', icon: FileCode, color: 'text-blue-400' }
  ];

  const logEvents = (auditLogs || []).map((log) => {
    let icon = CheckCircle2;
    let color = 'text-emerald-400';
    let title = log.action.replace(/_/g, ' ');

    if (log.action.includes('ROLLBACK') || log.action.includes('REVERT')) {
      icon = RotateCcw;
      color = 'text-rose-400';
    } else if (log.action.includes('REJECT') || log.action.includes('FAIL')) {
      icon = AlertTriangle;
      color = 'text-amber-400';
    }

    return {
      time: formatTime(log.timestamp),
      title,
      detail: log.details || `Actor: ${log.actor}`,
      icon,
      color
    };
  });

  const allEvents = [...defaultEvents, ...logEvents];

  const hasRealAuditLogs = logEvents.length > 0;

  return (
    <div className="surface p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent)]" /> Remediation Lifecycle Timeline
        </h3>
        <span className="text-[10px] font-mono text-faint-color">AUDIT TRAIL</span>
      </div>

      {/* Pre-incident synthetic events */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-1 pb-1">
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            SIMULATED DEMO — PRE-INCIDENT CONTEXT
          </span>
          <span className="text-[9px] text-muted-color">These events represent the incident detection & AI analysis phase</span>
        </div>
        <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
          {defaultEvents.map((evt, idx) => {
            const EvtIcon = evt.icon;
            return (
              <div key={`default-${idx}`} className="relative flex items-start gap-3 text-xs font-mono opacity-70">
                <div className={`absolute -left-6 top-0.5 p-1 rounded-full bg-[var(--bg-page)] border border-[var(--border)] ${evt.color}`}>
                  <EvtIcon className="w-3 h-3" />
                </div>
                <div className="flex-1 surface-muted p-3 rounded-lg border border-[var(--border)] border-dashed">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-heading">{evt.title}</span>
                    <span className="text-[10px] text-muted-color">{evt.time}</span>
                  </div>
                  <p className="text-[11px] text-muted-color font-sans leading-relaxed">{evt.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real audit events (from server) */}
      {hasRealAuditLogs && (
        <div className="space-y-1 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 px-1 pb-1 pt-2">
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              LIVE AUDIT TRAIL
            </span>
            <span className="text-[9px] text-muted-color">Real lifecycle events recorded by IncidentAI</span>
          </div>
          <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-500/20">
            {logEvents.map((evt, idx) => {
              const EvtIcon = evt.icon;
              return (
                <div key={`log-${idx}`} className="relative flex items-start gap-3 text-xs font-mono">
                  <div className={`absolute -left-6 top-0.5 p-1 rounded-full bg-[var(--bg-page)] border border-[var(--border)] ${evt.color}`}>
                    <EvtIcon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 surface-muted p-3 rounded-lg border border-[var(--border)]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-heading">{evt.title}</span>
                      <span className="text-[10px] text-muted-color">{evt.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-color font-sans leading-relaxed">{evt.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasRealAuditLogs && (
        <p className="text-[11px] text-muted-color text-center font-mono py-2">
          Live audit events will appear here as you progress through the remediation workflow.
        </p>
      )}
    </div>
  );
}
