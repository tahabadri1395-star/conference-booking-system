import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { format, parseISO } from 'date-fns'

function useCountUp(target, duration = 800, active = true) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active || target === 0) { setVal(target); return }
    const step = Math.ceil(duration / target)
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + Math.max(1, Math.ceil(target / (duration / step))), target)
      setVal(current)
      if (current >= target) clearInterval(timer)
    }, step)
    return () => clearInterval(timer)
  }, [target, active])
  return val
}

function StatCard({ label, value, color, icon, loading, suffix = '' }) {
  const count = useCountUp(value ?? 0, 900, !loading)
  return (
    <div className={`stat-card ${color || ''}`}>
      <div className="stat-label">{label}</div>
      {loading
        ? <div className="skeleton" style={{ height: 44, width: 72, marginTop: 4 }} />
        : <div className="stat-value">{count}{suffix}</div>
      }
      <div className="stat-icon">{icon}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

const QuickIcons = {
  book:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  rooms:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>,
  requests: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const [statsRes, bookingsRes] = await Promise.all([
            api.get('/bookings/stats'),
            api.get('/bookings')
          ])
          setStats(statsRes.data.data)
          setRecent(bookingsRes.data.data.slice(0, 6))
        } else {
          const res = await api.get(`/bookings?email=${user.email}`)
          const all = res.data.data
          setStats({
            total: all.length,
            pending: all.filter(b => b.status === 'pending').length,
            approved: all.filter(b => b.status === 'approved').length,
            rejected: all.filter(b => b.status === 'rejected').length,
            todayBookings: all.filter(b => b.date === today).length,
          })
          setRecent(all.slice(0, 6))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin, user, today])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const todayItems = recent.filter(b => b.date === today)

  return (
    <div className="page animate-in">

      {/* ── Hero Card ───────────────────────────────────────────────── */}
      <div className="hero-card">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="hero-title">
                {greeting()}, {user?.name?.split(' ')[0]} 👋
              </div>
              <div className="hero-subtitle">
                {format(new Date(), 'EEEE, MMMM d, yyyy')} · Here's what's happening today
              </div>
            </div>
            <button
              className="btn"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)', minHeight: 40 }}
              onClick={() => navigate('/book')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              Book a Room
            </button>
          </div>

          {/* Today inline stats */}
          <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { label: "Today's Bookings", value: stats?.todayBookings ?? 0 },
              { label: 'Approved',          value: stats?.approved     ?? 0 },
              { label: 'Total',             value: stats?.total        ?? 0 },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                  {loading ? '–' : value}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="quick-actions">
        <button className="quick-action-btn accent" onClick={() => navigate('/book')}>
          {QuickIcons.book}
          Book a Room
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/calendar')}>
          {QuickIcons.calendar}
          Calendar
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/rooms')}>
          {QuickIcons.rooms}
          View Rooms
        </button>
        <button className="quick-action-btn" onClick={() => navigate(isAdmin ? '/admin' : '/my-requests')}>
          {QuickIcons.requests}
          {isAdmin ? 'Manage' : 'My Requests'}
        </button>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard
          label="Total Bookings" value={stats?.total ?? 0} loading={loading}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>}
        />
        <StatCard
          label="Approved" value={stats?.approved ?? 0} color="green" loading={loading}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>}
        />
        <StatCard
          label="Rejected" value={stats?.rejected ?? 0} color="red" loading={loading}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>}
        />
        <StatCard
          label="Today" value={stats?.todayBookings ?? 0} color="purple" loading={loading}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
      </div>

      {/* ── Content Grid ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 18, marginBottom: 18 }}>

        {/* Recent Bookings */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">Recent Bookings</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(isAdmin ? '/admin' : '/my-requests')}>
              View all →
            </button>
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 8 }} />
            ))
          ) : recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:40,height:40,opacity:0.3}}>
                  <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>
                </svg>
              </div>
              <div className="empty-title">No bookings yet</div>
              <div className="empty-text">Recent requests will appear here</div>
            </div>
          ) : (
            recent.map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 12px', borderRadius: 10, marginBottom: 6,
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                transition: 'all 0.15s',
              }}>
                {/* Status indicator */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: b.status === 'approved' ? 'var(--green)' : b.status === 'rejected' ? 'var(--red)' : 'var(--yellow)',
                  boxShadow: `0 0 6px ${b.status === 'approved' ? 'rgba(5,150,105,0.5)' : b.status === 'rejected' ? 'rgba(220,38,38,0.5)' : 'rgba(217,119,6,0.5)'}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.purpose}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 1 }}>
                    {b.room?.name} · {b.date === today ? 'Today' : format(parseISO(b.date), 'MMM d')} · {b.startTime}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))
          )}
        </div>

        {/* Room Usage — admin only */}
        {isAdmin && stats?.roomStats && (
          <div className="card">
            <div className="section-header">
              <div className="section-title">Room Utilization</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/rooms')}>View →</button>
            </div>
            {stats.roomStats.map((r, idx) => {
              const pct = Math.min(100, Math.round((r.approvedBookings / Math.max(stats.approved, 1)) * 100))
              return (
                <div key={r.id} style={{ marginBottom: idx < stats.roomStats.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color || 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{r.name}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 500 }}>
                      {r.approvedBookings} bookings · {pct}%
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 8, height: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{
                      height: '100%',
                      background: r.color || 'var(--accent-gradient)',
                      width: `${pct}%`,
                      borderRadius: 8,
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: `0 0 8px ${r.color || 'var(--accent-glow)'}`,
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Today's Schedule ──────────────────────────────────────────── */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Today's Schedule</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            {format(new Date(), 'EEEE, MMMM d')}
          </span>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 60 }} />
        ) : todayItems.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', color: 'var(--text-3)', fontSize: '0.875rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--green-bg)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" style={{width:18,height:18}}>
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--green)', marginBottom: 2 }}>All clear today</div>
              <div>No meetings scheduled.{' '}
                <button className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', padding: '2px 6px', minHeight: 'unset' }} onClick={() => navigate('/book')}>
                  Book a room →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayItems.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: 'var(--bg-3)',
                borderRadius: 10, border: '1px solid var(--border)',
              }}>
                <div style={{ width: 3, height: 40, background: b.status === 'approved' ? 'var(--green)' : 'var(--red)', borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{b.purpose}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
                    {b.startTime} – {b.endTime} · {b.room?.name}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
