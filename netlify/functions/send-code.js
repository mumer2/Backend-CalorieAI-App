const axios = require('axios');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

// ✅ Use environment variables instead of hardcoding sensitive data
const ACCOUNT_ID = process.env.LMOBILE_ACCOUNT_ID;
const PASSWORD = process.env.LMOBILE_PASSWORD;
const PRODUCT_ID = process.env.LMOBILE_PRODUCT_ID;
const MONGO_URI = process.env.MONGO_DB_URI;
const ENCRYPT_KEY = 'SMmsEncryptKey';

// 🔒 Utility functions
const md5 = (input) => crypto.createHash('md5').update(input).digest('hex').toUpperCase();
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex').toLowerCase();

// ✅ Format phone numbers with support for country code dropdown
const formatPhoneNumber = (phone, countryCode = '92') => {
  let formatted = phone.trim().replace(/\D/g, '');

  // If phone starts with "0", remove it and add default country code
  if (formatted.startsWith('0')) {
    formatted = formatted.substring(1);
  }

  // Prepend country code if not already there
  if (!formatted.startsWith(countryCode)) {
    formatted = `${countryCode}${formatted}`;
  }

  return formatted;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let mongo;

  try {
    const { phone, countryCode } = JSON.parse(event.body);
    console.log('📱 Raw phone:', phone, '🌍 Country code:', countryCode);

    if (!phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Phone number is required.' }),
      };
    }

    // Format and generate OTP
    const formattedPhone = formatPhoneNumber(phone, countryCode || '92');
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
        body: JSON.stringify({ success: false, message: smsRes.data.Reason || 'SMS sending failed.' }),
      };
    }

    // ✅ Store OTP
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
      body: JSON.stringify({ success: true, message: 'OTP sent successfully.' }),
    };
  } catch (error) {
    console.error('❌ Error sending OTP:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal server error.', error: error.message }),
    };
  } finally {
    if (mongo) await mongo.close();
  }
};
