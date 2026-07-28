import React, { useState } from 'react';
import { ShieldAlert, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_LABELS } from '../../constants/roles';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('END_USER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, name, role });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 app-bg">
      <div className="surface w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent)] flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-heading tracking-tight">IncidentAI</h1>
            <p className="text-xs text-muted-color font-medium">AI-Powered ERP Support Engineer</p>
          </div>
        </div>

        <div className="flex items-center gap-1 surface-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${mode === 'login' ? 'bg-[var(--accent)] text-white' : 'text-muted-color hover:text-heading'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${mode === 'register' ? 'bg-[var(--accent)] text-white' : 'text-muted-color hover:text-heading'}`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full p-2.5 text-xs"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full p-2.5 text-xs"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full p-2.5 text-xs"
            minLength={8}
            required
          />
          {mode === 'register' && (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field w-full p-2.5 text-xs"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          )}

          {error && <p className="text-xs callout callout-rose p-2">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-primary text-xs w-full justify-center">
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : mode === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        {mode === 'register' && (
          <p className="text-[11px] text-faint-color text-center leading-relaxed">
            Demo project — role is self-selected at signup rather than assigned by an admin.
            End User can only submit incidents; Support Triage, Developer, and Executive get the full internal console.
          </p>
        )}
      </div>
    </div>
  );
}
