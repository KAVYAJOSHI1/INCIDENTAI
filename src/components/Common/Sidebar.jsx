import React from 'react';
import { ShieldAlert, UserCheck, Code2, BarChart3, GitFork, Radio, Map, Gauge, X } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'REPORTER', label: 'End-User Reporter', icon: UserCheck },
  { id: 'TRIAGE', label: 'Support Triage Feed', icon: ShieldAlert },
  { id: 'DEVELOPER', label: 'Developer Workbench', icon: Code2 },
  { id: 'ADMIN', label: 'Executive Analytics', icon: BarChart3 },
  { id: 'PIPELINE', label: 'AI Pipeline Flow', icon: GitFork },
  { id: 'WARROOM', label: 'War Room', icon: Radio },
  { id: 'DIGITALTWIN', label: 'Digital Twin', icon: Map },
  { id: 'MISSIONCONTROL', label: 'Mission Control', icon: Gauge }
];

function SidebarContent({ items, currentView, setCurrentView, activeIncidentsCount, onCloseMobile }) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 h-16 border-b shrink-0" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-sm text-heading leading-tight truncate">IncidentAI</h1>
          <p className="text-[11px] text-muted-color leading-tight truncate">Websys Enterprise</p>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-muted-color hover:bg-[var(--bg-muted)] shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-color">Workspace</p>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)]'
                  : 'text-body-color hover:bg-[var(--bg-muted)]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--accent-soft-text)]' : 'text-muted-color'}`} />
              <span className="truncate flex-1 text-left">{item.label}</span>
              {item.id === 'TRIAGE' && activeIncidentsCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 shrink-0">
                  {activeIncidentsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t text-[11px] text-faint-color shrink-0" style={{ borderColor: 'var(--border-default)' }}>
        AI-Powered ERP Support Engineer
      </div>
    </>
  );
}

export default function Sidebar({ currentView, setCurrentView, allowedViews, activeIncidentsCount, isMobileOpen, onCloseMobile }) {
  const items = NAV_ITEMS.filter((v) => !allowedViews || allowedViews.includes(v.id));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-shell hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col h-screen sticky top-0">
        <SidebarContent items={items} currentView={currentView} setCurrentView={setCurrentView} activeIncidentsCount={activeIncidentsCount} />
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside className="sidebar-shell relative flex flex-col h-full w-72 max-w-[80vw] shadow-popover">
            <SidebarContent items={items} currentView={currentView} setCurrentView={setCurrentView} activeIncidentsCount={activeIncidentsCount} onCloseMobile={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
