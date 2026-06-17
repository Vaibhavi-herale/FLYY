const express = require('express');
const router = express.Router();
const { handleDodoWebhook, manualConfirm } = require('../webhook/webhookController');

// POST /api/webhooks/dodo — Dodo Payments webhook (auto-triggered)
// IMPORTANT: Must receive raw body for signature verification
router.post('/dodo', express.raw({ type: 'application/json' }), (req, res, next) => {
    // Attach raw body string for signature check
    if (Buffer.isBuffer(req.body)) {
        req.rawBody = req.body.toString('utf8');
        try { req.body = JSON.parse(req.rawBody); } catch (e) { req.body = {}; }
    }
    next();
}, handleDodoWebhook);

// POST /api/webhooks/confirm/:bookingId — manual confirm from frontend return_url
router.post('/confirm/:bookingId', manualConfirm);

module.exports = router;
