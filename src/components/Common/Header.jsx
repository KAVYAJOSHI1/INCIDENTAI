import React, { useState } from 'react';
import { Search, Bell, LogOut, Sun, Moon, Sparkles, AlertTriangle, ChevronDown, Menu } from 'lucide-react';
import { ROLE_LABELS } from '../../constants/roles';

export default function Header({ user, onLogout, theme, onToggleTheme, activeIncidentsCount, onTriggerPreset, onOpenMobileNav }) {
  const [openMenu, setOpenMenu] = useState(null); // 'scenarios' | 'notifications' | 'profile' | null

  const toggleMenu = (menu) => setOpenMenu((prev) => (prev === menu ? null : menu));
  const closeMenus = () => setOpenMenu(null);

  const initials = (user?.name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="header-shell sticky top-0 z-40 h-16 flex items-center gap-4 px-4 sm:px-6">
      {openMenu && <div className="fixed inset-0 z-40" onClick={closeMenus} />}

      {/* Mobile nav trigger */}
      <button
        onClick={onOpenMobileNav}
        className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-color hover:bg-[var(--bg-muted)] hover:text-heading transition-colors shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-muted-color absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search tickets, articles, developers..."
          className="input-field w-full pl-9 pr-3 py-2 text-sm"
        />
      </div>

      <div className="flex-1" />

      {/* Quick Scenarios */}
      <div className="relative hidden lg:block">
        <button
          onClick={() => toggleMenu('scenarios')}
          className="btn-secondary text-xs py-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" /> Quick Scenarios <ChevronDown className="w-3 h-3" />
        </button>
        {openMenu === 'scenarios' && (
          <div className="absolute right-0 mt-2 w-64 surface shadow-popover p-1.5 z-50">
            <button
              onClick={() => { onTriggerPreset('INVOICING'); closeMenus(); }}
              className="w-full text-left text-xs px-3 py-2 rounded-lg text-body-color hover:bg-[var(--bg-muted)] transition-colors"
            >
              SAP Tax Error <span className="text-muted-color">(P1 — Invoicing)</span>
            </button>
            <button
              onClick={() => { onTriggerPreset('PAYROLL'); closeMenus(); }}
              className="w-full text-left text-xs px-3 py-2 rounded-lg text-body-color hover:bg-[var(--bg-muted)] transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" /> Payroll Deadlock <span className="text-muted-color">(P0)</span>
            </button>
            <button
              onClick={() => { onTriggerPreset('INVENTORY'); closeMenus(); }}
              className="w-full text-left text-xs px-3 py-2 rounded-lg text-body-color hover:bg-[var(--bg-muted)] transition-colors"
            >
              Inventory Cache <span className="text-muted-color">(P2)</span>
            </button>
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        title="Toggle theme"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-color hover:bg-[var(--bg-muted)] hover:text-heading transition-colors shrink-0"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('notifications')}
          title="Notifications"
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-color hover:bg-[var(--bg-muted)] hover:text-heading transition-colors shrink-0"
        >
          <Bell className="w-4 h-4" />
          {activeIncidentsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>
        {openMenu === 'notifications' && (
          <div className="absolute right-0 mt-2 w-72 surface shadow-popover p-4 z-50">
            <h4 className="text-xs font-bold text-heading mb-1">Notifications</h4>
            {activeIncidentsCount > 0 ? (
              <p className="text-xs text-body-color">
                <strong className="text-heading">{activeIncidentsCount}</strong> incident{activeIncidentsCount === 1 ? '' : 's'} currently open and awaiting resolution.
              </p>
            ) : (
              <p className="text-xs text-muted-color">You're all caught up — no open incidents.</p>
            )}
          </div>
        )}
      </div>

      {/* Profile */}
      {user && (
        <div className="relative">
          <button
            onClick={() => toggleMenu('profile')}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-heading leading-tight">{user.name}</p>
              <p className="text-[10px] text-muted-color leading-tight">{ROLE_LABELS[user.role] || user.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-color hidden sm:block" />
          </button>
          {openMenu === 'profile' && (
            <div className="absolute right-0 mt-2 w-48 surface shadow-popover p-1.5 z-50">
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <p className="text-xs font-semibold text-heading">{user.name}</p>
                <p className="text-[10px] text-muted-color">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="w-full mt-1 flex items-center gap-2 text-left text-xs px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Log out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
