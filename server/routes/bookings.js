// routes/bookings.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookingController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/stats', requireAdmin, ctrl.getStats);
router.get('/', requireAuth, ctrl.getAllBookings);
router.get('/:id', requireAuth, ctrl.getBookingById);
router.post('/', requireAuth, ctrl.createBooking);
router.put('/:id', requireAdmin, ctrl.updateBooking);
router.delete('/:id', requireAdmin, ctrl.deleteBooking);

module.exports = router;
