const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roomController');
const { requireAdmin } = require('../middleware/auth');

router.get('/',    ctrl.getAllRooms);       // public — needed for booking form & schedule
router.get('/:id', ctrl.getRoomById);      // public
router.patch('/:id', requireAdmin, ctrl.updateRoom);

module.exports = router;
