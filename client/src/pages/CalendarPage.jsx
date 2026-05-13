import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

const HOUR_H = 60
const DAY_START = 7
const DAY_END = 21
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => i + DAY_START)
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toDateStr = d => d.toISOString().split('T')[0]
const isToday = d => toDateStr(d) === toDateStr(new Date())

function getWeekDays(date) {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => { const dd = new Date(monday); dd.setDate(monday.getDate() + i); return dd })
}

function getMonthGrid(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = new Date(firstDay)
  const dow = firstDay.getDay()
  start.setDate(firstDay.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
}

function fmtHour(h) { return h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM` }

function BookingBlock({ b, roomColor, compact }) {
  const s = toMin(b.startTime), e = toMin(b.endTime)
  const top = ((s - DAY_START * 60) / 60) * HOUR_H
  const height = Math.max(((e - s) / 60) * HOUR_H, 22)
  const dur = e - s
  return (
    <div style={{
      position: 'absolute', left: 3, right: 3,
      top, height,
      background: `${roomColor}22`,
      border: `1.5px solid ${roomColor}88`,
      borderLeft: `3px solid ${roomColor}`,
      borderRadius: 6,
      padding: '3px 7px',
      overflow: 'hidden',
      cursor: 'default',
      zIndex: 2,
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: roomColor, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {b.startTime}–{b.endTime}
      </div>
      {dur >= 45 && (
        <div style={{ fontSize: '0.68rem', color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
          {b.purpose}
        </div>
      )}
      {dur >= 75 && (
        <div style={{ fontSize: '0.63rem', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {b.name}
        </div>
      )}
    </div>
  )
}

function WeekView({ weekDays, bookings, rooms, navigate }) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const nowTop = ((nowMin - DAY_START * 60) / 60) * HOUR_H
  const showNow = nowMin >= DAY_START * 60 && nowMin <= DAY_END * 60

  const roomColorMap = {}
  rooms.forEach(r => { roomColorMap[r.id] = r.color || '#7c6af7' })

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div />
        {weekDays.map((d, i) => {
          const today = isToday(d)
          return (
            <div key={i} style={{ textAlign: 'center', padding: '10px 4px', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: today ? 'var(--accent)' : 'var(--text-3)', letterSpacing: '0.06em' }}>
                {DAY_NAMES[i]}
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', margin: '4px auto 0',
                background: today ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.95rem', fontWeight: today ? 700 : 500,
                color: today ? 'white' : 'var(--text)',
              }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', minWidth: 600 }}>
        {/* Hour labels */}
        <div style={{ position: 'relative', height: HOURS.length * HOUR_H }}>
          {HOURS.map((h, i) => (
            <div key={h} style={{ position: 'absolute', top: i * HOUR_H - 8, right: 8, fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 500 }}>
              {fmtHour(h)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((d, di) => {
          const dateStr = toDateStr(d)
          const dayBookings = bookings.filter(b => b.date === dateStr)
          const today = isToday(d)
          return (
            <div
              key={di}
              style={{
                position: 'relative',
                height: HOURS.length * HOUR_H,
                borderLeft: '1px solid var(--border)',
                background: today ? 'rgba(124,106,247,0.03)' : 'transparent',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/book`)}
            >
              {/* Hour lines */}
              {HOURS.map((_, i) => (
                <div key={i} style={{ position: 'absolute', top: i * HOUR_H, left: 0, right: 0, height: 1, background: 'var(--border)', opacity: 0.6 }} />
              ))}
              {/* Half-hour lines */}
              {HOURS.map((_, i) => (
                <div key={`h${i}`} style={{ position: 'absolute', top: i * HOUR_H + HOUR_H / 2, left: 0, right: 0, height: 1, background: 'var(--border)', opacity: 0.25 }} />
              ))}

              {/* Bookings */}
              {dayBookings.map(b => (
                <BookingBlock key={b.id} b={b} roomColor={roomColorMap[b.roomId] || '#7c6af7'} />
              ))}

              {/* Current time line */}
              {today && showNow && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: nowTop, zIndex: 5, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', left: -5, top: -4, width: 9, height: 9, borderRadius: '50%', background: 'var(--red)' }} />
                  <div style={{ height: 2, background: 'var(--red)', opacity: 0.8, marginLeft: 4, boxShadow: '0 0 6px rgba(220,38,38,0.4)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthView({ monthGrid, currentDate, bookings, rooms, selectedDay, setSelectedDay, navigate }) {
  const roomColorMap = {}
  rooms.forEach(r => { roomColorMap[r.id] = r.color || '#7c6af7' })

  const selectedStr = selectedDay ? toDateStr(selectedDay) : null
  const selectedBookings = selectedDay ? bookings.filter(b => b.date === toDateStr(selectedDay)) : []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>
      <div>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '6px 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {monthGrid.map((d, i) => {
            const dateStr = toDateStr(d)
            const inMonth = d.getMonth() === currentDate.getMonth()
            const today = isToday(d)
            const selected = dateStr === selectedStr
            const dayBookings = bookings.filter(b => b.date === dateStr)
            const hasBookings = dayBookings.length > 0

            return (
              <div
                key={i}
                onClick={() => setSelectedDay(d)}
                style={{
                  minHeight: 80,
                  padding: '8px 10px',
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                  borderBottom: i < 35 ? '1px solid var(--border)' : 'none',
                  background: selected ? 'var(--accent-glow)' : today ? 'rgba(124,106,247,0.04)' : 'var(--bg-2)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-3)' }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = today ? 'rgba(124,106,247,0.04)' : 'var(--bg-2)' }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: today ? 'var(--accent)' : selected ? 'var(--accent-2)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: today || selected ? 700 : 400,
                  color: today || selected ? 'white' : inMonth ? 'var(--text)' : 'var(--text-3)',
                  marginBottom: 4,
                }}>
                  {d.getDate()}
                </div>

                {/* Booking dots */}
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {dayBookings.slice(0, 3).map(b => (
                    <div key={b.id} style={{
                      width: '100%', padding: '1px 4px',
                      background: `${roomColorMap[b.roomId] || '#7c6af7'}22`,
                      borderLeft: `2px solid ${roomColorMap[b.roomId] || '#7c6af7'}`,
                      borderRadius: 3,
                      fontSize: '0.62rem', fontWeight: 500,
                      color: roomColorMap[b.roomId] || '#7c6af7',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {b.startTime} {b.purpose}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', padding: '1px 4px' }}>
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="card" style={{ position: 'sticky', top: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                {selectedDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1.2rem', lineHeight: 1 }}
              onClick={() => setSelectedDay(null)}>×</button>
          </div>

          {selectedBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🟢</div>
              <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.875rem' }}>Fully available</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12, width: '100%' }}
                onClick={() => navigate('/book')}>
                Book This Day
              </button>
            </div>
          ) : (
            <>
              {selectedBookings.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(b => (
                <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: roomColorMap[b.roomId] || '#7c6af7', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{b.startTime} – {b.endTime}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text)', paddingLeft: 16 }}>{b.purpose}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', paddingLeft: 16, marginTop: 2 }}>{b.name} · {b.room?.name}</div>
                </div>
              ))}
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14, width: '100%' }}
                onClick={() => navigate('/book')}>
                Book Another Slot
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.get('/rooms'), api.get('/bookings')])
      .then(([rRes, bRes]) => { setRooms(rRes.data.data); setBookings(bRes.data.data) })
      .catch(() => toast.error('Failed to load calendar'))
      .finally(() => setLoading(false))
  }, [])

  const prev = () => {
    const d = new Date(currentDate)
    view === 'month' ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }
  const next = () => {
    const d = new Date(currentDate)
    view === 'month' ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }

  const weekDays = getWeekDays(currentDate)
  const monthGrid = getMonthGrid(currentDate)

  const weekLabel = (() => {
    const first = weekDays[0], last = weekDays[6]
    if (first.getMonth() === last.getMonth())
      return `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`
    return `${MONTH_NAMES[first.getMonth()]} – ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`
  })()

  const label = view === 'month'
    ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : weekLabel

  if (loading) return (
    <div className="page animate-in">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 8 }} />
      ))}
    </div>
  )

  return (
    <div className="page animate-in" style={{ maxWidth: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prev} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', fontSize: '1rem' }}>‹</button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, minWidth: 200, textAlign: 'center' }}>{label}</span>
          <button onClick={next} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', fontSize: '1rem' }}>›</button>
          <button onClick={() => setCurrentDate(new Date())} className="btn btn-secondary btn-sm">Today</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Room legend */}
          <div style={{ display: 'flex', gap: 10 }}>
            {rooms.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: r.color }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{r.name}</span>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
            {['week', 'month'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--bg-2)' : 'transparent',
                color: view === v ? 'var(--text)' : 'var(--text-3)',
                fontFamily: 'var(--font-sans)', fontSize: '0.8rem', fontWeight: view === v ? 600 : 400,
                boxShadow: view === v ? 'var(--shadow)' : 'none', transition: 'all 0.15s',
              }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => navigate('/book')}>
            + Book Room
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {view === 'week'
          ? <WeekView weekDays={weekDays} bookings={bookings} rooms={rooms} navigate={navigate} />
          : <MonthView monthGrid={monthGrid} currentDate={currentDate} bookings={bookings} rooms={rooms} selectedDay={selectedDay} setSelectedDay={setSelectedDay} navigate={navigate} />
        }
      </div>
    </div>
  )
}
