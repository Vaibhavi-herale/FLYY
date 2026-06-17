const dns = require('dns').promises;
dns.setServers(['1.1.1.1', '8.8.8.8']); // Google + Cloudflare DNS

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const connectDB = require('./config/db');
const flightRoutes = require('./routes/flightRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const locationRoutes = require('./routes/locationRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const refundRoutes = require('./routes/refundRoutes');
const flightTrackingRoutes = require('./routes/flightTrackingRoutes');
const webhookRoutes = require('./routes/webhookRoutes');


const app = express();

// Middleware
app.use(cors());

// Connect Database
connectDB();

const { Webhooks } = require('@dodopayments/express');
const Booking = require('./models/Booking');
const emailService = require('./services/emailService');
const emailNotifications = require('./services/emailNotifications');
const ticketService = require('./services/ticketService');
const smsService = require('./services/smsService');
const alertService = require('./services/alertService');

// Start cron jobs
alertService.startCronJob();

// ✅ FIXED WEBHOOK (ONLY CHANGE: event_type → type)
// MUST BE PLACED BEFORE bodyParser.json()!
app.post('/api/webhooks/dodo', express.raw({ type: 'application/json' }), Webhooks({
    webhookKey: process.env.DODO_WEBHOOK_SECRET || 'whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    onPayload: async (payload) => {

        console.log('Received Dodo Event:', payload.type); // ✅ FIXED

        if (payload.type === 'payment.succeeded') { // ✅ FIXED

            const bookingId = payload.data.metadata?.booking_id;
            console.log("Booking ID:", bookingId);

            if (bookingId) {
                const booking = await Booking.findById(bookingId).populate('flight');

                if (booking && booking.bookingStatus === 'Pending Payment') {
                    booking.bookingStatus = 'Confirmed';

                    booking.payment = {
                        paymentMethod: payload.data.payment_method || 'card',
                        dodoPaymentId: payload.data.payment_id
                    };

                    await booking.save();

                    try {
                        const tickets = await ticketService.generateTicketsForBooking(booking._id);
                        
                        // Generate PDFs for all tickets
                        const attachments = [];
                        for (let t of tickets) {
                            const pdfPath = await ticketService.generatePDFTicket(t._id);
                            attachments.push({ filename: `Ticket_${t.ticketNumber}.pdf`, path: pdfPath });
                        }

                        const bookingDataForEmail = {
                            pnr: booking.pnr,
                            flight: booking.flight,
                            passengers: booking.passengers,
                            totalAmount: booking.totalAmount,
                            cabinClass: booking.cabinClass,
                            tickets: tickets
                        };

                        await emailNotifications.sendTicketEmail(
                            booking.contactEmail,
                            bookingDataForEmail,
                            attachments
                        );

                        const contactPhone = booking.contactPhone || (booking.passengers && booking.passengers[0] && booking.passengers[0].phoneNumber);
                        if (contactPhone) {
                            await smsService.sendBookingConfirmation(contactPhone, bookingDataForEmail);
                        }

                        console.log("✅ Notifications sent successfully");

                    } catch (e) {
                        console.error('❌ Failed sending email on webhook:', e);
                    }
                }
            }
        }
    }
}));

// Global JSON parser for all other routes (10mb limit for base64 image payloads)
app.use(bodyParser.json({ limit: '10mb' }));

// Routes
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/tracking', flightTrackingRoutes);
app.use('/api/webhooks', webhookRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});