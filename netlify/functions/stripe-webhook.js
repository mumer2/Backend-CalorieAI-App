const { MongoClient } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

let cachedDb = null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const connectToDatabase = async (uri) => {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  cachedDb = client.db('calorieai'); // your DB name
  return cachedDb;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);

    stripeEvent = stripe.webhooks.constructEvent(bodyBuffer, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('⚠️ Stripe webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.metadata?.userId;
    const subType = session.metadata?.type;
    const amount = session.amount_total ? session.amount_total / 100 : null;

    if (!userId || !subType) {
      console.warn('Missing metadata: userId or type');
      return { statusCode: 400, body: 'Missing metadata' };
    }

    if (subType === 'subscription') {
      try {
        const db = await connectToDatabase(process.env.MONGO_DB_URI);
        const users = db.collection('users');
        const history = db.collection('subscription_history');

        await users.updateOne(
          { userId },
          { $set: { isSubscribed: true } },
          { upsert: true }
        );

        await history.insertOne({
          userId,
          method: 'Stripe (ApplePay)',
          amount,
          createdAt: new Date(),
        });

        console.log(`✅ Subscription recorded for user ${userId}`);
      } catch (err) {
        console.error('❌ MongoDB error:', err.message);
        return { statusCode: 500, body: 'Database error' };
      }
    }
  }

  return {
    statusCode: 200,
    body: 'Webhook received',
  };
};
