// .netlify/functions/savePushToken.js
const { MongoClient } = require('mongodb');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST method allowed' };
  }

  const { userId, expoPushToken } = JSON.parse(event.body);
  if (!userId || !expoPushToken) {
    return { statusCode: 400, body: 'Missing userId or push token' };
  }

  const client = new MongoClient(process.env.MONGO_DB_URI);
  await client.connect();
  const db = client.db('calorieai');
  const users = db.collection('users');

  await users.updateOne(
    { _id: new require('mongodb').ObjectId(userId) },
    { $set: { expoPushToken } }
  );

  await client.close();
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
