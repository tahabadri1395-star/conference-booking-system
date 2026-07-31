const { Booking, Room, uuidv4 } = require('../models/db');
const { sendBookingEmails, sendCancellationNotification } = require('../utils/email');

async function hasConflict(roomId, date, startTime, endTime, excludeId = null) {
  const query = {
    roomId, date,
    status: { $ne: 'rejected' },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return !!(await Booking.exists(query));
}

exports.getAllBookings = async (req, res) => {
  try {
    const { status, roomId, date, email } = req.query;
    const isAdmin = req.user?.role === 'admin';
    const query = {};
    if (status) query.status = status;
    if (roomId) query.roomId = roomId;
    if (date) query.date = date;
    if (email && isAdmin) query.email = email;
    else if (!isAdmin && req.user) query.email = req.user.email;

    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    const roomIds = [...new Set(bookings.map(b => b.roomId))];
    const roomDocs = await Room.find({ _id: { $in: roomIds } });
    const rooms = {};
    for (const r of roomDocs) rooms[r._id] = r.toJSON();

    const data = bookings.map(b => ({ ...b.toJSON(), room: rooms[b.roomId] || null }));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const room = await Room.findById(booking.roomId);
    res.json({ success: true, data: { ...booking.toJSON(), room: room ? room.toJSON() : null } });
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

    const room = await Room.findById(roomId);
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

    const booking = await Booking.create({
      _id: uuidv4(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      roomId,
      date,
      startTime,
      endTime,
      purpose: purpose.trim(),
      attendees: parseInt(attendees, 10),
      status: 'approved',
      adminRemarks: '',
      createdAt: new Date().toISOString(),
    });

    const bookingObj = booking.toJSON();
    const roomObj = room.toJSON();
    sendBookingEmails({ booking: bookingObj, room: roomObj }).catch(err => console.error('[email error]', err.message));
    res.status(201).json({ success: true, message: 'Booking confirmed!', data: { ...bookingObj, room: roomObj } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const { status, adminRemarks } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    if (status === 'approved' && await hasConflict(booking.roomId, booking.date, booking.startTime, booking.endTime, booking._id))
      return res.status(409).json({ success: false, message: 'Cannot approve: another approved booking conflicts with this time slot' });

    booking.status = status;
    booking.adminRemarks = adminRemarks || '';
    booking.updatedAt = new Date().toISOString();
    await booking.save();

    const room = await Room.findById(booking.roomId);
    res.json({ success: true, message: `Booking ${status} successfully`, data: { ...booking.toJSON(), room: room ? room.toJSON() : null } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.email === booking.email;
    if (!isAdmin && !isOwner)
      return res.status(403).json({ success: false, message: 'You can only cancel your own bookings' });

    await booking.deleteOne();
    const room = await Room.findById(booking.roomId);
    const cancelledBy = isAdmin ? 'Admin' : booking.name;
    const reason = req.query.reason || '';
    if (room) sendCancellationNotification({ booking: booking.toJSON(), room: room.toJSON(), cancelledBy, reason }).catch(err => console.error('[whatsapp cancel]', err.message));
    res.json({ success: true, message: 'Booking cancelled successfully', data: booking.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.rescheduleBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.email === booking.email;
    if (!isAdmin && !isOwner)
      return res.status(403).json({ success: false, message: 'You can only reschedule your own bookings' });

    const { date, startTime, endTime } = req.body;
    if (!date || !startTime || !endTime)
      return res.status(400).json({ success: false, message: 'Date, start time, and end time are required' });

    const today = new Date().toISOString().split('T')[0];
    if (date < today)
      return res.status(400).json({ success: false, message: 'Cannot reschedule to a past date' });

    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    if (toMin(endTime) <= toMin(startTime))
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    if (toMin(endTime) - toMin(startTime) < 30)
      return res.status(400).json({ success: false, message: 'Minimum booking duration is 30 minutes' });

    if (await hasConflict(booking.roomId, date, startTime, endTime, booking._id))
      return res.status(409).json({ success: false, message: 'This time slot conflicts with an existing booking' });

    booking.date = date;
    booking.startTime = startTime;
    booking.endTime = endTime;
    booking.updatedAt = new Date().toISOString();
    await booking.save();

    const room = await Room.findById(booking.roomId);
    res.json({ success: true, message: 'Booking rescheduled successfully', data: { ...booking.toJSON(), room: room ? room.toJSON() : null } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, pending, approved, rejected, todayCount] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'approved' }),
      Booking.countDocuments({ status: 'rejected' }),
      Booking.countDocuments({ date: today }),
    ]);

    const rooms = await Room.find();
    const roomStats = await Promise.all(rooms.map(async (r) => {
      const [totalBookings, approvedBookings] = await Promise.all([
        Booking.countDocuments({ roomId: r._id }),
        Booking.countDocuments({ roomId: r._id, status: 'approved' }),
      ]);
      return { ...r.toJSON(), totalBookings, approvedBookings };
    }));

    res.json({ success: true, data: { total, pending, approved, rejected, todayBookings: todayCount, roomStats } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
