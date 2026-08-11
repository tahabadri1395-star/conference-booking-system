import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const handleLogin = async e => {
    e.preventDefault()
    const errs = {}
    if (!form.email) errs.email = 'Email is required'
    if (!form.password) errs.password = 'Password is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`)
      navigate(user.role === 'admin' ? '/dashboard' : '/my-requests')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const handleSignup = async e => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email) errs.email = 'Email is required'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 6) errs.password = 'Minimum 6 characters'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password)
      toast.success(`Welcome, ${user.name.split(' ')[0]}`)
      navigate('/my-requests')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create account')
    } finally { setLoading(false) }
  }

  const handleForgot = async e => {
    e.preventDefault()
    if (!form.email) { setErrors({ email: 'Email is required' }); return }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: form.email })
      toast.success('Request sent. The administrator will reset your password.')
      setView('login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const EyeBtn = () => (
    <button
      type="button"
      onClick={() => setShowPass(s => !s)}
      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', display: 'flex', padding: 4 }}
    >
      {showPass
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{width:15,height:15}}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{width:15,height:15}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  )

  return (
    <div className="login-root">
      <div className="login-card animate-in">

        {/* Logo */}
        <div className="login-logo-row">
          <div className="logo-mark" style={{ width: 32, height: 32, borderRadius: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17, color: 'white' }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01"/>
            </svg>
          </div>
          <span className="logo-name" style={{ fontSize: '1rem' }}>MeetingDesk</span>
        </div>

        {/* Heading */}
        {view === 'login'  && <><div className="login-headline">Sign in to your account</div><div className="login-subline">Book and manage conference rooms for your organisation.</div></>}
        {view === 'signup' && <><div className="login-headline">Create an account</div><div className="login-subline">Get started with conference room booking today.</div></>}
        {view === 'forgot' && <><div className="login-headline">Reset your password</div><div className="login-subline">Enter your email and we'll notify the administrator.</div></>}

        {/* Panel */}
        <div className="login-panel">

          {/* Login form */}
          {view === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" className="form-input" placeholder="name@company.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" autoFocus />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  <button type="button" onClick={() => { setView('forgot'); setErrors({}) }} style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="Enter your password" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="current-password" style={{ paddingRight: 38 }} />
                  <EyeBtn />
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
              <button type="submit" className="btn btn-primary btn-xl" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
                {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Signup form */}
          {view === 'signup' && (
            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input type="text" className="form-input" placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" autoFocus />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" className="form-input" placeholder="name@company.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" placeholder="Minimum 6 characters" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input type="password" className="form-input" placeholder="Repeat your password" value={form.confirm} onChange={e => set('confirm', e.target.value)} autoComplete="new-password" />
                {errors.confirm && <span className="form-error">{errors.confirm}</span>}
              </div>
              <button type="submit" className="btn btn-primary btn-xl" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {/* Forgot password */}
          {view === 'forgot' && (
            <form onSubmit={handleForgot}>
              <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '11px 14px', margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--tx-3)', lineHeight: 1.5 }}>
                Enter your email address and we'll ask the administrator to reset your password.
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" className="form-input" placeholder="name@company.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" autoFocus />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
              <button type="submit" className="btn btn-primary btn-xl" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
                {loading ? 'Sending…' : 'Send request'}
              </button>
              <button type="button" className="btn btn-ghost btn-xl" style={{ width: '100%', marginTop: 6 }} onClick={() => { setView('login'); setErrors({}) }}>
                Back to sign in
              </button>
            </form>
          )}
        </div>

        {/* Switch links */}
        {view !== 'forgot' && (
          <>
            <div className="login-divider"><span>or</span></div>
            {view === 'login' && (
              <>
                <button className="btn btn-secondary btn-xl" style={{ width: '100%', marginBottom: 8 }} onClick={() => { setView('signup'); setErrors({}); }}>
                  Create an account
                </button>
                <button className="btn btn-ghost btn-xl" style={{ width: '100%' }} onClick={() => navigate('/book')}>
                  Continue without account
                </button>
              </>
            )}
            {view === 'signup' && (
              <button className="btn btn-secondary btn-xl" style={{ width: '100%' }} onClick={() => { setView('login'); setErrors({}); }}>
                Already have an account? Sign in
              </button>
            )}
          </>
        )}

        <div className="login-footer">MeetingDesk · Conference Room Management</div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
