require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

async function run() {
    try {
        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: `"Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'Test Email',
            text: 'Hello world'
        });
        console.log("Success:", info.response);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
