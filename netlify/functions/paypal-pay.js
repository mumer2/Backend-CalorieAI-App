const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const MONGO_URI = process.env.MONGO_DB_URI;

let cachedDb = null;

async function connectToDatabase(uri) {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  cachedDb = client.db('calorieai'); // Change to your DB name
  return cachedDb;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  let { token, userId } = JSON.parse(event.body || '{}');

  if (!token || !userId) {
    return {
      statusCode: 400,
      body: 'Missing token or userId',
    };
  }

  try {
    // Step 1: Get PayPal access token (SANDBOX)
    const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authRes.json();

    if (!authRes.ok || !authData.access_token) {
      return {
        statusCode: 500,
        body: 'Failed to get PayPal access token',
      };
    }

    const accessToken = authData.access_token;

    // Step 2: Capture the payment
    const captureRes = await fetch(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${token}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = captureRes.headers.get('content-type');
    let captureData;

    if (contentType && contentType.includes('application/json')) {
      captureData = await captureRes.json();
    } else {
      const raw = await captureRes.text();
      throw new Error(`Unexpected PayPal response: ${raw}`);
    }

    if (captureRes.ok) {
      // ✅ Step 3: Mark user as subscribed
      const db = await connectToDatabase(MONGO_URI);
      await db.collection('users').updateOne(
        { userId },
        { $set: { isSubscribed: true } },
        { upsert: true }
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Payment captured and user subscribed',
          details: captureData,
        }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payment capture failed', captureData }),
      };
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    return {
      statusCode: 500,
      body: `Internal Server Error: ${err.message}`,
    };
  }
};
