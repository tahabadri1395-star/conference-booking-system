// src/pages/BookRoomPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am–9pm
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const minToLabel = m => {
  const h = Math.floor(m / 60), min = m % 60, ampm = h >= 12 ? 'pm' : 'am'
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(min).padStart(2, '0')}${ampm}`
}

export default function BookRoomPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    date: today,
    startTime: '09:00',
    endTime: '10:00',
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
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  // Load all rooms + all bookings once
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

  // Bookings for the selected room on the selected date
  const dayBookings = allBookings.filter(
    b => b.roomId === form.roomId && b.date === form.date && b.status !== 'rejected'
  ).sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Does the selected time window conflict with any existing booking?
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

  // ── Schedule sidebar helpers ──────────────────────────────────────────────
  const dayStart = 7 * 60
  const totalMins = 14 * 60
  const slotPct = (mins) => ((mins - dayStart) / totalMins) * 100

  const previewStart = toMin(form.startTime)
  const previewEnd   = toMin(form.endTime)
  const previewValid = previewEnd > previewStart && previewEnd - previewStart >= 30

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="page animate-in">
        <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem' }}>✓</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>
            Room Booked!
          </h1>
          <p style={{ color: 'var(--text-3)', marginBottom: 28, fontSize: '0.9rem' }}>
            Your booking is confirmed. A confirmation email has been sent.
          </p>
          <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
            {[
              ['Room',      submitted.room?.name || selectedRoom?.name],
              ['Date',      submitted.date],
              ['Time',      `${submitted.startTime} – ${submitted.endTime}`],
              ['Purpose',   submitted.purpose],
              ['Attendees', `${submitted.attendees} people`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-3)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-3)' }}>Status</span>
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
            <button className="btn btn-secondary" onClick={() => navigate('/rooms')}>
              View Schedule →
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
          <p className="page-subtitle">Fill in the details and pick your time — see availability live on the right</p>
        </div>
      </div>

      <div className="book-room-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT: Form ─────────────────────────────────────────────────── */}
        <div className="card">

          {/* Who */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>
              Your Details
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

          {/* When */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>
              When
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.date} min={today} onChange={e => set('date', e.target.value)} />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <select className="form-select" value={form.startTime} onChange={e => set('startTime', e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.startTime && <span className="form-error">{errors.startTime}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">End Time *</label>
                <select className="form-select" value={form.endTime} onChange={e => set('endTime', e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.endTime && <span className="form-error">{errors.endTime}</span>}
              </div>
            </div>
            {hasConflict && (
              <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--red)', marginTop: 4 }}>
                ⚠ This time slot conflicts with an existing booking — pick a different time or room.
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

          {/* What */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>
              Meeting Info
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Purpose *</label>
              <textarea className="form-textarea" rows={2} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="e.g. Team standup, client presentation…" />
              {errors.purpose && <span className="form-error">{errors.purpose}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Attendees *</label>
              <input className="form-input" type="number" min="1" value={form.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Number of people" style={{ maxWidth: 160 }} />
              {errors.attendees && <span className="form-error">{errors.attendees}</span>}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

          {/* Room picker */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>
              Room
            </div>
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
                      padding: '12px 14px', borderRadius: 10,
                      border: `1.5px solid ${isSelected ? 'var(--accent)' : roomConflict ? 'rgba(220,38,38,0.2)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent-glow)' : roomConflict ? 'var(--red-bg)' : 'var(--bg-3)',
                      cursor: roomConflict ? 'not-allowed' : 'pointer',
                      opacity: roomConflict ? 0.7 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 1 }}>{r.floor}</div>
                    </div>
                    {roomConflict
                      ? <span className="badge badge-unavailable" style={{ fontSize: '0.65rem' }}>Conflict</span>
                      : isSelected
                        ? <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>✓ Selected</span>
                        : <span className="badge badge-available" style={{ fontSize: '0.65rem' }}>Available</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={loading || hasConflict}
          >
            {loading ? 'Submitting…' : 'Submit Booking Request'}
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>
            Your booking is instantly confirmed. A confirmation email will be sent.
          </p>
        </div>

        {/* ── RIGHT: Day schedule ────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div className="card" style={{ padding: '18px 16px' }}>

            {/* Header */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600 }}>
                {selectedRoom ? selectedRoom.name : 'Select a room'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                {form.date
                  ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                  : 'Pick a date'}
              </div>
            </div>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {dayBookings.length === 0
                ? <span style={{ fontSize: '0.7rem', color: 'var(--green)', background: 'var(--green-bg)', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>Fully free today</span>
                : <>
                    <span style={{ fontSize: '0.7rem', color: 'var(--red)', background: 'var(--red-bg)', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{dayBookings.length} booked</span>
                    {!hasConflict && previewValid && <span style={{ fontSize: '0.7rem', color: 'var(--accent-2)', background: 'var(--accent-glow)', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>Your slot is free ✓</span>}
                    {hasConflict && <span style={{ fontSize: '0.7rem', color: 'var(--red)', background: 'var(--red-bg)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Conflict ✗</span>}
                  </>
              }
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', gap: 0 }}>
              {/* Hour labels */}
              <div style={{ width: 36, flexShrink: 0, position: 'relative', height: HOURS.length * 44 }}>
                {HOURS.map((h, i) => (
                  <div key={h} style={{ position: 'absolute', top: i * 44 - 6, right: 6, fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1, textAlign: 'right' }}>
                    {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ flex: 1, position: 'relative', height: HOURS.length * 44 }}>
                {/* Hour lines */}
                {HOURS.map((_, i) => (
                  <div key={i} style={{ position: 'absolute', top: i * 44, left: 0, right: 0, height: 1, background: 'var(--border)' }} />
                ))}

                {/* Existing bookings */}
                {dayBookings.map(b => {
                  const top = slotPct(toMin(b.startTime))
                  const height = slotPct(toMin(b.endTime)) - top
                  const approved = b.status === 'approved'
                  return (
                    <div key={b.id} style={{
                      position: 'absolute', left: 2, right: 2,
                      top: `${top}%`, height: `${height}%`,
                      background: approved ? 'var(--accent-glow)' : 'var(--yellow-bg)',
                      border: `1.5px solid ${approved ? 'var(--accent)' : 'rgba(217,119,6,0.4)'}`,
                      borderRadius: 6, padding: '3px 6px', overflow: 'hidden',
                    }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: approved ? 'var(--accent-2)' : 'var(--yellow)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.startTime}–{b.endTime}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.purpose}
                      </div>
                    </div>
                  )
                })}

                {/* Your selected slot preview */}
                {previewValid && (() => {
                  const top = slotPct(previewStart)
                  const height = slotPct(previewEnd) - top
                  return (
                    <div style={{
                      position: 'absolute', left: 2, right: 2,
                      top: `${top}%`, height: `${height}%`,
                      background: hasConflict ? 'var(--red-bg)' : 'rgba(124,106,247,0.15)',
                      border: `2px dashed ${hasConflict ? 'var(--red)' : 'var(--accent)'}`,
                      borderRadius: 6, padding: '3px 6px', overflow: 'hidden', zIndex: 5,
                    }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: hasConflict ? 'var(--red)' : 'var(--accent)', lineHeight: 1.2 }}>
                        {hasConflict ? '✗ Conflict' : '✓ Your slot'}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: hasConflict ? 'var(--red)' : 'var(--accent-2)', opacity: 0.8 }}>
                        {form.startTime}–{form.endTime}
                      </div>
                    </div>
                  )
                })()}

                {/* Now line */}
                {form.date === today && (() => {
                  const now = new Date()
                  const pct = slotPct(now.getHours() * 60 + now.getMinutes())
                  if (pct < 0 || pct > 100) return null
                  return (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${pct}%`, zIndex: 10, pointerEvents: 'none' }}>
                      <div style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                      <div style={{ height: 2, background: 'var(--accent)', marginLeft: 4 }} />
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { color: 'var(--accent-glow)', border: 'var(--accent)', label: 'Approved' },
                { color: 'var(--yellow-bg)', border: 'rgba(217,119,6,0.4)', label: 'Pending' },
                { color: 'rgba(124,106,247,0.15)', border: 'var(--accent)', dashed: true, label: 'Your slot' },
              ].map(({ color, border, dashed, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: `1.5px ${dashed ? 'dashed' : 'solid'} ${border}` }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
