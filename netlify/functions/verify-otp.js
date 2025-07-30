const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { phone, code } = JSON.parse(event.body);
  const mongo = new MongoClient(uri);
  await mongo.connect();
  const record = await mongo.db('calorieai').collection('otp_verifications').findOne({ phone });

  if (!record || record.code !== code) {
    await mongo.close();
    return { statusCode: 401, body: JSON.stringify({ message: 'Invalid code' }) };
  }

  const age = (Date.now() - record.createdAt.getTime()) / 1000;
  if (age > 300) { await mongo.close(); return { statusCode: 410, body: JSON.stringify({ message: 'OTP expired' }) }; }

  await mongo.db('calorieai').collection('otp_verifications').deleteOne({ phone });
  await mongo.close();
  return { statusCode: 200, body: JSON.stringify({ message: 'OTP verified' }) };
};
