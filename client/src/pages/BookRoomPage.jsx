// src/pages/BookRoomPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

function RoomCard({ room, selected, onSelect, checking }) {
  const avail = room.available !== false
  return (
    <div
      className={`room-card${selected ? ' selected' : ''}`}
      style={{ '--room-color': room.color, opacity: checking ? 0.6 : 1, cursor: avail ? 'pointer' : 'default' }}
      onClick={() => avail && onSelect(room)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div className="room-card-name">{room.name}</div>
        {room.available !== undefined && (
          <span className={`badge ${avail ? 'badge-available' : 'badge-unavailable'}`}>
            {avail ? 'Available' : 'Booked'}
          </span>
        )}
      </div>
      <div className="room-card-floor">{room.floor}</div>
      <div className="room-card-amenities">
        {room.amenities?.slice(0, 4).map(a => (
          <span key={a} className="amenity-tag">{a}</span>
        ))}
        {room.amenities?.length > 4 && <span className="amenity-tag">+{room.amenities.length - 4}</span>}
      </div>
      {!avail && room.conflictingBooking && (
        <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--red)', background: 'var(--red-bg)', padding: '6px 8px', borderRadius: 6 }}>
          Booked {room.conflictingBooking.startTime}–{room.conflictingBooking.endTime}
        </div>
      )}
    </div>
  )
}

