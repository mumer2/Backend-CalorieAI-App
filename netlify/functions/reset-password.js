// netlify/functions/setNewPassword.js
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGO_URI);

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
    const db = client.db('tarot-station');

    const identifierField = email ? 'email' : 'phone';
    const identifierValue = email ? email.trim().toLowerCase() : phone.trim();
    const identifier = { [identifierField]: identifierValue };

    // 1. Check if the token exists for this user
    const validToken = await db.collection('reset_tokens').findOne({
      ...identifier,
      token,
    });

    if (!validToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid or expired token' }),
      };
    }

    // 2. Hash and update password
    const hashed = await bcrypt.hash(newPassword, 10);

    await db.collection('users').updateOne(
      identifier,
      { $set: { password: hashed } }
    );

    // 3. Remove all tokens related to this identifier
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


// const bcrypt = require('bcryptjs');
// const { MongoClient } = require('mongodb');

// exports.handler = async (event) => {
//   if (event.httpMethod !== 'POST') {
//     return { statusCode: 405, body: 'Method Not Allowed' };
//   }

//   const { email, otp, newPassword } = JSON.parse(event.body);
//   if (!email || !otp || !newPassword) {
//     return { statusCode: 400, body: JSON.stringify({ message: 'Email, OTP, and new password are required' }) };
//   }

//   const client = new MongoClient(process.env.MONGO_DB_URI);

//   try {
//     await client.connect();
//     const db = client.db('calorieai');
//     const users = db.collection('users');

//     const user = await users.findOne({ email: email.toLowerCase() });
//     if (!user || user.otp !== otp || new Date(user.otpExpiresAt) < new Date()) {
//       return { statusCode: 400, body: JSON.stringify({ message: 'Invalid or expired OTP' }) };
//     }

//     const passwordHash = await bcrypt.hash(newPassword, 10);

//     await users.updateOne(
//       { email: email.toLowerCase() },
//       { $set: { passwordHash }, $unset: { otp: '', otpExpiresAt: '' } }
//     );

//     return { statusCode: 200, body: JSON.stringify({ message: 'Password reset successful' }) };
//   } catch (err) {
//     console.error('Reset password error:', err);
//     return { statusCode: 500, body: JSON.stringify({ message: 'Server error' }) };
//   } finally {
//     await client.close();
//   }
// };
