const { MongoClient } = require('mongodb');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Only GET allowed' };
  }

  const userId = event.queryStringParameters.userId;
  if (!userId) {
    return { statusCode: 400, body: 'Missing userId' };
  }

  const client = new MongoClient(process.env.MONGO_DB_URI);
  await client.connect();
  const db = client.db('calorieai');
  const notifications = db.collection('notifications');

  const userNotifications = await notifications
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  await client.close();

  return {
    statusCode: 200,
    body: JSON.stringify(userNotifications),
  };
};
