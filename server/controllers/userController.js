// controllers/userController.js
const { db } = require('../models/db');

const safeUser = ({ password, ...u }) => u;

exports.getPendingUsers = (req, res) => {
  try {
    const users = db.prepare("SELECT * FROM users WHERE status = 'pending' ORDER BY rowid DESC").all().map(safeUser);
    res.json({ success: true, data: users, count: users.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.approveUser = (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: `${user.name} has been approved` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.rejectUser = (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `${user.name}'s registration has been rejected` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
