import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, LogOut, Sun, Moon, Sparkles, AlertTriangle, ChevronDown, Menu, Settings } from 'lucide-react';
import { ROLE_LABELS } from '../../constants/roles';
import { searchKnowledge } from '../../services/apiClient';

export default function Header({ user, onLogout, theme, onToggleTheme, activeIncidentsCount, onTriggerPreset, onOpenMobileNav }) {
  const [openMenu, setOpenMenu] = useState(null); // 'scenarios' | 'notifications' | 'profile' | null
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const ref = useRef(null);

  const toggleMenu = (menu) => setOpenMenu(prev => prev === menu ? null : menu);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchKnowledge(searchQuery);
        setSearchResults(results);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const initials = (user?.name || '?')
    .split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const roleLabel = ROLE_LABELS[user?.role] || user?.role || '';

  return (
    <header
      ref={ref}
      className="header-shell sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-5"
    >
      {/* Mobile hamburger */}
      <button onClick={onOpenMobileNav} className="btn-icon md:hidden">
        <Menu className="w-4 h-4" />
      </button>

      {/* Search */}
      <div className="relative w-64 hidden sm:block">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-color pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
          onFocus={() => setIsSearchOpen(true)}
          placeholder="Search RAG & Knowledge… (Ctrl+K)"
          className="input-field pl-9 pr-3 text-sm"
          style={{ height: '32px', fontSize: '13px' }}
        />
        {isSearchOpen && (searchQuery.trim() || searchResults) && (
          <div className="popover absolute left-0 mt-1 w-80 z-50 p-2 fade-in max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1 border-b mb-1" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-semibold uppercase text-muted-color">RAG Knowledge Results</span>
              <button onClick={() => setIsSearchOpen(false)} className="text-xs text-muted-color hover:text-heading">Esc</button>
            </div>
            {isSearching && <p className="p-2 text-xs text-muted-color">Searching semantic vectors...</p>}
            {!isSearching && searchResults && searchResults.length === 0 && (
              <p className="p-2 text-xs text-muted-color">No matching knowledge articles found.</p>
            )}
            {!isSearching && searchResults && searchResults.map((item, idx) => (
              <div key={idx} className="p-2 hover:bg-[var(--bg-muted)] rounded-md cursor-pointer text-left transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold text-heading">
                  <span className="truncate">{item.article?.title}</span>
                  <span className="text-[10px] font-mono badge-module ml-1 shrink-0">{item.confidence_percentage}%</span>
                </div>
                <p className="text-[11px] text-body-color line-clamp-2 mt-0.5">{item.article?.solution}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action group */}
      <div className="flex items-center gap-1">

        {/* Quick Scenarios */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('scenarios')}
            className="btn-secondary hidden sm:inline-flex"
            style={{ height: '32px', fontSize: '12px', padding: '0 10px' }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span className="hidden md:inline">Quick Demo</span>
            <ChevronDown className="w-3 h-3 text-muted-color" />
          </button>
          {openMenu === 'scenarios' && (
            <div className="popover absolute right-0 mt-1 w-56 z-50 fade-in">
              <div className="p-1">
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-color">Sample Incidents</p>
                {[
                  { label: 'SAP Tax Error', sub: 'P1 · Invoicing', mod: 'INVOICING' },
                  { label: 'Payroll Deadlock', sub: 'P0 · Critical', mod: 'PAYROLL', danger: true },
                  { label: 'Inventory Sync', sub: 'P2 · Inventory', mod: 'INVENTORY' },
                ].map(s => (
                  <button
                    key={s.mod}
                    onClick={() => { onTriggerPreset(s.mod); setOpenMenu(null); }}
                    className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-md transition-colors text-sm"
                    style={{ color: 'var(--text-body)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span className="flex items-center gap-2">
                      {s.danger && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                      <span className="font-medium" style={{ fontSize: '13px' }}>{s.label}</span>
                    </span>
                    <span className="text-xs text-muted-color shrink-0">{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={onToggleTheme} className="btn-icon" title="Toggle theme">
          {theme === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('notifications')}
            className="btn-icon relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {activeIncidentsCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ background: 'var(--red)' }}
              />
            )}
          </button>
          {openMenu === 'notifications' && (
            <div className="popover absolute right-0 mt-1 w-72 z-50 fade-in">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold text-heading">Notifications</p>
              </div>
              <div className="p-4">
                {activeIncidentsCount > 0 ? (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--red)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-body)' }}>
                      <span className="font-semibold text-heading">{activeIncidentsCount}</span>
                      {' '}open incident{activeIncidentsCount !== 1 ? 's' : ''} awaiting resolution.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-color">You're all caught up.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

        {/* Profile */}
        {user && (
          <div className="relative">
            <button
              onClick={() => toggleMenu('profile')}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors"
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'var(--accent)', fontSize: '11px' }}
              >
                {initials}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-semibold text-heading">{user.name}</p>
                <p className="text-[11px] text-muted-color">{roleLabel}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-color hidden sm:block" />
            </button>

            {openMenu === 'profile' && (
              <div className="popover absolute right-0 mt-1 w-52 z-50 fade-in">
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold text-heading">{user.name}</p>
                  <p className="text-xs text-muted-color">{user.email}</p>
                </div>
                <div className="p-1">
                  <button
                    className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-md text-sm transition-colors"
                    style={{ color: 'var(--red-text)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--red-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={onLogout}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
