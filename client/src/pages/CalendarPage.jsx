import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

// ─── Constants ───────────────────────────────────────────────
const GRID_START = 7
const GRID_END   = 21
const HOUR_H     = 64
const DAYS_S     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_S   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const toDateStr = d => d.toISOString().slice(0, 10)
const todayStr  = toDateStr(new Date())

const toAMPM = t => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function timeToY(t) {
  if (!t) return -1
  const [h, m] = t.split(':').map(Number)
  return (h * 60 + m - GRID_START * 60) * (HOUR_H / 60)
}

function getWeekDays(date) {
  const d = new Date(date), sun = new Date(d)
  sun.setDate(d.getDate() - d.getDay())
  return Array.from({ length: 7 }, (_, i) => { const w = new Date(sun); w.setDate(sun.getDate() + i); return w })
}

// Status → colour meta
const STATUS_META = {
  approved: { bg: 'rgba(52,211,153,0.12)', border: '#34d399', text: '#34d399', solid: '#10b981' },
  pending:  { bg: 'rgba(251,191,36,0.12)',  border: '#fbbf24', text: '#fbbf24', solid: '#f59e0b' },
  rejected: { bg: 'rgba(248,113,113,0.12)', border: '#f87171', text: '#f87171', solid: '#ef4444' },
}
const meta = s => STATUS_META[s] || STATUS_META.approved

