import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

const getNextSlot = () => {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.ceil((mins + 1) / 30) * 30
  const clamped = Math.max(7 * 60, Math.min(21 * 60, rounded))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const addMins = (t, m) => { const total = toMin(t) + m; return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` }
const minToLabel = m => {
  const h = Math.floor(m / 60), min = m % 60, ampm = h >= 12 ? 'pm' : 'am'
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(min).padStart(2, '0')}${ampm}`
}

export default function BookRoomPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const today = new Date().toISOString().split('T')[0]

  const initialDate = location.state?.date || today
  const initStart = initialDate === today ? getNextSlot() : '09:00'
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    date: initialDate,
    startTime: initStart,
    endTime: addMins(initStart, 30),
    purpose: '',
    attendees: '',
    roomId: '',
  })
  const [errors, setErrors] = useState({})
  const [rooms, setRooms] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  const set = (k, v) => {
    setErrors(e => ({ ...e, [k]: '' }))
    if (k === 'startTime') {
      setForm(f => ({ ...f, startTime: v, endTime: addMins(v, 30) }))
    } else if (k === 'date') {
      setForm(f => {
        let start = f.startTime
        if (v === today && toMin(f.startTime) < toMin(getNextSlot())) start = getNextSlot()
        return { ...f, date: v, startTime: start, endTime: addMins(start, 30) }
      })
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }

  useEffect(() => {
    Promise.all([api.get('/rooms'), api.get('/bookings')])
      .then(([rRes, bRes]) => {
        const rs = rRes.data.data
        setRooms(rs)
        setAllBookings(bRes.data.data)
        if (rs.length && !form.roomId) setForm(f => ({ ...f, roomId: rs[0].id }))
      })
      .catch(() => toast.error('Failed to load rooms'))
  }, [])

  const selectedRoom = rooms.find(r => r.id === form.roomId)

  const dayBookings = allBookings.filter(
    b => b.roomId === form.roomId && b.date === form.date && b.status !== 'rejected'
  ).sort((a, b) => a.startTime.localeCompare(b.startTime))

  const hasConflict = dayBookings.some(b => {
    const s = toMin(b.startTime), e = toMin(b.endTime)
    const fs = toMin(form.startTime), fe = toMin(form.endTime)
    return fs < e && fe > s
  })

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.date)         e.date = 'Required'
    else if (form.date < today) e.date = 'Cannot book past dates'
    if (!form.startTime)    e.startTime = 'Required'
    if (!form.endTime)      e.endTime = 'Required'
    else {
      if (toMin(form.endTime) <= toMin(form.startTime)) e.endTime = 'Must be after start'
      else if (toMin(form.endTime) - toMin(form.startTime) < 30) e.endTime = 'Min 30 minutes'
    }
    if (!form.purpose.trim()) e.purpose = 'Required'
    if (!form.attendees || isNaN(form.attendees) || parseInt(form.attendees) < 1) e.attendees = 'Min 1'
    if (!form.roomId)       e.roomId = 'Select a room'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (hasConflict) { toast.error('This time slot conflicts with an existing booking'); return }
    setLoading(true)
    try {
      const res = await api.post('/bookings', form)
      setSubmitted(res.data.data)
      toast.success('Booking request submitted!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  const dayStart = 7 * 60
  const totalMins = 14 * 60
  const slotPct = (mins) => ((mins - dayStart) / totalMins) * 100

  const previewStart = toMin(form.startTime)
  const previewEnd   = toMin(form.endTime)
  const previewValid = previewEnd > previewStart && previewEnd - previewStart >= 30

  if (submitted) {
    return (
      <div className="page animate-in">
        <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--green-bg)', border: '1.5px solid var(--green-bd)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" style={{ width: 22, height: 22 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 6 }}>
            Booking Submitted
          </h1>
          <p style={{ color: 'var(--tx-3)', marginBottom: 28, fontSize: '0.875rem' }}>
            Your request is pending admin review. You'll be notified by email.
          </p>
          <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
            {[
              ['Room',      submitted.room?.name || selectedRoom?.name],
              ['Date',      submitted.date],
              ['Time',      `${submitted.startTime} – ${submitted.endTime}`],
              ['Purpose',   submitted.purpose],
              ['Attendees', `${submitted.attendees} people`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: '0.845rem' }}>
                <span style={{ color: 'var(--tx-3)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: '0.845rem' }}>
              <span style={{ color: 'var(--tx-3)' }}>Status</span>
              <span className="badge badge-pending">Pending</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => {
              setSubmitted(null)
              setForm(f => ({ ...f, purpose: '', attendees: '' }))
            }}>
              Book Another Room
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/my-requests')}>
              View My Requests
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Book a Room</h1>
          <p className="page-subtitle">Fill in the details and pick your time — availability updates live on the right</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Form ── */}
        <div className="card" style={{ padding: '24px' }}>

          {/* Section: Your Details */}
          <div style={{ marginBottom: 22 }}>
            <div className="section-label">Your Details</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line)', marginBottom: 22 }} />

          {/* Section: When */}
          <div style={{ marginBottom: 22 }}>
            <div className="section-label">When</div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} min={today} onChange={e => set('date', e.target.value)} style={{ maxWidth: 220 }} />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start time</label>
                <select className="form-select" value={form.startTime} onChange={e => set('startTime', e.target.value)}>
                  {TIME_SLOTS
                    .filter(t => form.date !== today || toMin(t) >= toMin(getNextSlot()))
                    .map(t => <option key={t} value={t}>{minToLabel(toMin(t))}</option>)}
                </select>
                {errors.startTime && <span className="form-error">{errors.startTime}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">End time</label>
                <select className="form-select" value={form.endTime} onChange={e => set('endTime', e.target.value)}>
                  {TIME_SLOTS
                    .filter(t => toMin(t) >= toMin(form.startTime) + 30)
                    .map(t => <option key={t} value={t}>{minToLabel(toMin(t))}</option>)}
                </select>
                {errors.endTime && <span className="form-error">{errors.endTime}</span>}
              </div>
            </div>
            {hasConflict && (
              <div style={{
                background: 'var(--red-bg)', border: '1px solid var(--red-bd)',
                borderRadius: 'var(--r-sm)', padding: '8px 12px',
                fontSize: '0.8rem', color: 'var(--red-tx)', marginTop: 6,
              }}>
                This time slot conflicts with an existing booking — pick a different time or room.
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--line)', marginBottom: 22 }} />

          {/* Section: Meeting Info */}
          <div style={{ marginBottom: 22 }}>
            <div className="section-label">Meeting Info</div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Purpose</label>
              <textarea className="form-textarea" rows={2} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="e.g. Team standup, client presentation, training session" />
              {errors.purpose && <span className="form-error">{errors.purpose}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Number of attendees</label>
              <input className="form-input" type="number" min="1" value={form.attendees} onChange={e => set('attendees', e.target.value)} placeholder="e.g. 8" style={{ maxWidth: 140 }} />
              {errors.attendees && <span className="form-error">{errors.attendees}</span>}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line)', marginBottom: 22 }} />

          {/* Section: Room */}
          <div style={{ marginBottom: 24 }}>
            <div className="section-label">Choose a Room</div>
            {errors.roomId && <div className="form-error" style={{ marginBottom: 8 }}>{errors.roomId}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rooms.map(r => {
                const isSelected = form.roomId === r.id
                const roomConflict = allBookings.some(b =>
                  b.roomId === r.id && b.date === form.date && b.status !== 'rejected' &&
                  toMin(form.startTime) < toMin(b.endTime) && toMin(form.endTime) > toMin(b.startTime)
                )
                return (
                  <div
                    key={r.id}
                    onClick={() => !roomConflict && set('roomId', r.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px', borderRadius: 'var(--r)',
                      border: `1.5px solid ${isSelected ? 'var(--accent)' : roomConflict ? 'var(--red-bd)' : 'var(--line)'}`,
                      background: isSelected ? 'var(--accent-subtle)' : roomConflict ? 'var(--red-bg)' : 'var(--bg-1)',
                      cursor: roomConflict ? 'not-allowed' : 'pointer',
                      opacity: roomConflict ? 0.7 : 1,
                      transition: 'border-color var(--t), background var(--t)',
                    }}
                  >
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: r.color || 'var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--tx)' }}>{r.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 1 }}>{r.floor}{r.capacity ? ` · ${r.capacity} seats` : ''}</div>
                    </div>
                    {roomConflict
                      ? <span style={{ fontSize: '0.7rem', color: 'var(--red-tx)', fontWeight: 600 }}>Conflict</span>
                      : isSelected
                        ? <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>Selected</span>
                        : <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 500 }}>Available</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={loading || hasConflict}
          >
            {loading
              ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Submitting</>
              : 'Submit Booking Request'
            }
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--tx-3)', textAlign: 'center', marginTop: 8 }}>
            Your request will be reviewed by an administrator.
          </p>
        </div>

        {/* ── RIGHT: Day schedule ── */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div className="card" style={{ padding: '18px 16px' }}>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx)' }}>
                {selectedRoom ? selectedRoom.name : 'Select a room'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 2 }}>
                {form.date
                  ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                  : 'Pick a date'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {dayBookings.length === 0
                ? <span style={{ fontSize: '0.7rem', color: 'var(--green-tx)', background: 'var(--green-bg)', border: '1px solid var(--green-bd)', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>Fully available</span>
                : <>
                    <span style={{ fontSize: '0.7rem', color: 'var(--red-tx)', background: 'var(--red-bg)', border: '1px solid var(--red-bd)', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{dayBookings.length} slot{dayBookings.length !== 1 ? 's' : ''} booked</span>
                    {!hasConflict && previewValid && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>Your slot is free</span>}
                    {hasConflict && <span style={{ fontSize: '0.7rem', color: 'var(--red-tx)', background: 'var(--red-bg)', border: '1px solid var(--red-bd)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Time conflict</span>}
                  </>
              }
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', gap: 0 }}>
              <div style={{ width: 36, flexShrink: 0, position: 'relative', height: HOURS.length * 44 }}>
                {HOURS.map((h, i) => (
                  <div key={h} style={{ position: 'absolute', top: i * 44 - 6, right: 6, fontSize: '0.6rem', color: 'var(--tx-3)', lineHeight: 1, textAlign: 'right' }}>
                    {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, position: 'relative', height: HOURS.length * 44 }}>
                {HOURS.map((_, i) => (
                  <div key={i} style={{ position: 'absolute', top: i * 44, left: 0, right: 0, height: 1, background: 'var(--line)' }} />
                ))}

                {dayBookings.map(b => {
                  const top = slotPct(toMin(b.startTime))
                  const height = slotPct(toMin(b.endTime)) - top
                  const approved = b.status === 'approved'
                  return (
                    <div key={b.id} style={{
                      position: 'absolute', left: 2, right: 2,
                      top: `${top}%`, height: `${height}%`,
                      background: approved ? 'var(--accent-subtle)' : 'var(--amber-bg)',
                      border: `1.5px solid ${approved ? 'var(--accent)' : 'var(--amber-bd)'}`,
                      borderRadius: 5, padding: '3px 6px', overflow: 'hidden',
                    }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: approved ? 'var(--accent)' : 'var(--amber)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.startTime}–{b.endTime}
                      </div>
                      <div style={{ fontSize: '0.58rem', color: 'var(--tx-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.purpose}
                      </div>
                    </div>
                  )
                })}

                {previewValid && (() => {
                  const top = slotPct(previewStart)
                  const height = slotPct(previewEnd) - top
                  return (
                    <div style={{
                      position: 'absolute', left: 2, right: 2,
                      top: `${top}%`, height: `${height}%`,
                      background: hasConflict ? 'var(--red-bg)' : 'rgba(91,91,214,0.12)',
                      border: `2px dashed ${hasConflict ? 'var(--red)' : 'var(--accent)'}`,
                      borderRadius: 5, padding: '3px 6px', overflow: 'hidden', zIndex: 5,
                    }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: hasConflict ? 'var(--red)' : 'var(--accent)', lineHeight: 1.2 }}>
                        {hasConflict ? 'Conflict' : 'Your slot'}
                      </div>
                      <div style={{ fontSize: '0.58rem', color: hasConflict ? 'var(--red-tx)' : 'var(--accent)', opacity: 0.8 }}>
                        {form.startTime}–{form.endTime}
                      </div>
                    </div>
                  )
                })()}

                {form.date === today && (() => {
                  const now = new Date()
                  const pct = slotPct(now.getHours() * 60 + now.getMinutes())
                  if (pct < 0 || pct > 100) return null
                  return (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${pct}%`, zIndex: 10, pointerEvents: 'none' }}>
                      <div style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                      <div style={{ height: 1.5, background: 'var(--accent)', marginLeft: 4 }} />
                    </div>
                  )
                })()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              {[
                { color: 'var(--accent-subtle)', border: 'var(--accent)', dashed: false, label: 'Approved' },
                { color: 'var(--amber-bg)', border: 'var(--amber-bd)', dashed: false, label: 'Pending' },
                { color: 'rgba(91,91,214,0.12)', border: 'var(--accent)', dashed: true, label: 'Your slot' },
              ].map(({ color, border, dashed, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: `1.5px ${dashed ? 'dashed' : 'solid'} ${border}` }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--tx-3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
