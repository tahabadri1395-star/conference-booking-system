// routes/users.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { requireAdmin } = require('../middleware/auth');

router.get('/pending', requireAdmin, ctrl.getPendingUsers);
router.patch('/:id/approve', requireAdmin, ctrl.approveUser);
router.delete('/:id', requireAdmin, ctrl.rejectUser);

module.exports = router;
