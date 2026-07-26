import React from 'react';
import { UserCheck, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Activity, Award } from 'lucide-react';
import { recommendDeveloperForTicket } from '../../services/loadBalancer';

export default function DeveloperLoadBalancer({ currentTicket, developers, onAssignDeveloper, onRebalanceLoad }) {
  const routing = currentTicket ? recommendDeveloperForTicket(currentTicket, developers) : null;
  const recommendedDev = routing ? routing.recommended : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="glass-panel p-6 border-indigo-500/30 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Module 6: Developer Recommendation AI
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white">Dynamic Developer Load Balancing & Routing</h2>
            <p className="text-slate-400 text-sm mt-1">
              AI balances developer skill matrix, active workload capacity, and historical MTTR to route tickets.
            </p>
          </div>

          <button
            onClick={onRebalanceLoad}
            className="btn-primary text-xs shadow-lg shadow-indigo-500/30"
          >
            <Activity className="w-4 h-4" /> Trigger Auto Re-Balance
          </button>
        </div>
      </div>

      {/* AI Routing Recommendation Box for Active Ticket */}
      {currentTicket && recommendedDev && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/50 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={recommendedDev.avatar}
                alt={recommendedDev.name}
                className="w-12 h-12 rounded-xl bg-slate-800 p-1 border-2 border-indigo-500 shadow-md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Optimal Match</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                    {recommendedDev.match_score}% Match Score
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{recommendedDev.name} — <span className="text-slate-300 font-normal">{recommendedDev.role}</span></h3>
              </div>
            </div>

            <button
              onClick={() => onAssignDeveloper(currentTicket.id, recommendedDev.id)}
              className="btn-emerald text-xs"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm Assignment to {recommendedDev.name.split(' ')[0]}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs space-y-1">
            <span className="font-bold text-purple-300 block">AI Routing Rationale:</span>
            <p className="text-slate-300 font-sans">{recommendedDev.reasoning}</p>
          </div>
        </div>
      )}

      {/* Developer Capacity Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-400" /> Engineering Team Workload & Skill Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {developers.map((dev) => {
            const isRecommended = recommendedDev && recommendedDev.id === dev.id;
            const capacityRatio = (dev.active_tickets / dev.max_capacity) * 100;
            const isOverloaded = capacityRatio >= 80;

            return (
              <div
                key={dev.id}
                className={`glass-panel p-5 space-y-4 border transition-all ${
                  isRecommended
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={dev.avatar}
                      alt={dev.name}
                      className="w-11 h-11 rounded-xl bg-slate-800 p-1 border border-white/10"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{dev.name}</h4>
                        {dev.on_call && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
                            ON CALL
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{dev.role}</p>
                    </div>
                  </div>

                  {isRecommended && (
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold border border-indigo-500/40 animate-pulse">
                      RECOMMENDED
                    </span>
                  )}
                </div>

                {/* Skills Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {dev.skills.map((skill, sIdx) => (
                    <span key={sIdx} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10 font-mono">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Workload Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Active Ticket Queue:</span>
                    <span className={`font-mono font-bold ${isOverloaded ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {dev.active_tickets} / {dev.max_capacity} ({Math.round(capacityRatio)}% Capacity)
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${capacityRatio}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverloaded ? 'bg-amber-500 shadow-sm shadow-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                    <span className="text-slate-500 text-[10px] block font-semibold">HISTORICAL MTTR</span>
                    <span className="text-indigo-300 font-mono font-bold">{dev.historical_mttr_hours} hrs/ticket</span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                    <span className="text-slate-500 text-[10px] block font-semibold">AI ACCURACY</span>
                    <span className="text-emerald-400 font-mono font-bold">{dev.performance_score}%</span>
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
