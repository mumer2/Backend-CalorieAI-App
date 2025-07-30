const Core = require('@alicloud/pop-core');
const { MongoClient } = require('mongodb');

const client = new Core({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  endpoint: 'https://dysmsapi.ap-southeast-1.aliyuncs.com',
  apiVersion: '2018-05-01',
});

const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { phone } = JSON.parse(event.body);
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await client.request('SendSms', {
      RegionId: 'ap-southeast-1',
      PhoneNumbers: phone,
      SignName: process.env.ALIYUN_SMS_SIGN_NAME,
      TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
      TemplateParam: JSON.stringify({ code }),
    }, { method: 'POST' });

    const mongo = new MongoClient(uri);
    await mongo.connect();
    await mongo.db('calorieai').collection('otp_verifications')
      .updateOne({ phone }, { $set: { code, createdAt: new Date() } }, { upsert: true });
    await mongo.close();

    return { statusCode: 200, body: JSON.stringify({ message: 'OTP sent' }) };
  } catch (err) {
    console.error('Aliyun SMS error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to send OTP' }) };
  }
};
