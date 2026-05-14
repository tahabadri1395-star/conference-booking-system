const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.MAILJET_KEY || !process.env.MAILJET_SECRET) return null;
  return nodemailer.createTransport({
    host: 'in-v3.mailjet.com',
    port: 587,
    auth: { user: process.env.MAILJET_KEY, pass: process.env.MAILJET_SECRET },
  });
}

const row = (label, value) => `
  <tr>
    <td style="padding:12px 20px;font-size:13px;color:#6b7280;background:#f9fafb;width:120px;border-bottom:1px solid #e5e7eb;font-weight:500">${label}</td>
    <td style="padding:12px 20px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb">${value}</td>
  </tr>`;

async function sendBookingEmails({ booking, room }) {
  const transporter = getTransporter();
  if (!transporter) { console.log('[email] MAILJET_KEY/SECRET not set — skipping'); return; }

  const adminTo = process.env.ADMIN_EMAIL;
  if (!adminTo) { console.log('[email] ADMIN_EMAIL not set — skipping'); return; }

  const FROM = process.env.EMAIL_FROM || process.env.MAILJET_SENDER || process.env.ADMIN_EMAIL;

  const adminHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <div style="background:#4f46e5;padding:28px 32px">
        <p style="margin:0;font-size:11px;color:#a5b4fc;text-transform:uppercase;letter-spacing:1px;font-weight:600">Conference Room System</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#fff;font-weight:700">New Room Booking</h1>
      </div>
      <div style="padding:24px 32px 8px">
        <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6">
          A new booking has been made by <a href="mailto:${booking.email}" style="color:#4f46e5;font-weight:600;text-decoration:none">${booking.name}</a>.
          Reply to this email to contact them directly.
        </p>
      </div>
      <div style="padding:16px 32px">
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
          ${row('Room',      room.name)}
          ${row('Date',      booking.date)}
          ${row('Time',      `${booking.startTime} – ${booking.endTime}`)}
          ${row('Purpose',   booking.purpose)}
          ${row('Attendees', `${booking.attendees} people`)}
          ${row('Booked by', booking.name)}
          ${row('Email',     `<a href="mailto:${booking.email}" style="color:#4f46e5;text-decoration:none">${booking.email}</a>`)}
        </table>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#9ca3af">Automated notification from MeetingDesk. Reply to contact ${booking.name} directly.</p>
      </div>
    </div>
  </body></html>`;

  const userHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <div style="background:#4f46e5;padding:28px 32px">
        <p style="margin:0;font-size:11px;color:#a5b4fc;text-transform:uppercase;letter-spacing:1px;font-weight:600">Conference Room System</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#fff;font-weight:700">Booking Confirmed</h1>
      </div>
      <div style="padding:24px 32px 8px">
        <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6">Hi <strong>${booking.name}</strong>, your conference room has been booked successfully.</p>
      </div>
      <div style="padding:16px 32px">
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
          ${row('Room',      room.name)}
          ${row('Date',      booking.date)}
          ${row('Time',      `${booking.startTime} – ${booking.endTime}`)}
          ${row('Purpose',   booking.purpose)}
          ${row('Attendees', `${booking.attendees} people`)}
        </table>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#9ca3af">Automated confirmation from MeetingDesk. Please do not reply to this email.</p>
      </div>
    </div>
  </body></html>`;

  const results = await Promise.allSettled([
    transporter.sendMail({
      from: `"MeetingDesk" <${FROM}>`,
      replyTo: `"${booking.name}" <${booking.email}>`,
      to: adminTo,
      subject: `New Booking: ${room.name} on ${booking.date} at ${booking.startTime}`,
      html: adminHtml,
    }),
    transporter.sendMail({
      from: `"MeetingDesk" <${FROM}>`,
      to: booking.email,
      subject: `Booking Confirmed – ${room.name} on ${booking.date}`,
      html: userHtml,
    }),
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[email] send ${i} failed:`, r.reason?.message);
    else console.log(`[email] send ${i} ok`);
  });
}

module.exports = { sendBookingEmails };
