const express = require('express');

const { createBooking, cancelBooking, getBooking, lockSpecificSeats, getSeatAvailability } = require('../controllers/bookingController');
const { protectUser } = require('../middleware/authMiddleware');
const router = express.Router();
// Apply auth middleware to all booking routes
router.use(protectUser);
// POST /api/bookings to create a booking
router.post('/', createBooking);
// GET /api/bookings/flights/:flightId/seats/availability to get occupied seats
router.get('/flights/:flightId/seats/availability', getSeatAvailability);
// POST /api/bookings/flights/:flightId/seats/lock to lock exact seats
router.post('/flights/:flightId/seats/lock', lockSpecificSeats);
// POST /api/bookings/cancel to cancel booking operations
router.post('/cancel', cancelBooking);
// GET /api/bookings/:pnr to get booking details
router.get('/:pnr', getBooking);
module.exports = router;