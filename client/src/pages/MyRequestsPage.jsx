import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { format, parseISO, isToday, isFuture } from 'date-fns'
import toast from 'react-hot-toast'

const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`)
}
const toMin  = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
const toAMPM = t => { const [h,m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }
const addMins = (t,m) => { const tot = toMin(t)+m; return `${String(Math.floor(tot/60)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}` }

const STATUS_META = {
  approved: { cls:'badge-approved', lineColor:'var(--green)', label:'Approved' },
  pending:  { cls:'badge-pending',  lineColor:'var(--amber)', label:'Pending'  },
  rejected: { cls:'badge-rejected', lineColor:'var(--red)',   label:'Rejected' },
}

function RescheduleForm({ booking, today, onSave, onClose }) {
  const [form, setForm] = useState({ date: booking.date, startTime: booking.startTime, endTime: booking.endTime })
  const [loading, setLoading] = useState(false)

  const setF = (k, v) => {
    if (k === 'startTime') setForm(f => ({ ...f, startTime: v, endTime: addMins(v, 30) }))
    else setForm(f => ({ ...f, [k]: v }))
  }

  const submit = async () => {
    if (!form.date || !form.startTime || !form.endTime) { toast.error('Fill in all fields'); return }
    if (form.date < today) { toast.error('Cannot reschedule to a past date'); return }
    if (toMin(form.endTime) <= toMin(form.startTime) + 29) { toast.error('Minimum 30 minutes'); return }
    setLoading(true)
    try {
      const res = await api.patch(`/bookings/${booking.id}/reschedule`, form)
      toast.success('Booking rescheduled!')
      onSave(res.data.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reschedule') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ borderTop:'1px solid var(--accent-border)', background:'var(--bg-2)', padding:'16px 20px 14px' }}>
      <div style={{ fontSize:'0.65rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--accent-text)', marginBottom:14 }}>
        Reschedule Booking
      </div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:14 }}>
        <div className="form-group" style={{ flex:'1 1 140px', marginBottom:0 }}>
          <label className="form-label">New Date</label>
          <input className="form-input" type="date" min={today} value={form.date} onChange={e => setF('date', e.target.value)} />
        </div>
        <div className="form-group" style={{ flex:'1 1 130px', marginBottom:0 }}>
          <label className="form-label">Start Time</label>
          <select className="form-select" value={form.startTime} onChange={e => setF('startTime', e.target.value)}>
            {TIME_SLOTS.map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex:'1 1 130px', marginBottom:0 }}>
          <label className="form-label">End Time</label>
          <select className="form-select" value={form.endTime} onChange={e => setF('endTime', e.target.value)}>
            {TIME_SLOTS.filter(t => toMin(t) >= toMin(form.startTime) + 30).map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : 'Save new time'}
        </button>
      </div>
    </div>
  )
}

export default function MyRequestsPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const today     = new Date().toISOString().split('T')[0]

  const [bookings,     setBookings]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [rescheduleId, setRescheduleId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/bookings?email=${user.email}`)
      setBookings(res.data.data)
    } catch { toast.error('Failed to load bookings') }
    finally { setLoading(false) }
  }

  const handleCancel = async id => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      await api.delete(`/bookings/${id}`)
      toast.success('Booking cancelled')
      setBookings(b => b.filter(x => x.id !== id))
    } catch { toast.error('Failed to cancel') }
  }

  useEffect(() => { load() }, [user.email])

  const filtered = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return b.purpose?.toLowerCase().includes(q) ||
             b.room?.name?.toLowerCase().includes(q) ||
             b.date?.includes(q)
    }
    return true
  })

  const counts = {
    all:      bookings.length,
    approved: bookings.filter(b => b.status === 'approved').length,
    pending:  bookings.filter(b => b.status === 'pending').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
  }

  const isFutureBooking = b => new Date(`${b.date}T${b.startTime}`) > new Date()

  const dateLabel = (date, startTime) => {
    try {
      if (isToday(parseISO(date))) return 'Today'
      return format(parseISO(date), 'MMM d, yyyy')
    } catch { return date }
  }

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Requests</h1>
          <p className="page-subtitle">Track and manage your conference room booking requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/book')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:14,height:14}}><path d="M12 5v14M5 12h14"/></svg>
          New Booking
        </button>
      </div>

      {/* Filters + search */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div className="filters-bar" style={{ margin:0 }}>
            {['all','approved','pending','rejected'].map(f => (
              <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="filter-count">({counts[f] ?? 0})</span>
              </button>
            ))}
          </div>
          <div className="search-wrap" style={{ flex:1, minWidth:180 }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="form-input search-input" placeholder="Search bookings…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height:88, borderRadius:14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01"/></svg>
          </div>
          <div className="empty-title">
            {search ? 'No matching bookings' : filter === 'all' ? "You haven't made any bookings yet" : `No ${filter} bookings`}
          </div>
          <div className="empty-text">
            {!search && filter === 'all' && 'Book your first conference room to get started.'}
          </div>
          {!search && filter === 'all' && (
            <button className="btn btn-primary" onClick={() => navigate('/book')}>Book a Room</button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }} className="stagger">
          {filtered.map(b => {
            const sm = STATUS_META[b.status] || STATUS_META.pending
            const isRescheduling = rescheduleId === b.id
            const isFut = isFutureBooking(b)
            return (
              <div key={b.id} className="animate-in" style={{ overflow:'hidden', borderRadius:'var(--r-lg)', border:`1px solid ${isRescheduling ? 'var(--accent)' : 'var(--line)'}`, background:'var(--bg-1)', boxShadow:'var(--s0)', transition:'border-color var(--t), box-shadow var(--t2)' }}
                onMouseEnter={e => { if (!isRescheduling) { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'var(--s1)' } }}
                onMouseLeave={e => { if (!isRescheduling) { e.currentTarget.style.borderColor = 'var(--line)';  e.currentTarget.style.boxShadow = 'var(--s0)' } }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px' }}>
                  {/* Status bar */}
                  <div style={{ width:3, height:56, borderRadius:4, background:sm.lineColor, flexShrink:0 }} />

                  {/* Time block */}
                  <div className="booking-time-block">
                    <div className="booking-time">{toAMPM(b.startTime)}</div>
                    <div className="booking-date-label">{dateLabel(b.date, b.startTime)}</div>
                  </div>

                  {/* Info */}
                  <div className="booking-info">
                    <div className="booking-purpose">{b.purpose}</div>
                    <div className="booking-meta">
                      {b.room?.name && <span style={{ color: b.room.color || 'var(--accent-text)', fontWeight:600 }}>{b.room.name}</span>}
                      {b.room?.name && ' · '}
                      {toAMPM(b.startTime)}–{toAMPM(b.endTime)}
                      {b.attendees && ` · ${b.attendees} people`}
                    </div>
                    {b.adminRemarks && (
                      <div style={{ fontSize:'0.72rem', color:'var(--tx-3)', marginTop:4, fontStyle:'italic' }}>
                        Admin: "{b.adminRemarks}"
                      </div>
                    )}
                  </div>

                  {/* Right side */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
                    <span className={`badge ${sm.cls}`}>{sm.label}</span>
                    {isFut && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: isRescheduling ? 'var(--accent)' : 'var(--accent-subtle)', color: isRescheduling ? 'white' : 'var(--accent-text)', border:`1px solid var(--accent-border)` }}
                          onClick={() => setRescheduleId(isRescheduling ? null : b.id)}>
                          {isRescheduling ? 'Close' : 'Reschedule'}
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background:'var(--red-bg)', color:'var(--red-tx)', border:'1px solid var(--red-bd)' }}
                          onClick={() => handleCancel(b.id)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isRescheduling && (
                  <RescheduleForm
                    booking={b}
                    today={today}
                    onSave={updated => {
                      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, ...updated } : x))
                      setRescheduleId(null)
                    }}
                    onClose={() => setRescheduleId(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p style={{ marginTop:16, fontSize:'0.75rem', color:'var(--tx-3)', textAlign:'right' }}>
          Showing {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
