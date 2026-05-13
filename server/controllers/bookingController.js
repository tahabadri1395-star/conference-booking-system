// controllers/bookingController.js
const { db, uuidv4, parseBooking, parseRoom } = require('../models/db');

function hasConflict(roomId, date, startTime, endTime, excludeId = null) {
  const row = db.prepare(`
    SELECT 1 FROM bookings
    WHERE room_id = ? AND date = ? AND status != 'rejected'
      AND id != ? AND start_time < ? AND end_time > ?
  `).get(roomId, date, excludeId || '', endTime, startTime);
  return !!row;
}

exports.getAllBookings = (req, res) => {
  try {
    const { status, roomId, date, email } = req.query;
    const isAdmin = req.user?.role === 'admin';
    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (roomId) { query += ' AND room_id = ?'; params.push(roomId); }
    if (date)   { query += ' AND date = ?';    params.push(date); }
    // Public or admin: show all bookings; filter by email only if admin explicitly requests it
    if (email && isAdmin) {
      query += ' AND email = ?'; params.push(email);
    }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params).map(parseBooking).map(b => ({
      ...b,
      room: parseRoom(db.prepare('SELECT * FROM rooms WHERE id = ?').get(b.roomId)),
    }));

    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getBookingById = (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Booking not found' });
    const booking = parseBooking(row);
    res.json({ success: true, data: { ...booking, room: parseRoom(db.prepare('SELECT * FROM rooms WHERE id = ?').get(booking.roomId)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.createBooking = (req, res) => {
  try {
    const { name, email, roomId, date, startTime, endTime, purpose, attendees } = req.body;

    if (!name || !email || !roomId || !date || !startTime || !endTime || !purpose || !attendees)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email format' });

    const room = parseRoom(db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId));
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const today = new Date().toISOString().split('T')[0];
    if (date < today) return res.status(400).json({ success: false, message: 'Cannot book past dates' });

    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    if (toMin(endTime) <= toMin(startTime))
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    if (toMin(endTime) - toMin(startTime) < 30)
      return res.status(400).json({ success: false, message: 'Minimum booking duration is 30 minutes' });

    if (hasConflict(roomId, date, startTime, endTime))
      return res.status(409).json({ success: false, message: `Time slot conflict: ${room.name} is already booked for this time` });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO bookings (id, name, email, room_id, date, start_time, end_time, purpose, attendees, status, admin_remarks, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?)
    `).run(id, name.trim(), email.trim().toLowerCase(), roomId, date, startTime, endTime, purpose.trim(), parseInt(attendees, 10), new Date().toISOString());

    const booking = parseBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
    res.status(201).json({ success: true, message: 'Booking request submitted successfully', data: { ...booking, room } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.updateBooking = (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Booking not found' });

    const { status, adminRemarks } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    if (status === 'approved' && hasConflict(row.room_id, row.date, row.start_time, row.end_time, row.id))
      return res.status(409).json({ success: false, message: 'Cannot approve: another approved booking conflicts with this time slot' });

    db.prepare('UPDATE bookings SET status = ?, admin_remarks = ?, updated_at = ? WHERE id = ?')
      .run(status, adminRemarks || '', new Date().toISOString(), row.id);

    const updated = parseBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(row.id));
    res.json({ success: true, message: `Booking ${status} successfully`, data: { ...updated, room: parseRoom(db.prepare('SELECT * FROM rooms WHERE id = ?').get(updated.roomId)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.deleteBooking = (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Booking not found' });
    db.prepare('DELETE FROM bookings WHERE id = ?').run(row.id);
    res.json({ success: true, message: 'Booking deleted successfully', data: parseBooking(row) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getStats = (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { total, pending, approved, rejected } = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'pending')  as pending,
        SUM(status = 'approved') as approved,
        SUM(status = 'rejected') as rejected
      FROM bookings
    `).get();
    const todayBookings = db.prepare("SELECT COUNT(*) as n FROM bookings WHERE date = ?").get(today).n;

    const rooms = db.prepare('SELECT * FROM rooms').all().map(r => ({
      ...parseRoom(r),
      totalBookings:    db.prepare('SELECT COUNT(*) as n FROM bookings WHERE room_id = ?').get(r.id).n,
      approvedBookings: db.prepare("SELECT COUNT(*) as n FROM bookings WHERE room_id = ? AND status = 'approved'").get(r.id).n,
    }));

    res.json({ success: true, data: { total, pending, approved, rejected, todayBookings, roomStats: rooms } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
