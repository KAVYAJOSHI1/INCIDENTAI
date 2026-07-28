import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingDown, Clock, ShieldCheck, DollarSign, Activity } from 'lucide-react';
import { fetchAnalyticsSummary, fetchHeatmap, fetchSeverityDistribution } from '../../services/apiClient';
import { InlineLoading, Skeleton } from '../Common/Loading';

const SEVERITY_COLORS = { P0_CRITICAL: '#E11D48', P1_HIGH: '#D97706', P2_MEDIUM: '#0891B2', P3_LOW: '#64748B' };
const HOURLY_ENGINEERING_RATE = 145;
const TOOLTIP_STYLE = { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#0F172A', borderRadius: 8, fontSize: 12 };

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
      <div className="surface p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="badge-module"><BarChart3 className="w-3 h-3 inline mr-1" /> Executive Analytics &amp; Business ROI</span>
        </div>
        <h2 className="text-xl font-extrabold text-heading">IncidentAI Platform Analytics &amp; Engineering Workload</h2>
        <p className="text-body-color text-sm mt-1">
          Real-time metrics tracking mean time to resolution, module error frequency, and developer capacity.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-color font-semibold uppercase">Total Incidents Handled</span>
            <Activity className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-extrabold text-heading font-mono">{tickets.length}</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> {summary?.resolved_count ?? 0} resolved, {summary?.open_count ?? tickets.length} open
          </p>
        </div>

        <div className="surface p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-color font-semibold uppercase">Average MTTR</span>
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{summary ? `${summary.ai_mttr_hours} Hours` : <Skeleton className="h-7 w-20" />}</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {summary ? `-${summary.reduction_percentage}% reduction (was ${summary.manual_baseline_hours} hrs)` : <InlineLoading label="Loading..." />}
          </p>
        </div>

        <div className="surface p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-color font-semibold uppercase">Engineering Team Capacity</span>
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
            {developers.reduce((sum, d) => sum + d.active_tickets, 0)} / {developers.reduce((sum, d) => sum + d.max_capacity, 0)}
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400">Active tickets across {developers.length} developers</p>
        </div>

        <div className="surface p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-color font-semibold uppercase">Estimated Cost Saved</span>
            <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">${costSaved.toLocaleString()}</div>
          <p className="text-[11px] text-muted-color">
            Based on {summary?.resolved_count ?? 0} resolved incidents at ${HOURLY_ENGINEERING_RATE}/eng-hour
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MTTR Comparison Bar Chart (7 cols) */}
        <div className="lg:col-span-7 surface p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-body-color">
            MTTR Comparison: Manual Triaging vs IncidentAI Engine
          </h3>
          <div className="h-64">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrComparisonData}>
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} unit="h" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} name="MTTR (hrs)">
                    {mttrComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.label === 'IncidentAI' ? '#059669' : '#E11D48'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Severity Distribution Pie Chart (5 cols) */}
        <div className="lg:col-span-5 surface p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-body-color">
            Incident Severity Breakdown (P0 to P3)
          </h3>
          <div className="h-64 flex items-center justify-center">
            {isLoading ? <Skeleton className="h-full w-full rounded-full max-w-[170px] mx-auto" /> : severityPieData.length === 0 ? (
              <p className="text-xs text-muted-color">No incidents recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center justify-around text-xs flex-wrap gap-2">
            {severityPieData.map((s, idx) => (
              <span key={idx} className="flex items-center gap-1 text-body-color font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>

        {/* ERP Module Error Heatmap Bar Chart (12 cols) */}
        <div className="lg:col-span-12 surface p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-body-color">
            ERP Module Error Frequency by Severity
          </h3>
          <div className="h-56">
            {isLoading ? <Skeleton className="h-full w-full" /> : heatmap.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-color">No module error data recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmap}>
                  <XAxis dataKey="erp_module" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="P0_CRITICAL" stackId="severity" fill="#E11D48" name="P0 Critical" />
                  <Bar dataKey="P1_HIGH" stackId="severity" fill="#D97706" name="P1 High" />
                  <Bar dataKey="P2_MEDIUM" stackId="severity" fill="#0891B2" name="P2 Medium" />
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
