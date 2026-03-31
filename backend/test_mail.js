require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER || 'samyoj20266@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

transporter.verify().then(() => {
    console.log('SMTP transporter verified successfully!');
    process.exit(0);
}).catch(err => {
    console.error('SMTP test failed:', err.message);
    process.exit(1);
});
