const flightTrackingService = require('../services/flightTrackingService');

exports.getFlightStatus = async (req, res) => {
    try {
        const status = await flightTrackingService.getFlightStatus(req.params.flightId);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFlightStatusByNumber = async (req, res) => {
    try {
        const status = await flightTrackingService.getFlightStatusByNumber(req.params.flightNumber);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateFlightDelay = async (req, res) => {
    try {
        const { flightId, delayMinutes, reason } = req.body;
        const status = await flightTrackingService.updateFlightDelay(flightId, delayMinutes, reason);
        res.json({ success: true, message: 'Flight delay updated', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.cancelFlight = async (req, res) => {
    try {
        const { flightId, reason } = req.body;
        const status = await flightTrackingService.cancelFlight(flightId, reason);
        res.json({ success: true, message: 'Flight cancelled', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.divertFlight = async (req, res) => {
    try {
        const { flightId, airport, reason } = req.body;
        const status = await flightTrackingService.divertFlight(flightId, airport, reason);
        res.json({ success: true, message: 'Flight diverted', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateFlightStatus = async (req, res) => {
    try {
        const { flightId, newStatus, details } = req.body;
        const status = await flightTrackingService.updateFlightStatus(flightId, newStatus, details);
        res.json({ success: true, message: 'Flight status updated', status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};