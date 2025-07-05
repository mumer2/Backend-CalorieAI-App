// functions/get-coaches.js
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_DB_URI;

exports.handler = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('calorieai');
    const coaches = await db
      .collection('users')
      .find({ role: 'coach' }, { projection: { passwordHash: 0 } })
      .toArray();

    return {
      statusCode: 200,
      body: JSON.stringify(coaches),
    };
  } catch (err) {
    console.error('Error fetching coaches:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching coaches' }),
    };
  } finally {
    await client.close();
  }
};
