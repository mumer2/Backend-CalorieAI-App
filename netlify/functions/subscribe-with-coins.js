const { MongoClient, ObjectId } = require('mongodb');

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

  const { userId } = body;
  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Missing userId' }),
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

    if ((user.points || 0) < 50) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Not enough coins' }),
      };
    }

    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $inc: { points: -100 }, $set: { subscribed: true, subscriptionDate: new Date() } }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Subscription successful' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Server error', error: err.message }),
    };
  } finally {
    await client.close();
  }
};
