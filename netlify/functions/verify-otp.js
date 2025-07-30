const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { phone, otp } = JSON.parse(event.body);
  if (!phone || !otp) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Phone and OTP required' }) };
  }

  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db('calorieai');
    const record = await db.collection('otp_verifications').findOne({ phone });

    if (!record || record.otp !== otp) {
      await mongo.close();
      return { statusCode: 401, body: JSON.stringify({ message: 'Invalid OTP' }) };
    }

    const age = (Date.now() - new Date(record.createdAt).getTime()) / 1000;
    if (age > 300) {
      await mongo.close();
      return { statusCode: 410, body: JSON.stringify({ message: 'OTP expired' }) };
    }

    await db.collection('otp_verifications').deleteOne({ phone });
    await mongo.close();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OTP verified' }),
    };
  } catch (err) {
    console.error('Verify OTP error:', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Verification failed' }) };
  }
};
