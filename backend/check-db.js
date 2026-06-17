const dns = require('dns').promises;
dns.setServers(['1.1.1.1', '8.8.8.8']); // Google + Cloudflare DNS

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const Ticket = require('./models/Ticket');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const latestBooking = await Booking.findOne().sort({ createdAt: -1 });
        console.log('Latest Booking PNR:', latestBooking.pnr);
        console.log('Status:', latestBooking.bookingStatus);
        console.log('CreatedAt:', latestBooking.createdAt);

        const tickets = await Ticket.find({ bookingId: latestBooking._id });
        console.log('Tickets count:', tickets.length);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
