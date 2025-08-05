const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGO_DB_URI);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { email, phone, token, newPassword } = JSON.parse(event.body);

    if ((!email && !phone) || !token || !newPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Email or phone, token, and newPassword are required' }),
      };
    }

    await client.connect();
    const db = client.db('calorieai');

    const identifierField = email ? 'email' : 'phone';
    const identifierValue = email ? email.trim().toLowerCase() : phone.trim();
    const identifier = { [identifierField]: identifierValue };

    // ✅ 1. Check if the token is valid and not expired (10 minutes window)
    const validToken = await db.collection('reset_tokens').findOne({
      ...identifier,
      token,
      createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) }, // token expires after 10 minutes
    });

    if (!validToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid or expired token' }),
      };
    }

    // ✅ 2. Hash and update the password
    const hashed = await bcrypt.hash(newPassword, 10);
   await db.collection('users').updateOne(
  identifier,
  { $set: { passwordHash: hashed } }
);


    // ✅ 3. Remove used tokens
    await db.collection('reset_tokens').deleteMany(identifier);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Password updated successfully' }),
    };
  } catch (err) {
    console.error('❌ Reset error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Server error', error: err.message }),
    };
  }
};
