import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: '📅', text: 'Real-time availability across all rooms' },
  { icon: '⚡', text: 'Instant booking confirmation — no approval wait' },
  { icon: '🗓️', text: 'Week & month calendar views at a glance' },
  { icon: '📧', text: 'Automatic email confirmations & reminders' },
]

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('login') // 'login' | 'signup' | 'forgot'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const handleLogin = async e => {
    e.preventDefault()
    const errs = {}
    if (!form.email) errs.email = 'Required'
    if (!form.password) errs.password = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      navigate(user.role === 'admin' ? '/dashboard' : '/my-requests')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const handleSignup = async e => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.email) errs.email = 'Required'
    if (!form.password) errs.password = 'Required'
    else if (form.password.length < 6) errs.password = 'Min 6 characters'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password)
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`)
      navigate('/my-requests')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account')
    } finally { setLoading(false) }
  }

  const handleForgot = async e => {
    e.preventDefault()
    if (!form.email) { setErrors({ email: 'Required' }); return }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: form.email })
      toast.success('Request sent! The administrator will reset your password shortly.')
      setView('login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 16, height: 16 }}>
      {showPass
        ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><path d="M1 1l22 22"/></>
        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  )

  return (
    <div className="login-page">

      {/* ── Left branding panel ────────────────────────────────────── */}
      <div className="login-left">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-brand">
          <div className="login-brand-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20, color: 'white' }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01"/>
              </svg>
            </div>
            <span className="logo-text">Meeting<span>Desk</span></span>
          </div>

          <div className="login-headline">
            Book smarter,<br /><em>meet better.</em>
          </div>
          <div className="login-tagline">
            The modern conference room booking system designed for teams that value their time.
          </div>
        </div>

        <ul className="login-features">
          {FEATURES.map(f => (
            <li key={f.text} className="login-feature">
              <div className="login-feature-icon">{f.icon}</div>
              {f.text}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right form panel ────────────────────────────────────────── */}
      <div className="login-right">
        <div className="login-form-wrap animate-in">

          {/* Header */}
          {view === 'login' && <>
            <div className="login-form-title">Sign <em>In</em></div>
            <div className="login-form-subtitle">Access your account to book and manage rooms</div>
          </>}
          {view === 'signup' && <>
            <div className="login-form-title">Create <em>Account</em></div>
            <div className="login-form-subtitle">Sign up to start booking conference rooms</div>
          </>}
          {view === 'forgot' && <>
            <div className="login-form-title">Reset <em>Password</em></div>
            <div className="login-form-subtitle">Enter your email and we'll notify the administrator</div>
          </>}

          <div className="card" style={{ boxShadow: 'var(--shadow-lg)' }}>
            {/* ── Login ── */}
            {view === 'login' && (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email address <span>*</span></label>
                  <input type="email" className="form-input" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="current-password" style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                      <EyeIcon />
                    </button>
                  </div>
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>
                <div style={{ textAlign: 'right', marginBottom: 20, marginTop: -8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '3px 0', minHeight: 'unset', fontSize: '0.76rem', color: 'var(--accent)' }} onClick={() => setView('forgot')}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                  {loading
                    ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Signing in…</>
                    : 'Sign In →'
                  }
                </button>
              </form>
            )}

            {/* ── Signup ── */}
            {view === 'signup' && (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label className="form-label">Full Name <span>*</span></label>
                  <input type="text" className="form-input" placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email address <span>*</span></label>
                  <input type="email" className="form-input" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span>*</span></label>
                  <input type="password" className="form-input" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Confirm Password <span>*</span></label>
                  <input type="password" className="form-input" placeholder="Repeat your password" value={form.confirm} onChange={e => set('confirm', e.target.value)} autoComplete="new-password" />
                  {errors.confirm && <span className="form-error">{errors.confirm}</span>}
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Account →'}
                </button>
              </form>
            )}

            {/* ── Forgot ── */}
            {view === 'forgot' && (
              <form onSubmit={handleForgot}>
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 18, fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  Enter your email and the administrator will be notified to reset your password.
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Email address <span>*</span></label>
                  <input type="email" className="form-input" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Request →'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setView('login')}>
                  ← Back to Sign In
                </button>
              </form>
            )}
          </div>

          {/* Switch between login/signup */}
          {view !== 'forgot' && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', flexShrink: 0 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {view === 'login' && (
                <>
                  <button type="button" className="btn btn-secondary btn-lg" style={{ width: '100%', marginBottom: 8 }} onClick={() => { setView('signup'); setErrors({}) }}>
                    Create an Account →
                  </button>
                  <button type="button" className="btn btn-ghost btn-lg" style={{ width: '100%' }} onClick={() => navigate('/book')}>
                    Continue as Guest →
                  </button>
                </>
              )}

              {view === 'signup' && (
                <button type="button" className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={() => { setView('login'); setErrors({}) }}>
                  ← Back to Sign In
                </button>
              )}
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 20 }}>
            MeetingDesk · Conference Room Management
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
