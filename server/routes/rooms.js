// routes/rooms.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roomController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.getAllRooms);
router.get('/:id', requireAuth, ctrl.getRoomById);
router.patch('/:id', requireAdmin, ctrl.updateRoom);

module.exports = router;
