const cron = require('node-cron');
const axios = require('axios');
const Alert = require('../models/Alert');
const emailNotifications = require('./emailNotifications'); // we will reuse this to send the alert email
const nodemailer = require('nodemailer');

const getSerpApiKey = () => process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY;

class AlertService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });
    }

    startCronJob() {
        // Run daily at 00:00
        cron.schedule('0 0 * * *', async () => {
            console.log('🔄 Running Price Drop Alert Cron Job...');
            try {
                const activeAlerts = await Alert.find({ isActive: true });
                for (let alert of activeAlerts) {
                    if (new Date(alert.date) < new Date()) {
                        alert.isActive = false; // past date, disable
                        await alert.save();
                        continue;
                    }

                    const serpApiKey = getSerpApiKey();
                    if (!serpApiKey) continue;

                    const dateStr = new Date(alert.date).toISOString().split('T')[0];
                    const { data } = await axios.get('https://serpapi.com/search', {
                        params: {
                            engine: 'google_flights',
                            departure_id: alert.departureCity,
                            arrival_id: alert.destinationCity,
                            outbound_date: dateStr,
                            type: '2',
                            currency: 'USD', // using USD for simpler comparison, adjust if needed
                            api_key: serpApiKey
                        }
                    });

                    const apiResults = [...(data.best_flights || []), ...(data.other_flights || [])];
                    if (apiResults.length > 0) {
                        // Find lowest price
                        let lowestPrice = Number.MAX_VALUE;
                        let bestFlight = null;
                        
                        apiResults.forEach(f => {
                            if (f.price && f.price < lowestPrice) {
                                lowestPrice = f.price;
                                bestFlight = f;
                            }
                        });

                        if (lowestPrice <= alert.targetPrice) {
                            await this.sendAlertEmail(alert, lowestPrice, bestFlight);
                            alert.isActive = false; // Disable after sending alert
                            await alert.save();
                        }
                    }
                }
            } catch (e) {
                console.error('❌ Cron Job Error:', e.message);
            }
        });
    }

    async sendAlertEmail(alert, price, flightData) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: alert.email,
                subject: `🚨 Price Drop Alert: ${alert.departureCity} to ${alert.destinationCity}`,
                html: `
                    <h2>Good news! Flights are cheaper!</h2>
                    <p>The flight from ${alert.departureCity} to ${alert.destinationCity} on ${new Date(alert.date).toLocaleDateString()} has dropped to <strong>$${price}</strong>.</p>
                    <p>This is below your target price of $${alert.targetPrice}.</p>
                    <p>Go to FlightAgent AI to book your flight now!</p>
                `
            };
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Price drop alert sent to ${alert.email}`);
        } catch (error) {
            console.error('❌ Failed to send price drop email:', error.message);
        }
    }
}

module.exports = new AlertService();
