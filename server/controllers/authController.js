// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, uuidv4 } = require('../models/db');

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

exports.login = (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    if (isRateLimited(ip))
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Try again in 15 minutes.' });

    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
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


exports.changePassword = (req, res) => {
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

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.me = (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user: safeUser(user) } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
