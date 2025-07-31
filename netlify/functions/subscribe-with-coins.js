const { MongoClient, ObjectId } = require('mongodb');

// Direct URI used here (not from .env as per your request)
const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid JSON format' }),
    };
  }

  const { userId, plan, amount, duration } = body;

  if (!userId || !plan || !amount || !duration) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Missing data: userId, plan, amount, or duration' }),
    };
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    const userCoins = user.points || 0;
    if (userCoins < amount) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Insufficient coins' }),
      };
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() + duration);

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $inc: { points: -amount },
        $set: {
          subscription: {
            plan,
            method: 'coins',
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            active: true,
          },
          isSubscribed: true,
        },
      }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Subscription successful' }),
    };
  } catch (err) {
    console.error('Server error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Server error', error: err.message }),
    };
  } finally {
    await client.close();
  }
};
