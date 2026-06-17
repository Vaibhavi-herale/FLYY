const express = require('express');
const { searchFlights, addFlight } = require('../controllers/flightController');

const router = express.Router();

// GET /api/flights to search
router.get('/', searchFlights);

// POST /api/flights to add flights (admin tool)
router.post('/', addFlight);

module.exports = router;