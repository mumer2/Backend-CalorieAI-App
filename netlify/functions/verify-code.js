const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_DB_URI;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let mongo;

  try {
    const { phone, code } = JSON.parse(event.body);

    if (!phone || !code) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Phone and code are required' }) };
    }

    mongo = new MongoClient(MONGO_URI);
    await mongo.connect();

    const db = mongo.db('calorieai');
    const record = await db.collection('otp_verifications').findOne({ phone });

    if (!record || record.code !== code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid or expired code' }),
      };
    }

    // Delete the code after successful verification
    await db.collection('otp_verifications').deleteOne({ phone });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Code verified successfully' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Server error', error: err.message }),
    };
  } finally {
    if (mongo) await mongo.close();
  }
};
