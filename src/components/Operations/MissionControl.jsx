import React, { useEffect, useState } from 'react';
import { Gauge, Users, Zap, BookOpen, DollarSign, Clock, Activity } from 'lucide-react';
import { fetchMissionControl } from '../../services/apiClient';
import { Skeleton, InlineLoading } from '../Common/Loading';

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
      <div className="surface p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="badge-module"><Gauge className="w-3 h-3 inline mr-1" /> Mission Control</span>
        </div>
        <h2 className="text-xl font-extrabold text-heading">Mission Control Command Center</h2>
        <p className="text-body-color text-sm mt-1">Unified auto-refreshing view of platform health — updates every 5 seconds.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile icon={Activity} label="Live Incidents" value={snapshot?.live_incidents ?? '—'} color="text-rose-600 dark:text-rose-400" />
        <Tile
          icon={Users}
          label="Developer Capacity"
          value={snapshot ? `${snapshot.developer_capacity.active}/${snapshot.developer_capacity.total}` : '—'}
          sub={snapshot ? `${snapshot.developer_capacity.utilization_percentage}% utilized` : ''}
          color="text-accent-color"
        />
        <Tile icon={Zap} label="AI Queue Latency" value={snapshot ? `${snapshot.ai_queue_latency_ms}ms` : '—'} color="text-cyan-600 dark:text-cyan-400" />
        <Tile icon={BookOpen} label="Knowledge Base Hits" value={snapshot?.knowledge_base_hits ?? '—'} color="text-emerald-600 dark:text-emerald-400" />
        <Tile icon={DollarSign} label="Daily Cost Savings" value={snapshot ? `$${snapshot.daily_cost_savings.toLocaleString()}` : '—'} color="text-amber-600 dark:text-amber-400" />
        <Tile icon={Clock} label="Team MTTR" value={snapshot ? `${snapshot.team_mttr_hours}h` : '—'} color="text-purple-600 dark:text-purple-400" />
      </div>

      <div className="surface p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-body-color">Module Health Snapshot</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {!snapshot && (
            <>
              <InlineLoading label="Loading module health..." className="col-span-full" />
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </>
          )}
          {snapshot && snapshot.module_health.length === 0 && (
            <p className="text-xs text-muted-color col-span-full">No incidents recorded yet — module health will populate once tickets come in.</p>
          )}
          {(snapshot?.module_health || []).map((m) => (
            <div key={m.erp_module} className="surface-muted p-3 text-xs">
              <span className="text-muted-color font-semibold block">{m.erp_module}</span>
              <span className="text-heading font-mono font-bold text-lg">{m.total}</span>
              {m.critical > 0 && <span className="text-rose-600 dark:text-rose-400 font-semibold block mt-0.5">{m.critical} P0 critical</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub, color }) {
  const isLoading = value === '—';
  return (
    <div className="surface p-5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-color font-semibold uppercase">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className={`text-2xl font-extrabold font-mono ${color}`}>
        {isLoading ? <Skeleton className="h-7 w-16" /> : value}
      </div>
      {sub && <p className="text-[11px] text-muted-color">{sub}</p>}
    </div>
  );
}
