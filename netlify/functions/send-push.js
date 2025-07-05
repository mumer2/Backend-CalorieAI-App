// netlify/functions/send-push.js
const { MongoClient, ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { userId, message } = JSON.parse(event.body);

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('calorieai');
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user || !user.pushToken) {
      return { statusCode: 400, body: 'Push token not found' };
    }

    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.pushToken,
        sound: 'default',
        title: '📩 New Reply from Your Coach!',
        body: message || 'You have a new message.',
        data: { screen: 'Replies' },
      }),
    });

    const result = await pushRes.json();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
