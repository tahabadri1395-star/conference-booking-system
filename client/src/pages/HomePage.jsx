import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import {
  DAY_START, DAY_END, toMin, fromMin, toAMPM, shortTime, todayStr, nowMin, nextSlotMin,
  freeGaps, fmtDuration, fmtLongDate, addDays,
} from '../utils/time'

const Icon = {
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  cal:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  bolt:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  pin:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  door:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>,
  tap:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V6a2 2 0 114 0v5"/><path d="M13 10a2 2 0 114 0v2a7 7 0 01-7 7h-.5a6 6 0 01-5.2-3L3 13.5a1.6 1.6 0 012.7-1.7L7 13.5V8a2 2 0 012 0"/></svg>,
  pen:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
}

const pct = m => ((m - DAY_START) / (DAY_END - DAY_START)) * 100

// Where a room stands right now, for the live card.
function roomStatus(dayBookings, isToday) {
  const now = nowMin()
  const sorted = [...dayBookings].sort((a, b) => toMin(a.startTime) - toMin(b.startTime))
  const current = isToday && sorted.find(b => toMin(b.startTime) <= now && now < toMin(b.endTime))
  const next = sorted.find(b => toMin(b.startTime) > (isToday ? now : -1))
  const open = isToday ? now >= DAY_START && now < DAY_END : false
  const from = isToday ? Math.max(DAY_START, nextSlotMin(now)) : DAY_START
  const gaps = freeGaps(sorted, from)
  const freeMins = gaps.reduce((t, [s, e]) => t + (e - s), 0)
  return { current, next, open, gaps, freeMins }
}

