const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookingController');
const { requireAdmin } = require('../middleware/auth');

router.get('/stats',  requireAdmin, ctrl.getStats);
router.get('/',       ctrl.getAllBookings);      // public — schedule view needs this
router.get('/:id',    ctrl.getBookingById);      // public
router.post('/',      ctrl.createBooking);       // public — anyone can submit a booking
router.put('/:id',    requireAdmin, ctrl.updateBooking);
router.delete('/:id', requireAdmin, ctrl.deleteBooking);

module.exports = router;
