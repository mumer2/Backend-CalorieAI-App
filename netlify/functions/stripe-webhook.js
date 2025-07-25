const { MongoClient } = require('mongodb');
let cachedDb = null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const connectToDatabase = async (uri) => {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  cachedDb = client.db('calorieai');
  return cachedDb;
};

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
    stripeEvent = stripe.webhooks.constructEvent(bodyBuffer, sig, stripeWebhookSecret);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.metadata?.userId;

    if (session.metadata?.type === 'subscription' && userId) {
      try {
        const db = await connectToDatabase(process.env.MONGO_DB_URI);
        await db.collection('users').updateOne(
          { userId },
          { $set: { isSubscribed: true } },
          { upsert: true }
        );
      } catch (err) {
        return { statusCode: 500, body: 'Database error' };
      }
    }
  }

  return { statusCode: 200, body: 'Received' };
};