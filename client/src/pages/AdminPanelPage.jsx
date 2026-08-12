import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`)
}
const toMin   = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
const toAMPM  = t => { const [h,m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }
const addMins = (t,m) => { const tot = toMin(t)+m; return `${String(Math.floor(tot/60)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}` }

const STATUS_META = {
  approved: { cls:'badge-approved', lineColor:'var(--green)',  label:'Approved' },
  pending:  { cls:'badge-pending',  lineColor:'var(--amber)',  label:'Pending'  },
  rejected: { cls:'badge-rejected', lineColor:'var(--red)',    label:'Rejected' },
}

// ─── Reject Modal ─────────────────────────────────────────
function RejectModal({ onConfirm, onClose }) {
  const [remarks, setRemarks] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }} onClick={onClose} />
      <div className="animate-scale" style={{ position:'relative', zIndex:1, background:'var(--bg-1)', border:'1px solid var(--line-2)', borderRadius:'var(--r-xl)', padding:'24px 26px', width:'100%', maxWidth:400, boxShadow:'var(--s4)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'var(--red-bg)', border:'1px solid var(--red-bd)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" style={{width:16,height:16}}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div>
            <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--tx)', letterSpacing:'-0.02em' }}>Reject Booking</h3>
            <p style={{ fontSize:'0.75rem', color:'var(--tx-3)', marginTop:1 }}>Optionally add a reason for the requester.</p>
          </div>
        </div>
        <div className="form-group" style={{ marginBottom:18 }}>
          <label className="form-label">Reason / Remarks (optional)</label>
          <textarea ref={inputRef} className="form-textarea" rows={3}
            placeholder="e.g. Room already reserved for all-hands, please choose another slot…"
            value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={() => onConfirm(remarks)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:13,height:13}}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Reject Booking
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Change Password ───────────────────────────────────────
function ChangePasswordForm() {
  const [form,    setForm]    = useState({ currentPassword:'', newPassword:'', confirm:'' })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const handle = async e => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) return toast.error('Passwords do not match')
    if (form.newPassword.length < 6) return toast.error('Minimum 6 characters')
    setLoading(true)
    try {
      await api.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password updated')
      setForm({ currentPassword:'', newPassword:'', confirm:'' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }
  return (
    <div style={{ maxWidth:440 }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:700, color:'var(--tx)', letterSpacing:'-0.02em', marginBottom:4 }}>Change Password</h2>
      <p style={{ fontSize:'0.845rem', color:'var(--tx-3)', marginBottom:20 }}>Update your admin account password.</p>
      <div className="card">
        <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[['currentPassword','Current Password','current-password'],['newPassword','New Password','new-password'],['confirm','Confirm New Password','new-password']].map(([k,label,ac]) => (
            <div key={k} className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">{label}</label>
              <input type="password" className="form-input" value={form[k]} onChange={set(k)} required autoComplete={ac} />
            </div>
          ))}
          <div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth:160 }}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reschedule Inline ────────────────────────────────────
function RescheduleInline({ booking, today, onSave, onClose }) {
  const [form, setForm]       = useState({ date:booking.date, startTime:booking.startTime, endTime:booking.endTime })
  const [loading, setLoading] = useState(false)
  const setF = (k,v) => {
    if (k === 'startTime') setForm(f => ({ ...f, startTime:v, endTime:addMins(v,30) }))
    else setForm(f => ({ ...f, [k]:v }))
  }
  const submit = async () => {
    if (!form.date || !form.startTime || !form.endTime) { toast.error('Fill all fields'); return }
    if (toMin(form.endTime) <= toMin(form.startTime)+29) { toast.error('Min 30 minutes'); return }
    setLoading(true)
    try {
      const res = await api.patch(`/bookings/${booking.id}/reschedule`, form)
      toast.success('Rescheduled!')
      onSave(res.data.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }
  return (
    <div style={{ borderTop:'1px solid var(--accent-border)', background:'var(--bg-2)', padding:'16px 20px 14px' }}>
      <div style={{ fontSize:'0.65rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--accent-text)', marginBottom:12 }}>Reschedule Booking</div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12 }}>
        <div className="form-group" style={{ flex:'1 1 140px', marginBottom:0 }}>
          <label className="form-label">New Date</label>
          <input className="form-input" type="date" min={today} value={form.date} onChange={e => setF('date',e.target.value)} />
        </div>
        <div className="form-group" style={{ flex:'1 1 130px', marginBottom:0 }}>
          <label className="form-label">Start Time</label>
          <select className="form-select" value={form.startTime} onChange={e => setF('startTime',e.target.value)}>
            {TIME_SLOTS.map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex:'1 1 130px', marginBottom:0 }}>
          <label className="form-label">End Time</label>
          <select className="form-select" value={form.endTime} onChange={e => setF('endTime',e.target.value)}>
            {TIME_SLOTS.filter(t => toMin(t) >= toMin(form.startTime)+30).map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>{loading ? 'Saving…' : 'Save new time'}</button>
      </div>
    </div>
  )
}

const TABS = [
  { id:'bookings', label:'Manage Bookings' },
  { id:'settings', label:'Settings' },
]

export default function AdminPanelPage() {
  const [tab,          setTab]          = useState('bookings')
  const [bookings,     setBookings]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [dateFilter,   setDateFilter]   = useState('')
  const [roomFilter,   setRoomFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [rooms,        setRooms]        = useState([])
  const [rescheduleId, setRescheduleId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

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

  const updateStatus = async (id, status, adminRemarks = '') => {
    setActionLoading(id + status)
    try {
      const res = await api.put(`/bookings/${id}`, { status, adminRemarks })
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...res.data.data } : b))
      toast.success(`Booking ${status}`)
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${status}`)
    } finally { setActionLoading(null) }
  }

  const handleCancel = async id => {
    const reason = window.prompt('Reason for cancellation (leave blank if none):')
    if (reason === null) return
    try {
      await api.delete(`/bookings/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`)
      toast.success('Booking cancelled')
      setBookings(b => b.filter(x => x.id !== id))
    } catch { toast.error('Failed to cancel') }
  }

  const filtered = bookings.filter(b => {
    if (dateFilter   && b.date   !== dateFilter)   return false
    if (roomFilter   && b.roomId !== roomFilter)   return false
    if (statusFilter && b.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return b.name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q) ||
             b.purpose?.toLowerCase().includes(q) || b.room?.name?.toLowerCase().includes(q)
    }
    return true
  })

  const today      = new Date().toISOString().split('T')[0]
  const todayCount = bookings.filter(b => b.date === today).length
  const upcomingCnt= bookings.filter(b => b.date >= today).length
  const pendingCnt = bookings.filter(b => b.status === 'pending').length
  const hasFilters = dateFilter || roomFilter || statusFilter || search

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Review, approve and manage all booking requests</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{width:13,height:13}}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:2, marginBottom:26, background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:'var(--r-lg)', padding:4, width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'7px 18px', borderRadius:'var(--r)', border:'none', cursor:'pointer',
            background: tab === t.id ? 'var(--bg-1)' : 'transparent',
            color: tab === t.id ? 'var(--tx)' : 'var(--tx-3)',
            fontFamily:'var(--font)', fontSize:'0.845rem',
            fontWeight: tab === t.id ? 700 : 500,
            boxShadow: tab === t.id ? 'var(--s2)' : 'none', transition:'all var(--t2)',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'settings' && <ChangePasswordForm />}

      {tab === 'bookings' && (
        <>
          {/* Mini stats */}
          <div className="stats-grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', marginBottom:24 }}>
            {[
              { label:'Total',    value: bookings.length, color:'',      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
              { label:'Pending',  value: pendingCnt,      color:'amber', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { label:'Today',    value: todayCount,      color:'blue',  icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01"/></svg> },
              { label:'Upcoming', value: upcomingCnt,     color:'green', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
            ].map(s => (
              <div key={s.label} className={`stat-card ${s.color}`} style={{ padding:'16px 18px' }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize:'2rem' }}>{loading ? '–' : s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
            <input type="date" className="form-input" style={{ width:160 }}
              value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            <select className="form-select" style={{ width:180 }}
              value={roomFilter} onChange={e => setRoomFilter(e.target.value)}>
              <option value="">All Rooms</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className="form-select" style={{ width:155 }}
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="search-wrap" style={{ flex:1, minWidth:200 }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="form-input search-input" placeholder="Search name, email, purpose…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setDateFilter(''); setRoomFilter(''); setStatusFilter(''); setSearch('') }}>
                Clear all
              </button>
            )}
          </div>

          {!loading && (
            <p style={{ fontSize:'0.75rem', color:'var(--tx-3)', marginBottom:12 }}>
              {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
              {hasFilters && ' (filtered)'}
            </p>
          )}

          {/* Bookings */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {loading ? (
              Array.from({ length:6 }).map((_,i) => <div key={i} className="skeleton" style={{ height:96, borderRadius:14 }} />)
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <div className="empty-title">No bookings found</div>
                <div className="empty-text">{hasFilters ? 'Try adjusting your filters.' : 'No bookings in the system yet.'}</div>
              </div>
            ) : (
              filtered.map(b => {
                const sm      = STATUS_META[b.status] || STATUS_META.pending
                const isFut   = new Date(`${b.date}T${b.startTime}`) > new Date()
                const isRSch  = rescheduleId === b.id
                const isPending  = b.status === 'pending'
                const isApproved = b.status === 'approved'
                const isRejected = b.status === 'rejected'
                return (
                  <div key={b.id} style={{
                    overflow:'hidden', borderRadius:'var(--r-lg)',
                    border:`1px solid ${isRSch ? 'var(--accent)' : 'var(--line)'}`,
                    background: 'var(--bg-1)',
                    boxShadow: 'var(--s0)',
                    transition:'all var(--t2)',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px' }}>
                      {/* Status bar */}
                      <div style={{ width:3, height:64, borderRadius:4, background:sm.lineColor, flexShrink:0 }} />

                      {/* Date/time block */}
                      <div className="booking-time-block" style={{ minWidth:82 }}>
                        <div className="booking-time">{toAMPM(b.startTime)}</div>
                        <div className="booking-date-label">{b.date === today ? 'Today' : b.date}</div>
                        <div style={{ fontSize:'0.56rem', color:'var(--tx-3)', marginTop:2 }}>{toAMPM(b.startTime)}–{toAMPM(b.endTime)}</div>
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'-0.01em' }}>
                          {b.purpose}
                        </div>
                        <div style={{ fontSize:'0.76rem', color:'var(--tx-3)', marginTop:3, display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                          {b.room?.name && <span style={{ color:b.room.color || 'var(--accent-text)', fontWeight:600 }}>{b.room.name}</span>}
                          {b.attendees && <span>· {b.attendees} people</span>}
                          {b.createdAt && <span>· submitted {format(parseISO(b.createdAt), 'MMM d, HH:mm')}</span>}
                        </div>
                        <div style={{ fontSize:'0.76rem', color:'var(--tx-2)', marginTop:3, fontWeight:550 }}>
                          {b.name}
                          <span style={{ fontWeight:400, color:'var(--tx-3)', marginLeft:6 }}>{b.email}</span>
                        </div>
                        {b.adminRemarks && (
                          <div style={{ fontSize:'0.72rem', color:'var(--red-tx)', marginTop:4, fontStyle:'italic' }}>
                            Remarks: "{b.adminRemarks}"
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
                        <span className={`badge ${sm.cls}`}>{sm.label}</span>

                        <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
                          {/* Reject — admin can cancel/reject any booking */}
                          {!isRejected && (
                            <button className="btn btn-sm"
                              style={{ background:'var(--red-bg)', color:'var(--red-tx)', border:'1px solid var(--red-bd)', fontWeight:700 }}
                              disabled={actionLoading === b.id + 'rejected'}
                              onClick={() => setRejectTarget(b)}>
                              {actionLoading === b.id + 'rejected' ? '…' : (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  Reject
                                </>
                              )}
                            </button>
                          )}

                          {/* Reschedule — future bookings */}
                          {isFut && (
                            <button className="btn btn-sm"
                              style={{ background: isRSch ? 'var(--accent)' : 'var(--accent-subtle)', color: isRSch ? 'white' : 'var(--accent-text)', border:'1px solid var(--accent-border)' }}
                              onClick={() => setRescheduleId(isRSch ? null : b.id)}>
                              {isRSch ? 'Close' : 'Reschedule'}
                            </button>
                          )}

                          {/* Cancel */}
                          <button className="btn btn-sm"
                            style={{ background:'var(--bg-2)', color:'var(--tx-3)', border:'1px solid var(--line)' }}
                            onClick={() => handleCancel(b.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {isRSch && (
                      <RescheduleInline
                        booking={b} today={today}
                        onSave={updated => { setBookings(prev => prev.map(x => x.id === b.id ? { ...x, ...updated } : x)); setRescheduleId(null) }}
                        onClose={() => setRescheduleId(null)}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={remarks => {
            updateStatus(rejectTarget.id, 'rejected', remarks)
            setRejectTarget(null)
          }}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  )
}
