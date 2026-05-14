const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '8h';

const loginFailures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (loginFailures.get(ip) || []).filter(t => now - t < WINDOW_MS);
  return recent.length >= MAX_FAILURES;
}
function recordFailure(ip) {
  const now = Date.now();
  const recent = (loginFailures.get(ip) || []).filter(t => now - t < WINDOW_MS);
  loginFailures.set(ip, [...recent, now]);
}
function clearFailures(ip) { loginFailures.delete(ip); }

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const safeUser = (row) => { const { password, ...u } = row; return u; };

exports.login = async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    if (isRateLimited(ip))
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Try again in 15 minutes.' });

    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      recordFailure(ip);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Your account is awaiting admin approval. You will be able to sign in once approved.' });
    }

    clearFailures(ip);
    const u = safeUser(user);
    res.json({ success: true, message: 'Login successful', data: { user: u, token: signToken(u) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [bcrypt.hashSync(newPassword, 10), user.id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.me = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user: safeUser(user) } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email format' });

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing[0])
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const hashed = bcrypt.hashSync(password, 10);
    await pool.query(
      'INSERT INTO users (id, name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name.trim(), email.toLowerCase().trim(), hashed, 'user', 'approved']
    );
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const u = safeUser(rows[0]);
    res.status(201).json({ success: true, message: 'Account created', data: { user: u, token: signToken(u) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    // Always return success (don't leak whether email exists)
    if (rows[0]) {
      const { sendPasswordResetNotification } = require('../utils/email');
      sendPasswordResetNotification({ name: rows[0].name, email: rows[0].email }).catch(() => {});
    }
    res.json({ success: true, message: 'If an account exists with this email, the administrator has been notified to reset your password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
