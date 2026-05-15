const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookingController');
const { requireAdmin, optionalAuth } = require('../middleware/auth');

router.get('/stats',  requireAdmin, ctrl.getStats);
router.get('/',       ctrl.getAllBookings);
router.get('/:id',    ctrl.getBookingById);
router.post('/',      ctrl.createBooking);
router.put('/:id',           requireAdmin, ctrl.updateBooking);
router.patch('/:id/reschedule', ctrl.rescheduleBooking);
router.delete('/:id',        optionalAuth, ctrl.deleteBooking);

module.exports = router;
