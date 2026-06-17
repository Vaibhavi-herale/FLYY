const dns = require('dns').promises;
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const mongoose = require('mongoose');
const Flight = require('./models/Flight');
const Booking = require('./models/Booking');
const ticketService = require('./services/ticketService');
const emailNotifications = require('./services/emailNotifications');
const fs = require('fs');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the most recent confirmed booking
        const booking = await Booking.findOne({ bookingStatus: 'Confirmed' }).populate('flight').sort({ createdAt: -1 });
        if (!booking) {
            console.log('No confirmed booking found.');
            process.exit(0);
        }

        console.log('Testing email flow with booking:', booking.pnr);

        let tickets = [];
        try {
            console.log('Generating tickets...');
            tickets = await ticketService.generateTicketsForBooking(booking._id);
            console.log(`Generated ${tickets.length} tickets`);
        } catch (e) {
            console.error('Ticket generation failed:', e);
            throw e;
        }

        const attachments = [];
        try {
            console.log('Generating PDFs...');
            for (let t of tickets) {
                const pdfPath = await ticketService.generatePDFTicket(t._id);
                attachments.push({ filename: `Ticket_${t.ticketNumber}.pdf`, path: pdfPath });
            }
            console.log('Generated PDFs:', attachments.map(a => a.path));
        } catch (e) {
            console.error('PDF generation failed:', e);
            throw e;
        }

        try {
            console.log('Sending email...');
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
            console.log('Email sent successfully via test script.');
        } catch (e) {
            console.error('Email sending failed:', e);
            throw e;
        }

        setTimeout(() => process.exit(0), 2000);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
})();
