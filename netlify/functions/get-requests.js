// functions/get-requests.js
const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  const coachId = event.queryStringParameters.coachId;

  if (!coachId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Coach ID required' }),
    };
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('calorieai');
    const requests = await db
      .collection('requests')
      .find({ coachId })
      .toArray();

    return {
      statusCode: 200,
      body: JSON.stringify(requests),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error retrieving requests' }),
    };
  } finally {
    await client.close();
  }
};
