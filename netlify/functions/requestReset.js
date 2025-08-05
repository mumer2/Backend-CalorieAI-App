const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB client
const client = new MongoClient(process.env.MONGO_DB_URI);

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' }),
    };
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

    let user, method;

    if (/^\d{10,15}$/.test(identifier)) {
      user = await db.collection('users').findOne({ phone: identifier });
      method = 'phone';
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
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

    // Create token document without empty fields
    const tokenDoc = {
      token,
      createdAt: new Date(),
    };

    if (user.email) tokenDoc.email = user.email.toLowerCase();
    if (user.phone) tokenDoc.phone = user.phone;

    await db.collection('reset_tokens').insertOne(tokenDoc);

    if (method === 'email') {
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
      // Simulate SMS for now
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
    console.error('❌ Reset error:', err.message);
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
