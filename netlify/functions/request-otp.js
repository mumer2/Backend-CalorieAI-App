const twilio = require('twilio');
const { MongoClient } = require('mongodb');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { phone } = JSON.parse(event.body);
  if (!phone || !/^\d{10,15}$/.test(phone)) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid phone number' }) };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await client.messages.create({
      body: `Your verification code is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+${phone}`,
    });

    const mongo = new MongoClient(uri);
    await mongo.connect();
    const db = mongo.db('calorieai');
    await db.collection('otp_verifications').updateOne(
      { phone },
      { $set: { otp, createdAt: new Date() } },
      { upsert: true }
    );
    await mongo.close();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OTP sent successfully' }),
    };
  } catch (err) {
    console.error('Send OTP error:', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to send OTP' }) };
  }
};
