// netlify/functions/storeSubscription.js
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_DB_URI;
const DB_NAME = "calorieai";
const COLLECTION = "subscriptions";

const client = new MongoClient(MONGO_URI);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { userId, planType, paymentMethod, startDate, duration } = JSON.parse(event.body);

    if (!userId || !planType || !paymentMethod || !duration) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    await client.connect();
    const db = client.db(DB_NAME);
    const subscriptions = db.collection(COLLECTION);

    const start = new Date(startDate || Date.now());
    const expire = new Date(start);
    if (duration === 'monthly') expire.setMonth(start.getMonth() + 1);
    else if (duration === 'yearly') expire.setFullYear(start.getFullYear() + 1);

    const result = await subscriptions.insertOne({
      userId: new ObjectId(userId),
      planType,
      paymentMethod,
      startDate: start,
      endDate: expire,
      createdAt: new Date(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, subscriptionId: result.insertedId }),
    };
  } catch (error) {
    console.error("Subscription error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
