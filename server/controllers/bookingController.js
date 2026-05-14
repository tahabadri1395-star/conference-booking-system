const { pool, uuidv4, parseBooking, parseRoom } = require('../models/db');
const { sendBookingEmails, sendCancellationNotification } = require('../utils/email');

async function hasConflict(roomId, date, startTime, endTime, excludeId = null) {
  const { rows } = await pool.query(`
    SELECT 1 FROM bookings
    WHERE room_id = $1 AND date = $2 AND status != 'rejected'
      AND id != $3 AND start_time < $4 AND end_time > $5
  `, [roomId, date, excludeId || '', endTime, startTime]);
  return rows.length > 0;
}

exports.getAllBookings = async (req, res) => {
  try {
    const { status, roomId, date, email } = req.query;
    const isAdmin = req.user?.role === 'admin';
    const params = [];
    let where = 'WHERE 1=1';

    if (status)  { params.push(status);  where += ` AND status = $${params.length}`; }
    if (roomId)  { params.push(roomId);  where += ` AND room_id = $${params.length}`; }
    if (date)    { params.push(date);    where += ` AND date = $${params.length}`; }
    if (email && isAdmin) { params.push(email); where += ` AND email = $${params.length}`; }
    else if (email && req.user && !isAdmin) { params.push(req.user.email); where += ` AND email = $${params.length}`; }

    const { rows } = await pool.query(`SELECT * FROM bookings ${where} ORDER BY created_at DESC`, params);

    const roomIds = [...new Set(rows.map(r => r.room_id))];
    const rooms = {};
    for (const id of roomIds) {
      const { rows: rr } = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
      if (rr[0]) rooms[id] = parseRoom(rr[0]);
    }

    const data = rows.map(r => ({ ...parseBooking(r), room: rooms[r.room_id] || null }));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Booking not found' });
    const booking = parseBooking(rows[0]);
    const { rows: rr } = await pool.query('SELECT * FROM rooms WHERE id = $1', [booking.roomId]);
    res.json({ success: true, data: { ...booking, room: parseRoom(rr[0]) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { name, email, roomId, date, startTime, endTime, purpose, attendees } = req.body;

    if (!name || !email || !roomId || !date || !startTime || !endTime || !purpose || !attendees)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email format' });

    const { rows: rr } = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    const room = parseRoom(rr[0]);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const today = new Date().toISOString().split('T')[0];
    if (date < today) return res.status(400).json({ success: false, message: 'Cannot book past dates' });

    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    if (toMin(endTime) <= toMin(startTime))
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    if (toMin(endTime) - toMin(startTime) < 30)
      return res.status(400).json({ success: false, message: 'Minimum booking duration is 30 minutes' });

    if (await hasConflict(roomId, date, startTime, endTime))
      return res.status(409).json({ success: false, message: `Time slot conflict: ${room.name} is already booked for this time` });

    const id = uuidv4();
    await pool.query(`
      INSERT INTO bookings (id, name, email, room_id, date, start_time, end_time, purpose, attendees, status, admin_remarks, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'approved', '', $10)
    `, [id, name.trim(), email.trim().toLowerCase(), roomId, date, startTime, endTime, purpose.trim(), parseInt(attendees, 10), new Date().toISOString()]);

    const { rows: br } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    const booking = parseBooking(br[0]);
    sendBookingEmails({ booking, room }).catch(err => console.error('[email error]', err.message));
    res.status(201).json({ success: true, message: 'Booking confirmed!', data: { ...booking, room } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'Booking not found' });

    const { status, adminRemarks } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    if (status === 'approved' && await hasConflict(row.room_id, row.date, row.start_time, row.end_time, row.id))
      return res.status(409).json({ success: false, message: 'Cannot approve: another approved booking conflicts with this time slot' });

    await pool.query(
      'UPDATE bookings SET status = $1, admin_remarks = $2, updated_at = $3 WHERE id = $4',
      [status, adminRemarks || '', new Date().toISOString(), row.id]
    );

    const { rows: updated } = await pool.query('SELECT * FROM bookings WHERE id = $1', [row.id]);
    const booking = parseBooking(updated[0]);
    const { rows: rr } = await pool.query('SELECT * FROM rooms WHERE id = $1', [booking.roomId]);
    res.json({ success: true, message: `Booking ${status} successfully`, data: { ...booking, room: parseRoom(rr[0]) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Booking not found' });
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.email === rows[0].email;
    if (!isAdmin && !isOwner)
      return res.status(403).json({ success: false, message: 'You can only cancel your own bookings' });
    await pool.query('DELETE FROM bookings WHERE id = $1', [rows[0].id]);
    const booking = parseBooking(rows[0]);
    const { rows: rr } = await pool.query('SELECT * FROM rooms WHERE id = $1', [booking.roomId]);
    const cancelledBy = isAdmin ? 'Admin' : booking.name;
    const reason = req.query.reason || '';
    if (rr[0]) sendCancellationNotification({ booking, room: rr[0], cancelledBy, reason }).catch(err => console.error('[whatsapp cancel]', err.message));
    res.json({ success: true, message: 'Booking cancelled successfully', data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows: s } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
      FROM bookings
    `);
    const { rows: td } = await pool.query('SELECT COUNT(*) AS n FROM bookings WHERE date = $1', [today]);

    const { rows: roomRows } = await pool.query('SELECT * FROM rooms');
    const rooms = await Promise.all(roomRows.map(async (r) => {
      const { rows: total }    = await pool.query('SELECT COUNT(*) AS n FROM bookings WHERE room_id = $1', [r.id]);
      const { rows: approved } = await pool.query("SELECT COUNT(*) AS n FROM bookings WHERE room_id = $1 AND status = 'approved'", [r.id]);
      return { ...parseRoom(r), totalBookings: parseInt(total[0].n), approvedBookings: parseInt(approved[0].n) };
    }));

    const { total, pending, approved, rejected } = s[0];
    res.json({ success: true, data: { total: parseInt(total), pending: parseInt(pending), approved: parseInt(approved), rejected: parseInt(rejected), todayBookings: parseInt(td[0].n), roomStats: rooms } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
