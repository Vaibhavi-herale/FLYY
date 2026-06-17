const express = require('express');
const { register, login, me, getUserContext, getUserBookings } = require('../controllers/userController');
const { protectUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protectUser, me);
router.get('/bookings', protectUser, getUserBookings);
router.get('/context/:email', protectUser, getUserContext);

module.exports = router;
