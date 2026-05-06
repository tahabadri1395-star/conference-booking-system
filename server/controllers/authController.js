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

exports.register = (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    if (name.trim().length < 2)
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase().trim()))
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });

    const ALLOWED_ROLES = ['user', 'staff', 'khidmat_guzar'];
    const assignedRole = ALLOWED_ROLES.includes(req.body.role) ? req.body.role : 'user';

    const id = uuidv4();
    db.prepare('INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, name.trim(), email.toLowerCase().trim(), bcrypt.hashSync(password, 10), assignedRole, 'pending'
    );

    const u = safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    // No token issued — account must be approved by admin before login is allowed
    res.status(201).json({ success: true, message: 'Registration submitted. An admin will review your account before you can sign in.' , data: { user: u } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
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
