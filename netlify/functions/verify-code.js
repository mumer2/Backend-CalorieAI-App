const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_DB_URI;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' }),
    };
  }

  let mongo;

  try {
    const { phone, code } = JSON.parse(event.body);

    if (!phone || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Phone and code are required' }),
      };
    }

    mongo = new MongoClient(MONGO_URI);
    await mongo.connect();

    const db = mongo.db('calorieai');
    const record = await db.collection('otp_verifications').findOne({ phone });

    if (!record) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'No verification record found for this phone' }),
      };
    }

    if (record.code !== code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid verification code' }),
      };
    }

    // Optionally: Check expiry (e.g., 5 minutes)
    const createdAt = new Date(record.createdAt);
    const now = new Date();
    const diffMinutes = (now - createdAt) / 1000 / 60;
    if (diffMinutes > 5) {
      await db.collection('otp_verifications').deleteOne({ phone });
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Code expired, please request a new one' }),
      };
    }

    // Success: Delete the code after verification
    await db.collection('otp_verifications').deleteOne({ phone });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Code verified successfully' }),
    };
  } catch (err) {
    console.error('Verification Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Server error', error: err.message }),
    };
  } finally {
    if (mongo) await mongo.close();
  }
};
