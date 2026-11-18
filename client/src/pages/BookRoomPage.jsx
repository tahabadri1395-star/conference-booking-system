import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  SLOTS, DAY_END, toMin, addMins, toAMPM, shortTime, todayStr, addDays, parseDate,
  nowMin, isFree, fmtDuration, fmtLongDate, downloadIcs,
} from '../utils/time'

const DURATIONS = [30, 60, 90, 120, 180, 240]
const DATE_RANGE = 14

const Icon = {
  check:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  users:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  pin:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  cal:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  clock:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  bolt:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  minus:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/></svg>,
  plus:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  door:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}

function Spinner() {
  return <span className="spinner" />
}

function Step({ num, title, hint, done, children }) {
  return (
    <section className="card book-step">
      <header className="book-step-head">
        <span className={`book-step-num${done ? ' done' : ''}`}>{done ? Icon.check : num}</span>
        <div>
          <h2 className="book-step-title">{title}</h2>
          {hint && <p className="book-step-hint">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

// The confirmation "ticket" shown after booking.
function Confirmation({ booking, room, user, onAnother, navigate }) {
  const ref = (booking.id || '').slice(0, 8).toUpperCase()
  return (
    <div className="page animate-in confirm-page">
      <div className="confirm-badge">{Icon.check}</div>
      <h1 className="confirm-title">You're booked!</h1>
      <p className="confirm-sub">Your room is reserved and confirmed. No approval needed.</p>

      <div className="ticket">
        <div className="ticket-top" style={{ '--room': room?.color || 'var(--accent)' }}>
          <span className="ticket-eyebrow">{Icon.door}{room?.floor || 'Conference room'}</span>
          <h2 className="ticket-room">{room?.name || 'Conference room'}</h2>
          <p className="ticket-purpose">{booking.purpose}</p>
        </div>
        <div className="ticket-cut" />
        <div className="ticket-grid">
          <div><span>Date</span><strong>{fmtLongDate(booking.date)}</strong></div>
          <div><span>Time</span><strong>{toAMPM(booking.startTime)} – {toAMPM(booking.endTime)}</strong></div>
          <div><span>Guests</span><strong>{booking.attendees} {booking.attendees === 1 ? 'person' : 'people'}</strong></div>
          <div><span>Booked by</span><strong>{booking.name}</strong></div>
        </div>
        {ref && <div className="ticket-ref">Booking ref <strong>{ref}</strong></div>}
      </div>

      <div className="confirm-actions">
        <button className="btn btn-primary btn-lg" onClick={() => downloadIcs(booking, room?.name)}>
          {Icon.download}Add to calendar
        </button>
        <button className="btn btn-secondary btn-lg" onClick={onAnother}>Book another</button>
        {user
          ? <button className="btn btn-ghost btn-lg" onClick={() => navigate('/my-requests')}>My bookings</button>
          : <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>Sign in to manage</button>}
      </div>
    </div>
  )
}

export default function BookRoomPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const today = todayStr()
  const preset = location.state || {}

  // After the last slot of the day, start on tomorrow.
  const firstDate = preset.date || (nowMin() >= DAY_END - 30 ? addDays(today, 1) : today)

  const [rooms, setRooms]       = useState([])
  const [bookings, setBookings] = useState([])
  const [loaded, setLoaded]     = useState(false)
  const [roomId, setRoomId]     = useState(preset.roomId || '')
  const [date, setDate]         = useState(firstDate)
  const [start, setStart]       = useState(preset.startTime || null)
  const [duration, setDuration] = useState(60)
  const [purpose, setPurpose]   = useState('')
  const [attendees, setAttendees] = useState(2)
  const [name, setName]         = useState(user?.name || '')
  const [email, setEmail]       = useState(user?.email || '')
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(null)

  // Signed-in users load after the first render; fill their details in then.
  useEffect(() => {
    if (user) { setName(n => n || user.name || ''); setEmail(e => e || user.email || '') }
  }, [user])

  const loadBookings = useCallback(
    () => api.get('/bookings').then(r => setBookings(r.data.data)),
    []
  )

  useEffect(() => {
    Promise.all([api.get('/rooms'), loadBookings()])
      .then(([rRes]) => {
        const rs = rRes.data.data
        setRooms(rs)
        setRoomId(id => id || rs[0]?.id || '')
      })
      .catch(() => toast.error('Could not load rooms. Please refresh.'))
      .finally(() => setLoaded(true))
  }, [loadBookings])

  const room = rooms.find(r => r.id === roomId)

  const dayBookings = useMemo(() => bookings.filter(
    b => b.roomId === roomId && b.date === date && b.status !== 'rejected'
  ), [bookings, roomId, date])

  const slotState = s => {
    if (date === today && toMin(s) < nowMin()) return 'past'
    if (!isFree(dayBookings, s, addMins(s, 30))) return 'booked'
    return 'free'
  }

  const durationOk = (s, d) =>
    s && toMin(s) + d <= DAY_END && isFree(dayBookings, s, addMins(s, d))

  // Keep the chosen time valid when the room, date or bookings change.
  useEffect(() => {
    if (!loaded || !start) return
    if (slotState(start) !== 'free') { setStart(null); return }
    if (!durationOk(start, duration)) {
      const fit = [...DURATIONS].reverse().find(d => durationOk(start, d))
      setDuration(fit || 30)
    }
  }, [loaded, start, dayBookings, date]) // eslint-disable-line react-hooks/exhaustive-deps

  const end = start ? addMins(start, duration) : null
  const timeReady = !!(start && durationOk(start, duration))

  // Free hours per day for the date strip.
  const dates = useMemo(() => Array.from({ length: DATE_RANGE }, (_, i) => {
    const ds = addDays(today, i)
    const bs = bookings.filter(b => b.roomId === roomId && b.date === ds && b.status !== 'rejected')
    const free = SLOTS.filter(s =>
      !(ds === today && toMin(s) < nowMin()) && isFree(bs, s, addMins(s, 30))
    ).length
    return { ds, free }
  }), [bookings, roomId, today])

  const pickTime = s => {
    setErrors(e => ({ ...e, time: '' }))
    setStart(s)
    if (!durationOk(s, duration)) {
      const fit = [...DURATIONS].reverse().find(d => durationOk(s, d) && d <= duration) || 30
      setDuration(fit)
    }
  }

  const validate = () => {
    const e = {}
    if (!roomId) e.room = 'Choose a room'
    if (!timeReady) e.time = 'Choose a start time'
    if (!purpose.trim()) e.purpose = 'Tell us what the meeting is for'
    if (!attendees || attendees < 1) e.attendees = 'At least 1 person'
    if (!name.trim()) e.name = 'Enter your name'
    if (!email.trim()) e.email = 'Enter your email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'That email doesn’t look right'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) {
      toast.error('A few details are missing')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/bookings', {
        name, email, roomId, date, startTime: start, endTime: end, purpose, attendees,
      })
      setSubmitted(res.data.data)
      loadBookings()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.')
      if (err.response?.status === 409) loadBookings()
    } finally { setLoading(false) }
  }

  if (submitted) {
    return (
      <Confirmation booking={submitted} room={submitted.room || room} user={user} navigate={navigate}
        onAnother={() => { setSubmitted(null); setStart(null); setPurpose(''); setErrors({}) }} />
    )
  }

  const groups = [
    ['Morning',   SLOTS.filter(s => toMin(s) < 12 * 60)],
    ['Afternoon', SLOTS.filter(s => toMin(s) >= 12 * 60 && toMin(s) < 17 * 60)],
    ['Evening',   SLOTS.filter(s => toMin(s) >= 17 * 60)],
  ]
  const anyFree = SLOTS.some(s => slotState(s) === 'free')
  const overCapacity = room?.capacity && attendees > room.capacity

  const summaryRows = [
    ['Room', room?.name || '—', Icon.door],
    ['Date', fmtLongDate(date), Icon.cal],
    ['Time', start ? `${toAMPM(start)} – ${toAMPM(end)}` : 'Not chosen yet', Icon.clock],
    ['Length', start ? fmtDuration(duration) : '—', Icon.bolt],
    ['Guests', `${attendees || 0} ${attendees === 1 ? 'person' : 'people'}`, Icon.users],
  ]

  return (
    <>
    <div className="page animate-in book-page">
      <header className="book-hero">
        <div>
          <span className="eyebrow">Reserve a space</span>
          <h1 className="hero-title">Book a room</h1>
          <p className="hero-sub">Pick a day and time, add a few details, and it's yours. Confirmed instantly.</p>
        </div>
        <div className="trust-chips">
          <span className="trust-chip">{Icon.bolt}Instant confirmation</span>
          <span className="trust-chip">{Icon.shield}No double bookings</span>
        </div>
      </header>

      <div className="book-layout">
        <div className="book-steps">

          {/* 1 — Room */}
          <Step num="1" title="Choose your room" done={!!room}
            hint={rooms.length > 1 ? 'Every room includes the essentials for a productive meeting.' : 'Our dedicated conference room.'}>
            {errors.room && <p className="form-error">{errors.room}</p>}
            <div className="room-options">
              {!loaded && <div className="skeleton" style={{ height: 92 }} />}
              {rooms.map(r => (
                <button key={r.id} className={`room-option${r.id === roomId ? ' selected' : ''}`}
                  style={{ '--room': r.color || 'var(--accent)' }}
                  onClick={() => { setRoomId(r.id); setErrors(e => ({ ...e, room: '' })) }}>
                  <span className="room-option-art">{Icon.door}</span>
                  <span className="room-option-body">
                    <span className="room-option-name">{r.name}</span>
                    <span className="room-option-meta">
                      <span>{Icon.pin}{r.floor}</span>
                      {r.capacity ? <span>{Icon.users}Up to {r.capacity}</span> : null}
                    </span>
                  </span>
                  <span className="room-option-check">{Icon.check}</span>
                </button>
              ))}
            </div>
          </Step>

          {/* 2 — Date */}
          <Step num="2" title="Pick a day" done={!!date} hint={fmtLongDate(date)}>
            <div className="date-strip">
              {dates.map(({ ds, free }) => {
                const d = parseDate(ds)
                const full = free === 0
                return (
                  <button key={ds} className={`date-chip${ds === date ? ' selected' : ''}${full ? ' full' : ''}`}
                    onClick={() => setDate(ds)}>
                    <span className="date-chip-dow">{ds === today ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="date-chip-day">{d.getDate()}</span>
                    <span className="date-chip-mon">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="date-chip-free">{full ? 'Full' : `${free / 2}h free`}</span>
                  </button>
                )
              })}
            </div>
            <label className="date-more">
              Another date
              <input type="date" className="form-input" value={date} min={today}
                onChange={e => e.target.value && setDate(e.target.value)} />
            </label>
          </Step>

          {/* 3 — Time */}
          <Step num="3" title="Choose a time" done={timeReady}
            hint={start ? `${toAMPM(start)} – ${toAMPM(end)} · ${fmtDuration(duration)}` : 'Tap a start time. Greyed-out times are taken.'}>
            {errors.time && <p className="form-error">{errors.time}</p>}
            {loaded && !anyFree && (
              <div className="notice">This room is fully booked on {fmtLongDate(date)}. Try another day.</div>
            )}
            <div className="slot-groups">
              {groups.map(([label, slots]) => (
                <div key={label} className="slot-group">
                  <p className="slot-group-label">{label}</p>
                  <div className="slot-grid">
                    {slots.map(s => {
                      const st = slotState(s)
                      const inRange = start && toMin(s) >= toMin(start) && toMin(s) < toMin(end)
                      return (
                        <button key={s} disabled={st !== 'free'}
                          className={`slot ${st}${s === start ? ' selected' : inRange ? ' in-range' : ''}`}
                          onClick={() => pickTime(s)}
                          title={st === 'booked' ? 'Already booked' : st === 'past' ? 'This time has passed' : `Start at ${toAMPM(s)}`}>
                          {shortTime(s)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className={`duration-row${start ? '' : ' muted'}`}>
              <p className="slot-group-label">How long?</p>
              <div className="duration-chips">
                {DURATIONS.map(d => {
                  const ok = durationOk(start, d)
                  return (
                    <button key={d} disabled={!start || !ok}
                      className={`duration-chip${start && d === duration ? ' selected' : ''}`}
                      onClick={() => setDuration(d)}>
                      {fmtDuration(d)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="slot-legend">
              <span><i className="lg free" />Available</span>
              <span><i className="lg sel" />Your time</span>
              <span><i className="lg booked" />Taken</span>
            </div>
          </Step>

          {/* 4 — Details */}
          <Step num="4" title="Meeting details" done={!!purpose.trim() && !!name.trim() && !!email.trim()}>
            <div className="form-group">
              <label className="form-label">What's the meeting for?</label>
              <input className="form-input" value={purpose} maxLength={120}
                onChange={e => { setPurpose(e.target.value); setErrors(x => ({ ...x, purpose: '' })) }}
                placeholder="e.g. Team standup, client presentation, training session" />
              {errors.purpose && <span className="form-error">{errors.purpose}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">How many people?</label>
              <div className="stepper">
                <button type="button" aria-label="Fewer people" onClick={() => setAttendees(a => Math.max(1, (a || 1) - 1))}>{Icon.minus}</button>
                <input type="number" min="1" value={attendees}
                  onChange={e => setAttendees(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))} />
                <button type="button" aria-label="More people" onClick={() => setAttendees(a => (a || 0) + 1)}>{Icon.plus}</button>
                {room?.capacity ? <span className="stepper-hint">Seats up to {room.capacity}</span> : null}
              </div>
              {overCapacity && <span className="form-warn">That's more than the room seats ({room.capacity}).</span>}
              {errors.attendees && <span className="form-error">{errors.attendees}</span>}
            </div>

            {user ? (
              <div className="booking-as">
                <span className="avatar-sm">{(user.name || '?').slice(0, 1).toUpperCase()}</span>
                <span>Booking as <strong>{user.name}</strong><em>{user.email}</em></span>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your name</label>
                  <input className="form-input" value={name} autoComplete="name"
                    onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: '' })) }} placeholder="Full name" />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={email} autoComplete="email"
                    onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: '' })) }} placeholder="you@company.com" />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
              </div>
            )}
          </Step>
        </div>

        {/* Summary */}
        <aside className="book-summary">
          <div className="card summary-card">
            <div className="summary-band" style={{ '--room': room?.color || 'var(--accent)' }}>
              <span className="eyebrow">Your booking</span>
              <h3>{room?.name || 'Choose a room'}</h3>
            </div>
            <dl className="summary-rows">
              {summaryRows.map(([label, value, icon]) => (
                <div key={label} className="summary-row">
                  <dt>{icon}{label}</dt>
                  <dd className={value === 'Not chosen yet' ? 'muted' : ''}>{value}</dd>
                </div>
              ))}
            </dl>
            <button className="btn btn-primary btn-xl summary-cta" onClick={submit} disabled={loading}>
              {loading ? <><Spinner />Confirming…</> : 'Confirm booking'}
            </button>
            <p className="summary-note">{Icon.bolt}Confirmed instantly. Free to cancel any time.</p>
          </div>
        </aside>
      </div>
    </div>

    {/* Phone: summary as a bar above the dock (outside the animated page,
        whose transform would otherwise pin it to the page, not the screen) */}
      <div className="book-bar">
        <div className="book-bar-text">
          <strong>{start ? `${toAMPM(start)} – ${toAMPM(end)}` : 'Choose a time'}</strong>
          <span>{parseDate(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{room ? ` · ${room.name}` : ''}</span>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? <Spinner /> : 'Confirm'}
        </button>
      </div>
    </>
  )
}
