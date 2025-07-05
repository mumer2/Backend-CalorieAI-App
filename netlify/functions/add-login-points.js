const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { userId } = JSON.parse(event.body);
  if (!userId) {
    return { statusCode: 400, body: 'User ID is required' };
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $inc: { coins: 5 } },
      { returnDocument: 'after' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: '5 coins added for login', coins: result.value.coins }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Error updating coins', error: err.message }) };
  } finally {
    await client.close();
  }
};