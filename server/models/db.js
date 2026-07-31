const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const idTransform = (doc, ret) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
  return ret;
};

const userSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  status: { type: String, default: 'approved' },
});
userSchema.set('toJSON', { transform: idTransform });

const roomSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, required: true },
  capacity: { type: Number, default: 20 },
  floor: { type: String, required: true },
  amenities: { type: [String], default: [] },
  color: { type: String, default: '#6366f1' },
});
roomSchema.set('toJSON', { transform: idTransform });

const bookingSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, required: true },
  email: { type: String, required: true },
  roomId: { type: String, required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  purpose: { type: String, required: true },
  attendees: { type: Number, default: 1 },
  status: { type: String, default: 'approved' },
  adminRemarks: { type: String, default: '' },
  createdAt: { type: String, required: true },
  updatedAt: String,
});
bookingSchema.set('toJSON', { transform: idTransform });

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Booking = mongoose.model('Booking', bookingSchema);

let connectPromise = null;

async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const SALT = 10;
    const seeds = [
      { _id: 'user-1', name: 'Admin User',    email: 'admin@conference.com',   password: bcrypt.hashSync('admin123',   SALT), role: 'admin' },
      { _id: 'user-2', name: 'Taha Badri',    email: 'user@conference.com',    password: bcrypt.hashSync('user123',    SALT), role: 'user' },
      { _id: 'user-3', name: 'Khidmat Guzar', email: 'khidmat@conference.com', password: bcrypt.hashSync('khidmat123', SALT), role: 'khidmat_guzar' },
      { _id: 'user-4', name: 'Staff Member',  email: 'staff@conference.com',   password: bcrypt.hashSync('staff123',   SALT), role: 'staff' },
    ];
    for (const { _id, ...fields } of seeds) {
      await User.findOneAndUpdate({ _id }, { $setOnInsert: { _id, ...fields } }, { upsert: true });
    }

    if (await Room.countDocuments() === 0) {
      await Room.create({ _id: 'room-1', name: 'Fakhri Makan Conference Room', capacity: 20, floor: '1st Floor', amenities: [], color: '#6366f1' });
    }
  })();

  return connectPromise;
}

module.exports = { User, Room, Booking, connectDb, uuidv4 };
