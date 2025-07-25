const { MongoClient } = require('mongodb');

let cachedDb = null;
const connectToDatabase = async (uri) => {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  cachedDb = client.db('calorieai');
  return cachedDb;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { userId, paid } = event.queryStringParameters;

  if (paid === 'true' && userId) {
    try {
      const db = await connectToDatabase(process.env.MONGO_DB_URI);
      await db.collection('users').updateOne(
        { userId },
        { $set: { isSubscribed: true } },
        { upsert: true }
      );
      return { statusCode: 200, body: 'Subscribed Successfully' };
    } catch (err) {
      return { statusCode: 500, body: 'Database update failed' };
    }
  }

  return { statusCode: 400, body: 'Payment not confirmed' };
};
