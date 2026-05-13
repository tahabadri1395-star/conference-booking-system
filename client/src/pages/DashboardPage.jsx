// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { format, parseISO } from 'date-fns'

function StatCard({ label, value, color, icon, loading }) {
  return (
    <div className={`stat-card ${color || ''}`}>
      <div className="stat-label">{label}</div>
      {loading
        ? <div className="skeleton" style={{ height: 40, width: 80, marginTop: 4 }} />
        : <div className="stat-value">{value}</div>
      }
      <div className="stat-icon">{icon}</div>
    </div>
  )
}

function StatusBadge({ status }) {
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
          const [statsRes, bookingsRes] = await Promise.all([
            api.get('/bookings/stats'),
            api.get('/bookings')
          ])
          setStats(statsRes.data.data)
          setRecent(bookingsRes.data.data.slice(0, 5))
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
          setRecent(all.slice(0, 5))
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

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} — Here's your booking overview
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/book')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Book a Room
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Bookings" value={stats?.total ?? 0} loading={loading} icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        } />
        <StatCard label="Pending Review" value={stats?.pending ?? 0} color="yellow" loading={loading} icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        } />
        <StatCard label="Approved" value={stats?.approved ?? 0} color="green" loading={loading} icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        } />
        <StatCard label="Rejected" value={stats?.rejected ?? 0} color="red" loading={loading} icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        } />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Recent Bookings */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>
              Recent Bookings
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(isAdmin ? '/admin' : '/my-requests')}>
              View all →
            </button>
          </div>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 8 }} />
            ))
          ) : recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:40,height:40,opacity:0.3}}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></div>
              <div className="empty-title">No bookings yet</div>
              <div className="empty-text">Your recent requests will appear here</div>
            </div>
          ) : (
            recent.map(b => (
              <div key={b.id} className="booking-item" style={{ padding: '12px 14px' }}>
                <div className="booking-time-block" style={{ minWidth: 64, padding: '8px 10px' }}>
                  <div className="booking-time" style={{ fontSize: '0.9rem' }}>{b.startTime}</div>
                  <div className="booking-date-label">{b.date === today ? 'Today' : format(parseISO(b.date), 'MMM d')}</div>
                </div>
                <div className="booking-info">
                  <div className="booking-purpose">{b.purpose}</div>
                  <div className="booking-meta">{b.room?.name} · {b.name}</div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))
          )}
        </div>

        {/* Room Usage — admin only */}
        {isAdmin && stats?.roomStats && (
          <div className="card">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 20 }}>
              Room Usage
            </h2>
            {stats.roomStats.map(r => (
              <div key={r.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-2)' }}>
                    {r.name}
                    <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>{r.floor}</span>
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{r.approvedBookings} approved</span>
                </div>
                <div style={{ background: 'var(--bg-3)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: r.color,
                    width: `${Math.min(100, (r.approvedBookings / Math.max(stats.approved, 1)) * 100)}%`,
                    borderRadius: 6,
                    transition: 'width 0.6s ease',
                    opacity: 0.8,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>
            Today's Schedule
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{format(new Date(), 'EEEE, MMMM d')}</span>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 60 }} />
        ) : (() => {
          const todayItems = recent.filter(b => b.date === today)
          return todayItems.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', padding: '12px 0' }}>
              No bookings scheduled for today.{' '}
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/book')} style={{ display: 'inline-flex' }}>
                Book a room →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayItems.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8 }}>
                  <div style={{ width: 3, height: 36, background: b.status === 'approved' ? 'var(--green)' : b.status === 'pending' ? 'var(--yellow)' : 'var(--red)', borderRadius: 4 }} />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{b.purpose}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{b.startTime} – {b.endTime} · {b.room?.name}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
