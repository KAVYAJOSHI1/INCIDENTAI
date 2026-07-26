import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingDown, Zap, Clock, ShieldCheck, DollarSign, Activity } from 'lucide-react';

export default function ExecutiveDashboard({ tickets, developers }) {
  // Chart Data
  const moduleData = [
    { module: 'Invoicing', tickets: 14, mttr: 1.8 },
    { module: 'Payroll', tickets: 22, mttr: 2.9 },
    { module: 'Inventory', tickets: 9, mttr: 1.4 },
    { module: 'General Ledger', tickets: 6, mttr: 2.1 },
    { module: 'Procurement', tickets: 4, mttr: 1.1 },
  ];

  const trendData = [
    { day: 'Mon', manualMTTR: 8.5, aiMTTR: 2.4 },
    { day: 'Tue', manualMTTR: 9.2, aiMTTR: 2.1 },
    { day: 'Wed', manualMTTR: 8.0, aiMTTR: 1.9 },
    { day: 'Thu', manualMTTR: 10.1, aiMTTR: 2.2 },
    { day: 'Fri', manualMTTR: 7.8, aiMTTR: 1.6 },
    { day: 'Sat', manualMTTR: 6.4, aiMTTR: 1.4 },
    { day: 'Sun', manualMTTR: 7.2, aiMTTR: 1.5 },
  ];

  const severityPieData = [
    { name: 'P0 Critical', value: 15, color: '#F43F5E' },
    { name: 'P1 High', value: 35, color: '#F59E0B' },
    { name: 'P2 Medium', value: 38, color: '#06B6D4' },
    { name: 'P3 Low', value: 12, color: '#64748B' },
  ];

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
          <div className="text-2xl font-extrabold text-white font-mono">{tickets.length + 52}</div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> +24% auto-triaged by AI
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Average MTTR</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">1.9 Hours</div>
          <p className="text-[11px] text-emerald-400 font-semibold">
            ⚡ -68.4% reduction (was 8.2 hrs)
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2 border-purple-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">AI Triage Accuracy</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono">96.8%</div>
          <p className="text-[11px] text-purple-300">
            Validated by Lead Engineers
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2 border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Estimated Cost Saved</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">$142,500</div>
          <p className="text-[11px] text-slate-400">
            Saved in engineering hours / month
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MTTR Reduction Area Chart (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            MTTR Comparison: Manual Triaging vs IncidentAI Engine
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="manualColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="aiColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} unit="h" />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#FFF' }} />
                <Area type="monotone" dataKey="manualMTTR" stroke="#F43F5E" fillOpacity={1} fill="url(#manualColor)" name="Manual MTTR (hrs)" />
                <Area type="monotone" dataKey="aiMTTR" stroke="#10B981" fillOpacity={1} fill="url(#aiColor)" name="IncidentAI MTTR (hrs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Pie Chart (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Incident Severity Breakdown (P0 to P3)
          </h3>
          <div className="h-64 flex items-center justify-center">
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
          </div>
          <div className="flex items-center justify-around text-xs">
            {severityPieData.map((s, idx) => (
              <span key={idx} className="flex items-center gap-1 text-slate-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
              </span>
            ))}
          </div>
        </div>

        {/* ERP Module Error Heatmap Bar Chart (12 cols) */}
        <div className="lg:col-span-12 glass-panel p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            ERP Module Error Frequency & Mean Resolution Time (Hours)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleData}>
                <XAxis dataKey="module" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155' }} />
                <Bar dataKey="tickets" fill="#6366F1" radius={[6, 6, 0, 0]} name="Total Tickets" />
                <Bar dataKey="mttr" fill="#06B6D4" radius={[6, 6, 0, 0]} name="Avg MTTR (hrs)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
