// Shared date/time helpers. Dates are "YYYY-MM-DD" in local time, times "HH:MM".

export const DAY_START = 7 * 60   // 7:00 AM
export const DAY_END   = 21 * 60  // 9:00 PM
export const SLOT      = 30       // minutes

const pad = n => String(n).padStart(2, '0')

export const toMin   = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
export const addMins = (t, m) => fromMin(toMin(t) + m)

export const toAMPM = t => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`
}
// Short form for chips and axes: "9 AM", "9:30 AM"
export const shortTime = t => {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}${m ? ':' + pad(m) : ''} ${h >= 12 ? 'PM' : 'AM'}`
}

export const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayStr = () => dateStr(new Date())
export const parseDate = s => new Date(s + 'T00:00:00')
export const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d) }

export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() }

export const fmtDuration = mins => {
  const h = Math.floor(mins / 60), m = mins % 60
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr${h > 1 ? 's' : ''}`
}

export const fmtLongDate = s =>
  parseDate(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

// Every bookable start time in the day.
export const SLOTS = []
for (let m = DAY_START; m < DAY_END; m += SLOT) SLOTS.push(fromMin(m))

// Is [start, end) free of the given bookings?
export const isFree = (bookings, start, end) =>
  !bookings.some(b => toMin(start) < toMin(b.endTime) && toMin(end) > toMin(b.startTime))

// Free gaps in a day as [startMin, endMin] pairs, starting from `fromMinute`.
export function freeGaps(bookings, fromMinute = DAY_START) {
  const busy = bookings
    .map(b => [toMin(b.startTime), toMin(b.endTime)])
    .sort((a, b) => a[0] - b[0])
  const gaps = []
  let cur = Math.max(DAY_START, fromMinute)
  for (const [s, e] of busy) {
    if (s > cur) gaps.push([cur, s])
    cur = Math.max(cur, e)
  }
  if (cur < DAY_END) gaps.push([cur, DAY_END])
  return gaps.filter(([s, e]) => e - s >= SLOT)
}

// Round a minute up to the next half-hour slot.
export const nextSlotMin = m => Math.ceil(m / SLOT) * SLOT

// .ics file so people can add the booking to their own calendar.
export function icsFor(booking, roomName) {
  const stamp = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00'
  const esc = s => String(s || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MeetingDesk//Room booking//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id || Date.now()}@meetingdesk`,
    `DTSTART:${stamp(booking.date, booking.startTime)}`,
    `DTEND:${stamp(booking.date, booking.endTime)}`,
    `SUMMARY:${esc(booking.purpose)}`,
    `LOCATION:${esc(roomName)}`,
    `DESCRIPTION:${esc(`Booked by ${booking.name} for ${booking.attendees} people`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(booking, roomName) {
  const blob = new Blob([icsFor(booking, roomName)], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `booking-${booking.date}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
