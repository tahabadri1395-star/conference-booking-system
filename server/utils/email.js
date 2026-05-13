const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendBookingEmails({ booking, room }) {
  const transporter = getTransporter();
  if (!transporter) return;

  const adminTo = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  const adminMail = {
    from: `"MeetingDesk" <${process.env.EMAIL_USER}>`,
    replyTo: `"${booking.name}" <${booking.email}>`,
    to: adminTo,
    subject: `New Booking: ${room.name} on ${booking.date}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f5f5ff;border-radius:12px">
        <h2 style="color:#4e3dc8;margin-bottom:4px">New Room Booking</h2>
        <p style="color:#888;margin-bottom:20px;font-size:14px">A new booking has been made on MeetingDesk.</p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
          ${[
            ['Room',       room.name],
            ['Date',       booking.date],
            ['Time',       `${booking.startTime} – ${booking.endTime}`],
            ['Purpose',    booking.purpose],
            ['Booked by',  `${booking.name} (${booking.email})`],
            ['Attendees',  booking.attendees],
          ].map(([label, value]) => `
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#888;background:#f8f8ff;width:110px;border-bottom:1px solid #eee">${label}</td>
              <td style="padding:10px 16px;font-size:13px;color:#1c1a3a;border-bottom:1px solid #eee"><strong>${value}</strong></td>
            </tr>
          `).join('')}
        </table>
      </div>
    `,
  };

  const userMail = {
    from: `"MeetingDesk" <${process.env.EMAIL_USER}>`,
    to: booking.email,
    subject: `Booking Confirmed – ${room.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f5f5ff;border-radius:12px">
        <h2 style="color:#4e3dc8;margin-bottom:4px">Booking Confirmed!</h2>
        <p style="color:#555;margin-bottom:20px">Hi ${booking.name}, your room has been booked successfully.</p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
          ${[
            ['Room',      room.name],
            ['Date',      booking.date],
            ['Time',      `${booking.startTime} – ${booking.endTime}`],
            ['Purpose',   booking.purpose],
            ['Attendees', booking.attendees],
          ].map(([label, value]) => `
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#888;background:#f8f8ff;width:110px;border-bottom:1px solid #eee">${label}</td>
              <td style="padding:10px 16px;font-size:13px;color:#1c1a3a;border-bottom:1px solid #eee"><strong>${value}</strong></td>
            </tr>
          `).join('')}
        </table>
        <p style="margin-top:20px;font-size:13px;color:#888">— MeetingDesk Conference Room System</p>
      </div>
    `,
  };

  await Promise.allSettled([
    transporter.sendMail(adminMail),
    transporter.sendMail(userMail),
  ]);
}

module.exports = { sendBookingEmails };
