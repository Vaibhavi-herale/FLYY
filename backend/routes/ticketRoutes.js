const express = require('express');
const router = express.Router();
const ticketService = require('../services/ticketService');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const { protectUser } = require('../middleware/authMiddleware');

/**
 * GET /api/tickets/view/:ticketNumber
 * Web view for mobile QR scanning
 */
router.get('/view/:ticketNumber', async (req, res) => {
    try {
        const ticket = await Ticket.findOne({ ticketNumber: req.params.ticketNumber }).populate('flightId');
        if (!ticket) return res.status(404).send('Ticket not found');
        const booking = await Booking.findById(ticket.bookingId);
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <title>Boarding Pass</title>
        </head>
        <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4 font-sans">
            <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                <div class="bg-blue-800 p-6 text-white text-center relative overflow-hidden">
                    <div class="absolute top-0 right-0 opacity-10">
                        <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                    </div>
                    <h1 class="text-3xl font-bold tracking-widest relative z-10">BOARDING PASS</h1>
                    <p class="text-blue-200 mt-2 text-lg relative z-10">${ticket.flightId.departureAirport} ✈ ${ticket.flightId.destinationAirport}</p>
                </div>
                <div class="p-6">
                    <div class="mb-5">
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Passenger</p>
                        <p class="text-xl font-bold text-gray-900 mt-1">${ticket.passengerName}</p>
                    </div>
                    
                    <div class="flex justify-between mb-5 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Flight</p>
                            <p class="text-lg font-bold text-gray-900 mt-1">${ticket.flightId.flightNumber}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Date</p>
                            <p class="text-lg font-bold text-gray-900 mt-1">${new Date(ticket.flightId.departureDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="flex justify-between mb-6 pb-6 border-b-2 border-gray-200 border-dashed">
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Seat</p>
                            <p class="text-3xl font-bold text-blue-600 mt-1">${ticket.seatNumber}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Class</p>
                            <p class="text-lg font-bold text-gray-900 mt-1">${ticket.cabinClass.toUpperCase()}</p>
                        </div>
                    </div>

                    <div class="flex justify-between text-sm">
                        <div>
                            <p class="text-gray-500 font-semibold">PNR</p>
                            <p class="font-bold text-lg mt-1 tracking-widest">${ticket.pnr}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-gray-500 font-semibold">Status</p>
                            <p class="font-bold text-lg mt-1 text-green-600 tracking-wider">CONFIRMED</p>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-800 p-4 text-center text-xs text-gray-400">
                    Ticket Number: ${ticket.ticketNumber}
                </div>
            </div>
        </body>
        </html>
        `;
        res.send(html);
    } catch (error) {
        res.status(500).send('Error loading ticket');
    }
});

/**
 * GET /api/tickets/:bookingId
 * Get all tickets for a booking
 */
router.get('/:bookingId', protectUser, async (req, res) => {
    try {
        const booking = await Booking.findOne({
            _id: req.params.bookingId,
            $or: [
                { userId: req.user._id },
                { contactEmail: req.user.email }
            ]
        });
        if (!booking) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        const tickets = await ticketService.getTicketsByBooking(req.params.bookingId);
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tickets/verify
 * Verify ticket authenticity
 */
router.post('/verify', async (req, res) => {
    try {
        const { ticketNumber, pnr } = req.body;
        const verification = await ticketService.verifyTicket(ticketNumber, pnr);
        res.json(verification);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tickets/:ticketId/checkin
 * Check in a passenger
 */
router.post('/:ticketId/checkin', protectUser, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
        const booking = await Booking.findById(ticket.bookingId);
        if (!booking || (booking.userId?.toString() !== req.user._id.toString() && booking.contactEmail !== req.user.email)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        const updatedTicket = await ticketService.checkInPassenger(req.params.ticketId);
        res.json({ success: true, message: 'Checked in successfully', ticket: updatedTicket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tickets/:ticketId/board
 * Board a passenger
 */
router.post('/:ticketId/board', protectUser, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
        const booking = await Booking.findById(ticket.bookingId);
        if (!booking || (booking.userId?.toString() !== req.user._id.toString() && booking.contactEmail !== req.user.email)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        const updatedTicket = await ticketService.boardPassenger(req.params.ticketId);
        res.json({ success: true, message: 'Boarded successfully', ticket: updatedTicket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/tickets/:ticketId/pdf
 * Download ticket PDF
 */
router.get('/:ticketId/pdf', protectUser, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
        const booking = await Booking.findById(ticket.bookingId);
        if (!booking || (booking.userId?.toString() !== req.user._id.toString() && booking.contactEmail !== req.user.email)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        const filePath = await ticketService.generatePDFTicket(req.params.ticketId);
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;