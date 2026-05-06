import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const switchMode = (m) => { setMode(m); setForm({ name: '', email: '', password: '', role: 'user' }); setErrors({}) }

  // Clear any stale session when landing on the login page
  useEffect(() => { localStorage.removeItem('token'); localStorage.removeItem('user') }, [])

  const validate = () => {
    const e = {}
    if (mode === 'signup' && !form.name.trim()) e.name = 'Name is required'
    if (!form.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    else if (mode === 'signup' && form.password.length < 6) e.password = 'At least 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const user = await login(form.email, form.password)
        toast.success(`Welcome back, ${user.name}!`)
        navigate('/dashboard')
      } else {
        await register(form.name, form.email, form.password, form.role)
        toast.success('Registration submitted! You can sign in once an admin approves your account.')
        switchMode('login')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card animate-in">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20, color: 'white' }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01"/>
              </svg>
            </div>
            <span className="logo-text" style={{ fontSize: '1.4rem' }}>Gather<span>ly</span></span>
          </div>
          <div className="login-title">
            {mode === 'login' ? <>Welcome <em>back</em></> : <>Create an <em>account</em></>}
          </div>
          <div className="login-subtitle">
            {mode === 'login' ? 'Sign in to manage conference room bookings' : 'Join to start booking the Fakhri Makan Conference Room'}
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {['login', 'signup'].map(m => (
            <button key={m} type="button"
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 7, cursor: 'pointer',
                background: mode === m ? 'var(--bg-2)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-3)',
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: mode === m ? 600 : 400,
                boxShadow: mode === m ? 'var(--shadow)' : 'none',
                transition: 'all 0.18s',
              }}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full Name <span>*</span></label>
                <input type="text" className="form-input" placeholder="Your full name"
                  value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email address <span>*</span></label>
              <input type="email" className="form-input" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: mode === 'signup' ? 18 : 24 }}>
              <label className="form-label">Password <span>*</span></label>
              <input type="password" className="form-input" placeholder="••••••••"
                value={form.password} onChange={e => set('password', e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              {errors.password && <span className="form-error">{errors.password}</span>}
              {mode === 'signup' && !errors.password && (
                <span className="form-hint">Minimum 6 characters</span>
              )}
            </div>

            {mode === 'signup' && (
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Role <span>*</span></label>
                <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="khidmat_guzar">Khidmat Guzar</option>
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign in →' : 'Create account →')}
            </button>
          </form>
        </div>


        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 20 }}>
          Gatherly · Fakhri Makan Conference Booking
        </p>
      </div>
    </div>
  )
}
