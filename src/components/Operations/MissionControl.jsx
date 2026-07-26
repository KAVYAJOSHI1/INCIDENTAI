import React, { useEffect, useState } from 'react';
import { Gauge, Users, Zap, BookOpen, DollarSign, Clock, Activity } from 'lucide-react';
import { fetchMissionControl } from '../../services/apiClient';

export default function MissionControl() {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchMissionControl().then((data) => { if (!cancelled) setSnapshot(data); }).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="glass-panel p-6 border-purple-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-purple-400" /> Enterprise Feature 10: Mission Control
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-white">Mission Control Command Center</h2>
        <p className="text-slate-400 text-sm mt-1">Unified auto-refreshing view of platform health — updates every 5 seconds.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile icon={Activity} label="Live Incidents" value={snapshot?.live_incidents ?? '—'} color="text-rose-400 border-rose-500/30" />
        <Tile
          icon={Users}
          label="Developer Capacity"
          value={snapshot ? `${snapshot.developer_capacity.active}/${snapshot.developer_capacity.total}` : '—'}
          sub={snapshot ? `${snapshot.developer_capacity.utilization_percentage}% utilized` : ''}
          color="text-indigo-400 border-indigo-500/30"
        />
        <Tile icon={Zap} label="AI Queue Latency" value={snapshot ? `${snapshot.ai_queue_latency_ms}ms` : '—'} color="text-cyan-400 border-cyan-500/30" />
        <Tile icon={BookOpen} label="Knowledge Base Hits" value={snapshot?.knowledge_base_hits ?? '—'} color="text-emerald-400 border-emerald-500/30" />
        <Tile icon={DollarSign} label="Daily Cost Savings" value={snapshot ? `$${snapshot.daily_cost_savings.toLocaleString()}` : '—'} color="text-amber-400 border-amber-500/30" />
        <Tile icon={Clock} label="Team MTTR" value={snapshot ? `${snapshot.team_mttr_hours}h` : '—'} color="text-purple-400 border-purple-500/30" />
      </div>

      <div className="glass-panel p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Module Health Snapshot</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(snapshot?.module_health || []).map((m) => (
            <div key={m.erp_module} className="bg-slate-900/60 p-3 rounded-lg border border-white/5 text-xs">
              <span className="text-slate-400 font-semibold block">{m.erp_module}</span>
              <span className="text-white font-mono font-bold text-lg">{m.total}</span>
              {m.critical > 0 && <span className="text-rose-400 font-semibold block mt-0.5">{m.critical} P0 critical</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={`glass-panel p-5 space-y-2 border ${color.split(' ')[1]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-semibold uppercase">{label}</span>
        <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
      </div>
      <div className={`text-2xl font-extrabold font-mono ${color.split(' ')[0]}`}>{value}</div>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
