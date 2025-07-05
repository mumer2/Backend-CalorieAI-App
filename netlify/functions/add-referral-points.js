const { MongoClient, ObjectId } = require('mongodb');
const uri2 = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { referrerId } = JSON.parse(event.body);
  if (!referrerId) {
    return { statusCode: 400, body: 'Referrer ID is required' };
  }

  const client = new MongoClient(uri2);
  try {
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(referrerId) },
      { $inc: { coins: 10 } },
      { returnDocument: 'after' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: '10 coins added via referral', coins: result.value.coins }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Error applying referral', error: err.message }) };
  } finally {
    await client.close();
  }
};