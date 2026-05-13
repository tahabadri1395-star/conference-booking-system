// src/pages/MyRequestsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { format, parseISO, isToday, isFuture } from 'date-fns'
import toast from 'react-hot-toast'

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

export default function MyRequestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/bookings?email=${user.email}`)
      setBookings(res.data.data)
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user.email])

  const filtered = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return b.purpose?.toLowerCase().includes(q) || b.room?.name?.toLowerCase().includes(q) || b.date?.includes(q)
    }
    return true
  })

  const counts = {
    all: bookings.length,
    approved: bookings.filter(b => b.status === 'approved').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
  }

  const timeUntil = (date, startTime) => {
    try {
      const dt = parseISO(`${date}T${startTime}:00`)
      if (isToday(parseISO(date))) return 'Today'
      if (isFuture(dt)) return `${format(parseISO(date), 'MMM d')}`
      return format(parseISO(date), 'MMM d, yyyy')
    } catch { return date }
  }

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Requests</h1>
          <p className="page-subtitle">Track your conference room booking requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/book')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M12 5v14M5 12h14"/></svg>
          New Booking
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <div className="filters-bar" style={{ margin: 0 }}>
          {['all', 'approved', 'rejected'].map(f => (
            <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{ marginLeft: 5, opacity: 0.7, fontSize: '0.7rem' }}>({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="form-input search-input" style={{ width: '100%' }} placeholder="Search bookings…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: 8, borderRadius: 10 }} />
        ))
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:40,height:40,opacity:0.3}}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></div>
          <div className="empty-title">{search ? 'No matching bookings' : filter === 'all' ? "You haven't made any bookings yet" : `No ${filter} bookings`}</div>
          <div className="empty-text" style={{ marginBottom: 16 }}>
            {!search && filter === 'all' && 'Book your first conference room to get started.'}
          </div>
          {!search && filter === 'all' && (
            <button className="btn btn-primary" onClick={() => navigate('/book')}>Book a Room</button>
          )}
        </div>
      ) : (
        <div>
          {filtered.map(b => (
            <div key={b.id} className="booking-item animate-in">
              {/* Color bar */}
              <div style={{
                width: 4, height: 60, borderRadius: 4, flexShrink: 0,
                background: b.status === 'approved' ? 'var(--green)' : 'var(--red)'
              }} />

              <div className="booking-time-block">
                <div className="booking-time">{b.startTime}</div>
                <div className="booking-date-label">{timeUntil(b.date, b.startTime)}</div>
              </div>

              <div className="booking-info" style={{ flex: 1 }}>
                <div className="booking-purpose">{b.purpose}</div>
                <div className="booking-meta">
                  <span style={{ color: b.room?.color || 'var(--accent-2)', fontWeight: 500 }}>{b.room?.name}</span>
                  <span> · {b.startTime}–{b.endTime} · {b.date}</span>
                </div>
                {b.adminRemarks && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 3, fontStyle: 'italic' }}>
                    "{b.adminRemarks}"
                  </div>
                )}
              </div>

              <StatusBadge status={b.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
