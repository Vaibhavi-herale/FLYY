const nodemailer = require('nodemailer');
const ics = require('ics');

const formatFlightDeparture = (flight) => {
    const date = new Date(flight.departureDate).toLocaleDateString();
    return flight.departureTime ? `${date}, ${flight.departureTime}` : new Date(flight.departureDate).toLocaleString();
};

class EmailNotifications {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });
    }

    /**
     * Send ticket email
     */
    async sendTicketEmail(email, ticketData, attachments = []) {
        try {
            let passengerListHtml = '';
            if (ticketData.passengers && Array.isArray(ticketData.passengers)) {
                passengerListHtml = ticketData.passengers.map((p, index) => {
                    const ticket = ticketData.tickets ? ticketData.tickets.find(t => t.passengerName === p.name) : null;
                    const qrHtml = ticket && ticket.qrCode ? `<br/><img src="${ticket.qrCode}" width="150" height="150" alt="QR Code" />` : '';
                    return `
                        <li style="margin-bottom: 15px;">
                            <strong>Passenger ${index + 1}:</strong> ${p.name} <br/>
                            <strong>Seat:</strong> ${ticket ? ticket.seatNumber : 'TBD'} <br/>
                            <strong>Ticket Number:</strong> ${ticket ? ticket.ticketNumber : 'N/A'}
                            ${qrHtml}
                        </li>
                    `;
                }).join('');
            }

            const startDate = new Date(ticketData.flight.departureDate);
            const { error: icsError, value: icsValue } = ics.createEvent({
                title: `Flight ${ticketData.flight.flightNumber}`,
                description: `Flight from ${ticketData.flight.departureAirport} to ${ticketData.flight.destinationAirport}\\nPNR: ${ticketData.pnr}`,
                start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes()],
                duration: { hours: 2, minutes: 0 },
                location: ticketData.flight.departureAirport,
                status: 'CONFIRMED'
            });

            if (!icsError && icsValue) {
                attachments.push({
                    filename: 'flight.ics',
                    content: icsValue
                });
            }

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Your Flight Ticket - ${ticketData.pnr}`,
                html: `
                    <h2>Your Flight Ticket</h2>
                    <p>Dear ${ticketData.passengers[0].name},</p>
                    <p>Your booking has been confirmed! Here are your ticket details:</p>
                    <ul>
                        <li><strong>PNR:</strong> ${ticketData.pnr}</li>
                        <li><strong>Flight:</strong> ${ticketData.flight.flightNumber}</li>
                        <li><strong>Departure:</strong> ${formatFlightDeparture(ticketData.flight)}</li>
                        <li><strong>From:</strong> ${ticketData.flight.departureAirport}</li>
                        <li><strong>To:</strong> ${ticketData.flight.destinationAirport}</li>
                        <li><strong>Cabin Class:</strong> ${ticketData.cabinClass}</li>
                        <li><strong>Total Amount:</strong> $${ticketData.totalAmount}</li>
                    </ul>
                    ${passengerListHtml ? `
                        <h3>Passenger Tickets</h3>
                        <ul>${passengerListHtml}</ul>
                    ` : ''}
                    <p>Please arrive 3 hours before departure.</p>
                    <p>Best regards,<br/>Flight Agent Team</p>
                `,
                attachments: attachments
            };
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Ticket email sent to', email);
        } catch (error) {
            console.error('❌ Failed to send ticket email:', error.message);
        }
    }

    /**
     * Send refund request acknowledgement
     */
    async sendRefundRequestAcknowledgement(email, refundData) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Refund Request Received - ${refundData._id}`,
                html: `
                    <h2>Refund Request Received</h2>
                    <p>Your refund request has been received and is under review.</p>
                    <ul>
                        <li><strong>Refund ID:</strong> ${refundData._id}</li>
                        <li><strong>Original Amount:</strong> $${refundData.originalAmount}</li>
                        <li><strong>Estimated Refund:</strong> $${refundData.refundAmount}</li>
                        <li><strong>Refund Percentage:</strong> ${refundData.refundPercentage}%</li>
                        <li><strong>Status:</strong> ${refundData.status}</li>
                        <li><strong>Reason:</strong> ${refundData.reason}</li>
                    </ul>
                    <p>We will notify you once your refund has been approved and processed.</p>
                    <p>Best regards,<br/>Flight Agent Team</p>
                `
            };
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Refund acknowledgement email sent to', email);
        } catch (error) {
            console.error('❌ Failed to send refund acknowledgement email:', error.message);
        }
    }

    /**
     * Send refund approved email
     */
    async sendRefundApprovedEmail(email, refundData) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Your Refund Has Been Approved - ${refundData._id}`,
                html: `
                    <h2>Refund Approved</h2>
                    <p>Great news! Your refund has been approved.</p>
                    <ul>
                        <li><strong>Refund ID:</strong> ${refundData._id}</li>
                        <li><strong>Refund Amount:</strong> $${refundData.refundAmount}</li>
                        <li><strong>Approved Date:</strong> ${new Date(refundData.approvedAt).toLocaleString()}</li>
                        <li><strong>Refund Method:</strong> ${refundData.refundMethod}</li>
                    </ul>
                    <p>The refund will be processed within 5-7 business days.</p>
                    <p>Best regards,<br/>Flight Agent Team</p>
                `
            };
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Refund approved email sent to', email);
        } catch (error) {
            console.error('❌ Failed to send refund approved email:', error.message);
        }
    }

    /**
     * Send refund rejected email
     */
    async sendRefundRejectedEmail(email, refundData, reason) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Refund Request Update - ${refundData._id}`,
                html: `
                    <h2>Refund Request Status Update</h2>
                    <p>Unfortunately, your refund request has been rejected.</p>
                    <ul>
                        <li><strong>Refund ID:</strong> ${refundData._id}</li>
                        <li><strong>Reason for Rejection:</strong> ${reason}</li>
                    </ul>
                    <p>If you believe this is a mistake, please contact our support team.</p>
                    <p>Best regards,<br/>Flight Agent Team</p>
                `
            };
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Refund rejected email sent to', email);
        } catch (error) {
            console.error('❌ Failed to send refund rejected email:', error.message);
        }
    }

    /**
     * Send refund processed email
     */
    async sendRefundProcessedEmail(email, refundData) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Your Refund Has Been Processed - ${refundData.transactionId}`,
                html: `
                    <h2>Refund Processed Successfully</h2>
                    <p>Your refund has been successfully processed and sent to your original payment method.</p>
                    <ul>
                        <li><strong>Refund ID:</strong> ${refundData._id}</li>
                        <li><strong>Refund Amount:</strong> $${refundData.refundAmount}</li>
                        <li><strong>Transaction ID:</strong> ${refundData.transactionId}</li>
                        <li><strong>Processed Date:</strong> ${new Date(refundData.processedAt).toLocaleString()}</li>
                    </ul>
                    <p>Please allow 5-7 business days for the funds to appear in your account.</p>
                    <p>Best regards,<br/>Flight Agent Team</p>
                `
            };
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Refund processed email sent to', email);
        } catch (error) {
            console.error('❌ Failed to send refund processed email:', error.message);
        }
    }

    /**
     * Send flight delay notification
     */
    async sendFlightDelayNotification(email, flightData) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Flight Delay Notification - ${flightData.flightNumber}`,
                html: `
                    <h2>Flight Delay Notification</h2>
                    <p>Your flight has been delayed.</p>
                    <ul>
                        <li><strong>Flight Number:</strong> ${flightData.flightNumber}</li>
                        <li><strong>PNR:</strong> ${flightData.pnr}</li>
                        <li><strong>Delay Duration:</strong> ${flightData.delayMinutes} minutes</li>
                        <li><strong>Reason:</strong> ${flightData.reason}</li>
                    </ul>
                    <p>Please check with the airline for the latest updates.</p>
                    <p>Best regards,<br/>Flight Agent Team</p>
                `
            };
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Flight delay notification sent to', email);
        } catch (error) {
            console.error('❌ Failed to send flight delay notification:', error.message);
        }
    }

    /**
     * Send flight cancellation notification
     */
    async sendFlightCancellationNotification(email, flightData) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Flight Cancellation - ${flightData.flightNumber}`,
                html: `
                    <h2>Flight Cancellation Notification</h2>
                    <p>Unfortunately, your flight has been cancelled.</p>
                    <ul>
                        <li><strong>Flight Number:</strong> ${flightData.flightNumber}</li>
                        <li><strong>PNR:</strong> ${flightData.pnr}</li>
                        <li><strong>Reason:</strong> ${flightData.reason}</li>
                        <li><strong>Booking Amount:</strong> $${flightData.totalAmount}</li>
                    </ul>
                    <p>A full refund of $${flightData.totalAmount} has been automatically initiated.</p>
                    <p>You will be notified once the refund is processed (5-7 business days).</p>
                    <p>Best regards,<br/>Flight Agent Team</p>
                `
            };
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Flight cancellation notification sent to', email);
        } catch (error) {
            console.error('❌ Failed to send flight cancellation notification:', error.message);
        }
    }

    /**
     * Send flight diversion notification
     */
    async sendFlightDiversionNotification(email, flightData) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Flight Diversion - ${flightData.flightNumber}`,
                html: `
                    <h2>Flight Diversion Alert</h2>
                    <p>Your flight has been diverted to an alternate airport.</p>
                    <ul>
                        <li><strong>Flight Number:</strong> ${flightData.flightNumber}</li>
                        <li><strong>PNR:</strong> ${flightData.pnr}</li>
                        <li><strong>Diverted to:</strong> ${flightData.airport}</li>
                        <li><strong>Reason:</strong> ${flightData.reason}</li>
                    </ul>
                    <p>Please stay tuned for further updates from the airline.</p>
                    <p>Best regards,<br/>Flight Agent Team</p>
                `
            };
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Flight diversion notification sent to', email);
        } catch (error) {
            console.error('❌ Failed to send flight diversion notification:', error.message);
        }
    }
}

module.exports = new EmailNotifications();
