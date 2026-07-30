import React, { useEffect, useState } from 'react';
import { UserCheck, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { routeDeveloper } from '../../services/apiClient';
import { InlineLoading } from '../Common/Loading';
import PageHeader from '../Common/PageHeader';

export default function DeveloperLoadBalancer({ currentTicket, developers, onAssignDeveloper, onRebalanceLoad }) {
  const [liveRouting, setLiveRouting]     = useState(null);
  const [isRoutingLoading, setIsLoading]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (currentTicket && !currentTicket.developer_routing) {
      setIsLoading(true);
      routeDeveloper(currentTicket.erp_module)
        .then(r  => { if (!cancelled) setLiveRouting(r); })
        .catch(() => { if (!cancelled) setLiveRouting(null); })
        .finally(()=> { if (!cancelled) setIsLoading(false); });
    } else {
      setLiveRouting(null);
      setIsLoading(false);
    }
    return () => { cancelled = true; };
  }, [currentTicket?.id, currentTicket?.erp_module]);

  const routing      = currentTicket?.developer_routing || liveRouting;
  const recommended  = routing?.recommended || null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        badge="Developer Routing AI"
        title="Team Workload & Developer Assignment"
        description="AI-weighted routing using skill matrix, active workload, and historical MTTR."
        action={
          <button onClick={onRebalanceLoad} className="btn-primary">
            <Activity className="w-3.5 h-3.5" />
            Auto Re-Balance
          </button>
        }
      />

      {/* AI Routing Recommendation */}
      {currentTicket && isRoutingLoading && !recommended && (
        <div className="surface p-5">
          <InlineLoading label="Computing optimal developer routing…" />
        </div>
      )}

      {currentTicket && recommended && (
        <div className="callout callout-blue space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={recommended.avatar}
                alt={recommended.name}
                className="w-11 h-11 rounded-lg"
                style={{ border: '2px solid var(--accent)', background: 'var(--bg-surface)', padding: '2px' }}
              />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wide">AI Optimal Match</p>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded"
                    style={{ background: 'var(--green-bg)', color: 'var(--green-text)', border: '1px solid var(--green-border)' }}
                  >
                    {recommended.match_score}% Match
                  </span>
                </div>
                <p className="text-sm font-semibold text-heading">
                  {recommended.name}
                  <span className="font-normal text-muted-color ml-1">— {recommended.role}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => onAssignDeveloper(currentTicket.id, recommended.id)}
              className="btn-emerald shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirm Assignment
            </button>
          </div>

          {recommended.reasoning && (
            <div className="surface-muted p-4 rounded-lg">
              <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-1">AI Rationale</p>
              <p className="text-sm text-body-color leading-relaxed">{recommended.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* Developer Grid */}
      <div>
        <p className="text-xs font-semibold text-muted-color uppercase tracking-wide mb-4 flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          Engineering Team — Workload & Skill Matrix
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {developers.map(dev => {
            const isRecommended = recommended?.id === dev.id;
            const ratio         = dev.max_capacity > 0 ? (dev.active_tickets / dev.max_capacity) * 100 : 0;
            const isOverloaded  = ratio >= 80;

            return (
              <div
                key={dev.id}
                className={`surface p-5 space-y-4 ${isRecommended ? 'is-selected' : ''}`}
              >
                {/* Dev header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={dev.avatar}
                      alt={dev.name}
                      className="w-10 h-10 rounded-lg"
                      style={{ background: 'var(--bg-muted)', padding: '2px' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-heading">{dev.name}</p>
                        {dev.on_call && (
                          <span className="badge-green" style={{ fontSize: '10px', padding: '1px 6px' }}>ON CALL</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-color">{dev.role}</p>
                    </div>
                  </div>
                  {isRecommended && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                      style={{ background: 'var(--accent-subtle-bg)', color: 'var(--accent-subtle-text)', border: '1px solid var(--accent-subtle-bd)' }}
                    >
                      RECOMMENDED
                    </span>
                  )}
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {dev.skills.map((skill, i) => (
                    <span key={i} className="tag">{skill}</span>
                  ))}
                </div>

                {/* Workload bar */}
                <div className="space-y-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-color font-medium">Active Queue</span>
                    <span
                      className="font-mono font-semibold"
                      style={{ color: isOverloaded ? 'var(--amber)' : 'var(--green)' }}
                    >
                      {dev.active_tickets} / {dev.max_capacity} ({Math.round(ratio)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(ratio, 100)}%`,
                        background: isOverloaded ? 'var(--amber)' : 'var(--green)'
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="surface-muted p-3 rounded-lg">
                    <p className="text-[10px] font-semibold text-muted-color uppercase mb-1">Hist. MTTR</p>
                    <p className="text-sm font-mono font-bold text-heading">{dev.historical_mttr_hours}h</p>
                  </div>
                  <div className="surface-muted p-3 rounded-lg">
                    <p className="text-[10px] font-semibold text-muted-color uppercase mb-1">AI Accuracy</p>
                    <p className="text-sm font-mono font-bold" style={{ color: 'var(--green)' }}>{dev.performance_score}%</p>
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
