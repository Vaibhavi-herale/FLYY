const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/login', admin.adminLogin);

router.post('/flight', protectAdmin, admin.addFlight);
router.get('/flights', protectAdmin, admin.getFlights);
router.put('/flight/:id', protectAdmin, admin.editFlight);
router.delete('/flight/:id', protectAdmin, admin.deleteFlight);

router.get('/bookings', protectAdmin, admin.getBookings);

router.get('/users', protectAdmin, admin.getAllUsers);
router.patch('/users/:userId/toggle-status', protectAdmin, admin.toggleUserStatus);
router.get('/users/:userId/booking-stats', protectAdmin, admin.getUserBookingStats);
router.delete('/users/:userId', protectAdmin, admin.deleteUser);

module.exports = router;