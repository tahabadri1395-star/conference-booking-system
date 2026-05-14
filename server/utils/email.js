const { Resend } = require('resend');

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendBookingEmails({ booking, room }) {
  const resend = getClient();
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set — skipping');
    return;
  }

  const adminTo = process.env.ADMIN_EMAIL;
  if (!adminTo) {
    console.log('[email] ADMIN_EMAIL not set — skipping admin notification');
    return;
  }

  const rows = (items) =>
    items.map(([label, value]) => `
      <tr>
        <td style="padding:12px 20px;font-size:13px;color:#6b7280;background:#f9fafb;width:120px;border-bottom:1px solid #e5e7eb;font-weight:500">${label}</td>
        <td style="padding:12px 20px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb">${value}</td>
      </tr>`).join('');

  const adminHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

        <!-- Header -->
        <div style="background:#4f46e5;padding:28px 32px">
          <p style="margin:0;font-size:11px;color:#a5b4fc;text-transform:uppercase;letter-spacing:1px;font-weight:600">Conference Room System</p>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700">New Room Booking</h1>
        </div>

        <!-- Intro -->
        <div style="padding:24px 32px 8px">
          <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6">
            A new booking has been made by
            <a href="mailto:${booking.email}" style="color:#4f46e5;font-weight:600;text-decoration:none">${booking.name}</a>.
            You can reply to this email to contact them directly.
          </p>
        </div>

        <!-- Details table -->
        <div style="padding:16px 32px 8px">
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
            ${rows([
              ['Room',       room.name],
              ['Date',       booking.date],
              ['Time',       `${booking.startTime} – ${booking.endTime}`],
              ['Purpose',    booking.purpose],
              ['Attendees',  `${booking.attendees} people`],
              ['Booked by',  booking.name],
              ['Email',      `<a href="mailto:${booking.email}" style="color:#4f46e5;text-decoration:none">${booking.email}</a>`],
            ])}
          </table>
        </div>

        <!-- Footer -->
        <div style="padding:24px 32px;border-top:1px solid #e5e7eb;margin-top:16px">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">
            This is an automated notification from MeetingDesk.<br>
            Reply to this email to contact ${booking.name} directly.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  const userHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

        <!-- Header -->
        <div style="background:#4f46e5;padding:28px 32px">
          <p style="margin:0;font-size:11px;color:#a5b4fc;text-transform:uppercase;letter-spacing:1px;font-weight:600">Conference Room System</p>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700">Booking Confirmed</h1>
        </div>

        <!-- Greeting -->
        <div style="padding:24px 32px 8px">
          <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6">
            Hi <strong>${booking.name}</strong>, your conference room has been booked successfully.
          </p>
        </div>

        <!-- Details table -->
        <div style="padding:16px 32px 8px">
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
            ${rows([
              ['Room',      room.name],
              ['Date',      booking.date],
              ['Time',      `${booking.startTime} – ${booking.endTime}`],
              ['Purpose',   booking.purpose],
              ['Attendees', `${booking.attendees} people`],
            ])}
          </table>
        </div>

        <!-- Footer -->
        <div style="padding:24px 32px;border-top:1px solid #e5e7eb;margin-top:16px">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">
            This is an automated confirmation from MeetingDesk.<br>
            Please do not reply to this email.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  const results = await Promise.allSettled([
    resend.emails.send({
      from: 'MeetingDesk <onboarding@resend.dev>',
      reply_to: `${booking.name} <${booking.email}>`,
      to: [adminTo],
      subject: `New Booking: ${room.name} on ${booking.date} – ${booking.startTime}`,
      html: adminHtml,
    }),
    resend.emails.send({
      from: 'MeetingDesk <onboarding@resend.dev>',
      to: [booking.email],
      subject: `Booking Confirmed – ${room.name} on ${booking.date}`,
      html: userHtml,
    }),
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[email] send ${i} failed:`, r.reason);
    else console.log(`[email] send ${i} ok:`, r.value?.data?.id);
  });
}

module.exports = { sendBookingEmails };
