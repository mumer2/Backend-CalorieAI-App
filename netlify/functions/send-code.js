const axios = require('axios');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

// Hardcoded credentials (better to move to env vars)
const ACCOUNT_ID = 'dlbjzy22';
const PASSWORD = 'Czhangyue123';
const PRODUCT_ID = '1012818';
const MONGO_URI = process.env.MONGO_DB_URI;
const ENCRYPT_KEY = 'SMmsEncryptKey';

// Helpers
const md5 = (input) => crypto.createHash('md5').update(input).digest('hex').toUpperCase();
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex').toLowerCase();

// Format phone to international format
const formatPhoneNumber = (phone) => {
  let formatted = phone.trim().replace(/\s+/g, '');
  // If number starts with 0, remove it
  if (formatted.startsWith('0')) {
    formatted = formatted.slice(1);
  }
  // If doesn't start with +, add default country code (change this as needed)
  if (!formatted.startsWith('+')) {
    // You can set default country code here — like +92 for Pakistan
    formatted = `+92${formatted}`;
  }
  return formatted;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let mongo;

  try {
    const { phone } = JSON.parse(event.body);
    console.log('📱 Raw phone received:', phone);

    if (!phone) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Phone is required' }) };
    }

    const formattedPhone = formatPhoneNumber(phone);
    console.log('📞 Formatted phone:', formattedPhone);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 9000000000) + 100000000;

    const passwordHash = md5(PASSWORD + ENCRYPT_KEY);
    const accessKeyString = `AccountId=${ACCOUNT_ID}&PhoneNos=${formattedPhone}&Password=${passwordHash}&Random=${random}&Timestamp=${timestamp}`;
    const accessKey = sha256(accessKeyString);

    const requestBody = {
      AccountId: ACCOUNT_ID,
      AccessKey: accessKey,
      Timestamp: timestamp,
      Random: random,
      ExtendNo: '',
      ProductId: PRODUCT_ID,
      PhoneNos: formattedPhone,
      Content: `【CalorieAI】Your verification code is ${code}`,
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

    // ✅ Save to MongoDB
    mongo = new MongoClient(MONGO_URI);
    await mongo.connect();

    await mongo
      .db('calorieai')
      .collection('otp_verifications')
      .updateOne(
        { phone: formattedPhone },
        { $set: { code, createdAt: new Date() } },
        { upsert: true }
      );

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
