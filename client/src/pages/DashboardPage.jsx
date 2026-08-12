import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { format, parseISO } from 'date-fns'

function useCountUp(target, duration = 800, active = true) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active || !target) { setVal(target || 0); return }
    let start = null
    const step = ts => {
      if (!start) start = ts
      const pct = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - pct, 3)
      setVal(Math.round(ease * target))
      if (pct < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, active])
  return val
}

const ICONS = {
  total: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  approved: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  rejected: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  today: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
}

function StatCard({ label, value, color, icon, loading, sub }) {
  const count = useCountUp(value ?? 0, 800, !loading)
  return (
    <div className={`stat-card animate-in ${color || ''}`} style={{ animationDelay: '0ms' }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      {loading
        ? <div className="skeleton" style={{ height: 40, width: 80 }} />
        : <div className="stat-value">{count.toLocaleString()}</div>
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
  const [stats,   setStats]   = useState(null)
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const [sRes, bRes] = await Promise.all([api.get('/bookings/stats'), api.get('/bookings')])
          setStats(sRes.data.data)
          setRecent(bRes.data.data.slice(0, 10))
        } else {
          const res = await api.get(`/bookings?email=${user.email}`)
          const all = res.data.data
          setStats({
            total:         all.length,
            approved:      all.filter(b => b.status === 'approved').length,
            rejected:      all.filter(b => b.status === 'rejected').length,
            todayBookings: all.filter(b => b.date === today).length,
          })
          setRecent(all.slice(0, 10))
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [isAdmin, user, today])

  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayItems = recent.filter(b => b.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const dotColor = s => s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'amber'

  const upcomingBookings = isAdmin
    ? recent.filter(b => b.date >= today && b.status === 'approved').length
    : undefined

  return (
    <div className="page animate-in">

      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div>
          <div className="welcome-title">{greeting}, {user?.name?.split(' ')[0]}</div>
          <div className="welcome-sub">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
            {stats && ` · ${stats.todayBookings ?? 0} booking${stats.todayBookings !== 1 ? 's' : ''} today`}
          </div>
        </div>
        <div style={{ display:'flex', gap:10, position:'relative', zIndex:1 }}>
          <button className="welcome-btn" onClick={() => navigate('/calendar')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Calendar
          </button>
          <button className="welcome-btn" onClick={() => navigate('/book')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><path d="M12 5v14M5 12h14"/></svg>
            New booking
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger">
        <StatCard label="Total bookings" value={stats?.total}         icon={ICONS.total}    loading={loading} />
        <StatCard label="Approved"        value={stats?.approved}      icon={ICONS.approved} color="green" loading={loading}
          sub={stats?.approved && stats?.total ? `${Math.round((stats.approved / stats.total) * 100)}% approval rate` : undefined} />
        <StatCard label="Rejected"        value={stats?.rejected}      icon={ICONS.rejected} color="red"   loading={loading} />
        <StatCard label="Today"           value={stats?.todayBookings} icon={ICONS.today}    color="blue"  loading={loading}
          sub={upcomingBookings != null ? `${upcomingBookings} upcoming approved` : undefined} />
      </div>

      {/* Two-col content */}
      <div style={{ display:'grid', gridTemplateColumns: isAdmin ? '1fr 340px' : '1fr', gap:16, marginBottom:16 }}>

        {/* Recent Bookings */}
        <div className="card" style={{ padding:0 }}>
          <div className="card-header" style={{ padding:'16px 22px', marginBottom:0 }}>
            <div>
              <span className="card-title">Recent bookings</span>
              {!loading && recent.length > 0 && (
                <p style={{ fontSize:'0.72rem', color:'var(--tx-3)', marginTop:2 }}>
                  {recent.length} booking{recent.length !== 1 ? 's' : ''} total
                </p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(isAdmin ? '/admin' : '/my-requests')}>
              View all
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {loading ? (
            <div style={{ padding:'12px 22px 16px', display:'flex', flexDirection:'column', gap:10 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01"/></svg>
              </div>
              <div className="empty-title">No bookings yet</div>
              <div className="empty-text">Book your first conference room to get started.</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/book')}>Book a room</button>
            </div>
          ) : (
            <div style={{ padding:'0 22px 8px' }}>
              {recent.map((b, idx) => (
                <div key={b.id} className="activity-item" style={{ animationDelay:`${idx * 30}ms` }}>
                  <div className={`activity-dot ${dotColor(b.status)}`} />
                  <div className="activity-main">
                    <div className="activity-purpose">{b.purpose}</div>
                    <div className="activity-meta">
                      {b.room?.name && <span style={{ color: b.room.color || 'var(--accent-text)', fontWeight:500 }}>{b.room.name}</span>}
                      {b.room?.name && ' · '}
                      {b.date === today ? 'Today' : b.date ? format(parseISO(b.date), 'MMM d') : ''}
                      {' · '}{b.startTime}–{b.endTime}
                      {isAdmin && b.name && ` · ${b.name}`}
                    </div>
                  </div>
                  <Badge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room utilization — admin only */}
        {isAdmin && stats?.roomStats && (
          <div className="card" style={{ padding:0 }}>
            <div className="card-header" style={{ padding:'16px 22px', marginBottom:0 }}>
              <span className="card-title">Room utilization</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/rooms')}>View rooms</button>
            </div>
            <div style={{ padding:'12px 22px 18px', display:'flex', flexDirection:'column', gap:16 }}>
              {stats.roomStats.map(r => {
                const pct = Math.min(100, stats.approved > 0 ? Math.round((r.approvedBookings / stats.approved) * 100) : 0)
                return (
                  <div key={r.id}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:9, height:9, borderRadius:'50%', background: r.color || 'var(--accent)', flexShrink:0 }} />
                        <span style={{ fontSize:'0.845rem', fontWeight:600, color:'var(--tx)' }}>{r.name}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:'0.72rem', color:'var(--tx-3)', fontVariantNumeric:'tabular-nums' }}>{r.approvedBookings}</span>
                        <span style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--accent-text)', background:'var(--accent-subtle)', border:'1px solid var(--accent-border)', borderRadius:20, padding:'1px 7px' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ background:'var(--bg-2)', borderRadius:6, height:6, overflow:'hidden', border:'1px solid var(--line)' }}>
                      <div style={{ height:'100%', background: r.color ? `linear-gradient(90deg, ${r.color}cc, ${r.color})` : 'linear-gradient(90deg, var(--accent-h), var(--accent))', width:`${pct}%`, borderRadius:6, transition:'width 1.2s cubic-bezier(0.4,0,0.2,1)', boxShadow: r.color ? `0 0 6px ${r.color}80` : '0 0 6px var(--accent-glow)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      <div className="card" style={{ padding:0 }}>
        <div className="card-header" style={{ padding:'16px 22px', marginBottom:0 }}>
          <div>
            <span className="card-title">Today's schedule</span>
            <p style={{ fontSize:'0.72rem', color:'var(--tx-3)', marginTop:2 }}>{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          </div>
          {todayItems.length > 0 && (
            <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'3px 10px', borderRadius:20, background:'var(--blue-bg)', color:'var(--blue-tx)', border:'1px solid var(--blue-bd)' }}>
              {todayItems.length} today
            </span>
          )}
        </div>

        <div style={{ padding:'0 22px 16px' }}>
          {loading ? (
            <div className="skeleton" style={{ height:52, borderRadius:8 }} />
          ) : todayItems.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', gap:12 }}>
              <p style={{ fontSize:'0.845rem', color:'var(--tx-3)' }}>No meetings scheduled for today — schedule looks clear.</p>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/book')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><path d="M12 5v14M5 12h14"/></svg>
                Book a room
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, paddingTop:8 }}>
              {todayItems.map((b, i) => {
                const statusColor = b.status === 'approved' ? 'var(--green)' : b.status === 'rejected' ? 'var(--red)' : 'var(--amber)'
                return (
                  <div key={b.id} className="animate-in" style={{
                    animationDelay:`${i * 40}ms`,
                    display:'flex', alignItems:'center', gap:14,
                    padding:'11px 16px', borderRadius:'var(--r)',
                    background:'var(--bg-2)', border:'1px solid var(--line)',
                    transition:'all var(--t2)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.background = 'var(--bg-3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)';   e.currentTarget.style.background = 'var(--bg-2)'; }}>
                    <div style={{ width:3, alignSelf:'stretch', background:statusColor, borderRadius:4, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--tx)', letterSpacing:'-0.01em' }}>{b.purpose}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--tx-3)', marginTop:2 }}>
                        {b.startTime} – {b.endTime}
                        {b.room?.name && <> · <span style={{ color: b.room.color || 'var(--accent-text)', fontWeight:500 }}>{b.room.name}</span></>}
                        {b.attendees && ` · ${b.attendees} people`}
                      </div>
                    </div>
                    <Badge status={b.status} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
