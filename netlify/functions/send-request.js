// functions/sendRequest.js
const { MongoClient } = require('mongodb');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  const { coachId, userId, userName, message } = JSON.parse(event.body);

  const client = new MongoClient(process.env.MONGO_DB_URI);

  try {
    await client.connect();
    const db = client.db('calorieai');
    const collection = db.collection('coach_requests');

    await collection.insertOne({
      coachId,
      userId,
      userName,
      message,
      timestamp: new Date(),
      status: 'pending',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Request sent successfully' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  } finally {
    await client.close();
  }
};
