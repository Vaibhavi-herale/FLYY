require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = require('./models/Booking');

    const withId = await Booking.find({
        bookingStatus: 'Confirmed',
        'payment.dodoPaymentId': { $exists: true, $ne: null }
    });

    const missing = await Booking.find({
        bookingStatus: 'Confirmed',
        $or: [
            { 'payment.dodoPaymentId': { $exists: false } },
            { 'payment.dodoPaymentId': null },
            { 'payment.dodoPaymentId': '' }
        ]
    });

    console.log('✅ Confirmed bookings WITH payment ID:', withId.length);
    console.log('❌ Confirmed bookings MISSING payment ID:', missing.length);

    if (missing.length > 0) {
        console.log('\nBookings missing dodoPaymentId:');
        missing.forEach(b => {
            console.log(` - PNR: ${b.pnr} | BookingID: ${b._id} | Payment:`, b.payment);
        });
    }

    mongoose.disconnect();
}).catch(err => {
    console.error('DB connection failed:', err.message);
});
