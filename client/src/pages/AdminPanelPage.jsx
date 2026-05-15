import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toAMPM = t => { const [h, m] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; return `${h12}:${String(m).padStart(2, '0')} ${ampm}` }
const addMins = (t, m) => { const total = toMin(t) + m; return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` }

function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const handle = async e => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await api.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password updated')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally { setLoading(false) }
  }
  return (
    <div style={{ maxWidth: 420 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>Change Password</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 20 }}>Update your admin account password.</p>
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[['currentPassword','Current Password','current-password'],['newPassword','New Password','new-password'],['confirm','Confirm New Password','new-password']].map(([k,label,ac]) => (
          <div key={k} className="form-group">
            <label className="form-label">{label}</label>
            <input type="password" className="form-input" value={form[k]} onChange={set(k)} required autoComplete={ac} minLength={k !== 'currentPassword' ? 6 : undefined} />
          </div>
        ))}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

export default function AdminPanelPage() {
  const [tab, setTab] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [rooms, setRooms] = useState([])
  const [rescheduleId, setRescheduleId] = useState(null)
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', startTime: '', endTime: '' })
  const [rescheduling, setRescheduling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, rRes] = await Promise.all([api.get('/bookings'), api.get('/rooms')])
      setBookings(bRes.data.data)
      setRooms(rRes.data.data)
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openReschedule = (b) => {
    setRescheduleId(b.id)
    setRescheduleForm({ date: b.date, startTime: b.startTime, endTime: b.endTime })
  }
  const setRField = (k, v) => {
    setRescheduleForm(f => k === 'startTime' ? { ...f, startTime: v, endTime: addMins(v, 30) } : { ...f, [k]: v })
  }
  const handleReschedule = async () => {
    const { date, startTime, endTime } = rescheduleForm
    if (!date || !startTime || !endTime) { toast.error('Fill in all fields'); return }
    if (toMin(endTime) <= toMin(startTime) + 29) { toast.error('Minimum 30-minute duration'); return }
    setRescheduling(true)
    try {
      const res = await api.patch(`/bookings/${rescheduleId}/reschedule`, { date, startTime, endTime })
      toast.success('Booking rescheduled!')
      setBookings(b => b.map(x => x.id === rescheduleId ? { ...x, ...res.data.data } : x))
      setRescheduleId(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule')
    } finally { setRescheduling(false) }
  }

  const handleCancel = async id => {
    const reason = window.prompt('Reason for cancellation (leave blank if none):')
    if (reason === null) return // user clicked Cancel button
    try {
      await api.delete(`/bookings/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`)
      toast.success('Booking cancelled')
      setBookings(b => b.filter(x => x.id !== id))
    } catch { toast.error('Failed to cancel') }
  }

  const filtered = bookings.filter(b => {
    if (dateFilter && b.date !== dateFilter) return false
    if (roomFilter && b.roomId !== roomFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return b.name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q) ||
             b.purpose?.toLowerCase().includes(q) || b.room?.name?.toLowerCase().includes(q)
    }
    return true
  })

  const today = new Date().toISOString().split('T')[0]
  const todayCount = bookings.filter(b => b.date === today).length
  const upcomingCount = bookings.filter(b => b.date >= today).length

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage all bookings</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['bookings', 'settings'].map(key => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === key ? 'var(--bg-2)' : 'transparent',
            color: tab === key ? 'var(--text)' : 'var(--text-3)',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: tab === key ? 600 : 400,
            boxShadow: tab === key ? 'var(--shadow)' : 'none', transition: 'all 0.15s',
            textTransform: 'capitalize',
          }}>
            {key}
          </button>
        ))}
      </div>

      {tab === 'settings' && <ChangePasswordForm />}

      {tab === 'bookings' && <>
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
          {[
            { label: 'Total Bookings', value: bookings.length, color: '' },
            { label: 'Today',          value: todayCount,       color: 'green' },
            { label: 'Upcoming',       value: upcomingCount,    color: '' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`stat-card ${color}`} style={{ padding: '14px 18px' }}>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ fontSize: '1.8rem' }}>{loading ? '–' : value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" className="form-input" style={{ width: 160 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          <select className="form-select" style={{ width: 180 }} value={roomFilter} onChange={e => setRoomFilter(e.target.value)}>
            <option value="">All Rooms</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="form-input search-input" style={{ width: '100%' }} placeholder="Search name, email, purpose…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {(dateFilter || roomFilter || search) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setDateFilter(''); setRoomFilter(''); setSearch('') }}>Clear</button>
          )}
        </div>

        {/* Bookings list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />)
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:40,height:40,opacity:0.3}}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></div><div className="empty-title">No bookings found</div></div>
          ) : (
            filtered.map(b => {
              const isFuture = new Date(`${b.date}T${b.startTime}`) > new Date()
              return (
                <div key={b.id} style={{ marginBottom: 2 }}>
                  <div style={{
                    background: 'var(--bg-2)', border: `1px solid ${rescheduleId === b.id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: rescheduleId === b.id ? '12px 12px 0 0' : 12,
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'border-color 0.15s',
                  }}>
                    {/* Color bar */}
                    <div style={{ width: 4, height: 52, borderRadius: 4, background: b.room?.color || 'var(--accent)', flexShrink: 0 }} />

                    {/* Date/time block */}
                    <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '8px 12px', textAlign: 'center', minWidth: 76, flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{toAMPM(b.startTime)}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', marginTop: 2, letterSpacing: '0.04em' }}>
                        {b.date === today ? 'Today' : b.date}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.purpose}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-3)', marginTop: 3 }}>
                        <span style={{ color: b.room?.color || 'var(--accent-2)', fontWeight: 500 }}>{b.room?.name}</span>
                        {' · '}{toAMPM(b.startTime)}–{toAMPM(b.endTime)}
                        {' · '}{b.name} · {b.attendees} people
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 1 }}>{b.email}</div>
                    </div>

                    {/* Actions */}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span>{b.createdAt ? format(parseISO(b.createdAt), 'MMM d, HH:mm') : ''}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isFuture && (
                          <button className="btn btn-sm"
                            style={{ background: 'var(--accent-glow)', color: 'var(--accent-2)', border: '1px solid rgba(124,106,247,0.25)' }}
                            onClick={() => rescheduleId === b.id ? setRescheduleId(null) : openReschedule(b)}>
                            {rescheduleId === b.id ? 'Close' : 'Reschedule'}
                          </button>
                        )}
                        <button className="btn btn-sm" style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}
                          onClick={() => handleCancel(b.id)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline reschedule form */}
                  {rescheduleId === b.id && (
                    <div style={{
                      background: 'var(--bg-2)', border: '1px solid var(--accent)', borderTop: 'none',
                      borderRadius: '0 0 12px 12px', padding: '16px 18px 14px',
                      display: 'flex', flexDirection: 'column', gap: 12,
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-2)' }}>
                        Reschedule Booking
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                          <label className="form-label">New Date</label>
                          <input className="form-input" type="date" min={today}
                            value={rescheduleForm.date} onChange={e => setRField('date', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                          <label className="form-label">Start Time</label>
                          <select className="form-select" value={rescheduleForm.startTime} onChange={e => setRField('startTime', e.target.value)}>
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                          <label className="form-label">End Time</label>
                          <select className="form-select" value={rescheduleForm.endTime} onChange={e => setRField('endTime', e.target.value)}>
                            {TIME_SLOTS.filter(t => toMin(t) >= toMin(rescheduleForm.startTime) + 30).map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setRescheduleId(null)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={handleReschedule} disabled={rescheduling}>
                          {rescheduling ? 'Saving…' : 'Save New Time'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {!loading && (
          <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'right' }}>
            {filtered.length} of {bookings.length} bookings
          </div>
        )}
      </>}
    </div>
  )
}
