// models/db.js — SQLite database setup and seed
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = new Database(path.join(__dirname, '../data/gatherly.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Migration: add status column to users if it doesn't exist yet
try { db.prepare("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'").run(); } catch {}

db.exec(`
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
    status        TEXT NOT NULL DEFAULT 'pending',
    admin_remarks TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL,
    updated_at    TEXT
  );
`);

// Seed default accounts (INSERT OR IGNORE so re-runs are safe)
const seedUser = db.prepare('INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
const SALT = 10;
seedUser.run('user-1', 'Admin User',    'admin@conference.com',   bcrypt.hashSync('admin123',   SALT), 'admin');
seedUser.run('user-2', 'Taha Badri',    'user@conference.com',    bcrypt.hashSync('user123',    SALT), 'user');
seedUser.run('user-3', 'Khidmat Guzar', 'khidmat@conference.com', bcrypt.hashSync('khidmat123', SALT), 'khidmat_guzar');
seedUser.run('user-4', 'Staff Member',  'staff@conference.com',   bcrypt.hashSync('staff123',   SALT), 'staff');

// Seed default room once
const roomCount = db.prepare('SELECT COUNT(*) as n FROM rooms').get().n;
if (roomCount === 0) {
  db.prepare('INSERT INTO rooms (id, name, capacity, floor, amenities, color) VALUES (?, ?, ?, ?, ?, ?)').run(
    'room-1', 'Fakhri Makan Conference Room', 20, '1st Floor', '[]', '#6366f1'
  );
}

// Helper: convert a raw booking row to the camelCase shape the frontend expects
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

// Helper: parse amenities JSON stored as text
function parseRoom(row) {
  if (!row) return null;
  return { ...row, amenities: JSON.parse(row.amenities || '[]') };
}

module.exports = { db, uuidv4, parseBooking, parseRoom };
