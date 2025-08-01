const xml2js = require('xml2js');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Helper: Verify WeChat Pay signature
const verifySign = (data, key) => {
  const receivedSign = data.sign;
  delete data.sign;

  const stringA = Object.keys(data)
    .filter((k) => data[k] !== '' && data[k] !== undefined)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('&');

  const stringSignTemp = `${stringA}&key=${key}`;
  const generatedSign = crypto
    .createHash('md5')
    .update(stringSignTemp, 'utf8')
    .digest('hex')
    .toUpperCase();

  return receivedSign === generatedSign;
};

exports.handler = async (event) => {
  try {
    const xml = event.body;
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
    const data = parsed.xml;
    const key = process.env.WECHAT_API_KEY;

    if (
      data.return_code === 'SUCCESS' &&
      data.result_code === 'SUCCESS' &&
      verifySign({ ...data }, key)
    ) {
      const orderId = data.out_trade_no;
      const total_fee = parseInt(data.total_fee); // Amount in fen
      const openid = data.openid;

      console.log('✅ Valid WeChat payment received:', { orderId, total_fee, openid });

      // 🟢 STEP: Update the MongoDB user subscription
      const client = new MongoClient(process.env.MONGO_DB_URI);
      await client.connect();
      const db = client.db('calorieai');
      const users = db.collection('users');

      // You must map orderId ↔ userId for accurate updates.
      // For example, if userId is included inside orderId or saved in another DB/table,
      // retrieve userId from orderId here. This is just a placeholder.
      // ⚠️ Replace the logic below with your own lookup if needed.

      const isYearly = total_fee >= 39900;
      const subscriptionPlan = isYearly ? 'yearly' : 'monthly';

      const result = await users.updateOne(
        { openid }, // Replace if you store userId differently
        {
          $set: {
            subscribed: true,
            subscriptionDate: new Date(),
            subscriptionPlan,
          },
        }
      );

      await client.close();

      console.log('✅ DB updated. Matched:', result.matchedCount);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body:
          `<xml><return_code><![CDATA[SUCCESS]]></return_code>` +
          `<return_msg><![CDATA[OK]]></return_msg></xml>`,
      };
    }

    console.warn('❌ Invalid or tampered signature from WeChat');

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/xml' },
      body:
        `<xml><return_code><![CDATA[FAIL]]></return_code>` +
        `<return_msg><![CDATA[Invalid Signature]]></return_msg></xml>`,
    };
  } catch (err) {
    console.error('❌ WeChat Notify Error:', err);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/xml' },
      body:
        `<xml><return_code><![CDATA[FAIL]]></return_code>` +
        `<return_msg><![CDATA[Server Error]]></return_msg></xml>`,
    };
  }
};


// // ===============================
// // Netlify Function: wechat-notify.js
// // Purpose: Handles WeChat Pay's server-to-server payment confirmation (notify_url)
// // ===============================

// const xml2js = require('xml2js');
// const crypto = require('crypto');
// require('dotenv').config();

// // Helper: Generate signature and verify
// const verifySign = (data, key) => {
//   const receivedSign = data.sign;
//   delete data.sign;

//   const stringA = Object.keys(data)
//     .filter((k) => data[k] !== '' && data[k] !== undefined)
//     .sort()
//     .map((k) => `${k}=${data[k]}`)
//     .join('&');

//   const stringSignTemp = `${stringA}&key=${key}`;
//   const generatedSign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();

//   return receivedSign === generatedSign;
// };

// exports.handler = async (event) => {
//   try {
//     const xml = event.body;
//     const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
//     const data = parsed.xml;
//     const key = process.env.WECHAT_API_KEY;

//     if (
//       data.return_code === 'SUCCESS' &&
//       data.result_code === 'SUCCESS' &&
//       verifySign({ ...data }, key)
//     ) {
//       // Example: Extract order details
//       const orderId = data.out_trade_no;
//       const openid = data.openid;
//       const amount = data.total_fee;

//       // ✅ Update your database here to mark the subscription as active
//       console.log('✅ Payment confirmed for order:', orderId);

//       return {
//         statusCode: 200,
//         headers: { 'Content-Type': 'text/xml' },
//         body: `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`
//       };
//     }

//     console.warn('❌ Invalid or tampered signature from WeChat');
//     return {
//       statusCode: 400,
//       headers: { 'Content-Type': 'text/xml' },
//       body: `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[Invalid Signature]]></return_msg></xml>`
//     };
//   } catch (err) {
//     console.error('❌ Error in WeChat Notify:', err);
//     return {
//       statusCode: 500,
//       headers: { 'Content-Type': 'text/xml' },
//       body: `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[Server Error]]></return_msg></xml>`
//     };
//   }
// };