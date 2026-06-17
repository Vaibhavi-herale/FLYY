const dns = require('dns').promises;
dns.setServers(['1.1.1.1', '8.8.8.8']); // Google + Cloudflare DNS

require('dotenv').config();
const emailService = require('./services/emailService');

(async () => {
    try {
        console.log('Testing emailService.js configuration...');
        const bookingData = {
            pnr: 'TEST1234',
            passengers: [{ name: 'Test User' }],
            flight: {
                flightNumber: 'FL-999',
                departureDate: new Date(),
                departureAirport: 'JFK',
                destinationAirport: 'LHR'
            },
            cabinClass: 'Economy',
            totalAmount: 500,
            tickets: []
        };
        const result = await emailService.sendBookingConfirmationEmail(process.env.EMAIL_USER, bookingData);
        console.log('Result:', result);
    } catch (error) {
        console.error('Test script error:', error);
    }
})();
