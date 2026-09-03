import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Activity, Clock, ShieldCheck, DollarSign, TrendingDown, BarChart3 } from 'lucide-react';
import { fetchAnalyticsSummary, fetchHeatmap, fetchSeverityDistribution } from '../../services/apiClient';
import { Skeleton } from '../Common/Loading';
import PageHeader from '../Common/PageHeader';

const SEVERITY_COLORS = {
  P0_CRITICAL: '#DC2626',
  P1_HIGH:     '#D97706',
  P2_MEDIUM:   '#0891B2',
  P3_LOW:      '#64748B',
};

const HOURLY_ENG_RATE = 145;

// Theme-aware chart tooltip style — reads CSS vars at runtime
function useTooltipStyle() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    backgroundColor: isDark ? '#161B22' : '#FFFFFF',
    border:          `1px solid ${isDark ? '#21262D' : '#E2E8F0'}`,
    borderRadius:    '8px',
    color:           isDark ? '#F0F6FC' : '#0F172A',
    fontSize:        12,
    boxShadow:       '0 4px 12px rgba(0,0,0,0.1)',
  };
}

function KpiCard({ icon: Icon, label, value, sub, iconColor }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        <Icon className="w-4 h-4 shrink-0" style={{ color: iconColor || 'var(--accent)' }} />
      </div>
      {/* div, not p — `value` can be a <Skeleton> block element while loading */}
      <div className="kpi-value">{value}</div>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, height = 240, children }) {
  return (
    <div className="surface p-5">
      <p className="chart-title">{title}</p>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

export default function ExecutiveDashboard({ tickets, developers }) {
  const [summary, setSummary]                   = useState(null);
  const [heatmap, setHeatmap]                   = useState([]);
  const [severityDistribution, setSeverity]     = useState([]);
  const tooltipStyle                            = useTooltipStyle();

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAnalyticsSummary(), fetchHeatmap(), fetchSeverityDistribution()])
      .then(([s, h, sv]) => {
        if (cancelled) return;
        setSummary(s); setHeatmap(h); setSeverity(sv);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tickets]);

  const pieData = severityDistribution
    .filter(s => s.count > 0)
    .map(s => ({ name: s.severity.replace('_', ' '), value: s.count, color: SEVERITY_COLORS[s.severity] || '#64748B' }));

  const mttrData = summary
    ? [
        { label: 'Manual', hours: summary.manual_baseline_hours },
        { label: 'IncidentAI', hours: summary.ai_mttr_hours },
      ]
    : [];

  const hoursSaved = summary ? Math.max(0, summary.manual_baseline_hours - summary.ai_mttr_hours) * summary.resolved_count : 0;
  const costSaved  = Math.round(hoursSaved * HOURLY_ENG_RATE);
  const totalActive = developers.reduce((s, d) => s + d.active_tickets, 0);
  const totalCap    = developers.reduce((s, d) => s + d.max_capacity, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Executive Analytics"
        title="Platform Performance & ROI"
        description="Real-time MTTR metrics, module error frequency, and engineering team capacity."
      />

      {/* 4 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Activity}
          label="Total Incidents"
          value={tickets.length}
          sub={`${summary?.resolved_count ?? 0} resolved · ${summary?.open_count ?? tickets.length} open`}
          iconColor="var(--accent)"
        />
        <KpiCard
          icon={Clock}
          label="Avg MTTR"
          value={summary ? `${summary.ai_mttr_hours}h` : <Skeleton className="h-6 w-20" />}
          sub={summary ? `−${summary.reduction_percentage}% vs manual (${summary.manual_baseline_hours}h)` : ''}
          iconColor="var(--green)"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Team Capacity"
          value={`${totalActive} / ${totalCap}`}
          sub={`Across ${developers.length} engineers`}
          iconColor="var(--purple)"
        />
        <KpiCard
          icon={DollarSign}
          label="Estimated Savings"
          value={`$${costSaved.toLocaleString()}`}
          sub={`Based on ${summary?.resolved_count ?? 0} resolved @ $${HOURLY_ENG_RATE}/hr`}
          iconColor="var(--amber)"
        />
      </div>

      {/* Attention Required Banner */}
      {tickets.filter(t => t.status === 'VERIFICATION_FAILED' || t.status === 'PROPOSED' || (t.sla_remaining_minutes != null && t.sla_remaining_minutes < 30 && t.status !== 'RESOLVED')).length > 0 && (
        <div className="surface p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-2">
              <Activity className="w-4 h-4" /> ATTENTION REQUIRED — OPERATIONAL ALERTS
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500 text-white">
              URGENT ACTION NEEDED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            {tickets.filter(t => t.status === 'VERIFICATION_FAILED').map(t => (
              <div key={t.id} className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1">
                <span className="text-rose-500 font-extrabold block">VERIFICATION FAILED</span>
                <span className="font-bold text-heading block">{t.ticket_number || t.id}</span>
                <span className="text-[10px] text-muted-color">Rollback required</span>
              </div>
            ))}

            {tickets.filter(t => t.status === 'PROPOSED' || t.status === 'IN_PROGRESS').slice(0, 2).map(t => (
              <div key={t.id} className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                <span className="text-amber-500 font-extrabold block">AWAITING APPROVAL</span>
                <span className="font-bold text-heading block">{t.ticket_number || t.id}</span>
                <span className="text-[10px] text-muted-color">Dev: {t.assigned_dev_name || 'Marcus Vance'}</span>
              </div>
            ))}

            {tickets.filter(t => t.sla_remaining_minutes != null && t.sla_remaining_minutes < 30 && t.status !== 'RESOLVED').map(t => (
              <div key={t.id} className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1">
                <span className="text-rose-500 font-extrabold block">SLA BREACH RISK</span>
                <span className="font-bold text-heading block">{t.ticket_number || t.id}</span>
                <span className="text-[10px] text-muted-color">{t.sla_remaining_minutes} min remaining</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-col charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <ChartCard title="MTTR Comparison — Manual vs IncidentAI" height={240}>
            {!summary ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrData} barCategoryGap="40%">
                  <XAxis dataKey="label" stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} unit="h" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--bg-muted)', radius: 4 }} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} name="MTTR (hrs)">
                    {mttrData.map((entry, i) => (
                      <Cell key={i} fill={entry.label === 'IncidentAI' ? '#059669' : '#DC2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="lg:col-span-5">
          <ChartCard title="Severity Distribution" height={240}>
            {!summary ? <Skeleton className="h-full w-full" /> : pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-color">No data yet.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 flex-wrap mt-1">
                  {pieData.map((s, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs text-body-color">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      {s.name} ({s.value})
                    </span>
                  ))}
                </div>
              </>
            )}
          </ChartCard>
        </div>

        {/* Full-width heatmap */}
        <div className="lg:col-span-12">
          <ChartCard title="ERP Module Error Frequency by Severity" height={220}>
            {!summary ? <Skeleton className="h-full w-full" /> : heatmap.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-color">No module data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmap}>
                  <XAxis dataKey="erp_module" stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--bg-muted)' }} />
                  <Bar dataKey="P0_CRITICAL" stackId="s" fill="#DC2626" name="P0 Critical" />
                  <Bar dataKey="P1_HIGH"     stackId="s" fill="#D97706" name="P1 High" />
                  <Bar dataKey="P2_MEDIUM"   stackId="s" fill="#0891B2" name="P2 Medium" />
                  <Bar dataKey="P3_LOW"      stackId="s" fill="#64748B" radius={[4,4,0,0]} name="P3 Low" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
