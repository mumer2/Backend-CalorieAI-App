const axios = require('axios');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const ACCOUNT_ID = process.env.LMOBILE_ACCOUNT_ID;
const PASSWORD = process.env.LMOBILE_PASSWORD;
const PRODUCT_ID = process.env.LMOBILE_PRODUCT_ID; // must be number
const MONGO_URI = process.env.MONGO_DB_URI;
const ENCRYPT_KEY = 'SMmsEncryptKey';

const md5 = (input) => crypto.createHash('md5').update(input).digest('hex').toUpperCase();
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex').toLowerCase();

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let mongo;

  try {
    const { phone } = JSON.parse(event.body);

    if (!phone || !/^\d{6,15}$/.test(phone)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Valid phone number required' }),
      };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 8999999999 + 1000000000);

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

    console.log('Sending payload:', requestBody);

    const response = await axios.post(
      'https://api.51welink.com/EncryptionSubmit/SendSms.ashx',
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      }
    );

    if (response.data.Result !== 'succ') {
      console.error('LMobile Error:', response.data);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: response.data.Reason || 'Failed to send SMS' }),
      };
    }

    mongo = new MongoClient(MONGO_URI);
    await mongo.connect();

    await mongo.db('calorieai').collection('otp_verifications').updateOne(
      { phone },
      { $set: { code, createdAt: new Date() } },
      { upsert: true }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'OTP sent successfully' }),
    };
  } catch (err) {
    console.error('Server error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
    };
  } finally {
    if (mongo) await mongo.close();
  }
};
