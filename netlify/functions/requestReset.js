const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB client
const client = new MongoClient(process.env.MONGO_DB_URI);

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Main handler
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, phone } = JSON.parse(event.body);
    const identifier = (email || phone || '').trim();

    if (!identifier) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Email or phone is required',
        }),
      };
    }

    await client.connect();
    const db = client.db('calorieai');

    let user;
    let method;
    if (/^\d{10,15}$/.test(identifier)) {
      // If digits only → phone
      user = await db.collection('users').findOne({ phone: identifier });
      method = 'phone';
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      // If email format
      user = await db.collection('users').findOne({ email: identifier.toLowerCase() });
      method = 'email';
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid email or phone format' }),
      };
    }

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, message: 'User not found' }),
      };
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Save token
    await db.collection('reset_tokens').insertOne({
      email: user.email || '',
      phone: user.phone || '',
      token,
      createdAt: new Date(),
    });

    if (method === 'email') {
      // ✅ Send email
      await transporter.sendMail({
        from: `"Calorie AI" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '🔐 Password Reset Code',
        html: `<p>Your password reset code is: <strong>${token}</strong></p>`,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Reset code sent to email.',
          token,
          email: user.email,
        }),
      };
    } else {
      // ✅ TODO: Send SMS via your provider
      // Example placeholder:
      // await sendSms(user.phone, `Your reset code is: ${token}`);

      console.log(`📱 [DEV] Simulated SMS to ${user.phone}: ${token}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Reset code sent via SMS.',
          token,
          phone: user.phone,
        }),
      };
    }
  } catch (err) {
    console.error('Reset error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Server error',
        error: err.message,
      }),
    };
  }
};
