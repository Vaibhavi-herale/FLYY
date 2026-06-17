const express = require('express');
const { createCheckoutSession, getPaymentStatus } = require('../controllers/paymentController');

const router = express.Router();

router.post('/checkout', createCheckoutSession);

router.get('/:transactionId', getPaymentStatus);

module.exports = router;
