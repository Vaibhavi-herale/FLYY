const express = require('express');
const router = express.Router();
const flightTrackingService = require('../services/flightTrackingService');
const { protectAdmin } = require('../middleware/authMiddleware');
const { trackFlight } = require('../controllers/flightController');

/**
 * GET /api/tracking/live/:flightNumber
 * Get real-time live flight status from AviationStack API
 */
router.get('/live/:flightNumber', trackFlight);

/**
 * GET /api/tracking/flight/:flightId
 * Get flight status
 */
router.get('/flight/:flightId', async (req, res) => {
    try {
        const status = await flightTrackingService.getFlightStatus(req.params.flightId);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/tracking/flight-number/:flightNumber
 * Get flight status by flight number
 */
router.get('/flight-number/:flightNumber', async (req, res) => {
    try {
        const status = await flightTrackingService.getFlightStatusByNumber(req.params.flightNumber);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tracking/delay
 * Admin update flight delay
 */
router.post('/delay', protectAdmin, async (req, res) => {
    try {
        const { flightId, delayMinutes, reason } = req.body;
        const status = await flightTrackingService.updateFlightDelay(flightId, delayMinutes, reason);
        res.json({ success: true, message: 'Flight delay updated', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tracking/cancel
 * Admin cancel flight
 */
router.post('/cancel', protectAdmin, async (req, res) => {
    try {
        const { flightId, reason } = req.body;
        const status = await flightTrackingService.cancelFlight(flightId, reason);
        res.json({ success: true, message: 'Flight cancelled', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tracking/divert
 * Admin divert flight
 */
router.post('/divert', protectAdmin, async (req, res) => {
    try {
        const { flightId, airport, reason } = req.body;
        const status = await flightTrackingService.divertFlight(flightId, airport, reason);
        res.json({ success: true, message: 'Flight diverted', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tracking/update-status
 * Admin update flight status
 */
router.post('/update-status', protectAdmin, async (req, res) => {
    try {
        const { flightId, newStatus, details } = req.body;
        const status = await flightTrackingService.updateFlightStatus(flightId, newStatus, details);
        res.json({ success: true, message: 'Flight status updated', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;