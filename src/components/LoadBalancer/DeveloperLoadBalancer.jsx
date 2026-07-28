import React, { useEffect, useState } from 'react';
import { UserCheck, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Activity, Award } from 'lucide-react';
import { routeDeveloper } from '../../services/apiClient';
import { InlineLoading } from '../Common/Loading';

export default function DeveloperLoadBalancer({ currentTicket, developers, onAssignDeveloper, onRebalanceLoad }) {
  const [liveRouting, setLiveRouting] = useState(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (currentTicket && !currentTicket.developer_routing) {
      setIsRoutingLoading(true);
      routeDeveloper(currentTicket.erp_module)
        .then((routing) => { if (!cancelled) setLiveRouting(routing); })
        .catch(() => { if (!cancelled) setLiveRouting(null); })
        .finally(() => { if (!cancelled) setIsRoutingLoading(false); });
    } else {
      setLiveRouting(null);
      setIsRoutingLoading(false);
    }
    return () => { cancelled = true; };
  }, [currentTicket?.id, currentTicket?.erp_module]);

  const routing = currentTicket?.developer_routing || liveRouting;
  const recommendedDev = routing ? routing.recommended : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-module"><Sparkles className="w-3 h-3 inline mr-1" /> Developer Recommendation AI</span>
            </div>
            <h2 className="text-xl font-extrabold text-heading">Dynamic Developer Load Balancing &amp; Routing</h2>
            <p className="text-body-color text-sm mt-1">
              AI balances developer skill matrix, active workload capacity, and historical MTTR to route tickets.
            </p>
          </div>

          <button
            onClick={onRebalanceLoad}
            className="btn-primary text-xs"
          >
            <Activity className="w-4 h-4" /> Trigger Auto Re-Balance
          </button>
        </div>
      </div>

      {/* AI Routing Recommendation Box for Active Ticket */}
      {currentTicket && isRoutingLoading && !recommendedDev && (
        <div className="surface-muted p-5">
          <InlineLoading label="Computing optimal developer routing..." />
        </div>
      )}

      {currentTicket && recommendedDev && (
        <div className="callout callout-blue p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={recommendedDev.avatar}
                alt={recommendedDev.name}
                className="w-12 h-12 rounded-xl bg-white p-1 border-2 border-[var(--accent)]"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">AI Optimal Match</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[11px] font-bold">
                    {recommendedDev.match_score}% Match Score
                  </span>
                </div>
                <h3 className="text-base font-bold text-heading">{recommendedDev.name} — <span className="text-body-color font-normal">{recommendedDev.role}</span></h3>
              </div>
            </div>

            <button
              onClick={() => onAssignDeveloper(currentTicket.id, recommendedDev.id)}
              className="btn-emerald text-xs"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm Assignment to {recommendedDev.name.split(' ')[0]}
            </button>
          </div>

          <div className="surface p-3.5 text-xs space-y-1">
            <span className="font-bold text-purple-600 dark:text-purple-400 block">AI Routing Rationale:</span>
            <p className="text-body-color font-sans">{recommendedDev.reasoning}</p>
          </div>
        </div>
      )}

      {/* Developer Capacity Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-body-color mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[var(--accent)]" /> Engineering Team Workload &amp; Skill Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {developers.map((dev) => {
            const isRecommended = recommendedDev && recommendedDev.id === dev.id;
            const capacityRatio = (dev.active_tickets / dev.max_capacity) * 100;
            const isOverloaded = capacityRatio >= 80;

            return (
              <div
                key={dev.id}
                className={`surface p-5 space-y-4 ${isRecommended ? 'is-selected' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={dev.avatar}
                      alt={dev.name}
                      className="w-11 h-11 rounded-xl surface-muted p-1"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-heading text-sm">{dev.name}</h4>
                        {dev.on_call && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold border border-emerald-200 dark:border-emerald-500/30">
                            ON CALL
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-color">{dev.role}</p>
                    </div>
                  </div>

                  {isRecommended && (
                    <span className="px-2.5 py-1 rounded-full bg-[var(--accent-soft-bg)] text-accent-color text-[10px] font-extrabold">
                      RECOMMENDED
                    </span>
                  )}
                </div>

                {/* Skills Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {dev.skills.map((skill, sIdx) => (
                    <span key={sIdx} className="text-[11px] px-2 py-0.5 rounded surface-muted text-body-color font-mono">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Workload Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-color font-medium">Active Ticket Queue:</span>
                    <span className={`font-mono font-bold ${isOverloaded ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {dev.active_tickets} / {dev.max_capacity} ({Math.round(capacityRatio)}% Capacity)
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                    <div
                      style={{ width: `${capacityRatio}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverloaded ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="surface-muted p-2">
                    <span className="text-muted-color text-[10px] block font-semibold">HISTORICAL MTTR</span>
                    <span className="text-accent-color font-mono font-bold">{dev.historical_mttr_hours} hrs/ticket</span>
                  </div>

                  <div className="surface-muted p-2">
                    <span className="text-muted-color text-[10px] block font-semibold">AI ACCURACY</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{dev.performance_score}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
