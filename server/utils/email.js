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

async function sendCancellationNotification({ booking, room, cancelledBy, reason }) {
  const message =
    `*Booking Cancelled — MeetingDesk*\n\n` +
    `*Room:* ${room.name}\n` +
    `*Date:* ${booking.date}\n` +
    `*Time:* ${booking.startTime} – ${booking.endTime}\n` +
    `*Purpose:* ${booking.purpose}\n` +
    `*Booked by:* ${booking.name}\n` +
    `*Email:* ${booking.email}\n` +
    `*Cancelled by:* ${cancelledBy}` +
    (reason ? `\n*Reason:* ${reason}` : '');
  await sendWhatsApp(message);
}

async function sendPasswordResetNotification({ name, email }) {
  const message =
    `*Password Reset Request — MeetingDesk*\n\n` +
    `*Name:* ${name}\n` +
    `*Email:* ${email}\n\n` +
    `Please reset this user's password from the Admin Panel.`;
  await sendWhatsApp(message);
}

module.exports = { sendBookingEmails, sendCancellationNotification, sendPasswordResetNotification };
