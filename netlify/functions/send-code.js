const axios = require('axios');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

// Load environment variables
const ACCOUNT_ID = process.env.LMOBILE_ACCOUNT_ID;
const PASSWORD = process.env.LMOBILE_PASSWORD;
const PRODUCT_ID = parseInt(process.env.LMOBILE_PRODUCT_ID, 10);
const MONGO_URI = process.env.MONGO_DB_URI;
const ENCRYPT_KEY = 'SMmsEncryptKey'; // fixed string

// Helper functions
const md5 = (input) =>
  crypto.createHash('md5').update(input).digest('hex').toUpperCase();

const sha256 = (input) =>
  crypto.createHash('sha256').update(input).digest('hex').toLowerCase();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let mongo;

  try {
    const { phone } = JSON.parse(event.body);

    if (!phone || typeof phone !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Phone is required' }),
      };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 8999999999) + 1000000000;

    // Hash password and access key
    const passwordHash = md5(PASSWORD + ENCRYPT_KEY);
    const accessKeyString = `AccountId=${ACCOUNT_ID}&PhoneNos=${phone}&Password=${passwordHash}&Random=${random}&Timestamp=${timestamp}`;
    const accessKey = sha256(accessKeyString);

    const requestBody = {
      AccountId: ACCOUNT_ID,
      AccessKey: accessKey,
      Timestamp: timestamp,
      Random: random,
      ExtendNo: '',
      ProductId: PRODUCT_ID,
      PhoneNos: phone,
      Content: `Your verification code is ${code} [WeChat Communication]`,
      SendTime: '',
      OutId: '',
    };

    console.log('📤 Sending payload:', requestBody);

    // 1. Send the SMS
    const smsRes = await axios.post(
      'https://api.51welink.com/EncryptionSubmit/SendSms.ashx',
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('📩 SMS Response:', smsRes.data);

    if (smsRes.data.Result !== 'succ') {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: smsRes.data.Reason || 'SMS send failed',
        }),
      };
    }

    // 2. Store OTP in MongoDB
    mongo = new MongoClient(MONGO_URI);
    await mongo.connect();
    await mongo
      .db('calorieai')
      .collection('otp_verifications')
      .updateOne(
        { phone },
        { $set: { code, createdAt: new Date() } },
        { upsert: true }
      );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'OTP sent successfully' }),
    };
  } catch (err) {
    console.error('❌ Error sending OTP:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Internal Server Error',
        error: err.message,
      }),
    };
  } finally {
    if (mongo) await mongo.close();
  }
};
