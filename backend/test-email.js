require('dotenv').config();
const emailNotifications = require('./services/emailNotifications');

(async () => {
    try {
        console.log('Testing email configuration...');
        const ticketData = {
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
        await emailNotifications.sendTicketEmail(process.env.EMAIL_USER, ticketData, []);
        console.log('Test script completed.');
    } catch (error) {
        console.error('Test script error:', error);
    }
})();
