import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

const EyeOpen  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:15,height:15}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const EyeClose = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:15,height:15}}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>

function Spinner() {
  return <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.25)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin 0.65s linear infinite' }} />
}

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [view, setView]     = useState('login')
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }
  const sw  = (v) => { setView(v); setErrors({}); }

  const handleLogin = async e => {
    e.preventDefault()
    const errs = {}
    if (!form.email) errs.email = 'Required'
    if (!form.password) errs.password = 'Required'
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
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.email) errs.email = 'Required'
    if (!form.password) errs.password = 'Required'
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
    if (!form.email) { setErrors({ email: 'Required' }); return }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: form.email })
      toast.success('Request sent. The administrator will reset your password.')
      sw('login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const PasswordInput = ({ field = 'password', placeholder, autoComplete }) => (
    <div style={{ position: 'relative' }}>
      <input
        type={showPass ? 'text' : 'password'}
        className="form-input"
        placeholder={placeholder}
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        autoComplete={autoComplete}
        style={{ paddingRight: 38 }}
      />
      <button type="button" onClick={() => setShowPass(s => !s)}
        style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--tx-3)', display:'flex', padding:4 }}>
        {showPass ? <EyeClose /> : <EyeOpen />}
      </button>
    </div>
  )

  return (
    <div className="login-root">
      <div className="login-card animate-scale">

        {/* Logo */}
        <div className="login-logo-row">
          <div className="logo-mark" style={{ width:34, height:34, borderRadius:10 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" style={{width:16,height:16}}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01"/>
            </svg>
          </div>
          <span className="logo-name" style={{fontSize:'1rem'}}>Meeting<span>Desk</span></span>
        </div>

        {/* Headings */}
        {view === 'login'  && <><div className="login-headline">Welcome back</div><div className="login-subline">Sign in to your MeetingDesk account to continue.</div></>}
        {view === 'signup' && <><div className="login-headline">Create an account</div><div className="login-subline">Get started with conference room booking today.</div></>}
        {view === 'forgot' && <><div className="login-headline">Forgot password?</div><div className="login-subline">Enter your email and we'll notify the administrator.</div></>}

        {/* Forms */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="login-panel">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-input" placeholder="you@company.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                autoComplete="email" autoFocus />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group" style={{marginBottom: 6}}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <label className="form-label" style={{marginBottom:0}}>Password</label>
                <button type="button" onClick={() => sw('forgot')}
                  style={{ fontSize:'0.73rem', color:'var(--accent-text)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:500 }}>
                  Forgot?
                </button>
              </div>
              <PasswordInput placeholder="Enter your password" autoComplete="current-password" />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-xl" style={{ width:'100%', marginTop:16 }} disabled={loading}>
              {loading ? <><Spinner /> Signing in…</> : 'Sign in'}
            </button>
          </form>
        )}

        {view === 'signup' && (
          <form onSubmit={handleSignup} className="login-panel">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input type="text" className="form-input" placeholder="Your full name"
                value={form.name} onChange={e => set('name', e.target.value)}
                autoComplete="name" autoFocus />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-input" placeholder="you@company.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                autoComplete="email" />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <PasswordInput placeholder="Minimum 6 characters" autoComplete="new-password" />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <PasswordInput field="confirm" placeholder="Repeat your password" autoComplete="new-password" />
              {errors.confirm && <span className="form-error">{errors.confirm}</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-xl" style={{ width:'100%', marginTop:4 }} disabled={loading}>
              {loading ? <><Spinner /> Creating account…</> : 'Create account'}
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="login-panel">
            <div style={{ background:'var(--bg-2)', border:'1px solid var(--line-2)', borderRadius:'var(--r)', padding:'11px 14px', marginBottom:14, fontSize:'0.8rem', color:'var(--tx-3)', lineHeight:1.55 }}>
              We'll let the administrator know to reset your password.
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" className="form-input" placeholder="you@company.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                autoComplete="email" autoFocus />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-xl" style={{ width:'100%', marginTop:4 }} disabled={loading}>
              {loading ? <><Spinner /> Sending…</> : 'Send reset request'}
            </button>
            <button type="button" className="btn btn-ghost btn-xl" style={{ width:'100%', marginTop:6 }} onClick={() => sw('login')}>
              ← Back to sign in
            </button>
          </form>
        )}

        {/* Divider + switch */}
        {view !== 'forgot' && (
          <>
            <div className="login-divider"><span>or</span></div>
            {view === 'login' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <button className="btn btn-secondary btn-xl" style={{ width:'100%' }} onClick={() => sw('signup')}>
                  Create a new account
                </button>
                <button className="btn btn-ghost btn-xl" style={{ width:'100%' }} onClick={() => navigate('/book')}>
                  Continue without account
                </button>
              </div>
            )}
            {view === 'signup' && (
              <button className="btn btn-secondary btn-xl" style={{ width:'100%' }} onClick={() => sw('login')}>
                Already have an account? Sign in
              </button>
            )}
          </>
        )}

        <div className="login-footer">MeetingDesk · Conference Room Management System</div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