function Timeline({ dayBookings, isToday, onPick }) {
  const now = nowMin()
  const from = isToday ? Math.max(DAY_START, nextSlotMin(now)) : DAY_START
  const gaps = freeGaps(dayBookings, from)
  const hours = []
  for (let h = DAY_START / 60; h <= DAY_END / 60; h += 2) hours.push(h)
  return (
    <div className="timeline">
      <div className="timeline-track">
        {isToday && now > DAY_START && (
          <div className="timeline-past" style={{ width: `${Math.min(100, pct(now))}%` }} />
        )}
        {gaps.map(([s, e]) => (
          <button key={s} className="timeline-gap" style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%` }}
            onClick={() => onPick(fromMin(s))} title={`Free ${toAMPM(fromMin(s))} – ${toAMPM(fromMin(e))}. Tap to book`} />
        ))}
        {dayBookings.map(b => (
          <div key={b.id} className="timeline-busy"
            style={{ left: `${pct(toMin(b.startTime))}%`, width: `${pct(toMin(b.endTime)) - pct(toMin(b.startTime))}%` }}
            title={`${b.purpose} · ${toAMPM(b.startTime)} – ${toAMPM(b.endTime)}`}>
            <span>{b.purpose}</span>
          </div>
        ))}
        {isToday && now >= DAY_START && now <= DAY_END && (
          <div className="timeline-now" style={{ left: `${pct(now)}%` }} />
        )}
      </div>
      <div className="timeline-axis">
        {hours.map(h => <span key={h} style={{ left: `${pct(h * 60)}%` }}>{shortTime(fromMin(h * 60))}</span>)}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [day, setDay] = useState(todayStr())
  const today = todayStr()

  useEffect(() => {
    Promise.all([api.get('/rooms'), api.get('/bookings')])
      .then(([r, b]) => { setRooms(r.data.data); setBookings(b.data.data) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const forRoom = (id, ds) => bookings.filter(b => b.roomId === id && b.date === ds && b.status !== 'rejected')
  const book = (state = {}) => navigate('/book', { state })

  const main = rooms[0]
  const mainStatus = main ? roomStatus(forRoom(main.id, today), true) : null
  const firstName = user?.name?.split(' ')[0]
  const maxSeats = rooms.reduce((m, r) => Math.max(m, r.capacity || 0), 0)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Next free start for the "book now" button.
  const nextFree = mainStatus?.gaps[0]
  const nextFreeLabel = nextFree
    ? (mainStatus.open && !mainStatus.current && nextFree[0] <= nextSlotMin(nowMin()) ? 'Book it now' : `Book for ${toAMPM(fromMin(nextFree[0]))}`)
    : 'Book for tomorrow'

  return (
    <div className="page animate-in home">

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{user ? `${greet}, ${firstName}` : 'Conference room booking'}</span>
          <h1 className="hero-display">Your meeting room,<br /><em>ready when you are.</em></h1>
          <p className="hero-lede">
            See what's free, pick a time and you're confirmed on the spot. No emails back and forth, no double bookings.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-primary btn-xl" onClick={() => book()}>Book a room {Icon.arrow}</button>
            <button className="btn btn-secondary btn-xl" onClick={() => navigate('/calendar')}>{Icon.cal}See the schedule</button>
          </div>
          <div className="hero-facts">
            <span>{Icon.clock}Open 7 AM – 9 PM</span>
            {maxSeats > 0 && <span>{Icon.users}Seats up to {maxSeats}</span>}
            <span>{Icon.bolt}Instant confirmation</span>
          </div>
        </div>

        {/* Live status */}
        <div className="card live-card">
          {!loaded || !main ? (
            <div className="skeleton" style={{ height: 230 }} />
          ) : (
            <>
              <div className="live-head">
                <span className="eyebrow">Live now</span>
                <span className={`live-pill ${mainStatus.current ? 'busy' : mainStatus.open ? 'free' : 'closed'}`}>
                  <i />{mainStatus.current ? 'In use' : mainStatus.open ? 'Available' : 'Closed now'}
                </span>
              </div>
              <h2 className="live-room">{main.name}</h2>
              <p className="live-meta">{Icon.pin}{main.floor}{main.capacity ? <> · {Icon.users}{main.capacity} seats</> : null}</p>

              <div className="live-status">
                {mainStatus.current ? (
                  <>
                    <strong>Busy until {toAMPM(mainStatus.current.endTime)}</strong>
                    <span>{mainStatus.current.purpose}</span>
                  </>
                ) : mainStatus.open ? (
                  <>
                    <strong>Free right now</strong>
                    <span>{mainStatus.next ? `Next booking at ${toAMPM(mainStatus.next.startTime)}` : 'Nothing else booked today'}</span>
                  </>
                ) : (
                  <>
                    <strong>{nowMin() < DAY_START ? 'Opens at 7:00 AM' : 'Closed for today'}</strong>
                    <span>Bookings run 7 AM to 9 PM</span>
                  </>
                )}
              </div>

              <div className="live-stats">
                <div><strong>{fmtDuration(mainStatus.freeMins) === '0 min' ? 'None' : fmtDuration(mainStatus.freeMins)}</strong><span>free today</span></div>
                <div><strong>{forRoom(main.id, today).length}</strong><span>booked today</span></div>
              </div>

              <button className="btn btn-primary btn-lg live-cta"
                onClick={() => nextFree
                  ? book({ roomId: main.id, date: today, startTime: fromMin(nextFree[0]) })
                  : book({ roomId: main.id, date: addDays(today, 1) })}>
                {nextFreeLabel} {Icon.arrow}
              </button>
            </>
          )}
        </div>
      </section>

      {/* ── Availability ── */}
      <section className="home-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Availability</span>
            <h2 className="section-title">{day === today ? "Today's schedule" : fmtLongDate(day)}</h2>
            <p className="section-sub">Tap any free stretch to book it.</p>
          </div>
          <div className="seg">
            {[0, 1, 2].map(i => {
              const ds = addDays(today, i)
              return (
                <button key={ds} className={day === ds ? 'active' : ''} onClick={() => setDay(ds)}>
                  {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card avail-card">
          {!loaded && <div className="skeleton" style={{ height: 80 }} />}
          {rooms.map(r => {
            const db = forRoom(r.id, day)
            const st = roomStatus(db, day === today)
            return (
              <div key={r.id} className="avail-row">
                <div className="avail-room">
                  <span className="avail-dot" style={{ background: r.color || 'var(--accent)' }} />
                  <div>
                    <strong>{r.name}</strong>
                    <span>{st.freeMins ? `${fmtDuration(st.freeMins)} free` : 'Fully booked'} · {db.length} booking{db.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <Timeline dayBookings={db} isToday={day === today}
                  onPick={start => book({ roomId: r.id, date: day, startTime: start })} />
              </div>
            )
          })}
          <div className="avail-legend">
            <span><i className="lg free" />Free, tap to book</span>
            <span><i className="lg booked" />Booked</span>
            {day === today && <span><i className="lg now" />Now</span>}
          </div>
        </div>
      </section>

      {/* ── The space ── */}
      {rooms.length > 0 && (
        <section className="home-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">The space</span>
              <h2 className="section-title">{rooms.length === 1 ? 'Meet in the room' : 'Our rooms'}</h2>
            </div>
          </div>
          <div className="space-grid">
            {rooms.map(r => (
              <article key={r.id} className="card space-card" style={{ '--room': r.color || 'var(--accent)' }}>
                <div className="space-art">
                  <span className="space-art-icon">{Icon.door}</span>
                  <span className="space-floor">{r.floor}</span>
                </div>
                <div className="space-body">
                  <h3>{r.name}</h3>
                  <ul className="space-facts">
                    {r.capacity ? <li>{Icon.users}Seats up to {r.capacity} people</li> : null}
                    <li>{Icon.pin}{r.floor}</li>
                    <li>{Icon.clock}Bookable 7 AM – 9 PM, in 30-minute steps</li>
                    {(r.amenities || []).map(a => <li key={a}>{Icon.check}{a}</li>)}
                  </ul>
                  <div className="space-actions">
                    <button className="btn btn-primary" onClick={() => book({ roomId: r.id })}>Book this room</button>
                    <button className="btn btn-ghost" onClick={() => navigate('/rooms')}>View its day {Icon.arrow}</button>
                  </div>
                </div>
              </article>
            ))}

            <div className="card how-card">
              <span className="eyebrow">How it works</span>
              <ol className="how-steps">
                <li><span>{Icon.tap}</span><div><strong>Pick a time</strong><p>Choose a day and tap a free start time.</p></div></li>
                <li><span>{Icon.pen}</span><div><strong>Add a few details</strong><p>What it's for and how many people.</p></div></li>
                <li><span>{Icon.check}</span><div><strong>You're confirmed</strong><p>Instantly. Add it to your calendar in one tap.</p></div></li>
              </ol>
              {isAdmin
                ? <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Open admin dashboard</button>
                : !user && <p className="how-note">No account needed. <button className="link-btn" onClick={() => navigate('/login')}>Sign in</button> to see and manage your bookings.</p>}
            </div>
          </div>
        </section>
      )}

      <footer className="home-footer">MeetingDesk · Conference room booking</footer>
    </div>
  )
}