export default function BookRoomPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [step, setStep] = useState(1) // 1: form, 2: room select, 3: confirm
  const [loading, setLoading] = useState(false)
  const [checkingRooms, setCheckingRooms] = useState(false)
  const [submitted, setSubmitted] = useState(null)

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
  const [selectedRoom, setSelectedRoom] = useState(null)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  // Fetch rooms with availability when date/time changes
  useEffect(() => {
    if (step === 2 && form.date && form.startTime && form.endTime) {
      setCheckingRooms(true)
      api.get(`/rooms?date=${form.date}&startTime=${form.startTime}&endTime=${form.endTime}`)
        .then(r => setRooms(r.data.data))
        .catch(() => toast.error('Failed to load rooms'))
        .finally(() => setCheckingRooms(false))
    }
  }, [step, form.date, form.startTime, form.endTime])

  const validateStep1 = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.date) e.date = 'Date is required'
    else if (form.date < today) e.date = 'Cannot book past dates'
    if (!form.startTime) e.startTime = 'Required'
    if (!form.endTime) e.endTime = 'Required'
    else {
      const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
      if (toMin(form.endTime) <= toMin(form.startTime)) e.endTime = 'End time must be after start time'
      else if (toMin(form.endTime) - toMin(form.startTime) < 30) e.endTime = 'Minimum 30 minutes required'
    }
    if (!form.purpose.trim()) e.purpose = 'Purpose is required'
    if (!form.attendees) e.attendees = 'Required'
    else if (isNaN(form.attendees) || parseInt(form.attendees) < 1) e.attendees = 'Must be at least 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) setStep(2)
  }

  const handleSelectRoom = (room) => {
    setSelectedRoom(room)
    setForm(f => ({ ...f, roomId: room.id }))
    setStep(3)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await api.post('/bookings', form)
      setSubmitted(res.data.data)
      toast.success('Booking request submitted!')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit booking'
      toast.error(msg)
      if (err.response?.status === 409) setStep(2) // go back to room selection on conflict
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="page animate-in">
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
          <h1 className="page-title" style={{ marginBottom: 8 }}>Request Submitted!</h1>
          <p style={{ color: 'var(--text-3)', marginBottom: 32 }}>
            Your booking is pending admin approval. You'll be notified once it's reviewed.
          </p>
          <div className="card" style={{ textAlign: 'left', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Room', submitted.room?.name],
                ['Date', submitted.date],
                ['Time', `${submitted.startTime} – ${submitted.endTime}`],
                ['Status', <span className="badge badge-pending">Pending</span>],
                ['Name', submitted.name],
                ['Attendees', `${submitted.attendees} people`],
                ['Purpose', submitted.purpose],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => { setSubmitted(null); setStep(1); setSelectedRoom(null); setForm(f => ({ ...f, purpose: '', roomId: '' })) }}>
              Book Another
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/my-requests')}>
              View My Requests →
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
          <p className="page-subtitle">Fill in the details to request a conference room</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['1', 'Details'], ['2', 'Choose Room'], ['3', 'Confirm']].map(([num, label], i) => {
          const s = i + 1
          const active = step === s
          const done = step > s
          return (
            <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, background: active ? 'var(--bg-4)' : 'transparent', color: active ? 'var(--text)' : done ? 'var(--accent-2)' : 'var(--text-3)', fontSize: '0.82rem', fontWeight: active ? 600 : 400, transition: 'all 0.18s', cursor: done ? 'pointer' : 'default' }}
              onClick={() => done && setStep(s)}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: active ? 'var(--accent)' : done ? 'var(--accent-glow)' : 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: active ? 'white' : done ? 'var(--accent-2)' : 'var(--text-3)', flexShrink: 0 }}>
                {done ? '✓' : num}
              </span>
              {label}
            </div>
          )
        })}
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* Step 1: Details */}
        {step === 1 && (
          <div className="card animate-in">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, marginBottom: 20 }}>Booking Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name <span>*</span></label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email <span>*</span></label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date <span>*</span></label>
              <input className="form-input" type="date" value={form.date} min={today} onChange={e => set('date', e.target.value)} />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time <span>*</span></label>
                <select className="form-select" value={form.startTime} onChange={e => set('startTime', e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.startTime && <span className="form-error">{errors.startTime}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">End Time <span>*</span></label>
                <select className="form-select" value={form.endTime} onChange={e => set('endTime', e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.endTime && <span className="form-error">{errors.endTime}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Meeting Purpose <span>*</span></label>
              <textarea className="form-textarea" value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="e.g. Q3 Planning Session, Team Standup, Client Presentation…" rows={3} />
              {errors.purpose && <span className="form-error">{errors.purpose}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Number of Attendees <span>*</span></label>
              <input className="form-input" type="number" min="1" value={form.attendees} onChange={e => set('attendees', e.target.value)} placeholder="How many people will attend?" />
              {errors.attendees && <span className="form-error">{errors.attendees}</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleNext}>
                Choose Room →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Room Selection */}
        {step === 2 && (
          <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600 }}>Select a Room</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: 2 }}>
                  Availability checked for {form.date} · {form.startTime}–{form.endTime}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Back</button>
            </div>
            <div className="rooms-grid">
              {checkingRooms
                ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />)
                : rooms.map(r => (
                  <RoomCard key={r.id} room={r} selected={selectedRoom?.id === r.id} onSelect={handleSelectRoom} checking={checkingRooms} />
                ))
              }
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedRoom && (
          <div className="card animate-in">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, marginBottom: 4 }}>Confirm Booking</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 24 }}>Review your booking details before submitting</p>

            <div style={{ background: 'var(--bg-3)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: selectedRoom.color + '22', border: `2px solid ${selectedRoom.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🚪</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>{selectedRoom.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{selectedRoom.floor} · Up to {selectedRoom.capacity} people</div>
                </div>
                <span className="badge badge-available" style={{ marginLeft: 'auto' }}>Available</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  ['Date', form.date],
                  ['Time', `${form.startTime} – ${form.endTime}`],
                  ['Booked by', form.name],
                  ['Email', form.email],
                  ['Attendees', `${form.attendees} people`],
                  ['Purpose', form.purpose],
                ].map(([label, value]) => (
                  <div key={label} style={{ gridColumn: label === 'Purpose' ? '1/-1' : undefined }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--yellow-bg)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--yellow)', marginBottom: 24 }}>
              ⏳ Your request will be pending until an admin approves it.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Change Room</button>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Request ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
