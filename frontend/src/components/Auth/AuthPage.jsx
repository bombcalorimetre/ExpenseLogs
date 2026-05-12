import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.bg}>
        <div style={styles.orb1} />
        <div style={styles.orb2} />
        <div style={styles.grid} />
      </div>

      <div style={styles.left}>
        <div style={styles.brand}>
          <div style={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="rgba(59,130,246,0.15)" />
              <path d="M8 14h12M14 8v12M8 10l6-2 6 2M8 18l6 2 6-2" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={styles.brandName}>FinCorp Elite</span>
          </div>
          <p style={styles.tagline}>Wealth Management</p>
        </div>

        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>
            Command your<br />
            <span style={{ color: 'var(--accent)' }}>financial universe</span>
          </h1>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={styles.cardSub}>
              {mode === 'login'
                ? 'FinCorp, your expense companion'
                : 'Start your wealth management journey'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {mode === 'register' && (
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Alex Sterling"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={e => Object.assign(e.target.style, styles.input)}
                />
              </div>
            )}
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                style={styles.input}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={e => Object.assign(e.target.style, styles.input)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={e => Object.assign(e.target.style, styles.input)}
              />
            </div>

            {error && (
              <div style={styles.error}>
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={loading ? styles.btnDisabled : styles.btn}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={styles.spinner} /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div style={styles.toggle}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              style={styles.toggleBtn}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: { display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' },
  bg: { position: 'absolute', inset: 0, zIndex: 0 },
  orb1: {
    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
    top: '-200px', left: '-100px',
  },
  orb2: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%)',
    bottom: '-100px', right: '40%',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  left: {
    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '48px 56px', position: 'relative', zIndex: 1,
  },
  brand: { display: 'flex', flexDirection: 'column', gap: 4 },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  brandName: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  tagline: { fontSize: 12, color: 'var(--text-muted)', marginLeft: 38, letterSpacing: '0.1em', textTransform: 'uppercase' },
  hero: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 480 },
  heroTitle: {
    fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, lineHeight: 1.1,
    color: 'var(--text-primary)', marginBottom: 20,
  },

  right: {
    width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40, position: 'relative', zIndex: 1,
    borderLeft: '1px solid var(--border)',
    background: 'rgba(22,27,34,0.8)', backdropFilter: 'blur(12px)',
  },
  card: { width: '100%', maxWidth: 380, animation: 'fadeUp 0.5s ease' },
  cardHeader: { marginBottom: 28 },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 6 },
  cardSub: { fontSize: 14, color: 'var(--text-secondary)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '11px 14px', color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', transition: 'var(--transition)', width: '100%',
  },
  inputFocus: {
    background: 'var(--bg-input)', border: '1px solid var(--border-active)',
    borderRadius: 'var(--radius-sm)', padding: '11px 14px', color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', transition: 'var(--transition)', width: '100%',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.08)',
  },
  error: {
    background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)',
    borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: 'var(--red)',
    fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
  },
  btn: {
    background: 'var(--accent)', color: '#0d1117', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '13px 20px', fontFamily: 'var(--font-body)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4,
    transition: 'var(--transition)', letterSpacing: '0.02em',
  },
  btnDisabled: {
    background: 'rgba(59,130,246,0.4)', color: '#0d1117', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '13px 20px', fontFamily: 'var(--font-body)',
    fontSize: 14, fontWeight: 600, cursor: 'not-allowed', marginTop: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  spinner: {
    width: 14, height: 14, border: '2px solid rgba(13,17,23,0.3)',
    borderTop: '2px solid #0d1117', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  toggle: { marginTop: 24, textAlign: 'center', fontSize: 14 },
  toggleBtn: {
    background: 'none', border: 'none', color: 'var(--accent)',
    cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
  },
};
