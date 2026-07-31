const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models/db');

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

const safeUser = (doc) => {
  const obj = doc.toJSON();
  delete obj.password;
  return obj;
};

exports.login = async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    if (isRateLimited(ip))
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Try again in 15 minutes.' });

    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      recordFailure(ip);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.status === 'pending')
      return res.status(403).json({ success: false, message: 'Your account is awaiting admin approval. You will be able to sign in once approved.' });

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

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();
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
    const user = await User.findById(decoded.id);
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

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });

    const user = await User.create({
      _id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: bcrypt.hashSync(password, 10),
      role: 'user',
      status: 'approved',
    });
    const u = safeUser(user);
    res.status(201).json({ success: true, message: 'Account created', data: { user: u, token: signToken(u) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      const { sendPasswordResetNotification } = require('../utils/email');
      sendPasswordResetNotification({ name: user.name, email: user.email }).catch(() => {});
    }
    res.json({ success: true, message: 'If an account exists with this email, the administrator has been notified to reset your password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
