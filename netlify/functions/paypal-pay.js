// /netlify/functions/capture-paypal-order.js

const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const MONGO_URI = process.env.MONGO_DB_URI;

let cachedDb = null;
const connectToDatabase = async () => {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  cachedDb = client.db('calorieai');
  return cachedDb;
};

exports.handler = async (event) => {
  const { token } = event.queryStringParameters;

  if (!token) {
    return { statusCode: 400, body: 'Missing PayPal token (order ID)' };
  }

  try {
    // Step 1: Get PayPal access token
    const auth = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await auth.json();
    const accessToken = authData.access_token;

    // Step 2: Capture payment
    const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureRes.json();

    const userId =
      captureData?.purchase_units?.[0]?.custom_id || null;

    if (!userId) {
      return { statusCode: 400, body: 'Missing custom_id (userId)' };
    }

    // Step 3: Update DB
    const db = await connectToDatabase();
    await db.collection('users').updateOne(
      { userId },
      { $set: { isSubscribed: true } },
      { upsert: true }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'User successfully subscribed after PayPal payment.',
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: `Server Error: ${err.message}`,
    };
  }
};
