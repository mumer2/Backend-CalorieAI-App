const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  const { userId } = JSON.parse(event.body);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    const user = await users.findOne({ _id: userId });
    const today = new Date().toDateString();

    if (user.lastLoginDate !== today) {
      await users.updateOne(
        { _id: userId },
        {
          $set: { lastLoginDate: today },
          $inc: { points: 10 },
        }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Login rewarded' }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Error rewarding login' }) };
  } finally {
    await client.close();
  }
};