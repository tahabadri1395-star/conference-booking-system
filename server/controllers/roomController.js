const { Room, Booking } = require('../models/db');

exports.getAllRooms = async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;
    const rooms = await Room.find();

    const enriched = await Promise.all(rooms.map(async (room) => {
      let available = true;
      let conflictingBooking = null;

      if (date && startTime && endTime) {
        const conflict = await Booking.findOne({
          roomId: room._id,
          date,
          status: { $ne: 'rejected' },
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        });
        if (conflict) {
          available = false;
          conflictingBooking = conflict.toJSON();
        }
      }

      return { ...room.toJSON(), available, conflictingBooking };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const bookings = await Booking.find({
      roomId: room._id,
      status: { $ne: 'rejected' },
    }).sort({ date: 1, startTime: 1 });

    res.json({ success: true, data: { ...room.toJSON(), bookings: bookings.map(b => b.toJSON()) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const { capacity } = req.body;
    if (capacity !== undefined) {
      const cap = parseInt(capacity, 10);
      if (isNaN(cap) || cap < 1)
        return res.status(400).json({ success: false, message: 'Capacity must be a positive number' });
      room.capacity = cap;
      await room.save();
    }

    res.json({ success: true, data: room.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
