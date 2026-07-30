import React, { useState } from 'react';
import { ShieldAlert, LogIn, UserPlus, Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_LABELS } from '../../constants/roles';

const FEATURES = [
  'Multimodal OCR + Vision AI triage',
  'AI-powered severity classification & routing',
  'Real-time SLA tracking & executive analytics',
];

const DEMO_ACCOUNTS = [
  { role: 'End User',      email: 'enduser@incidentai.demo',   badge: 'bg-slate-100 text-slate-600' },
  { role: 'Support Triage',email: 'triage@incidentai.demo',    badge: 'bg-blue-50 text-blue-700' },
  { role: 'Developer',     email: 'developer@incidentai.demo', badge: 'bg-purple-50 text-purple-700' },
  { role: 'Executive',     email: 'executive@incidentai.demo', badge: 'bg-amber-50 text-amber-700' },
];

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode]               = useState('login');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [name, setName]               = useState('');
  const [role, setRole]               = useState('END_USER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register({ email, password, name, role });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickFill = (acc) => {
    setEmail(acc.email);
    setPassword('demopass123');
    setMode('login');
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* ── Left panel (branding) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: '#0F172A', color: '#F8FAFC' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2563EB' }}>
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-sm font-semibold">IncidentAI</span>
        </div>

        {/* Hero */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3B82F6' }}>
              ERP Support Engine
            </p>
            <h1 className="text-3xl font-bold leading-tight" style={{ color: '#F0F6FC' }}>
              Resolve ERP incidents<br />10× faster with AI.
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#8B949E' }}>
              From vague bug report to structured ticket, developer assignment, and patch preview — fully automated.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3 text-sm" style={{ color: '#C9D1D9' }}>
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#10B981' }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Demo hints */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#484F58' }}>
            Demo Accounts · password: demopass123
          </p>
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.email}
              type="button"
              onClick={() => quickFill(acc)}
              className="w-full flex items-center justify-between text-left rounded-md px-3 py-2 transition-colors text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <span>{acc.email}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${acc.badge}`}>{acc.role}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-heading">IncidentAI</span>
          </div>

          <h2 className="text-xl font-semibold text-heading mb-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
          </h2>
          <p className="text-sm text-muted-color mb-6">
            {mode === 'login' ? 'Enter your credentials below.' : 'Fill in the details to get started.'}
          </p>

          {/* Mode Toggle */}
          <div
            className="flex p-1 rounded-lg mb-5"
            style={{ background: 'var(--bg-muted)', gap: '4px' }}
          >
            {['login', 'register'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={{
                  background: mode === m ? 'var(--bg-surface)' : 'transparent',
                  color: mode === m ? 'var(--text-heading)' : 'var(--text-muted)',
                  boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  border: mode === m ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field px-3"
                  style={{ height: '36px' }}
                  placeholder="Your name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field px-3"
                style={{ height: '36px' }}
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-heading mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field px-3"
                style={{ height: '36px' }}
                placeholder="Min. 8 characters"
                minLength={8}
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-heading mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="input-field px-3"
                  style={{ height: '36px' }}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="callout callout-rose text-xs py-2 px-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center"
              style={{ height: '36px' }}
            >
              {isSubmitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : mode === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />
              }
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="mt-4 text-xs text-muted-color text-center leading-relaxed">
              Role is self-selected for this demo. End User can submit incidents; other roles access the full console.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
