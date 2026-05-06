// models/store.js — In-memory data store (replace with MongoDB later)
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const SALT = 10;

const rooms = [
  { id: 'room-1', name: 'Fakhri Makan Conference Room', capacity: 20, floor: '1st Floor', amenities: [], color: '#6366f1' },
];

let bookings = [];

const users = [
  { id: 'user-1', email: 'admin@conference.com', password: bcrypt.hashSync('admin123', SALT), name: 'Admin User', role: 'admin' },
  { id: 'user-2', email: 'user@conference.com', password: bcrypt.hashSync('user123', SALT), name: 'Taha Badri', role: 'user' },
];

module.exports = { rooms, bookings, users, uuidv4 };
