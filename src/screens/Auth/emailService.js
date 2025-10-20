const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendWelcomeEmail = async (userEmail, userName) => {
  const mailOptions = {
    from: `"EasyRide" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Welcome to EasyRide!',
    html: `<h3>Hi ${userName},</h3><p>Welcome to EasyRide! We're excited to have you on board. You can now log in to the app and start booking rides.</p><p>Happy travels!</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${userEmail}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

module.exports = { sendWelcomeEmail };