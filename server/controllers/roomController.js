const { pool, parseRoom, parseBooking } = require('../models/db');

exports.getAllRooms = async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;
    const { rows } = await pool.query('SELECT * FROM rooms');
    const rooms = rows.map(parseRoom);

    const enriched = await Promise.all(rooms.map(async (room) => {
      let available = true;
      let conflictingBooking = null;

      if (date && startTime && endTime) {
        const { rows: cr } = await pool.query(`
          SELECT * FROM bookings
          WHERE room_id = $1 AND date = $2 AND status != 'rejected'
            AND start_time < $3 AND end_time > $4
        `, [room.id, date, endTime, startTime]);

        if (cr[0]) {
          available = false;
          conflictingBooking = parseBooking(cr[0]);
        }
      }

      return { ...room, available, conflictingBooking };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    const room = parseRoom(rows[0]);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const { rows: bookings } = await pool.query(`
      SELECT * FROM bookings WHERE room_id = $1 AND status != 'rejected'
      ORDER BY date, start_time
    `, [room.id]);

    res.json({ success: true, data: { ...room, bookings: bookings.map(parseBooking) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Room not found' });

    const { capacity } = req.body;
    if (capacity !== undefined) {
      const cap = parseInt(capacity, 10);
      if (isNaN(cap) || cap < 1)
        return res.status(400).json({ success: false, message: 'Capacity must be a positive number' });
      await pool.query('UPDATE rooms SET capacity = $1 WHERE id = $2', [cap, rows[0].id]);
    }

    const { rows: updated } = await pool.query('SELECT * FROM rooms WHERE id = $1', [rows[0].id]);
    res.json({ success: true, data: parseRoom(updated[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
