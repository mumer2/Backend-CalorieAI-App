const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

let cachedDb = null;
const connectToDatabase = async (uri) => {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  cachedDb = client.db('calorieai');
  return cachedDb;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { orderId, userId } = body;

  if (!orderId || !userId) {
    return { statusCode: 400, body: 'Missing orderId or userId' };
  }

  try {
    // Step 1: Get Access Token
    const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authRes.json();
    if (!authRes.ok || !authData.access_token) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to authenticate with PayPal' }),
      };
    }

    const accessToken = authData.access_token;

    // Step 2: Capture the order
    const captureRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureRes.json();

    const status = captureData.status;
    if (status !== 'COMPLETED') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payment not completed', status }),
      };
    }

    // Step 3: Update user subscription
    const db = await connectToDatabase(process.env.MONGO_DB_URI);
    await db.collection('users').updateOne(
      { userId },
      { $set: { isSubscribed: true } },
      { upsert: true }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, status: 'COMPLETED' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
