const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, token } = JSON.parse(event.body);
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('calorieai');
    const users = db.collection('users');

    await users.updateOne(
      { _id: new MongoClient.ObjectId(userId) },
      { $set: { expoPushToken: token } }
    );

    await client.close();

    return { statusCode: 200, body: JSON.stringify({ message: 'Token saved' }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
