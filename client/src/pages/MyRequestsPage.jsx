// src/pages/MyRequestsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { format, parseISO, isToday, isFuture } from 'date-fns'
import toast from 'react-hot-toast'

const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toAMPM = t => { const [h, m] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; return `${h12}:${String(m).padStart(2, '0')} ${ampm}` }
const addMins = (t, m) => { const total = toMin(t) + m; return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` }

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

export default function MyRequestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [rescheduleId, setRescheduleId] = useState(null)
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', startTime: '', endTime: '' })
  const [rescheduling, setRescheduling] = useState(false)

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

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      await api.delete(`/bookings/${id}`)
      toast.success('Booking cancelled')
      setBookings(b => b.filter(x => x.id !== id))
    } catch {
      toast.error('Failed to cancel booking')
    }
  }

  const openReschedule = (b) => {
    setRescheduleId(b.id)
    setRescheduleForm({ date: b.date, startTime: b.startTime, endTime: b.endTime })
  }

  const setField = (k, v) => {
    setRescheduleForm(f => {
      if (k === 'startTime') {
        return { ...f, startTime: v, endTime: addMins(v, 30) }
      }
      return { ...f, [k]: v }
    })
  }

  const handleReschedule = async () => {
    const { date, startTime, endTime } = rescheduleForm
    if (!date || !startTime || !endTime) { toast.error('Fill in all fields'); return }
    if (date < today) { toast.error('Cannot reschedule to a past date'); return }
    if (toMin(endTime) <= toMin(startTime) + 29) { toast.error('Minimum 30-minute duration'); return }
    setRescheduling(true)
    try {
      const res = await api.patch(`/bookings/${rescheduleId}/reschedule`, { date, startTime, endTime })
      toast.success('Booking rescheduled!')
      setBookings(b => b.map(x => x.id === rescheduleId ? { ...x, ...res.data.data } : x))
      setRescheduleId(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule')
    } finally {
      setRescheduling(false)
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

  const isFutureBooking = b => new Date(`${b.date}T${b.startTime}`) > new Date()

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
            <div key={b.id} style={{ marginBottom: 8 }}>
              <div className="booking-item animate-in" style={{ marginBottom: 0 }}>
                {/* Color bar */}
                <div style={{
                  width: 4, height: 60, borderRadius: 4, flexShrink: 0,
                  background: b.status === 'approved' ? 'var(--green)' : 'var(--red)'
                }} />

                <div className="booking-time-block">
                  <div className="booking-time">{toAMPM(b.startTime)}</div>
                  <div className="booking-date-label">{timeUntil(b.date, b.startTime)}</div>
                </div>

                <div className="booking-info" style={{ flex: 1 }}>
                  <div className="booking-purpose">{b.purpose}</div>
                  <div className="booking-meta">
                    <span style={{ color: b.room?.color || 'var(--accent-text)', fontWeight: 500 }}>{b.room?.name}</span>
                    <span> · {toAMPM(b.startTime)}–{toAMPM(b.endTime)} · {b.date}</span>
                  </div>
                  {b.adminRemarks && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)', marginTop: 3, fontStyle: 'italic' }}>
                      "{b.adminRemarks}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <StatusBadge status={b.status} />
                  {isFutureBooking(b) && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(91,91,214,0.2)', fontSize: '0.72rem' }}
                        onClick={() => rescheduleId === b.id ? setRescheduleId(null) : openReschedule(b)}
                      >
                        {rescheduleId === b.id ? 'Close' : 'Reschedule'}
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', fontSize: '0.72rem' }}
                        onClick={() => handleCancel(b.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline reschedule form */}
              {rescheduleId === b.id && (
                <div style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--accent)',
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  padding: '16px 16px 14px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-text)' }}>
                    Reschedule Booking
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                      <label className="form-label">New Date</label>
                      <input
                        className="form-input"
                        type="date"
                        min={today}
                        value={rescheduleForm.date}
                        onChange={e => setField('date', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                      <label className="form-label">Start Time</label>
                      <select className="form-select" value={rescheduleForm.startTime} onChange={e => setField('startTime', e.target.value)}>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                      <label className="form-label">End Time</label>
                      <select className="form-select" value={rescheduleForm.endTime} onChange={e => setField('endTime', e.target.value)}>
                        {TIME_SLOTS.filter(t => toMin(t) >= toMin(rescheduleForm.startTime) + 30).map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setRescheduleId(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleReschedule} disabled={rescheduling}>
                      {rescheduling ? 'Saving…' : 'Save New Time'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
