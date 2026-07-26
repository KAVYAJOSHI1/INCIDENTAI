import React from 'react';
import { ShieldAlert, UserCheck, Code2, BarChart3, GitFork, Sparkles, AlertTriangle, Radio, Map, Gauge } from 'lucide-react';

export default function Navbar({ currentRole, setCurrentRole, activeIncidentsCount, onTriggerPreset }) {
  const roles = [
    { id: 'REPORTER', label: '1. End-User Reporter', icon: UserCheck },
    { id: 'TRIAGE', label: '2. Support Triage Feed', icon: ShieldAlert },
    { id: 'DEVELOPER', label: '3. Developer Workbench', icon: Code2 },
    { id: 'ADMIN', label: '4. Executive Analytics', icon: BarChart3 },
    { id: 'PIPELINE', label: '5. AI Pipeline Flow', icon: GitFork },
    { id: 'WARROOM', label: '6. War Room', icon: Radio },
    { id: 'DIGITALTWIN', label: '7. Digital Twin', icon: Map },
    { id: 'MISSIONCONTROL', label: '8. Mission Control', icon: Gauge },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-6 py-3 mb-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-white tracking-wide">IncidentAI</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Websys Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">AI-Powered ERP Support Engineer</p>
          </div>
        </div>

        {/* Preset Hackathon Demo Buttons */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-white/10">
          <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Hackathon Demos:
          </span>
          <button 
            onClick={() => onTriggerPreset('INVOICING')}
            className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all font-medium"
          >
            SAP Tax Error (P1)
          </button>
          <button 
            onClick={() => onTriggerPreset('PAYROLL')}
            className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all font-medium flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Payroll Deadlock (P0)
          </button>
          <button 
            onClick={() => onTriggerPreset('INVENTORY')}
            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all font-medium"
          >
            Inventory Cache (P2)
          </button>
        </div>

        {/* Navigation Role Switcher */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full w-full sm:w-auto">
          {roles.map((r) => {
            const IconComponent = r.icon;
            const isActive = currentRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setCurrentRole(r.id)}
                title={r.label}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="hidden xl:inline whitespace-nowrap">{r.label}</span>
                {r.id === 'TRIAGE' && activeIncidentsCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white shrink-0">
                    {activeIncidentsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
