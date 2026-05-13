import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  useEffect(() => { localStorage.removeItem('token'); localStorage.removeItem('user') }, [])

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome, ${user.name}!`)
      navigate(user.role === 'admin' ? '/dashboard' : '/my-requests')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
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
            <span className="logo-text">Meeting<span>Desk</span></span>
          </div>
          <div className="login-title">Sign <em>In</em></div>
          <div className="login-subtitle">Access your account to book and track conference rooms</div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address <span>*</span></label>
              <input type="email" className="form-input" placeholder="your@email.com"
                value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Password <span>*</span></label>
              <input type="password" className="form-input" placeholder="••••••••"
                value={form.password} onChange={e => set('password', e.target.value)} autoComplete="current-password" />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', flexShrink: 0 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            style={{ width: '100%', marginBottom: 12 }}
            onClick={() => navigate('/book')}
          >
            Continue as Guest →
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
            No account needed — just fill in your details to book a room
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 16 }}>
          MeetingDesk · Conference Room Management
        </p>
      </div>
    </div>
  )
}
