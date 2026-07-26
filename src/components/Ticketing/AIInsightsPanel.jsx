import React, { useEffect, useState } from 'react';
import { Network, Lightbulb, TrendingDown, History, Presentation, Film, ShieldAlert, Copy, CheckCircle2 } from 'lucide-react';
import { Skeleton, InlineLoading } from '../Common/Loading';
import {
  fetchRootCauseTree,
  fetchExplainability,
  fetchBusinessImpact,
  fetchTicketTimeline,
  fetchExecutiveSummary,
  fetchIncidentReplay,
  fetchPatchPreview
} from '../../services/apiClient';

const TABS = [
  { id: 'rootcause', label: 'Root Cause Tree', icon: Network },
  { id: 'explainability', label: 'Explainability', icon: Lightbulb },
  { id: 'impact', label: 'Business Impact', icon: TrendingDown },
  { id: 'timeline', label: 'Timeline', icon: History },
  { id: 'executive', label: 'Executive Summary', icon: Presentation },
  { id: 'replay', label: 'Replay', icon: Film },
  { id: 'patch', label: 'Patch Preview', icon: ShieldAlert }
];

const RISK_COLORS = { HIGH: 'text-rose-400 border-rose-500/40 bg-rose-950/30', MEDIUM: 'text-amber-400 border-amber-500/40 bg-amber-950/30', LOW: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30' };
const HEALTH_COLORS = { RED: 'text-rose-400', YELLOW: 'text-amber-400', GREEN: 'text-emerald-400' };

export default function AIInsightsPanel({ ticket }) {
  const [activeTab, setActiveTab] = useState('rootcause');
  const [data, setData] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ticket) return undefined;
    let cancelled = false;
    setData({});

    Promise.allSettled([
      fetchRootCauseTree(ticket.id),
      fetchExplainability(ticket.id),
      fetchBusinessImpact(ticket.id),
      fetchTicketTimeline(ticket.id),
      fetchExecutiveSummary(ticket.id),
      fetchIncidentReplay(ticket.id),
      fetchPatchPreview(ticket.id)
    ]).then(([rootcause, explainability, impact, timeline, executive, replay, patch]) => {
      if (cancelled) return;
      setData({
        rootcause: rootcause.status === 'fulfilled' ? rootcause.value : null,
        explainability: explainability.status === 'fulfilled' ? explainability.value : null,
        impact: impact.status === 'fulfilled' ? impact.value : null,
        timeline: timeline.status === 'fulfilled' ? timeline.value : null,
        executive: executive.status === 'fulfilled' ? executive.value : null,
        replay: replay.status === 'fulfilled' ? replay.value : null,
        patch: patch.status === 'fulfilled' ? patch.value : null
      });
    });

    return () => { cancelled = true; };
  }, [ticket?.id]);

  if (!ticket) return null;

  const handleCopySummary = () => {
    if (!data.executive) return;
    const text = `${data.executive.headline}\n\n${data.executive.business_summary}\n\nFinancial Exposure: ${data.executive.financial_exposure}\nResolution ETA: ${data.executive.resolution_eta}\n\nRecommended Actions:\n${data.executive.recommended_actions.map((a) => `- ${a}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="glass-panel p-5 space-y-4 border-indigo-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-400" /> Enterprise AI Insights
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all shrink-0 ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                <Icon className="w-3 h-3" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[160px]">
        {/* Root Cause Tree */}
        {activeTab === 'rootcause' && (
          data.rootcause ? (
            <div className="space-y-3">
              <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
                {data.rootcause.nodes.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    {idx > 0 && <span className="text-slate-600">→</span>}
                    <span className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-indigo-300">{node.label}</span>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-xs text-slate-300"><strong className="text-slate-400">Suspected Trigger:</strong> {data.rootcause.suspected_trigger}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-500 block text-[10px] font-semibold">CONFIDENCE SCORE</span>
                  <span className="text-emerald-400 font-mono font-bold">{Math.round(data.rootcause.confidence_score * 100)}%</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-500 block text-[10px] font-semibold">HUMAN ERROR LIKELIHOOD</span>
                  <span className="text-amber-400 font-mono font-bold">{Math.round(data.rootcause.human_error_likelihood * 100)}%</span>
                </div>
              </div>
            </div>
          ) : <LoadingState />
        )}

        {/* Explainability */}
        {activeTab === 'explainability' && (
          data.explainability ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 space-y-1.5">
                <span className="text-slate-400 font-bold block">Severity: {data.explainability.severity.value?.replace('_', ' ')}</span>
                {data.explainability.severity.reasons.length > 0 ? (
                  <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                    {data.explainability.severity.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                ) : <p className="text-slate-500">No scoring breakdown recorded for this ticket.</p>}
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 space-y-1.5">
                <span className="text-slate-400 font-bold block">Developer Routing</span>
                {data.explainability.developer_routing ? (
                  <>
                    <p className="text-indigo-300 font-semibold">{data.explainability.developer_routing.developer} — {data.explainability.developer_routing.match_score}% match</p>
                    <p className="text-slate-400">{data.explainability.developer_routing.reasoning}</p>
                  </>
                ) : <p className="text-slate-500">No live routing computed for this ticket.</p>}
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 space-y-1.5">
                <span className="text-slate-400 font-bold block">Duplicate Match: {data.explainability.duplicate_match.similarity_percentage}%</span>
                {data.explainability.duplicate_match.factors.length > 0 ? (
                  <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                    {data.explainability.duplicate_match.factors.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                ) : <p className="text-slate-500">No meaningful duplicate signal.</p>}
              </div>
            </div>
          ) : <LoadingState />
        )}

        {/* Business Impact */}
        {activeTab === 'impact' && (
          data.impact ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Metric label="Revenue Loss / Hour" value={`$${data.impact.revenue_loss_per_hour.toLocaleString()}`} color="text-rose-400" />
              <Metric label="Affected Users" value={data.impact.affected_users.toLocaleString()} color="text-indigo-300" />
              <Metric label="Compliance Risk" value={data.impact.compliance_risk} color={data.impact.compliance_risk === 'HIGH' ? 'text-rose-400' : data.impact.compliance_risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'} />
              <Metric label="SLA Breach Probability" value={`${data.impact.sla_breach_probability}%`} color="text-amber-400" />
              <div className="col-span-2 md:col-span-4 bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-slate-500 block text-[10px] font-semibold mb-1">IMPACTED DEPARTMENTS</span>
                <div className="flex gap-1.5 flex-wrap">
                  {data.impact.impacted_departments.map((d) => <span key={d} className="badge-module text-[10px]">{d}</span>)}
                </div>
              </div>
            </div>
          ) : <LoadingState />
        )}

        {/* Timeline */}
        {activeTab === 'timeline' && (
          data.timeline ? (
            <div className="space-y-2">
              {data.timeline.steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-3 text-xs">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${step.status === 'complete' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  <span className="text-slate-300 font-semibold w-48 shrink-0">{step.label}</span>
                  <span className="text-slate-500 font-mono">{step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : 'pending'}</span>
                  {step.duration_ms != null && <span className="text-slate-600 font-mono">+{step.duration_ms}ms</span>}
                </div>
              ))}
            </div>
          ) : <LoadingState />
        )}

        {/* Executive Summary */}
        {activeTab === 'executive' && (
          data.executive ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-bold text-white">{data.executive.headline}</h4>
                <button onClick={handleCopySummary} className="shrink-0 text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-slate-300 leading-relaxed">{data.executive.business_summary}</p>
              <p className="text-slate-400"><strong className="text-slate-300">Financial Exposure:</strong> {data.executive.financial_exposure}</p>
              <p className="text-slate-400"><strong className="text-slate-300">Resolution ETA:</strong> {data.executive.resolution_eta}</p>
              <div>
                <span className="text-slate-300 font-bold block mb-1">Recommended Actions:</span>
                <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                  {data.executive.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          ) : <LoadingState />
        )}

        {/* Replay */}
        {activeTab === 'replay' && (
          data.replay ? (
            <ol className="space-y-2">
              {data.replay.steps.map((step, idx) => (
                <li key={step.id} className="flex items-start gap-3 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[10px]">{idx + 1}</span>
                  <div>
                    <span className="text-slate-300 font-semibold">{step.label}</span>
                    <p className="text-slate-400 font-mono mt-0.5 break-words">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : <LoadingState />
        )}

        {/* Patch Preview */}
        {activeTab === 'patch' && (
          data.patch ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg font-bold border ${RISK_COLORS[data.patch.risk_level]}`}>{data.patch.risk_level} RISK ({data.patch.risk_score})</span>
                <span className="badge-module">Est. Success: {data.patch.estimated_success_percentage}%</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block mb-1">Affected Tables:</span>
                <div className="flex gap-1.5 flex-wrap font-mono">
                  {data.patch.affected_tables.map((t) => <span key={t} className="px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-cyan-300">{t}</span>)}
                </div>
              </div>
              <p className="text-slate-400"><strong className="text-slate-300">Rollback Plan:</strong> {data.patch.rollback_plan}</p>
              {data.patch.side_effect_warnings.length > 0 && (
                <ul className="list-disc list-inside text-amber-400 space-y-0.5">
                  {data.patch.side_effect_warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
              <div>
                <span className="text-slate-300 font-bold block mb-1">Execution Steps:</span>
                <ol className="list-decimal list-inside text-slate-400 space-y-0.5">
                  {data.patch.execution_steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            </div>
          ) : <LoadingState />
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
      <span className="text-slate-500 block text-[10px] font-semibold">{label.toUpperCase()}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <InlineLoading label="Loading AI insight..." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
