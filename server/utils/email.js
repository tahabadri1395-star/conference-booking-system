const https = require('https');

async function sendWhatsApp(message) {
  const phone = process.env.CALLMEBOT_PHONE;
  const key   = process.env.CALLMEBOT_KEY;
  if (!phone || !key) { console.log('[whatsapp] CALLMEBOT_PHONE/KEY not set — skipping'); return; }

  const text = encodeURIComponent(message);
  const url  = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${key}`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log('[whatsapp] status:', res.statusCode);
      resolve();
    }).on('error', (err) => {
      console.error('[whatsapp] error:', err.message);
      resolve();
    });
  });
}

async function sendBookingEmails({ booking, room }) {
  const message =
    `*New Room Booking — MeetingDesk*\n\n` +
    `*Room:* ${room.name}\n` +
    `*Date:* ${booking.date}\n` +
    `*Time:* ${booking.startTime} – ${booking.endTime}\n` +
    `*Purpose:* ${booking.purpose}\n` +
    `*Booked by:* ${booking.name}\n` +
    `*Email:* ${booking.email}\n` +
    `*Attendees:* ${booking.attendees} people`;

  await sendWhatsApp(message);
}

module.exports = { sendBookingEmails };
