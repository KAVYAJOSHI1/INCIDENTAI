import React, { useEffect, useState } from 'react';
import { Radio, AlertTriangle, Activity } from 'lucide-react';
import { fetchWarRoom } from '../../services/apiClient';
import { Skeleton, InlineLoading } from '../Common/Loading';

const HEALTH_STYLES = {
  RED: 'border-rose-500/60 bg-rose-950/30 text-rose-400',
  YELLOW: 'border-amber-500/60 bg-amber-950/30 text-amber-400',
  GREEN: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
};

const SEVERITY_BADGE = { P0_CRITICAL: 'badge-p0', P1_HIGH: 'badge-p1', P2_MEDIUM: 'badge-p2', P3_LOW: 'badge-p3' };

export default function WarRoom() {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchWarRoom().then((data) => { if (!cancelled) setSnapshot(data); }).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="glass-panel p-6 border-rose-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Enterprise Feature 6: War Room
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-white">Enterprise War Room Operations Center</h2>
        <p className="text-slate-400 text-sm mt-1">Live system pulse across every ERP module — auto-refreshes every 5 seconds.</p>
      </div>

      {/* Module Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {!snapshot
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : snapshot.module_status.map((m) => (
              <div key={m.module} className={`glass-panel p-4 border ${HEALTH_STYLES[m.health]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{m.module}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${m.health === 'RED' ? 'bg-rose-500 animate-pulse' : m.health === 'YELLOW' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </div>
                <p className="text-[11px] text-slate-400">Open Incidents</p>
                <p className={`text-xl font-mono font-extrabold ${HEALTH_STYLES[m.health].split(' ')[2]}`}>{m.open_incidents}</p>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Critical Ticker */}
        <div className="lg:col-span-5 glass-panel p-5 space-y-3 border-rose-500/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Critical P0 Ticker ({snapshot?.critical_ticker.length ?? 0})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {!snapshot && <InlineLoading label="Loading critical ticker..." />}
            {snapshot && snapshot.critical_ticker.length === 0 && <p className="text-xs text-slate-500">No active P0 incidents.</p>}
            {(snapshot?.critical_ticker || []).map((t) => (
              <div key={t.ticket_number} className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-xs">
                <span className="font-mono font-bold text-rose-300">{t.ticket_number}</span>
                <p className="text-white font-semibold mt-0.5 line-clamp-2">{t.title}</p>
                <p className="text-slate-400 mt-1">Dev: {t.assigned_dev_name || 'Unassigned'} · {t.erp_module}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="lg:col-span-7 glass-panel p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-400" /> Live Activity Feed
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {!snapshot && <InlineLoading label="Loading live feed..." />}
            {snapshot && snapshot.activity_feed.length === 0 && <p className="text-xs text-slate-500">No incidents recorded yet.</p>}
            {(snapshot?.activity_feed || []).map((t) => (
              <div key={t.ticket_number} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-indigo-400 shrink-0">{t.ticket_number}</span>
                  <span className="text-slate-300 truncate">{t.title}</span>
                </div>
                <span className={`${SEVERITY_BADGE[t.severity] || 'badge-p2'} shrink-0 ml-2`}>{t.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
