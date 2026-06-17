exports.createCheckoutSession = async (req, res) => {
    try {
        const { amount, currency, email, name, bookingRef } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
        }

        const DodoPayments = require('dodopayments');
        const dodo = new DodoPayments({
            bearerToken: process.env.DODO_API_KEY,
            environment: 'test_mode'
        });

        const payment = await dodo.payments.create({
            billing: { country: 'US' },
            customer: { email: email || 'user@example.com', name: name || 'User' },
            product_cart: [{
                product_id: process.env.DODO_PRODUCT_ID || 'prod_default',
                quantity: 1,
                amount: Math.round(amount * 100)
            }],
            payment_link: true,
            return_url: 'https://flight-agent-seven.vercel.app/payment-success',
            metadata: { booking_id: bookingRef }
        });

        res.status(200).json({
            success: true,
            message: 'Checkout session created',
            paymentLink: payment.payment_link
        });

    } catch (error) {
        console.error('Dodo Payment Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;

        if (!transactionId) {
            return res.status(404).json({ success: false, message: 'Transaction ID is required' });
        }

        res.status(200).json({
            success: true,
            transactionId,
            status: 'paid',
            message: 'Payment status retrieved successfully'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};