// ─── Mini Calendar ───────────────────────────────────────────
function MiniCal({ focusDate, selectedDate, onDateClick, dotDates }) {
  const [month, setMonth] = useState(focusDate.getMonth())
  const [year,  setYear]  = useState(focusDate.getFullYear())

  useEffect(() => { setMonth(focusDate.getMonth()); setYear(focusDate.getFullYear()) }, [focusDate])

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells       = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const prev = () => { const d = new Date(year, month - 1, 1); setMonth(d.getMonth()); setYear(d.getFullYear()) }
  const next = () => { const d = new Date(year, month + 1, 1); setMonth(d.getMonth()); setYear(d.getFullYear()) }

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--tx-2)' }}>{MONTHS_S[month]} {year}</span>
        <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--tx-3)', padding: '3px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isTdy   = dateStr === todayStr
          const isSel   = dateStr === selectedDate
          const hasDot  = dotDates.has(dateStr)
          return (
            <button key={dateStr} onClick={() => onDateClick(dateStr)}
              style={{
                position: 'relative', width: 28, height: 28, margin: '0 auto',
                borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: isTdy && !isSel ? 'var(--accent)' : isSel ? 'var(--accent-subtle)' : 'transparent',
                color: isTdy && !isSel ? 'white' : isSel ? 'var(--accent-text)' : 'var(--tx-2)',
                fontSize: '0.7rem', fontWeight: isTdy || isSel ? 700 : 500,
                outline: isSel ? '2px solid var(--accent)' : 'none',
                transition: 'all 0.1s',
              }}>
              {day}
              {hasDot && !isTdy && !isSel && (
                <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Event Popover ───────────────────────────────────────────
function EventPopover({ booking, anchorRect, onClose, navigate }) {
  const ref = useRef(null)
  const m   = meta(booking.status)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const t = setTimeout(() => document.addEventListener('pointerdown', handler), 50)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', handler) }
  }, [onClose])

  const popW = 272
  let left = anchorRect.right + 10
  let top  = Math.max(8, Math.min(anchorRect.top, window.innerHeight - 320))
  if (left + popW > window.innerWidth - 8) left = anchorRect.left - popW - 10
  if (left < 8) left = 8

  return (
    <div ref={ref} style={{
      position: 'fixed', zIndex: 200, top, left, width: popW,
      background: 'var(--bg-1)', border: '1px solid var(--line)',
      borderRadius: 16, boxShadow: 'var(--s4)', overflow: 'hidden',
      animation: 'scaleIn 0.15s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <div style={{ height: 3, background: m.solid }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--tx)', lineHeight: 1.35, fontFamily: 'var(--font-display)' }}>{booking.purpose}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:14,height:14}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {[
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, text: new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }) },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, text: `${toAMPM(booking.startTime)} – ${toAMPM(booking.endTime)}` },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/><path d="M15 11h.01"/></svg>, text: booking.room?.name },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, text: `${booking.name}${booking.attendees ? ` · ${booking.attendees} attendees` : ''}` },
          ].filter(r => r.text).map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem', color: 'var(--tx-3)' }}>
              <span style={{ color: 'var(--tx-3)', flexShrink: 0 }}>{row.icon}</span>
              <span>{row.text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: m.bg, color: m.text, border: `1px solid ${m.border}` }}>
            {booking.status}
          </span>
          {booking.adminRemarks && (
            <p style={{ fontSize: '0.72rem', color: 'var(--tx-3)', fontStyle: 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{booking.adminRemarks}"
            </p>
          )}
          <button
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 'auto', flexShrink: 0 }}
            onClick={() => { navigate('/book', { state: { date: booking.date } }); onClose() }}>
            Book same day
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Time Grid (Week / Day) ──────────────────────────────────
function TimeGrid({ days, bookings, onEventClick, navigate }) {
  const totalH = (GRID_END - GRID_START) * HOUR_H
  const hours  = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i)
  const gridRef = useRef(null)
  const [nowY, setNowY] = useState(-1)
  const todayCol = days.findIndex(d => toDateStr(d) === todayStr)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const y = (now.getHours() * 60 + now.getMinutes() - GRID_START * 60) * (HOUR_H / 60)
      setNowY(y >= 0 && y <= totalH ? y : -1)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [totalH])

  useEffect(() => {
    if (gridRef.current && nowY > 0) gridRef.current.scrollTop = Math.max(0, nowY - 120)
  }, [])

  const byDate = {}
  days.forEach(d => {
    const ds = toDateStr(d)
    byDate[ds] = bookings.filter(b => b.date === ds && b.status !== 'rejected')
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--bg-1)' }}>
        <div style={{ width: 56, flexShrink: 0 }} />
        {days.map(d => {
          const ds = toDateStr(d), isT = ds === todayStr
          return (
            <div key={ds} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderLeft: '1px solid var(--line)', background: isT ? 'var(--accent-subtle)' : 'transparent' }}>
              <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isT ? 'var(--accent-text)' : 'var(--tx-3)' }}>
                {DAYS_S[d.getDay()]}
              </p>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', margin: '4px auto 0',
                background: isT ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', fontWeight: isT ? 700 : 500,
                color: isT ? 'white' : 'var(--tx)',
              }}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', height: totalH }}>
          {/* Hour labels */}
          <div style={{ width: 56, flexShrink: 0, position: 'relative' }}>
            {hours.map((h, i) => (
              <div key={h} style={{ position: 'absolute', top: i * HOUR_H - 7, right: 8, fontSize: '0.6rem', color: 'var(--tx-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, ci) => {
            const ds = toDateStr(d), isT = ds === todayStr
            const dayBs = byDate[ds] || []

            return (
              <div key={ds}
                onClick={e => { if (e.target === e.currentTarget) navigate('/book', { state: { date: ds } }) }}
                style={{
                  flex: 1, borderLeft: '1px solid var(--line)', position: 'relative', height: totalH,
                  background: isT ? 'rgba(124,110,240,0.03)' : 'transparent', cursor: 'default',
                }}>
                {hours.map((_, i) => (
                  <div key={i} style={{ position: 'absolute', top: i * HOUR_H, left: 0, right: 0, borderTop: '1px solid var(--line)', opacity: 0.5 }} />
                ))}
                {hours.slice(0, -1).map((_, i) => (
                  <div key={`h${i}`} style={{ position: 'absolute', top: i * HOUR_H + HOUR_H / 2, left: 0, right: 0, borderTop: '1px dashed var(--line)', opacity: 0.3 }} />
                ))}

                {/* Now line */}
                {isT && nowY >= 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: nowY, zIndex: 10, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', marginLeft: -5, flexShrink: 0, boxShadow: '0 0 0 3px rgba(248,113,113,0.25)' }} />
                    <div style={{ flex: 1, height: 2, background: 'var(--red)', opacity: 0.85 }} />
                  </div>
                )}

                {/* Bookings */}
                {dayBs.map((b, bi) => {
                  const y = timeToY(b.startTime)
                  const endY = timeToY(b.endTime)
                  const h = Math.max(endY - y, 22)
                  const m = meta(b.status)
                  if (y < 0) return null
                  return (
                    <button key={b.id}
                      onClick={e => { e.stopPropagation(); onEventClick(b, e.currentTarget.getBoundingClientRect()) }}
                      style={{
                        position: 'absolute', left: 3, right: 3, top: y + 2, height: h - 4,
                        background: m.bg, borderLeft: `3px solid ${m.border}`,
                        border: `1px solid ${m.border}`, borderLeftWidth: 3,
                        borderRadius: 7, padding: '4px 7px', overflow: 'hidden',
                        textAlign: 'left', cursor: 'pointer', zIndex: 5,
                        transition: 'filter 0.1s, transform 0.1s',
                        animation: `scaleIn 0.2s ${bi * 0.04}s both`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'scaleX(1.01)' }}
                      onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = '' }}>
                      <p style={{ fontSize: '0.68rem', fontWeight: 700, color: m.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.purpose}
                      </p>
                      {h > 32 && (
                        <p style={{ fontSize: '0.6rem', color: m.text, opacity: 0.8, marginTop: 1 }}>
                          {toAMPM(b.startTime)}
                          {b.room?.name ? ` · ${b.room.name}` : ''}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Month Grid ──────────────────────────────────────────────
function MonthGrid({ year, month, bookings, onEventClick, onDayClick, selectedDay }) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells       = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
        {DAYS_S.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} style={{ minHeight: 96 }} />
          const ds       = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isT      = ds === todayStr
          const isSel    = ds === selectedDay
          const dayBs    = bookings.filter(b => b.date === ds && b.status !== 'rejected').sort((a,b) => a.startTime.localeCompare(b.startTime))

          return (
            <div key={ds} onClick={() => onDayClick(ds)}
              style={{
                minHeight: 96, borderRadius: 10, padding: '8px 8px 6px',
                border: `1px solid ${isSel ? 'var(--accent)' : isT ? 'rgba(124,110,240,0.3)' : 'var(--line)'}`,
                background: isSel ? 'var(--accent-subtle)' : isT ? 'rgba(124,110,240,0.04)' : 'var(--bg-1)',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!isSel && !isT) e.currentTarget.style.borderColor = 'var(--line-2)' }}
              onMouseLeave={e => { if (!isSel && !isT) e.currentTarget.style.borderColor = 'var(--line)' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: isT ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.78rem', fontWeight: isT ? 700 : 500,
                  color: isT ? 'white' : 'var(--tx)',
                }}>{day}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayBs.slice(0, 3).map(b => {
                  const m = meta(b.status)
                  return (
                    <button key={b.id}
                      onClick={e => { e.stopPropagation(); onEventClick(b, e.currentTarget.getBoundingClientRect()) }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '1.5px 5px',
                        borderRadius: 4, border: 'none', cursor: 'pointer',
                        background: m.bg, borderLeft: `2px solid ${m.border}`,
                        fontSize: '0.6rem', fontWeight: 600, color: m.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                      {toAMPM(b.startTime)} {b.purpose}
                    </button>
                  )
                })}
                {dayBs.length > 3 && (
                  <p style={{ fontSize: '0.58rem', color: 'var(--tx-3)', paddingLeft: 4 }}>+{dayBs.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Agenda View ─────────────────────────────────────────────
function AgendaView({ bookings, onEventClick, navigate }) {
  const groups = []
  for (let i = 0; i < 90; i++) {
    const d  = new Date(); d.setDate(d.getDate() + i)
    const ds = toDateStr(d)
    const dayBs = bookings.filter(b => b.date === ds && b.status !== 'rejected')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    if (!dayBs.length) continue
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    groups.push({ label, ds, bookings: dayBs })
  }

  if (!groups.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 48, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--tx-3)" strokeWidth="1.5" style={{width:24,height:24}}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <p style={{ fontWeight: 700, color: 'var(--tx-2)', marginBottom: 6 }}>All clear</p>
      <p style={{ fontSize: '0.845rem', color: 'var(--tx-3)', marginBottom: 20 }}>No bookings in the next 90 days.</p>
      <button className="btn btn-primary btn-sm" onClick={() => navigate('/book')}>Book a Room</button>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', maxWidth: 680, width: '100%' }}>
      {groups.map(({ label, ds, bookings: grpBs }) => (
        <div key={ds} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, position: 'sticky', top: 0, background: 'var(--bg)', padding: '6px 0', zIndex: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--tx)' }}>{label}</h3>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '1px 8px', borderRadius: 20, background: 'var(--bg-2)', color: 'var(--tx-3)', border: '1px solid var(--line)' }}>{grpBs.length}</span>
            <button onClick={() => navigate('/book', { state: { date: ds } })} style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              + Book
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grpBs.map(b => {
              const m = meta(b.status)
              return (
                <div key={b.id}
                  style={{
                    background: 'var(--bg-1)', border: '1px solid var(--line)',
                    borderLeft: `3px solid ${m.border}`,
                    borderRadius: 10, overflow: 'hidden',
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--s2)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px' }}>
                    <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 36 }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tx-3)' }}>
                        {b.startTime?.slice(0,5)}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--tx-3)', marginTop: 1 }}>
                        {b.endTime?.slice(0,5)}
                      </div>
                    </div>
                    <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.purpose}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        {b.room?.name && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>{b.room.name}</span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>{b.name}</span>
                        {b.attendees && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>{b.attendees} attendees</span>
                        )}
                      </div>
                    </div>
                    <button onClick={e => onEventClick(b, e.currentTarget.getBoundingClientRect())}
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', padding: 4, borderRadius: 6, transition: 'color 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--tx)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}>
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}>
                        <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                      </svg>
                    </button>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: m.bg, color: m.text, border: `1px solid ${m.border}`, flexShrink: 0 }}>
                      {b.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main CalendarPage ───────────────────────────────────────
const VIEWS = [
  { id: 'week',   label: 'Week' },
  { id: 'month',  label: 'Month' },
  { id: 'agenda', label: 'Agenda' },
]

export default function CalendarPage() {
  const [bookings,     setBookings]     = useState([])
  const [rooms,        setRooms]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [view,         setView]         = useState('week')
  const [currentDate,  setCurrentDate]  = useState(new Date())
  const [selectedDay,  setSelectedDay]  = useState(todayStr)
  const [filterRoom,   setFilterRoom]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [popover,      setPopover]      = useState(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(window.innerWidth >= 1024)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.get('/rooms'), api.get('/bookings')])
      .then(([rRes, bRes]) => { setRooms(rRes.data.data); setBookings(bRes.data.data) })
      .catch(() => toast.error('Failed to load calendar'))
      .finally(() => setLoading(false))
  }, [])

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const prevPeriod = () => {
    const d = new Date(currentDate)
    view === 'month' ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }
  const nextPeriod = () => {
    const d = new Date(currentDate)
    view === 'month' ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }
  const goToday = () => { setCurrentDate(new Date()); setSelectedDay(todayStr) }

  const weekDays = getWeekDays(currentDate)

  const periodLabel = view === 'month'
    ? `${MONTHS[month]} ${year}`
    : `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const filtered = bookings.filter(b => {
    if (filterRoom   && b.roomId !== filterRoom)   return false
    if (filterStatus && b.status !== filterStatus) return false
    return true
  })

  const dotDates = new Set(filtered.map(b => b.date))

  const onEventClick = (booking, rect) => {
    setPopover(p => p?.booking.id === booking.id ? null : { booking, rect })
  }

  const onDayClick = ds => {
    setSelectedDay(ds)
    setCurrentDate(new Date(ds + 'T00:00:00'))
    if (view !== 'month') setView('agenda')
  }

  if (loading) return (
    <div className="page animate-in">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 10 }} />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-h))', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Left Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 200 : 0, flexShrink: 0,
        transition: 'width 0.2s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden',
      }}>
        <div style={{
          width: 200, height: '100%', background: 'var(--bg-1)',
          borderRight: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
            {/* Book button */}
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 18, justifyContent: 'center' }}
              onClick={() => navigate('/book')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:14,height:14}}><path d="M12 5v14M5 12h14"/></svg>
              Book a Room
            </button>

            {/* Mini calendar */}
            <MiniCal
              focusDate={currentDate}
              selectedDate={selectedDay}
              dotDates={dotDates}
              onDateClick={ds => {
                setSelectedDay(ds)
                const d = new Date(ds + 'T00:00:00')
                setCurrentDate(d)
                if (view !== 'month') setView('agenda')
              }}
            />

            <div style={{ borderTop: '1px solid var(--line)', margin: '14px 0' }} />

            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tx-3)' }}>Filter by</p>

              <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', color: 'var(--tx)', fontFamily: 'var(--font)', cursor: 'pointer' }}>
                <option value="">All Rooms</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>

              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', color: 'var(--tx)', fontFamily: 'var(--font)', cursor: 'pointer' }}>
                <option value="">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              {(filterRoom || filterStatus) && (
                <button onClick={() => { setFilterRoom(''); setFilterStatus('') }}
                  style={{ fontSize: '0.72rem', color: 'var(--red-tx)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', fontWeight: 600 }}>
                  Clear filters
                </button>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--line)', margin: '14px 0' }} />

            {/* Room legend */}
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tx-3)', marginBottom: 8 }}>Rooms</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {rooms.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color || 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--tx-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status legend */}
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tx-3)', marginBottom: 8 }}>Status</p>
              {Object.entries(STATUS_META).map(([s, m]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: m.solid, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--tx-3)', textTransform: 'capitalize' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header top row */}
        <div style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 8px', borderBottom: '1px solid var(--line)' }}>
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18,height:18}}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.01em' }}>Conference Calendar</h1>
              <p style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 1 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}{filtered.filter(b => b.date === todayStr).length} bookings today
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/book')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:13,height:13}}><path d="M12 5v14M5 12h14"/></svg>
              Book Room
            </button>
          </div>

          {/* Nav row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px' }}>
            <button onClick={prevPeriod}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', padding: 6, borderRadius: 8, display: 'flex', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button onClick={nextPeriod}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', padding: 6, borderRadius: 8, display: 'flex', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--tx)', minWidth: 180 }}>{periodLabel}</span>
            <button onClick={goToday}
              style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-2)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--tx-2)', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-2)'}>
              Today
            </button>
            <div style={{ flex: 1 }} />
            {/* View switcher */}
            <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 3, gap: 2 }}>
              {VIEWS.map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  style={{
                    padding: '4px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: view === v.id ? 'var(--bg-1)' : 'transparent',
                    color: view === v.id ? 'var(--tx)' : 'var(--tx-3)',
                    fontFamily: 'var(--font)', fontSize: '0.78rem',
                    fontWeight: view === v.id ? 700 : 500,
                    boxShadow: view === v.id ? 'var(--s1)' : 'none',
                    transition: 'all 0.12s',
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {view === 'week' && (
            <TimeGrid days={weekDays} bookings={filtered} onEventClick={onEventClick} navigate={navigate} />
          )}
          {view === 'month' && (
            <MonthGrid year={year} month={month} bookings={filtered} onEventClick={onEventClick} onDayClick={onDayClick} selectedDay={selectedDay} />
          )}
          {view === 'agenda' && (
            <AgendaView bookings={filtered} onEventClick={onEventClick} navigate={navigate} />
          )}
        </div>
      </div>

      {/* Event Popover */}
      {popover && (
        <EventPopover
          booking={popover.booking}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}
