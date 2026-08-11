import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const HOUR_H = 56
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

const minToLabel = m => {
  const h = Math.floor(m / 60), min = m % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const d = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${d}:${String(min).padStart(2, '0')} ${ampm}`
}

function buildFreeSlots(bookings) {
  const s = 7 * 60, e = 21 * 60
  const sorted = [...bookings].sort((a, b) => toMin(a.startTime) - toMin(b.startTime))
  const free = []; let cur = s
  for (const b of sorted) {
    if (toMin(b.startTime) > cur) free.push({ from: cur, to: toMin(b.startTime) })
    cur = Math.max(cur, toMin(b.endTime))
  }
  if (cur < e) free.push({ from: cur, to: e })
  return free
}

const ROOM_ICONS = [
  <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:22,height:22}}><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01M15 15h.01"/></svg>,
  <svg key="b" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:22,height:22}}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:22,height:22}}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  <svg key="d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
]

export default function RoomsPage() {
  const [rooms, setRooms]       = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0])
  const [changing, setChanging] = useState(false)
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]
  const scheduleRef = useRef(null)

  useEffect(() => {
    Promise.all([api.get('/rooms'), api.get('/bookings')])
      .then(([rRes, bRes]) => {
        setRooms(rRes.data.data)
        setBookings(bRes.data.data)
        if (rRes.data.data.length) setSelected(rRes.data.data[0])
      })
      .catch(() => toast.error('Failed to load rooms'))
      .finally(() => setLoading(false))
  }, [])

  const shiftDate = delta => {
    setChanging(true)
    setTimeout(() => {
      const d = new Date(viewDate)
      d.setDate(d.getDate() + delta)
      setViewDate(d.toISOString().split('T')[0])
      setChanging(false)
    }, 180)
  }

  const selectRoom = r => {
    setChanging(true)
    setTimeout(() => { setSelected(r); setChanging(false) }, 160)
  }

  const roomBookings  = selected ? bookings.filter(b => b.roomId === selected.id && b.status !== 'rejected') : []
  const dayBookings   = roomBookings.filter(b => b.date === viewDate).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const upcomingBookings = roomBookings.filter(b => b.date > today).slice(0, 6)
  const freeSlots     = buildFreeSlots(dayBookings)

  const dayStart  = 7 * 60
  const totalMins = 14 * 60
  const slotPct   = mins => ((mins - dayStart) / totalMins) * 100

  const dateLabel = viewDate === today ? 'Today'
    : viewDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'Tomorrow'
    : new Date(viewDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const utilization = selected
    ? Math.round((dayBookings.reduce((acc, b) => acc + toMin(b.endTime) - toMin(b.startTime), 0) / totalMins) * 100)
    : 0

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conference Rooms</h1>
          <p className="page-subtitle">Explore room availability and reserve your slot</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/book')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:15,height:15}}><path d="M12 5v14M5 12h14"/></svg>
          Book a Room
        </button>
      </div>

      <div className="rooms-page-grid" style={{ display: 'grid', gridTemplateColumns: '256px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: room list ── */}
        <div className="rooms-list-mobile stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 88, borderRadius: 14 }} />
            ))
          ) : rooms.map((r, idx) => {
            const todayBooked = bookings.filter(b => b.roomId === r.id && b.date === today && b.status !== 'rejected').length
            const isSelected  = selected?.id === r.id
            const icon = ROOM_ICONS[idx % ROOM_ICONS.length]
            return (
              <div
                key={r.id}
                onClick={() => selectRoom(r)}
                style={{
                  background: isSelected ? 'var(--bg)' : 'var(--bg)',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 14,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: isSelected
                    ? '0 0 0 3px var(--accent-subtle), var(--s2)'
                    : 'var(--s1)',
                  transform: isSelected ? 'translateY(-1px)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* color bar top */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: r.color || 'var(--accent)', borderRadius: '14px 14px 0 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-2)',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isSelected ? 'var(--accent)' : 'var(--tx-3)',
                    transition: 'all 0.2s',
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 1 }}>{r.floor}</div>
                  </div>
                  {todayBooked > 0
                    ? <span className="badge badge-unavailable" style={{ fontSize: '0.62rem', flexShrink: 0 }}>{todayBooked}</span>
                    : <span className="badge badge-available" style={{ fontSize: '0.62rem', flexShrink: 0 }}>Free</span>
                  }
                </div>
                {r.amenities?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                    {r.amenities.slice(0, 3).map(a => (
                      <span key={a} className="amenity-tag" style={{ fontSize: '0.6rem' }}>{a}</span>
                    ))}
                    {r.amenities.length > 3 && (
                      <span className="amenity-tag" style={{ fontSize: '0.6rem' }}>+{r.amenities.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Right: detail panel ── */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: changing ? 0 : 1, transform: changing ? 'translateY(8px)' : 'none', transition: 'opacity 0.18s, transform 0.18s' }}>

            {/* Room hero card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Gradient header bar */}
              <div style={{
                height: 6,
                background: selected.color
                  ? `linear-gradient(90deg, ${selected.color}, ${selected.color}99)`
                  : 'linear-gradient(90deg, var(--a1), var(--a2))',
              }} />
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.025em' }}>
                      {selected.name}
                    </h2>
                    <p style={{ color: 'var(--tx-3)', fontSize: '0.82rem', marginTop: 3 }}>{selected.floor}{selected.capacity ? ` · Seats ${selected.capacity}` : ''}</p>
                    <div className="room-card-amenities" style={{ marginTop: 10 }}>
                      {selected.amenities?.map(a => (
                        <span key={a} className="amenity-tag">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => navigate('/book', { state: { roomId: selected.id } })}>
                      Book Now
                    </button>
                    {/* Utilization ring */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="36" height="36" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="3"/>
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          stroke={utilization > 70 ? 'var(--red)' : utilization > 40 ? 'var(--amber)' : 'var(--green)'}
                          strokeWidth="3"
                          strokeDasharray={`${(utilization / 100) * 94.2} 94.2`}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
                        />
                        <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--tx-3)">{utilization}%</text>
                      </svg>
                      <span style={{ fontSize: '0.68rem', color: 'var(--tx-3)' }}>today</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date navigator */}
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => shiftDate(-1)}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:13,height:13}}><polyline points="15 18 9 12 15 6"/></svg>
                  Prev
                </button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--tx)', letterSpacing: '-0.02em' }}>
                    {dateLabel}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 2 }}>
                    {new Date(viewDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => shiftDate(1)}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:13,height:13}}><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              {/* Availability pills */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {dayBookings.length === 0 ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--green-tx)', background: 'var(--green-bg)', border: '1px solid var(--green-bd)', padding: '4px 14px', borderRadius: 20, fontWeight: 600 }}>
                    Fully available all day
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: '0.78rem', color: 'var(--red-tx)', background: 'var(--red-bg)', border: '1px solid var(--red-bd)', padding: '4px 14px', borderRadius: 20, fontWeight: 600 }}>
                      {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--green-tx)', background: 'var(--green-bg)', border: '1px solid var(--green-bd)', padding: '4px 14px', borderRadius: 20, fontWeight: 500 }}>
                      {freeSlots.filter(s => s.to - s.from >= 30).length} free window{freeSlots.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>

              {/* Free windows */}
              {freeSlots.filter(s => s.to - s.from >= 30).length > 0 && dayBookings.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {freeSlots.filter(s => s.to - s.from >= 30).map((slot, i) => {
                    const dur = slot.to - slot.from
                    const h = Math.floor(dur / 60), m = dur % 60
                    return (
                      <button
                        key={i}
                        onClick={() => navigate('/book', { state: { date: viewDate } })}
                        style={{
                          fontSize: '0.72rem', color: 'var(--green-tx)', background: 'var(--green-bg)',
                          border: '1px solid var(--green-bd)', borderRadius: 8,
                          padding: '5px 12px', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s', fontFamily: 'var(--font)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--green)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-bg)'; e.currentTarget.style.color = 'var(--green-tx)'; e.currentTarget.style.borderColor = 'var(--green-bd)' }}
                      >
                        {minToLabel(slot.from)} – {minToLabel(slot.to)} · {h > 0 ? `${h}h ` : ''}{m > 0 ? `${m}m` : ''}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="card" ref={scheduleRef}>
              <div className="card-header">
                <span className="card-title">Daily Schedule — {dateLabel}</span>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { color: 'var(--accent-subtle)', border: 'var(--accent)', label: 'Approved' },
                    { color: 'var(--amber-bg)',      border: 'var(--amber-bd)', label: 'Pending' },
                    { color: 'rgba(22,163,74,0.07)', border: 'rgba(22,163,74,0.3)', label: 'Free', dashed: true },
                  ].map(({ color, border, label, dashed }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 11, height: 11, borderRadius: 3, background: color, border: `1.5px ${dashed ? 'dashed' : 'solid'} ${border}`, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.68rem', color: 'var(--tx-3)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 0 }}>
                {/* Time axis */}
                <div style={{ width: 48, flexShrink: 0, position: 'relative', height: HOURS.length * HOUR_H }}>
                  {HOURS.map((h, i) => (
                    <div key={h} style={{
                      position: 'absolute', top: i * HOUR_H - 7,
                      right: 8, fontSize: '0.62rem', color: 'var(--tx-3)',
                      lineHeight: 1, textAlign: 'right', fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}>
                      {h > 12 ? h - 12 : h}{h >= 12 ? 'pm' : 'am'}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div style={{ flex: 1, position: 'relative', height: HOURS.length * HOUR_H, borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                  {/* Hour grid lines */}
                  {HOURS.map((_, i) => (
                    <div key={i} style={{ position: 'absolute', top: i * HOUR_H, left: 0, right: 0, height: 1, background: 'var(--line)' }} />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.slice(0, -1).map((_, i) => (
                    <div key={`h${i}`} style={{ position: 'absolute', top: i * HOUR_H + HOUR_H / 2, left: 0, right: 0, height: 1, background: 'var(--line)', opacity: 0.4 }} />
                  ))}

                  {/* Free slots */}
                  {freeSlots.filter(s => s.to - s.from >= 30).map((slot, i) => (
                    <div
                      key={`free-${i}`}
                      onClick={() => navigate('/book', { state: { date: viewDate } })}
                      style={{
                        position: 'absolute', left: 3, right: 3,
                        top: `${slotPct(slot.from)}%`,
                        height: `${slotPct(slot.to) - slotPct(slot.from)}%`,
                        background: 'rgba(22,163,74,0.04)',
                        border: '1.5px dashed rgba(22,163,74,0.25)',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,163,74,0.09)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(22,163,74,0.04)'}
                    >
                      {(slot.to - slot.from) >= 60 && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--green)', fontWeight: 600, opacity: 0.8 }}>
                          {minToLabel(slot.from)} – {minToLabel(slot.to)} · Available
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Booked slots */}
                  {dayBookings.map((b, i) => {
                    const s = toMin(b.startTime), e = toMin(b.endTime)
                    const dur = e - s
                    const isApproved = b.status === 'approved'
                    return (
                      <div
                        key={b.id}
                        style={{
                          position: 'absolute', left: 4, right: 4,
                          top: `${slotPct(s)}%`,
                          height: `${slotPct(e) - slotPct(s)}%`,
                          background: isApproved
                            ? 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(124,58,237,0.08))'
                            : 'var(--amber-bg)',
                          border: `1.5px solid ${isApproved ? 'rgba(79,70,229,0.35)' : 'var(--amber-bd)'}`,
                          borderLeft: `3px solid ${isApproved ? 'var(--accent)' : 'var(--amber)'}`,
                          borderRadius: 8,
                          padding: '6px 10px',
                          overflow: 'hidden',
                          boxShadow: isApproved ? '0 2px 12px rgba(79,70,229,0.15)' : '0 2px 8px rgba(217,119,6,0.1)',
                          animation: `scaleIn 0.3s ${i * 0.06}s cubic-bezier(0.4,0,0.2,1) both`,
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isApproved ? 'var(--accent-text)' : 'var(--amber)', lineHeight: 1.3 }}>
                          {b.startTime} – {b.endTime}
                        </div>
                        {dur >= 45 && (
                          <>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tx)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {b.purpose}
                            </div>
                            <div style={{ fontSize: '0.67rem', color: 'var(--tx-3)', marginTop: 2 }}>{b.name}</div>
                          </>
                        )}
                        <span style={{
                          position: 'absolute', top: 5, right: 7,
                          fontSize: '0.58rem', fontWeight: 700,
                          background: isApproved ? 'var(--accent)' : 'transparent',
                          color: isApproved ? 'white' : 'var(--amber)',
                          padding: '1px 6px', borderRadius: 20,
                        }}>
                          {b.status}
                        </span>
                      </div>
                    )
                  })}

                  {/* Now line */}
                  {viewDate === today && (() => {
                    const now = new Date()
                    const pct = slotPct(now.getHours() * 60 + now.getMinutes())
                    if (pct < 0 || pct > 100) return null
                    return (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${pct}%`, zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{
                          position: 'absolute', left: -5, top: -5,
                          width: 10, height: 10, borderRadius: '50%',
                          background: 'var(--accent)',
                          boxShadow: '0 0 0 3px var(--accent-subtle), 0 0 10px var(--accent)',
                          animation: 'pulseGlow 2s ease infinite',
                        }} />
                        <div style={{ height: 2, background: 'linear-gradient(90deg, var(--accent), rgba(124,58,237,0.3))', marginLeft: 5, borderRadius: 2 }} />
                        <span style={{
                          position: 'absolute', right: 6, top: -9,
                          fontSize: '0.6rem', color: 'white', fontWeight: 700,
                          background: 'var(--accent)',
                          padding: '2px 7px', borderRadius: 20,
                          boxShadow: '0 2px 8px var(--accent-glow)',
                        }}>
                          Now
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Today's bookings list */}
            {dayBookings.length > 0 && (
              <div className="card animate-in" style={{ padding: 0 }}>
                <div className="card-header" style={{ padding: '16px 20px', marginBottom: 0 }}>
                  <span className="card-title">{dateLabel}'s Bookings</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--tx-3)', background: 'var(--bg-2)', padding: '2px 9px', borderRadius: 20, border: '1px solid var(--line)' }}>
                    {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ padding: '0 20px 8px' }}>
                  {dayBookings.map((b, i) => (
                    <div key={b.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 0', borderBottom: i < dayBookings.length - 1 ? '1px solid var(--line)' : 'none',
                      animation: `slideUp 0.25s ${i * 0.05}s cubic-bezier(0.4,0,0.2,1) both`,
                    }}>
                      <div style={{ width: 3, alignSelf: 'stretch', background: b.status === 'approved' ? 'var(--accent)' : 'var(--amber)', borderRadius: 4, flexShrink: 0 }} />
                      <div style={{ minWidth: 90, fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--tx)' }}>
                        {b.startTime} – {b.endTime}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.purpose}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 1 }}>{b.name}</div>
                      </div>
                      <span className={`badge badge-${b.status}`}>{b.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty today state */}
            {dayBookings.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--green-bg)', border: '1.5px solid var(--green-bd)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" style={{width:22,height:22}}><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--green-tx)', fontSize: '0.95rem', marginBottom: 4 }}>Room is fully available</div>
                <div style={{ color: 'var(--tx-3)', fontSize: '0.82rem', marginBottom: 16 }}>No bookings for {dateLabel.toLowerCase()}.</div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/book', { state: { date: viewDate } })}>
                  Book this time
                </button>
              </div>
            )}

            {/* Upcoming bookings */}
            {upcomingBookings.length > 0 && (
              <div className="card animate-in" style={{ padding: 0 }}>
                <div className="card-header" style={{ padding: '16px 20px', marginBottom: 0 }}>
                  <span className="card-title">Upcoming Bookings</span>
                </div>
                <div style={{ padding: '0 20px 8px' }}>
                  {upcomingBookings.map((b, i) => (
                    <div key={b.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', borderBottom: i < upcomingBookings.length - 1 ? '1px solid var(--line)' : 'none',
                      animation: `slideUp 0.25s ${i * 0.04}s cubic-bezier(0.4,0,0.2,1) both`,
                    }}>
                      <div style={{ textAlign: 'center', minWidth: 48 }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tx-3)' }}>
                          {new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--tx)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                          {new Date(b.date + 'T00:00:00').getDate()}
                        </div>
                      </div>
                      <div style={{ width: 1, height: 36, background: 'var(--line)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.purpose}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 1 }}>{b.startTime} – {b.endTime}</div>
                      </div>
                      <span className={`badge badge-${b.status}`}>{b.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
