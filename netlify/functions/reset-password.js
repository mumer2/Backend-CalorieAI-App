const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  const { email, phone, otp, newPassword } = JSON.parse(event.body);

  if ((!email && !phone) || !otp || !newPassword) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'OTP and new password are required along with email or phone',
      }),
    };
  }

  const client = new MongoClient(process.env.MONGO_DB_URI);

  try {
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    // 🔍 Build the query conditionally
    const query = email ? { email: email.toLowerCase() } : { phone: phone.trim() };

    const user = await users.findOne(query);

    if (!user) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    // ✅ Compare OTPs as strings
    if (!user.otp || String(user.otp) !== String(otp)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid OTP' }),
      };
    }

    // ❌ Removed expiration check:
    // if (user.otpExpiresAt && new Date(user.otpExpiresAt) < new Date()) {
    //   return {
    //     statusCode: 400,
    //     body: JSON.stringify({ message: 'OTP expired' }),
    //   };
    // }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await users.updateOne(query, {
      $set: { passwordHash },
      $unset: { otp: "", otpExpiresAt: "" },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Password reset successful' }),
    };
  } catch (err) {
    console.error('Reset password error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server error', error: err.message }),
    };
  } finally {
    await client.close();
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
