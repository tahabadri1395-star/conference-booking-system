// controllers/roomController.js
const { db, parseRoom, parseBooking } = require('../models/db');

exports.getAllRooms = (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;
    const rooms = db.prepare('SELECT * FROM rooms').all().map(parseRoom);

    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    const enriched = rooms.map((room) => {
      let available = true;
      let conflictingBooking = null;

      if (date && startTime && endTime) {
        const conflict = db.prepare(`
          SELECT * FROM bookings
          WHERE room_id = ? AND date = ? AND status != 'rejected'
            AND start_time < ? AND end_time > ?
        `).get(room.id, date, endTime, startTime);

        if (conflict) {
          available = false;
          conflictingBooking = parseBooking(conflict);
        }
      }

      return { ...room, available, conflictingBooking };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getRoomById = (req, res) => {
  try {
    const room = parseRoom(db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id));
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const bookings = db.prepare(`
      SELECT * FROM bookings WHERE room_id = ? AND status != 'rejected'
      ORDER BY date, start_time
    `).all(room.id).map(parseBooking);

    res.json({ success: true, data: { ...room, bookings } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.updateRoom = (req, res) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const { capacity } = req.body;
    if (capacity !== undefined) {
      const cap = parseInt(capacity, 10);
      if (isNaN(cap) || cap < 1)
        return res.status(400).json({ success: false, message: 'Capacity must be a positive number' });
      db.prepare('UPDATE rooms SET capacity = ? WHERE id = ?').run(cap, room.id);
    }

    res.json({ success: true, data: parseRoom(db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id)) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
