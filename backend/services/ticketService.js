const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}
const LOCAL_IP = getLocalIp();

class TicketService {
    /**
     * Generate tickets for a booking
     */
    async generateTicketsForBooking(bookingId) {
        try {
            const booking = await Booking.findById(bookingId).populate('flight');
            if (!booking) throw new Error('Booking not found');

            const tickets = [];
            for (let i = 0; i < booking.passengers.length; i++) {
                const passenger = booking.passengers[i];
                const ticketNumber = `${booking.flight.flightNumber}-${booking.pnr}-${i + 1}`;
                
                // Generate QR Code pointing to web view
                const qrText = `http://${LOCAL_IP}:5000/api/tickets/view/${ticketNumber}`;
                const qrCode = await QRCode.toDataURL(qrText);

                const ticket = await Ticket.create({
                    bookingId,
                    ticketNumber,
                    passengerId: passenger.passportNumber,
                    passengerName: passenger.name,
                    flightId: booking.flight._id,
                    pnr: booking.pnr,
                    seatNumber: (booking.seats && booking.seats[i]) ? booking.seats[i] : 'TBD',
                    cabinClass: booking.cabinClass,
                    qrCode,
                    status: 'issued',
                    baggage: {
                        pieces: 1,
                        weight: booking.cabinClass === 'first' ? 30 : booking.cabinClass === 'business' ? 25 : 20
                    }
                });

                tickets.push(ticket);
            }

            return tickets;
        } catch (error) {
            throw new Error(`Ticket generation failed: ${error.message}`);
        }
    }

    /**
     * Generate PDF ticket
     */
    async generatePDFTicket(ticketId) {
        try {
            const ticket = await Ticket.findById(ticketId).populate('flightId');
            if (!ticket) throw new Error('Ticket not found');

            const doc = new PDFDocument();
            const fileName = `ticket_${ticket.ticketNumber}.pdf`;
            const filePath = path.join(__dirname, '../uploads', fileName);

            // Ensure uploads directory exists
            if (!fs.existsSync(path.join(__dirname, '../uploads'))) {
                fs.mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
            }

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Minimalist Professional Design
            
            // Background Header
            doc.rect(0, 0, doc.page.width, 100).fill('#1e3a8a');
            doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('BOARDING PASS', 50, 40);
            
            // Passenger & Flight minimalist layout
            doc.fillColor('#333333').font('Helvetica');
            
            // Main Content Box
            doc.rect(50, 130, doc.page.width - 100, 220)
               .lineWidth(1).stroke('#e5e7eb');

            // Details
            doc.fontSize(10).fillColor('#6b7280').text('PASSENGER', 70, 150);
            doc.fontSize(16).fillColor('#111827').font('Helvetica-Bold').text(ticket.passengerName.toUpperCase(), 70, 165);

            doc.fontSize(10).fillColor('#6b7280').font('Helvetica').text('FLIGHT', 70, 210);
            doc.fontSize(14).fillColor('#111827').font('Helvetica-Bold').text(ticket.flightId.flightNumber, 70, 225);

            doc.fontSize(10).fillColor('#6b7280').font('Helvetica').text('DATE', 200, 210);
            doc.fontSize(14).fillColor('#111827').font('Helvetica-Bold').text(new Date(ticket.flightId.departureDate).toLocaleDateString(), 200, 225);

            // Routing
            doc.fontSize(20).fillColor('#2563eb').text(`${ticket.flightId.departureAirport} ✈ ${ticket.flightId.destinationAirport}`, 70, 270);

            // Seat & Class
            doc.fontSize(10).fillColor('#6b7280').font('Helvetica').text('SEAT', 70, 310);
            doc.fontSize(14).fillColor('#111827').font('Helvetica-Bold').text(ticket.seatNumber, 70, 325);
            
            // Generate QR Code pointing to web view
            const qrText = `http://${LOCAL_IP}:5000/api/tickets/view/${ticket.ticketNumber}`;
            const qrBuffer = await QRCode.toBuffer(qrText);
            
            // Position QR code neatly on the right side of the box
            doc.image(qrBuffer, doc.page.width - 200, 160, { width: 120, height: 120 });
            
            // Simple footer instruction
            doc.fontSize(9).fillColor('#9ca3af').font('Helvetica').text('Scan QR code for complete booking and passenger verification details.', 50, 380, { align: 'center' });

            doc.end();

            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    // Update ticket with PDF URL
                    ticket.pdfUrl = `/uploads/${fileName}`;
                    ticket.save();
                    resolve(filePath);
                });
                stream.on('error', reject);
            });
        } catch (error) {
            throw new Error(`PDF generation failed: ${error.message}`);
        }
    }

    /**
     * Check-in passenger
     */
    async checkInPassenger(ticketId) {
        try {
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) throw new Error('Ticket not found');
            if (ticket.status !== 'issued') throw new Error('Ticket already checked in or used');

            ticket.status = 'checked_in';
            ticket.checkInTime = new Date();
            await ticket.save();

            return ticket;
        } catch (error) {
            throw new Error(`Check-in failed: ${error.message}`);
        }
    }

    /**
     * Board passenger
     */
    async boardPassenger(ticketId) {
        try {
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) throw new Error('Ticket not found');
            if (ticket.status !== 'checked_in') throw new Error('Passenger must be checked in first');

            ticket.status = 'boarded';
            ticket.boardingTime = new Date();
            await ticket.save();

            return ticket;
        } catch (error) {
            throw new Error(`Boarding failed: ${error.message}`);
        }
    }

    /**
     * Get tickets by booking
     */
    async getTicketsByBooking(bookingId) {
        try {
            const tickets = await Ticket.find({ bookingId }).sort({ createdAt: 1 });
            return tickets;
        } catch (error) {
            throw new Error(`Failed to fetch tickets: ${error.message}`);
        }
    }

    /**
     * Verify ticket authenticity
     */
    async verifyTicket(ticketNumber, pnr) {
        try {
            const ticket = await Ticket.findOne({ ticketNumber, pnr });
            if (!ticket) return { valid: false, message: 'Ticket not found' };

            return {
                valid: true,
                ticket: {
                    passengerName: ticket.passengerName,
                    flightNumber: ticket.flightId,
                    seatNumber: ticket.seatNumber,
                    status: ticket.status,
                    boardingTime: ticket.boardingTime
                }
            };
        } catch (error) {
            throw new Error(`Verification failed: ${error.message}`);
        }
    }
}

module.exports = new TicketService();