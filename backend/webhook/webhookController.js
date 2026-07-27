const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const emailService = require('../services/emailService');
const emailNotifications = require('../services/emailNotifications');
const ticketService = require('../services/ticketService');
const crypto = require('crypto');
const fs = require('fs');

// ─────────────────────────────────────────
// DODO PAYMENTS WEBHOOK
// POST /api/webhooks/dodo
// ─────────────────────────────────────────
exports.handleDodoWebhook = async (req, res) => {
    try {
        // ── VERIFY WEBHOOK SIGNATURE ──
        const webhookSecret = process.env.DODO_WEBHOOK_SECRET;
        if (webhookSecret) {
            const signature = req.headers['webhook-signature'] || req.headers['x-webhook-signature'];
            const rawBody = req.rawBody || JSON.stringify(req.body);
            const expectedSig = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            if (signature && signature !== expectedSig) {
                console.warn('[Webhook] Invalid signature — rejected');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        const event = req.body;
        console.log(`[Webhook] Received event: ${event.type}`);
        // ── PAYMENT SUCCESS ──
        if (event.type === 'payment.succeeded' || event.type === 'payment.completed') {
            const bookingId = event.data?.metadata?.booking_id || event.metadata?.booking_id;

            if (!bookingId) {
                console.warn('[Webhook] No booking_id in metadata');
                return res.status(200).json({ received: true });
            }

            const paymentId = event.data?.payment_id || event.payment_id;
            const paymentMethod = event.data?.payment_method || event.payment_method || 'card';
            await processPaymentSuccess(bookingId, paymentId, paymentMethod);
        }

        // ── PAYMENT FAILED ──
        if (event.type === 'payment.failed' || event.type === 'payment.cancelled') {
            const bookingId = event.data?.metadata?.booking_id || event.metadata?.booking_id;
            if (bookingId) await processPaymentFailure(bookingId);
        }

        res.status(200).json({ received: true });

    } catch (error) {
        console.error('[Webhook] Error:', error.message);
        // Always return 200 to prevent Dodo from retrying
        res.status(200).json({ received: true, error: error.message });
    }
};

// ─────────────────────────────────────────
// MANUAL CONFIRM (for return_url redirect)
// POST /api/webhooks/confirm/:bookingId
// ─────────────────────────────────────────
exports.manualConfirm = async (req, res) => {
    try {
        const { bookingId } = req.params;
        // paymentId is sent from the frontend after Dodo redirects back with ?payment_id=xxx
        // This ensures dodoPaymentId is saved to the booking even when running locally (no real webhook)
        const { paymentId } = req.body || {};
        await processPaymentSuccess(bookingId, paymentId);
        res.status(200).json({ success: true, message: 'Booking confirmed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────
// CORE: Process successful payment
// ─────────────────────────────────────────
async function processPaymentSuccess(bookingId, paymentId, paymentMethod) {
    const booking = await Booking.findById(bookingId).populate('flight');
    if (!booking) {
        console.warn(`[Webhook] Booking not found: ${bookingId}`);
        return;
    }

    if (booking.bookingStatus === 'Confirmed' && booking.payment?.dodoPaymentId) {
        console.log(`[Webhook] Booking ${bookingId} already confirmed and paid, skipping`);
        return;
    }

    // Confirm booking
    booking.bookingStatus = 'Confirmed';
    if (!booking.payment) {
        booking.payment = {};
    }
    if (paymentMethod) {
        booking.payment.paymentMethod = paymentMethod;
    } else if (!booking.payment.paymentMethod) {
        booking.payment.paymentMethod = 'card';
    }
    if (paymentId) {
        booking.payment.dodoPaymentId = paymentId;
    }
    await booking.save();
    console.log(`[Webhook] Booking ${booking.pnr} confirmed`);

    // Build flight data
    const flightData = booking.flight || buildFlightFromSnapshot(booking.amadeusFlightSnapshot);

    // Generate tickets and PDFs
    let tickets = [];
    let attachments = [];
    try {
        tickets = await ticketService.generateTicketsForBooking(booking._id);
        
        for (const ticket of tickets) {
            const pdfPath = await ticketService.generatePDFTicket(ticket._id);
            attachments.push({
                filename: `ticket_${ticket.ticketNumber}.pdf`,
                path: pdfPath
            });
        }
        console.log(`[Webhook] Tickets generated for booking: ${bookingId}`);
    } catch (err) {
        console.error('[Webhook] Ticket generation failed:', err.message);
    }

    // Send confirmation email with ticket attachment
    try {
        const ticketData = {
            pnr: booking.pnr,
            flight: flightData,
            passengers: booking.passengers,
            cabinClass: booking.cabinClass,
            totalAmount: booking.totalAmount,
            tickets: tickets
        };
        
        await emailNotifications.sendTicketEmail(booking.contactEmail, ticketData, attachments);
        console.log(`[Webhook] Confirmation email sent to ${booking.contactEmail}`);
    } catch (err) {
        console.error('[Webhook] Email failed:', err.message);
    }

    // Clean up PDFs after 30s
    if (attachments.length > 0) {
        setTimeout(() => {
            attachments.forEach(att => {
                if (fs.existsSync(att.path)) {
                    fs.unlinkSync(att.path);
                }
            });
        }, 30000);
    }
}

async function processPaymentFailure(bookingId) {
    try {
        const booking = await Booking.findById(bookingId).populate('flight');
        if (!booking || booking.bookingStatus === 'Cancelled') return;

        // Restore seats if DB flight
        if (booking.flight?._id) {
            const flight = await Flight.findById(booking.flight._id);
            if (flight) {
                flight.availableSeats[booking.cabinClass] += booking.passengers.length;
                await flight.save();
            }
        }

        booking.bookingStatus = 'Cancelled';
        await booking.save();

        await emailService.sendPaymentFailureEmail(booking.contactEmail, { pnr: booking.pnr });
        console.log(`[Webhook] Booking ${booking.pnr} cancelled due to payment failure`);
    } catch (err) {
        console.error('[Webhook] processPaymentFailure error:', err.message);
    }
}

function buildFlightFromSnapshot(snapshot) {
    if (!snapshot) return null;
    const firstItinerary = snapshot.itineraries?.[0];
    const seg = firstItinerary?.segments?.[0];
    const lastSeg = firstItinerary?.segments?.[firstItinerary.segments.length - 1];
    return {
        flightNumber: `${seg?.carrierCode}${seg?.number}`,
        airline: seg?.carrierCode || 'N/A',
        departureCity: seg?.departure?.iataCode,
        departureAirport: seg?.departure?.iataCode,
        destinationCity: lastSeg?.arrival?.iataCode,
        destinationAirport: lastSeg?.arrival?.iataCode,
        departureDate: seg?.departure?.at ? new Date(seg.departure.at) : null,
        departureTime: seg?.departure?.at ? new Date(seg.departure.at).toTimeString().substring(0, 5) : 'N/A',
        arrivalTime: lastSeg?.arrival?.at ? new Date(lastSeg.arrival.at).toTimeString().substring(0, 5) : 'N/A',
        duration: 'N/A',
        stops: (firstItinerary?.segments?.length || 1) - 1
    };
}
