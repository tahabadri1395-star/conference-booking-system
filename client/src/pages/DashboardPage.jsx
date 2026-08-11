import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { format, parseISO } from 'date-fns'

function useCountUp(target, duration = 700, active = true) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active || !target) { setVal(target || 0); return }
    let start = null
    const step = ts => {
      if (!start) start = ts
      const pct = Math.min((ts - start) / duration, 1)
      setVal(Math.round(pct * target))
      if (pct < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, active])
  return val
}

function StatCard({ label, value, color, loading, sub }) {
  const count = useCountUp(value ?? 0, 700, !loading)
  return (
    <div className={`stat-card ${color || ''}`}>
      <div className="stat-label">{label}</div>
      {loading
        ? <div className="skeleton" style={{ height: 36, width: 60, marginTop: 4 }} />
        : <div className="stat-value">{count}</div>
      }
      {sub && !loading && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function Badge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
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
          const [sRes, bRes] = await Promise.all([api.get('/bookings/stats'), api.get('/bookings')])
          setStats(sRes.data.data)
          setRecent(bRes.data.data.slice(0, 8))
        } else {
          const res = await api.get(`/bookings?email=${user.email}`)
          const all = res.data.data
          setStats({
            total:    all.length,
            approved: all.filter(b => b.status === 'approved').length,
            rejected: all.filter(b => b.status === 'rejected').length,
            todayBookings: all.filter(b => b.date === today).length,
          })
          setRecent(all.slice(0, 8))
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [isAdmin, user, today])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayItems = recent.filter(b => b.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime))

  const dotColor = s => s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'amber'

  return (
    <div className="page animate-in">

      {/* ── Welcome banner ── */}
      <div className="welcome-banner">
        <div>
          <div className="welcome-title">{greeting}, {user?.name?.split(' ')[0]}</div>
          <div className="welcome-sub">{format(new Date(), 'EEEE, d MMMM yyyy')} — {stats?.todayBookings ?? 0} booking{stats?.todayBookings !== 1 ? 's' : ''} today</div>
        </div>
        <button className="welcome-btn" onClick={() => navigate('/book')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          New booking
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <StatCard label="Total bookings" value={stats?.total}    loading={loading} />
        <StatCard label="Approved"        value={stats?.approved} loading={loading} color="green" />
        <StatCard label="Rejected"        value={stats?.rejected} loading={loading} color="red" />
        <StatCard label="Today"           value={stats?.todayBookings} loading={loading} color="blue" />
      </div>

      {/* ── Two-column content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 340px' : '1fr', gap: 16, marginBottom: 16 }}>

        {/* Recent activity */}
        <div className="card" style={{ padding: '0' }}>
          <div className="card-header" style={{ padding: '16px 20px', marginBottom: 0 }}>
            <span className="card-title">Recent bookings</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(isAdmin ? '/admin' : '/my-requests')}>View all</button>
          </div>

          {loading ? (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></div>
              <div className="empty-title">No bookings yet</div>
              <div className="empty-text">Book your first room to get started.</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/book')}>Book a room</button>
            </div>
          ) : (
            <div style={{ padding: '0 20px 4px' }}>
              {recent.map(b => (
                <div key={b.id} className="activity-item">
                  <div className={`activity-dot ${dotColor(b.status)}`} />
                  <div className="activity-main">
                    <div className="activity-purpose">{b.purpose}</div>
                    <div className="activity-meta">
                      {b.room?.name && <span>{b.room.name} · </span>}
                      {b.date === today ? 'Today' : format(parseISO(b.date), 'MMM d')} · {b.startTime}–{b.endTime}
                    </div>
                  </div>
                  <Badge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room usage — admin only */}
        {isAdmin && stats?.roomStats && (
          <div className="card" style={{ padding: '0' }}>
            <div className="card-header" style={{ padding: '16px 20px', marginBottom: 0 }}>
              <span className="card-title">Room utilization</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/rooms')}>View</button>
            </div>
            <div style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stats.roomStats.map(r => {
                const pct = Math.min(100, stats.approved > 0 ? Math.round((r.approvedBookings / stats.approved) * 100) : 0)
                return (
                  <div key={r.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color || 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--tx)' }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--tx-3)', fontTabularNums: true }}>{r.approvedBookings} · {pct}%</span>
                    </div>
                    <div style={{ background: 'var(--bg-2)', borderRadius: 4, height: 5, overflow: 'hidden', border: '1px solid var(--line)' }}>
                      <div style={{ height: '100%', background: r.color || 'var(--accent)', width: `${pct}%`, borderRadius: 4, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Today's schedule ── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <span className="card-title">Today's schedule</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--tx-3)' }}>{format(new Date(), 'd MMMM yyyy')}</span>
        </div>
        <div style={{ padding: '0 20px 16px' }}>
          {loading ? (
            <div className="skeleton" style={{ height: 48, borderRadius: 6 }} />
          ) : todayItems.length === 0 ? (
            <div style={{ display: 'flex', align: 'center', gap: 10, padding: '12px 0', fontSize: '0.845rem', color: 'var(--tx-3)' }}>
              No meetings scheduled for today.
              <button className="btn btn-ghost btn-sm" style={{ display: 'inline-flex' }} onClick={() => navigate('/book')}>
                Book a room
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
              {todayItems.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 'var(--r-sm)',
                  background: 'var(--bg-1)', border: '1px solid var(--line)',
                }}>
                  <div style={{ width: 3, alignSelf: 'stretch', background: b.status === 'approved' ? 'var(--green)' : 'var(--red)', borderRadius: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--tx)' }}>{b.purpose}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)', marginTop: 1 }}>{b.startTime} – {b.endTime} · {b.room?.name}</div>
                  </div>
                  <Badge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
