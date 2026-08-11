const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      email    TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'user',
      status   TEXT NOT NULL DEFAULT 'approved'
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      capacity  INTEGER NOT NULL DEFAULT 20,
      floor     TEXT NOT NULL,
      amenities TEXT NOT NULL DEFAULT '[]',
      color     TEXT NOT NULL DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL,
      room_id       TEXT NOT NULL REFERENCES rooms(id),
      date          TEXT NOT NULL,
      start_time    TEXT NOT NULL,
      end_time      TEXT NOT NULL,
      purpose       TEXT NOT NULL,
      attendees     INTEGER NOT NULL DEFAULT 1,
      status        TEXT NOT NULL DEFAULT 'approved',
      admin_remarks TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL,
      updated_at    TEXT
    );
  `);

  await pool.query(`UPDATE bookings SET status = 'approved' WHERE status = 'pending'`);

  const SALT = 10;
  const seeds = [
    ['user-1', 'Admin User',    'admin@conference.com',   bcrypt.hashSync('admin123',   SALT), 'admin'],
    ['user-2', 'Taha Badri',    'user@conference.com',    bcrypt.hashSync('user123',    SALT), 'user'],
    ['user-3', 'Khidmat Guzar', 'khidmat@conference.com', bcrypt.hashSync('khidmat123', SALT), 'khidmat_guzar'],
    ['user-4', 'Staff Member',  'staff@conference.com',   bcrypt.hashSync('staff123',   SALT), 'staff'],
  ];
  for (const [id, name, email, password, role] of seeds) {
    await pool.query(
      `INSERT INTO users (id, name, email, password, role)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [id, name, email, password, role]
    );
  }

  const { rows } = await pool.query('SELECT COUNT(*) AS n FROM rooms');
  if (parseInt(rows[0].n) === 0) {
    await pool.query(
      `INSERT INTO rooms (id, name, capacity, floor, amenities, color)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['room-1', 'Fakhri Makan Conference Room', 20, '1st Floor', '[]', '#6366f1']
    );
  }
}

function parseBooking(row) {
  if (!row) return null;
  return {
    id:           row.id,
    name:         row.name,
    email:        row.email,
    roomId:       row.room_id,
    date:         row.date,
    startTime:    row.start_time,
    endTime:      row.end_time,
    purpose:      row.purpose,
    attendees:    row.attendees,
    status:       row.status,
    adminRemarks: row.admin_remarks,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

function parseRoom(row) {
  if (!row) return null;
  return { ...row, amenities: JSON.parse(row.amenities || '[]') };
}

module.exports = { pool, initDb, uuidv4, parseBooking, parseRoom };
