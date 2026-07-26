import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingDown, Clock, ShieldCheck, DollarSign, Activity } from 'lucide-react';
import { fetchAnalyticsSummary, fetchHeatmap, fetchSeverityDistribution } from '../../services/apiClient';
import { InlineLoading, Skeleton } from '../Common/Loading';

const SEVERITY_COLORS = { P0_CRITICAL: '#F43F5E', P1_HIGH: '#F59E0B', P2_MEDIUM: '#06B6D4', P3_LOW: '#64748B' };
const HOURLY_ENGINEERING_RATE = 145;

export default function ExecutiveDashboard({ tickets, developers }) {
  const [summary, setSummary] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [severityDistribution, setSeverityDistribution] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAnalyticsSummary(), fetchHeatmap(), fetchSeverityDistribution()])
      .then(([summaryData, heatmapData, severityData]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setHeatmap(heatmapData);
        setSeverityDistribution(severityData);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tickets.length]);

  const severityPieData = severityDistribution
    .filter((s) => s.count > 0)
    .map((s) => ({ name: s.severity.replace('_', ' '), value: s.count, color: SEVERITY_COLORS[s.severity] || '#64748B' }));

  const mttrComparisonData = summary
    ? [
        { label: 'Manual Process', hours: summary.manual_baseline_hours },
        { label: 'IncidentAI', hours: summary.ai_mttr_hours }
      ]
    : [];

  const hoursSaved = summary ? Math.max(0, summary.manual_baseline_hours - summary.ai_mttr_hours) * summary.resolved_count : 0;
  const costSaved = Math.round(hoursSaved * HOURLY_ENGINEERING_RATE);
  const isLoading = !summary;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Banner */}
      <div className="glass-panel p-6 border-indigo-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> Module 7: Executive Analytics & Business ROI
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-white">IncidentAI Platform Analytics & Engineering Workload</h2>
        <p className="text-slate-400 text-sm mt-1">
          Real-time metrics tracking mean time to resolution, module error frequency, and developer capacity.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 space-y-2 border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Incidents Handled</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{tickets.length}</div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> {summary?.resolved_count ?? 0} resolved, {summary?.open_count ?? tickets.length} open
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Average MTTR</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{summary ? `${summary.ai_mttr_hours} Hours` : <Skeleton className="h-7 w-20" />}</div>
          <p className="text-[11px] text-emerald-400 font-semibold">
            {summary ? `⚡ -${summary.reduction_percentage}% reduction (was ${summary.manual_baseline_hours} hrs)` : <InlineLoading label="Loading..." className="text-emerald-400/60" />}
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2 border-purple-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Engineering Team Capacity</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono">
            {developers.reduce((sum, d) => sum + d.active_tickets, 0)} / {developers.reduce((sum, d) => sum + d.max_capacity, 0)}
          </div>
          <p className="text-[11px] text-purple-300">Active tickets across {developers.length} developers</p>
        </div>

        <div className="glass-panel p-5 space-y-2 border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Estimated Cost Saved</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">${costSaved.toLocaleString()}</div>
          <p className="text-[11px] text-slate-400">
            Based on {summary?.resolved_count ?? 0} resolved incidents at ${HOURLY_ENGINEERING_RATE}/eng-hour
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MTTR Comparison Bar Chart (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            MTTR Comparison: Manual Triaging vs IncidentAI Engine
          </h3>
          <div className="h-64">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrComparisonData}>
                  <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} unit="h" />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#FFF' }} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} name="MTTR (hrs)">
                    {mttrComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.label === 'IncidentAI' ? '#10B981' : '#F43F5E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Severity Distribution Pie Chart (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Incident Severity Breakdown (P0 to P3)
          </h3>
          <div className="h-64 flex items-center justify-center">
            {isLoading ? <Skeleton className="h-full w-full rounded-full max-w-[170px] mx-auto" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center justify-around text-xs flex-wrap gap-2">
            {severityPieData.map((s, idx) => (
              <span key={idx} className="flex items-center gap-1 text-slate-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>

        {/* ERP Module Error Heatmap Bar Chart (12 cols) */}
        <div className="lg:col-span-12 glass-panel p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            ERP Module Error Frequency by Severity
          </h3>
          <div className="h-56">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmap}>
                  <XAxis dataKey="erp_module" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155' }} />
                  <Bar dataKey="P0_CRITICAL" stackId="severity" fill="#F43F5E" name="P0 Critical" />
                  <Bar dataKey="P1_HIGH" stackId="severity" fill="#F59E0B" name="P1 High" />
                  <Bar dataKey="P2_MEDIUM" stackId="severity" fill="#06B6D4" name="P2 Medium" />
                  <Bar dataKey="P3_LOW" stackId="severity" fill="#64748B" radius={[6, 6, 0, 0]} name="P3 Low" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
