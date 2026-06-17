const express = require('express');
const router = express.Router();
const refundService = require('../services/refundService');
const { protectAdmin } = require('../middleware/authMiddleware');

/**
 * POST /api/refunds/request
 * Request refund for a booking
 */
router.post('/request', async (req, res) => {
    try {
        const { bookingId, reason, notes } = req.body;
        const refund = await refundService.requestRefund(bookingId, reason, notes);
        res.json({ success: true, message: 'Refund request submitted', refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/refunds/:refundId
 * Get refund status
 */
router.get('/:refundId', async (req, res) => {
    try {
        const refund = await refundService.getRefundStatus(req.params.refundId);
        res.json({ success: true, refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/refunds/booking/:bookingId
 * Get all refunds for a booking
 */
router.get('/booking/:bookingId', async (req, res) => {
    try {
        const refunds = await refundService.getRefundsByBooking(req.params.bookingId);
        res.json({ success: true, refunds });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/refunds/:refundId/approve
 * Admin approve refund
 */
router.post('/:refundId/approve', protectAdmin, async (req, res) => {
    try {
        const { notes } = req.body;
        const refund = await refundService.approveRefund(req.params.refundId, notes);
        res.json({ success: true, message: 'Refund approved', refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/refunds/:refundId/reject
 * Admin reject refund
 */
router.post('/:refundId/reject', protectAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const refund = await refundService.rejectRefund(req.params.refundId, reason);
        res.json({ success: true, message: 'Refund rejected', refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/refunds/:refundId/process
 * Admin process refund
 */
router.post('/:refundId/process', protectAdmin, async (req, res) => {
    try {
        const refund = await refundService.processRefund(req.params.refundId);
        res.json({ success: true, message: 'Refund processed', refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;