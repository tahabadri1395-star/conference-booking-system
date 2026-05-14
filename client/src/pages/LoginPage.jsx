import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('login') // 'login' | 'signup' | 'forgot'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

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
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`)
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

  const Logo = () => (
    <div className="login-logo">
      <div className="logo-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20, color: 'white' }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
          <path d="M8 14h.01M12 14h.01M16 14h.01"/>
        </svg>
      </div>
      <span className="logo-text">Meeting<span>Desk</span></span>
    </div>
  )

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card animate-in">
        <div className="login-header">
          <Logo />
          {view === 'login' && <>
            <div className="login-title">Sign <em>In</em></div>
            <div className="login-subtitle">Access your account to book and manage rooms</div>
          </>}
          {view === 'signup' && <>
            <div className="login-title">Create <em>Account</em></div>
            <div className="login-subtitle">Sign up to start booking conference rooms</div>
          </>}
          {view === 'forgot' && <>
            <div className="login-title">Reset <em>Password</em></div>
            <div className="login-subtitle">Enter your email and we'll notify the administrator</div>
          </>}
        </div>

        <div className="card">
          {view === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email address <span>*</span></label>
                <input type="email" className="form-input" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">Password <span>*</span></label>
                <input type="password" className="form-input" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="current-password" />
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '4px 0', minHeight: 'unset', fontSize: '0.78rem' }} onClick={() => setView('forgot')}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          )}

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

          {view === 'forgot' && (
            <form onSubmit={handleForgot}>
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

        {view !== 'forgot' && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', flexShrink: 0 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {view === 'login' && (
              <>
                <button type="button" className="btn btn-secondary btn-lg" style={{ width: '100%', marginBottom: 10 }} onClick={() => { setView('signup'); setErrors({}) }}>
                  Create an Account →
                </button>
                <button type="button" className="btn btn-secondary btn-lg" style={{ width: '100%', marginBottom: 12 }} onClick={() => navigate('/book')}>
                  Continue as Guest →
                </button>
              </>
            )}

            {view === 'signup' && (
              <button type="button" className="btn btn-secondary btn-lg" style={{ width: '100%', marginBottom: 12 }} onClick={() => { setView('login'); setErrors({}) }}>
                ← Back to Sign In
              </button>
            )}

            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
              {view === 'login' ? 'No account needed — just fill in your details to book a room' : 'Already have an account? Sign in above'}
            </p>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 16 }}>
          MeetingDesk · Conference Room Management
        </p>
      </div>
    </div>
  )
}
