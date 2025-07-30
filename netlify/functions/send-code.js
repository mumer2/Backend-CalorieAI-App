const axios = require('axios');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const ACCOUNT_ID = 'dlbjzy22';
const PASSWORD = process.env.LMOBILE_PASSWORD;
const PRODUCT_ID = '1012818';
const MONGO_URI = process.env.MONGO_DB_URI;
const ENCRYPT_KEY = 'SMmsEncryptKey';

const md5 = (input) => crypto.createHash('md5').update(input).digest('hex').toUpperCase();
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex').toLowerCase();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let mongo;

  try {
    const { phone } = JSON.parse(event.body);
    console.log('📱 Phone received:', phone);

    if (!phone) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Phone is required' }) };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 9000000000) + 100000000;

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

    const smsRes = await axios.post(
      'https://api.51welink.com/EncryptionSubmit/SendSms.ashx',
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('📩 SMS Response:', smsRes.data);

    if (smsRes.data.Result !== 'succ') {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: smsRes.data.Reason }),
      };
    }

    // ✅ Mongo Insert
    console.log('📦 Storing OTP in MongoDB...');
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

    console.log('✅ OTP stored');

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'OTP sent successfully' }),
    };
  } catch (error) {
    console.error('❌ Send OTP Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal server error', error: error.message }),
    };
  } finally {
    if (mongo) await mongo.close();
  }
};
