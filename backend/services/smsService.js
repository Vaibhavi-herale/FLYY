const twilio = require('twilio');

const formatFlightDeparture = (flight) => {
    const date = new Date(flight.departureDate).toLocaleDateString();
    return flight.departureTime ? `${date}, ${flight.departureTime}` : new Date(flight.departureDate).toLocaleString();
};

class SmsService {
    constructor() {
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        }
    }

    async sendBookingConfirmation(phone, ticketData) {
        if (!this.client || !phone || !process.env.TWILIO_FROM_NUMBER) return;

        try {
            const message = `FlightAgent AI: Your booking is confirmed!\\nPNR: ${ticketData.pnr}\\nFlight: ${ticketData.flight.flightNumber}\\nDeparture: ${formatFlightDeparture(ticketData.flight)}\\nCheck your email for the PDF tickets.`;
            
            // To send via WhatsApp, prefix the numbers with 'whatsapp:'
            const isWhatsApp = process.env.TWILIO_USE_WHATSAPP === 'true';
            const to = isWhatsApp ? `whatsapp:${phone}` : phone;
            const from = isWhatsApp ? `whatsapp:${process.env.TWILIO_FROM_NUMBER}` : process.env.TWILIO_FROM_NUMBER;

            await this.client.messages.create({
                body: message,
                from: from,
                to: to
            });
            console.log(`✅ SMS/WhatsApp sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send SMS/WhatsApp:', error.message);
        }
    }
}

module.exports = new SmsService();
