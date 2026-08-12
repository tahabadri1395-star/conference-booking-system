import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const TIME_SLOTS = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`)
}

const getNextSlot = () => {
  const now = new Date()
  const mins = now.getHours()*60 + now.getMinutes()
  const rounded = Math.ceil((mins+1)/30)*30
  const clamped = Math.max(7*60, Math.min(21*60, rounded))
  return `${String(Math.floor(clamped/60)).padStart(2,'0')}:${String(clamped%60).padStart(2,'0')}`
}

const HOURS   = Array.from({ length:14 }, (_, i) => i+7)
const toMin   = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
const addMins = (t,m) => { const tot = toMin(t)+m; return `${String(Math.floor(tot/60)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}` }
const toAMPM  = t => { const [h,m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }
const toHHMM  = m => { const h=Math.floor(m/60), min=m%60, ap=h>=12?'pm':'am'; return `${h>12?h-12:h===0?12:h}:${String(min).padStart(2,'0')}${ap}` }

function SectionStep({ num, title }) {
  return (
    <div className="section-label" style={{ gap:10, marginBottom:16 }}>
      <span style={{ width:22, height:22, borderRadius:7, background:'var(--accent-subtle)', border:'1px solid var(--accent-border)', color:'var(--accent-text)', fontSize:'0.65rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{num}</span>
      {title}
    </div>
  )
}

function Spinner() {
  return <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin 0.65s linear infinite' }} />
}

export default function BookRoomPage() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const today       = new Date().toISOString().split('T')[0]
  const initialDate = location.state?.date || today
  const initStart   = initialDate === today ? getNextSlot() : '09:00'

  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '',
    date: initialDate, startTime: initStart,
    endTime: addMins(initStart, 30), purpose: '', attendees: '', roomId: '',
  })
  const [errors,      setErrors]      = useState({})
  const [rooms,       setRooms]       = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [submitted,   setSubmitted]   = useState(null)

  const set = (k, v) => {
    setErrors(e => ({ ...e, [k]:'' }))
    if (k === 'startTime') {
      setForm(f => ({ ...f, startTime:v, endTime:addMins(v,30) }))
    } else if (k === 'date') {
      setForm(f => {
        let start = f.startTime
        if (v === today && toMin(f.startTime) < toMin(getNextSlot())) start = getNextSlot()
        return { ...f, date:v, startTime:start, endTime:addMins(start,30) }
      })
    } else {
      setForm(f => ({ ...f, [k]:v }))
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
  const dayBookings  = allBookings.filter(
    b => b.roomId === form.roomId && b.date === form.date && b.status !== 'rejected'
  ).sort((a, b) => a.startTime.localeCompare(b.startTime))

  const hasConflict = dayBookings.some(b => {
    const s=toMin(b.startTime), e=toMin(b.endTime)
    const fs=toMin(form.startTime), fe=toMin(form.endTime)
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
    if (!form.endTime || toMin(form.endTime) <= toMin(form.startTime)) e.endTime = 'Must be after start'
    else if (toMin(form.endTime) - toMin(form.startTime) < 30) e.endTime = 'Min 30 minutes'
    if (!form.purpose.trim()) e.purpose = 'Required'
    if (!form.attendees || isNaN(form.attendees) || parseInt(form.attendees) < 1) e.attendees = 'Min 1'
    if (!form.roomId) e.roomId = 'Select a room'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (hasConflict) { toast.error('Time slot conflicts with an existing booking'); return }
    setLoading(true)
    try {
      const res = await api.post('/bookings', form)
      setSubmitted(res.data.data)
      toast.success('Booking request submitted!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit')
    } finally { setLoading(false) }
  }

  const dayStart = 7*60, totalMins = 14*60
  const slotPct  = m => ((m - dayStart) / totalMins) * 100
  const previewStart = toMin(form.startTime)
  const previewEnd   = toMin(form.endTime)
  const previewValid = previewEnd > previewStart && previewEnd - previewStart >= 30

  /* ── Success Screen ── */
  if (submitted) {
    return (
      <div className="page animate-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
        <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--green-bg)', border:'2px solid var(--green-bd)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px', boxShadow:'var(--s-green)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" style={{width:28,height:28}}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.65rem', fontWeight:800, letterSpacing:'-0.04em', marginBottom:8 }}>
            Booking Confirmed!
          </h1>
          <p style={{ color:'var(--tx-3)', marginBottom:28, lineHeight:1.6 }}>
            Your room is booked. A confirmation will be sent to <strong style={{color:'var(--tx-2)'}}>{submitted.email}</strong>.
          </p>
          <div className="card" style={{ textAlign:'left', marginBottom:22, padding:0, overflow:'hidden' }}>
            <div style={{ background:'rgba(52,211,153,0.04)', padding:'14px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:8 }}>
              <span className="badge badge-approved">confirmed</span>
              {submitted.room?.name && <span style={{ fontSize:'0.75rem', color:'var(--tx-3)' }}>· {submitted.room.name}</span>}
            </div>
            <div style={{ padding:'0 20px' }}>
              {[
                ['Purpose',   submitted.purpose],
                ['Date',      submitted.date],
                ['Time',      `${toAMPM(submitted.startTime)} – ${toAMPM(submitted.endTime)}`],
                ['Attendees', `${submitted.attendees} people`],
                ['Requested by', submitted.name],
              ].map(([label, value]) => value ? (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--line)', fontSize:'0.845rem', gap:12 }}>
                  <span style={{ color:'var(--tx-3)' }}>{label}</span>
                  <span style={{ fontWeight:550, textAlign:'right' }}>{value}</span>
                </div>
              ) : null)}
            </div>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn btn-primary" onClick={() => {
              setSubmitted(null)
              setForm(f => ({ ...f, purpose:'', attendees:'' }))
            }}>
              Book Another Room
            </button>
            {user ? (
              <button className="btn btn-secondary" onClick={() => navigate('/my-requests')}>View My Requests</button>
            ) : (
              <button className="btn btn-secondary" onClick={() => navigate('/login')}>Sign in to track</button>
            )}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  /* ── Main Form ── */
  return (
    <div className="page animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Book a Room</h1>
          <p className="page-subtitle">Fill in your details and pick a time — your booking is confirmed instantly.</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:20, alignItems:'start' }}>

        {/* ── Form ── */}
        <div className="card" style={{ padding:'26px 28px' }}>

          {/* Step 1: Details */}
          <div style={{ marginBottom:26 }}>
            <SectionStep num="1" title="Your Details" />
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

          <div style={{ height:1, background:'var(--line)', marginBottom:26 }} />

          {/* Step 2: When */}
          <div style={{ marginBottom:26 }}>
            <SectionStep num="2" title="When" />
            <div className="form-group" style={{ marginBottom:14 }}>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} min={today} onChange={e => set('date', e.target.value)} style={{ maxWidth:220 }} />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start time</label>
                <select className="form-select" value={form.startTime} onChange={e => set('startTime', e.target.value)}>
                  {TIME_SLOTS.filter(t => form.date !== today || toMin(t) >= toMin(getNextSlot()))
                    .map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
                </select>
                {errors.startTime && <span className="form-error">{errors.startTime}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">End time</label>
                <select className="form-select" value={form.endTime} onChange={e => set('endTime', e.target.value)}>
                  {TIME_SLOTS.filter(t => toMin(t) >= toMin(form.startTime)+30)
                    .map(t => <option key={t} value={t}>{toAMPM(t)}</option>)}
                </select>
                {errors.endTime && <span className="form-error">{errors.endTime}</span>}
              </div>
            </div>
            {hasConflict && (
              <div style={{ background:'var(--red-bg)', border:'1px solid var(--red-bd)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:'0.8rem', color:'var(--red-tx)', display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15,flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Time slot conflicts with an existing booking — pick a different time or room.
              </div>
            )}
          </div>

          <div style={{ height:1, background:'var(--line)', marginBottom:26 }} />

          {/* Step 3: Meeting Info */}
          <div style={{ marginBottom:26 }}>
            <SectionStep num="3" title="Meeting Info" />
            <div className="form-group" style={{ marginBottom:14 }}>
              <label className="form-label">Purpose / Meeting title</label>
              <textarea className="form-textarea" rows={2} value={form.purpose} onChange={e => set('purpose', e.target.value)}
                placeholder="e.g. Team standup, client presentation, training session" />
              {errors.purpose && <span className="form-error">{errors.purpose}</span>}
            </div>
            <div className="form-group" style={{ maxWidth:200 }}>
              <label className="form-label">Number of attendees</label>
              <input className="form-input" type="number" min="1" value={form.attendees}
                onChange={e => set('attendees', e.target.value)} placeholder="e.g. 8" />
              {errors.attendees && <span className="form-error">{errors.attendees}</span>}
            </div>
          </div>

          <div style={{ height:1, background:'var(--line)', marginBottom:26 }} />

          {/* Step 4: Room */}
          <div style={{ marginBottom:28 }}>
            <SectionStep num="4" title="Choose a Room" />
            {errors.roomId && <div className="form-error" style={{ marginBottom:10 }}>{errors.roomId}</div>}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {rooms.map(r => {
                const isSelected = form.roomId === r.id
                const roomConflict = allBookings.some(b =>
                  b.roomId === r.id && b.date === form.date && b.status !== 'rejected' &&
                  toMin(form.startTime) < toMin(b.endTime) && toMin(form.endTime) > toMin(b.startTime)
                )
                return (
                  <div key={r.id} onClick={() => !roomConflict && set('roomId', r.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:14, padding:'13px 16px',
                      borderRadius:'var(--r-lg)', cursor: roomConflict ? 'not-allowed' : 'pointer',
                      border:`1.5px solid ${isSelected ? 'var(--accent)' : roomConflict ? 'var(--red-bd)' : 'var(--line-2)'}`,
                      background: isSelected ? 'var(--accent-subtle)' : roomConflict ? 'var(--red-bg)' : 'var(--bg-2)',
                      opacity: roomConflict ? 0.65 : 1,
                      transition:'all var(--t2)',
                      boxShadow: isSelected ? 'var(--s-accent)' : 'none',
                    }}>
                    {/* Room color dot */}
                    <div style={{ width:10, height:10, borderRadius:'50%', background: r.color || 'var(--accent)', flexShrink:0,
                      boxShadow: isSelected ? `0 0 8px ${r.color || 'var(--accent)'}` : 'none' }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--tx)', letterSpacing:'-0.01em' }}>{r.name}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--tx-3)', marginTop:1.5 }}>
                        {r.floor}{r.capacity ? ` · ${r.capacity} seats` : ''}
                      </div>
                    </div>
                    {roomConflict
                      ? <span style={{ fontSize:'0.68rem', color:'var(--red-tx)', fontWeight:700, padding:'2px 8px', borderRadius:20, background:'var(--red-bg)', border:'1px solid var(--red-bd)' }}>Conflict</span>
                      : isSelected
                        ? <span style={{ fontSize:'0.68rem', color:'var(--accent-text)', fontWeight:700, padding:'2px 8px', borderRadius:20, background:'var(--accent-subtle)', border:'1px solid var(--accent-border)' }}>Selected</span>
                        : <span style={{ fontSize:'0.68rem', color:'var(--green-tx)', fontWeight:600 }}>Available</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submit */}
          <button className="btn btn-primary btn-lg" style={{ width:'100%' }} onClick={handleSubmit} disabled={loading || hasConflict}>
            {loading ? <><Spinner /> Submitting…</> : 'Submit Booking Request'}
          </button>
          <p style={{ fontSize:'0.72rem', color:'var(--tx-3)', textAlign:'center', marginTop:10 }}>
            Your request will be reviewed by an administrator · No account required
          </p>
        </div>

        {/* ── Day Schedule ── */}
        <div style={{ position:'sticky', top:20 }}>
          <div className="card" style={{ padding:'18px 16px' }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'0.92rem', fontWeight:700, color:'var(--tx)', letterSpacing:'-0.02em' }}>
                {selectedRoom ? selectedRoom.name : 'Select a room'}
              </div>
              <div style={{ fontSize:'0.72rem', color:'var(--tx-3)', marginTop:2.5 }}>
                {form.date ? new Date(form.date+'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' }) : 'Pick a date'}
              </div>
            </div>

            {/* Availability pills */}
            <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
              {dayBookings.length === 0 ? (
                <span style={{ fontSize:'0.68rem', color:'var(--green-tx)', background:'var(--green-bg)', border:'1px solid var(--green-bd)', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>
                  Fully available
                </span>
              ) : (
                <>
                  <span style={{ fontSize:'0.68rem', color:'var(--amber-tx)', background:'var(--amber-bg)', border:'1px solid var(--amber-bd)', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>
                    {dayBookings.length} slot{dayBookings.length !== 1 ? 's' : ''} taken
                  </span>
                  {!hasConflict && previewValid && (
                    <span style={{ fontSize:'0.68rem', color:'var(--green-tx)', background:'var(--green-bg)', border:'1px solid var(--green-bd)', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>
                      Your slot is free
                    </span>
                  )}
                  {hasConflict && (
                    <span style={{ fontSize:'0.68rem', color:'var(--red-tx)', background:'var(--red-bg)', border:'1px solid var(--red-bd)', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>
                      Conflict
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Timeline */}
            <div style={{ display:'flex' }}>
              <div style={{ width:38, flexShrink:0, position:'relative', height: HOURS.length*44 }}>
                {HOURS.map((h, i) => (
                  <div key={h} style={{ position:'absolute', top:i*44-6, right:6, fontSize:'0.58rem', color:'var(--tx-3)', lineHeight:1, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                    {h > 12 ? h-12 : h}{h >= 12 ? 'p' : 'a'}
                  </div>
                ))}
              </div>
              <div style={{ flex:1, position:'relative', height:HOURS.length*44 }}>
                {HOURS.map((_,i) => (
                  <div key={i} style={{ position:'absolute', top:i*44, left:0, right:0, height:1, background:'var(--line)' }} />
                ))}

                {/* Existing bookings */}
                {dayBookings.map(b => {
                  const top = slotPct(toMin(b.startTime))
                  const height = slotPct(toMin(b.endTime)) - top
                  const approved = b.status === 'approved'
                  return (
                    <div key={b.id} style={{
                      position:'absolute', left:2, right:2,
                      top:`${top}%`, height:`${height}%`,
                      background: approved ? 'var(--accent-subtle)' : 'var(--amber-bg)',
                      border:`1.5px solid ${approved ? 'var(--accent)' : 'var(--amber-bd)'}`,
                      borderRadius:6, padding:'3px 7px', overflow:'hidden',
                    }}>
                      <div style={{ fontSize:'0.6rem', fontWeight:700, color: approved ? 'var(--accent-text)' : 'var(--amber-tx)', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {toHHMM(toMin(b.startTime))}–{toHHMM(toMin(b.endTime))}
                      </div>
                      <div style={{ fontSize:'0.57rem', color:'var(--tx-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.purpose}</div>
                    </div>
                  )
                })}

                {/* Your slot preview */}
                {previewValid && (() => {
                  const top = slotPct(previewStart)
                  const height = slotPct(previewEnd) - top
                  return (
                    <div style={{
                      position:'absolute', left:2, right:2,
                      top:`${top}%`, height:`${height}%`,
                      background: hasConflict ? 'var(--red-bg)' : 'rgba(124,110,240,0.1)',
                      border:`2px dashed ${hasConflict ? 'var(--red)' : 'var(--accent)'}`,
                      borderRadius:6, padding:'3px 7px', overflow:'hidden', zIndex:5,
                      animation: 'pulse-border 2s ease-in-out infinite',
                    }}>
                      <div style={{ fontSize:'0.6rem', fontWeight:700, color: hasConflict ? 'var(--red-tx)' : 'var(--accent-text)', lineHeight:1.3 }}>
                        {hasConflict ? '⚠ Conflict' : '✓ Your slot'}
                      </div>
                      <div style={{ fontSize:'0.57rem', color: hasConflict ? 'var(--red)' : 'var(--accent)' }}>
                        {toAMPM(form.startTime)}–{toAMPM(form.endTime)}
                      </div>
                    </div>
                  )
                })()}

                {/* Now line */}
                {form.date === today && (() => {
                  const now = new Date()
                  const pct = slotPct(now.getHours()*60 + now.getMinutes())
                  if (pct < 0 || pct > 100) return null
                  return (
                    <div style={{ position:'absolute', left:0, right:0, top:`${pct}%`, zIndex:10, pointerEvents:'none', display:'flex', alignItems:'center' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', marginLeft:-4, flexShrink:0, boxShadow:'0 0 0 3px var(--accent-subtle)' }} />
                      <div style={{ flex:1, height:1.5, background:'var(--accent)', opacity:0.8 }} />
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap' }}>
              {[
                { color:'var(--accent-subtle)', border:'var(--accent)',    dashed:false, label:'Approved' },
                { color:'var(--amber-bg)',       border:'var(--amber-bd)', dashed:false, label:'Pending' },
                { color:'rgba(124,110,240,0.1)', border:'var(--accent)',   dashed:true,  label:'Your slot' },
              ].map(({ color, border, dashed, label }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:color, border:`1.5px ${dashed?'dashed':'solid'} ${border}` }} />
                  <span style={{ fontSize:'0.65rem', color:'var(--tx-3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse-border { 0%,100% { opacity:1 } 50% { opacity:0.7 } }
      `}</style>
    </div>
  )
}
