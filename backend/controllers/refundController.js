const refundService = require('../services/refundService');

exports.requestRefund = async (req, res) => {
    try {
        const { bookingId, reason, notes } = req.body;
        const refund = await refundService.requestRefund(bookingId, reason, notes);
        res.json({ success: true, message: 'Refund request submitted', refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRefundStatus = async (req, res) => {
    try {
        const refund = await refundService.getRefundStatus(req.params.refundId);
        res.json({ success: true, refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRefundsByBooking = async (req, res) => {
    try {
        const refunds = await refundService.getRefundsByBooking(req.params.bookingId);
        res.json({ success: true, refunds });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.approveRefund = async (req, res) => {
    try {
        const { notes } = req.body;
        const refund = await refundService.approveRefund(req.params.refundId, notes);
        res.json({ success: true, message: 'Refund approved', refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.rejectRefund = async (req, res) => {
    try {
        const { reason } = req.body;
        const refund = await refundService.rejectRefund(req.params.refundId, reason);
        res.json({ success: true, message: 'Refund rejected', refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.processRefund = async (req, res) => {
    try {
        const refund = await refundService.processRefund(req.params.refundId);
        res.json({ success: true, message: 'Refund processed', refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};