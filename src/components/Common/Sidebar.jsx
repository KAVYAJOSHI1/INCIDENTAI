import React from 'react';
import {
  ShieldAlert, UserCheck, Code2, BarChart3, GitFork,
  Radio, Map, Gauge, X, Zap
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Incident Management',
    items: [
      { id: 'REPORTER',  label: 'Submit Incident',       icon: UserCheck  },
      { id: 'TRIAGE',    label: 'Triage Feed',            icon: ShieldAlert },
      { id: 'DEVELOPER', label: 'Developer Workbench',    icon: Code2      },
    ]
  },
  {
    label: 'Analytics & AI',
    items: [
      { id: 'ADMIN',    label: 'Executive Dashboard',    icon: BarChart3   },
      { id: 'PIPELINE', label: 'AI Pipeline',            icon: GitFork     },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'WARROOM',       label: 'War Room',          icon: Radio  },
      { id: 'DIGITALTWIN',   label: 'Digital Twin',      icon: Map    },
      { id: 'MISSIONCONTROL',label: 'Mission Control',   icon: Gauge  },
    ]
  }
];

function SidebarContent({ allowedItems, currentView, setCurrentView, activeIncidentsCount, onCloseMobile }) {
  return (
    <>
      {/* Logo / Brand */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ height: 'var(--header-height)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}>
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-heading leading-none">IncidentAI</p>
          <p className="text-xs text-muted-color mt-0.5">ERP Support Engine</p>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="btn-icon md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
        {NAV_SECTIONS.map((section, sIdx) => {
          const visible = section.items.filter(i => !allowedItems || allowedItems.includes(i.id));
          if (visible.length === 0) return null;

          return (
            <div key={section.label} className={sIdx > 0 ? 'mt-5' : ''}>
              <span className="nav-section-label">{section.label}</span>
              <div className="space-y-0.5 pl-3 border-l" style={{ borderColor: 'var(--border)' }}>
                {visible.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.id === 'TRIAGE' && activeIncidentsCount > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 rounded-full shrink-0"
                          style={{
                            background: 'var(--red-bg)',
                            color: 'var(--red-text)',
                            border: '1px solid var(--red-border)'
                          }}
                        >
                          {activeIncidentsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot shrink-0" />
          <span className="text-xs text-muted-color">All systems operational</span>
        </div>
      </div>
    </>
  );
}

export default function Sidebar({
  currentView, setCurrentView, allowedViews,
  activeIncidentsCount, isMobileOpen, onCloseMobile
}) {
  const allowedIds = allowedViews || NAV_SECTIONS.flatMap(s => s.items.map(i => i.id));

  return (
    <>
      {/* Desktop */}
      <aside className="sidebar-shell hidden md:flex flex-col h-screen sticky top-0">
        <SidebarContent
          allowedItems={allowedIds}
          currentView={currentView}
          setCurrentView={setCurrentView}
          activeIncidentsCount={activeIncidentsCount}
        />
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside className="sidebar-shell relative flex flex-col h-full" style={{ width: '260px', maxWidth: '80vw', boxShadow: 'var(--shadow-popover)' }}>
            <SidebarContent
              allowedItems={allowedIds}
              currentView={currentView}
              setCurrentView={setCurrentView}
              activeIncidentsCount={activeIncidentsCount}
              onCloseMobile={onCloseMobile}
            />
          </aside>
        </div>
      )}
    </>
  );
}
