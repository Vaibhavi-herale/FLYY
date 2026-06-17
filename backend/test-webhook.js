require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

// Expose processPaymentSuccess for testing
const fs = require('fs');
const path = require('path');
const webhookPath = path.join(__dirname, 'webhook', 'webhookController.js');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const booking = await Booking.findOne().sort({ createdAt: -1 });
        if (!booking) {
            console.log('No booking found.');
            process.exit(0);
        }

        console.log('Testing webhook with booking:', booking._id);

        // We can't directly call processPaymentSuccess since it's not exported,
        // but we can call manualConfirm by mocking req and res.
        const webhookController = require('./webhook/webhookController');
        
        const req = { params: { bookingId: booking._id.toString() } };
        const res = {
            status: (code) => ({
                json: (data) => console.log(`Response [${code}]:`, data)
            })
        };

        await webhookController.manualConfirm(req, res);
        
        setTimeout(() => process.exit(0), 5000);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
})();
