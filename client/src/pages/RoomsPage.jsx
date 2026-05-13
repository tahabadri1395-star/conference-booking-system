// src/pages/RoomsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am–9pm
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function buildFreeSlots(bookings) {
  const dayStart = 7 * 60
  const dayEnd = 21 * 60
  const sorted = [...bookings].sort((a, b) => toMin(a.startTime) - toMin(b.startTime))
  const free = []
  let cursor = dayStart
  for (const b of sorted) {
    const s = toMin(b.startTime)
    const e = toMin(b.endTime)
    if (s > cursor) free.push({ from: cursor, to: s })
    cursor = Math.max(cursor, e)
  }
  if (cursor < dayEnd) free.push({ from: cursor, to: dayEnd })
  return free
}

function minToLabel(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:${String(min).padStart(2, '0')} ${ampm}`
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0])
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

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
    const d = new Date(viewDate)
    d.setDate(d.getDate() + delta)
    setViewDate(d.toISOString().split('T')[0])
  }

  const roomBookings = selected
    ? bookings
        .filter(b => b.roomId === selected.id && b.status !== 'rejected')
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    : []

  const dayBookings = roomBookings.filter(b => b.date === viewDate)
  const upcomingBookings = roomBookings.filter(b => b.date > today)
  const freeSlots = buildFreeSlots(dayBookings)

  const dayStart = 7 * 60
  const totalMins = 14 * 60

  const slotStyle = (startMin, endMin) => ({
    top: `${((startMin - dayStart) / totalMins) * 100}%`,
    height: `${((endMin - startMin) / totalMins) * 100}%`,
  })

  const dateLabel = viewDate === today
    ? 'Today'
    : viewDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]
      ? 'Tomorrow'
      : new Date(viewDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conference Rooms</h1>
          <p className="page-subtitle">View availability and schedules for all rooms</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/book')}>
          Book a Room →
        </button>
      </div>

      <div className="rooms-page-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Room list */}
        <div className="rooms-list-mobile" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
              ))
            : rooms.map(r => {
                const todayBooked = bookings.filter(
                  b => b.roomId === r.id && b.date === today && b.status !== 'rejected'
                ).length
                const isSelected = selected?.id === r.id
                return (
                  <div
                    key={r.id}
                    className={`room-card${isSelected ? ' selected' : ''}`}
                    style={{ '--room-color': r.color, padding: '14px 16px', cursor: 'pointer' }}
                    onClick={() => setSelected(r)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>
                        {r.name}
                      </div>
                      {todayBooked > 0
                        ? <span className="badge badge-unavailable" style={{ fontSize: '0.65rem' }}>{todayBooked} booked</span>
                        : <span className="badge badge-available" style={{ fontSize: '0.65rem' }}>Free today</span>
                      }
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{r.floor}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.amenities?.slice(0, 3).map(a => (
                        <span key={a} className="amenity-tag" style={{ fontSize: '0.6rem' }}>{a}</span>
                      ))}
                    </div>
                  </div>
                )
              })
          }
        </div>

        {/* Right panel */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Room header */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600 }}>
                    {selected.name}
                  </h2>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 2 }}>{selected.floor}</p>
                  <div className="room-card-amenities" style={{ marginTop: 8 }}>
                    {selected.amenities?.map(a => (
                      <span key={a} className="amenity-tag">{a}</span>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/book')}>Book Now</button>
              </div>
            </div>

            {/* Date navigator */}
            <div className="card" style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={() => shiftDate(-1)}
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.85rem' }}
                >
                  ← Prev
                </button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.05rem' }}>
                    {dateLabel}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 1 }}>
                    {new Date(viewDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => shiftDate(1)}
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.85rem' }}
                >
                  Next →
                </button>
              </div>

              {/* Availability summary pills */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {dayBookings.length === 0 ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--green)', background: 'var(--green-bg)', padding: '4px 12px', borderRadius: 20, fontWeight: 500 }}>
                    Fully available all day
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: '0.78rem', color: 'var(--red)', background: 'var(--red-bg)', padding: '4px 12px', borderRadius: 20, fontWeight: 500 }}>
                      {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--green)', background: 'var(--green-bg)', padding: '4px 12px', borderRadius: 20, fontWeight: 500 }}>
                      {freeSlots.length} free window{freeSlots.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Schedule grid */}
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
                Daily Schedule
              </h3>

              <div style={{ display: 'flex', gap: 0 }}>
                {/* Time axis */}
                <div style={{ width: 52, flexShrink: 0, position: 'relative', height: 14 * 56 }}>
                  {HOURS.map((h, i) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: i * 56,
                        right: 8,
                        fontSize: '0.65rem',
                        color: 'var(--text-3)',
                        lineHeight: 1,
                        textAlign: 'right',
                      }}
                    >
                      {h > 12 ? h - 12 : h}{h >= 12 ? 'pm' : 'am'}
                    </div>
                  ))}
                </div>

                {/* Grid + slots */}
                <div style={{ flex: 1, position: 'relative', height: 14 * 56 }}>
                  {/* Hour grid lines */}
                  {HOURS.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        top: i * 56,
                        left: 0, right: 0,
                        height: 1,
                        background: 'var(--border)',
                      }}
                    />
                  ))}
                  {/* Half-hour dashed lines */}
                  {HOURS.map((_, i) => (
                    <div
                      key={`half-${i}`}
                      style={{
                        position: 'absolute',
                        top: i * 56 + 28,
                        left: 0, right: 0,
                        height: 1,
                        background: 'var(--border)',
                        opacity: 0.4,
                        borderTop: '1px dashed var(--border)',
                      }}
                    />
                  ))}

                  {/* Free slots */}
                  {freeSlots.map((slot, i) => {
                    const style = slotStyle(slot.from, slot.to)
                    const durationMins = slot.to - slot.from
                    const durationH = Math.floor(durationMins / 60)
                    const durationM = durationMins % 60
                    const label = durationH > 0
                      ? `${durationH}h${durationM > 0 ? ` ${durationM}m` : ''} free`
                      : `${durationM}m free`
                    return (
                      <div
                        key={`free-${i}`}
                        style={{
                          position: 'absolute',
                          left: 2, right: 2,
                          ...style,
                          background: 'rgba(22,163,74,0.06)',
                          border: '1px dashed rgba(22,163,74,0.3)',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        {durationMins >= 30 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 500, opacity: 0.8 }}>
                            ✓ {minToLabel(slot.from)} – {minToLabel(slot.to)} · {label}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {/* Booked slots */}
                  {dayBookings.map(b => {
                    const s = toMin(b.startTime)
                    const e = toMin(b.endTime)
                    const style = slotStyle(s, e)
                    const durationMins = e - s
                    const isApproved = b.status === 'approved'
                    return (
                      <div
                        key={b.id}
                        style={{
                          position: 'absolute',
                          left: 4, right: 4,
                          ...style,
                          background: isApproved ? 'var(--accent-glow)' : 'var(--yellow-bg)',
                          border: `1.5px solid ${isApproved ? 'var(--accent)' : 'rgba(217,119,6,0.4)'}`,
                          borderRadius: 8,
                          padding: '6px 10px',
                          overflow: 'hidden',
                          boxShadow: isApproved ? '0 2px 8px var(--accent-glow)' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isApproved ? 'var(--accent-2)' : 'var(--yellow)', lineHeight: 1.2 }}>
                          {b.startTime} – {b.endTime}
                        </div>
                        {durationMins >= 45 && (
                          <>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {b.purpose}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 1 }}>
                              {b.name}
                            </div>
                          </>
                        )}
                        <span
                          style={{
                            position: 'absolute', top: 6, right: 8,
                            fontSize: '0.6rem', fontWeight: 600,
                            background: isApproved ? 'var(--accent)' : 'rgba(217,119,6,0.2)',
                            color: isApproved ? 'white' : 'var(--yellow)',
                            padding: '1px 6px', borderRadius: 10,
                          }}
                        >
                          {b.status}
                        </span>
                      </div>
                    )
                  })}

                  {/* Current time line (only for today) */}
                  {viewDate === today && (() => {
                    const now = new Date()
                    const mins = now.getHours() * 60 + now.getMinutes()
                    const pct = ((mins - dayStart) / totalMins) * 100
                    if (pct < 0 || pct > 100) return null
                    return (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${pct}%`, zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', left: -6, top: -5, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
                        <div style={{ height: 2, background: 'var(--accent)', marginLeft: 4, boxShadow: '0 0 6px var(--accent-glow)' }} />
                        <span style={{ position: 'absolute', right: 0, top: -9, fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 600, background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4 }}>
                          Now
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-glow)', border: '1.5px solid var(--accent)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Approved booking</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--yellow-bg)', border: '1.5px solid rgba(217,119,6,0.4)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Pending booking</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(22,163,74,0.06)', border: '1px dashed rgba(22,163,74,0.3)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Available</span>
                </div>
                {viewDate === today && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 2, background: 'var(--accent)', borderRadius: 2 }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Current time</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bookings list for selected day */}
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>
                {dateLabel}'s Bookings ({dayBookings.length})
              </h3>
              {dayBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🟢</div>
                  <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.9rem' }}>Room is fully available</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>No bookings on this day. Book it now!</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/book')}>
                    Book This Room
                  </button>
                </div>
              ) : (
                dayBookings.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{
                      width: 4, alignSelf: 'stretch', borderRadius: 4,
                      background: b.status === 'approved' ? 'var(--accent)' : 'var(--yellow)',
                      flexShrink: 0,
                    }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', minWidth: 105 }}>
                      {b.startTime} – {b.endTime}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>{b.purpose}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 1 }}>{b.name}</div>
                    </div>
                    <span className={`badge badge-${b.status}`}>{b.status}</span>
                  </div>
                ))
              )}

              {/* Free windows list */}
              {freeSlots.length > 0 && dayBookings.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Available Windows
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {freeSlots.map((slot, i) => {
                      const dur = slot.to - slot.from
                      const h = Math.floor(dur / 60)
                      const m = dur % 60
                      return (
                        <div key={i} style={{
                          fontSize: '0.78rem', color: 'var(--green)', background: 'var(--green-bg)',
                          border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8,
                          padding: '6px 12px', fontWeight: 500,
                        }}>
                          {minToLabel(slot.from)} – {minToLabel(slot.to)}
                          <span style={{ marginLeft: 6, opacity: 0.7, fontSize: '0.7rem' }}>
                            ({h > 0 ? `${h}h ` : ''}{m > 0 ? `${m}m` : ''})
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming bookings (future days) */}
            {upcomingBookings.length > 0 && (
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>
                  Upcoming Bookings ({upcomingBookings.length})
                </h3>
                {upcomingBookings.slice(0, 8).map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', minWidth: 70 }}>{b.date}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', minWidth: 100 }}>
                      {b.startTime} – {b.endTime}
                    </div>
                    <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.purpose}
                    </div>
                    <span className={`badge badge-${b.status}`}>{b.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
