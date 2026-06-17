const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

exports.sendBookingConfirmationEmail = async (toEmail, bookingData) => {
    try {
        console.log("📧 EMAIL FUNCTION CALLED");

        const { pnr, flight, passengers, totalAmount, cabinClass, tickets } = bookingData;

        // ✅ Prevent crash if flight is undefined
        const flightData = flight || {};

        let passengerListHtml = '';
        if (passengers && Array.isArray(passengers)) {
            passengerListHtml = passengers.map((p, index) => {
                const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`;
                const ticket = tickets ? tickets.find(t => t.passengerName === name) : null;
                const qrHtml = ticket ? `<br/><img src="${ticket.qrCode}" width="150" height="150" alt="QR Code" />` : '';
                return `
                    <li style="margin-bottom: 15px;">
                        <strong>Passenger ${index + 1}:</strong> ${name} <br/>
                        <strong>Seat:</strong> ${ticket ? ticket.seatNumber : 'TBD'} <br/>
                        <strong>Ticket Number:</strong> ${ticket ? ticket.ticketNumber : 'N/A'}
                        ${qrHtml}
                    </li>
                `;
            }).join('');
        }

        const mailOptions = {
            from: `"FlightAgent AI" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Flight Booking Confirmation - PNR: ${pnr || 'N/A'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                    <h2 style="color: #2563eb;">Booking Confirmed ✈️</h2>

                    <p>Your flight booking has been successfully confirmed.</p>

                    <h3>Flight Details</h3>
                    <p><strong>PNR:</strong> ${pnr || 'N/A'}</p>
                    <p><strong>Flight:</strong> ${flightData.airline || 'N/A'} ${flightData.flightNumber || ''}</p>
                    <p><strong>Route:</strong> 
                        ${flightData.departureCity || 'N/A'} → ${flightData.destinationCity || 'N/A'}
                    </p>
                    <p><strong>Cabin Class:</strong> ${cabinClass || 'Economy'}</p>

                    ${passengerListHtml ? `
                        <h3>Passenger Details</h3>
                        <ul>${passengerListHtml}</ul>
                    ` : ''}

                    <h3>Payment Details</h3>
                    <p><strong>Total Amount Paid:</strong> ₹${totalAmount || 0}</p>

                    <p>Thank you for choosing FlightAgent AI.</p>
                    <p>Have a safe and pleasant journey!</p>
                </div>
            `,
            attachments: bookingData.attachments || []
        };

        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Confirmation email sent:', info.response);

        return { success: true };

    } catch (error) {
        console.error('❌ Error sending email:', error);
        return { success: false, message: error.message };
    }
};