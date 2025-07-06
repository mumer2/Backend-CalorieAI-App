const { MongoClient } = require('mongodb');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Only GET method allowed',
    };
  }

  const coachId = event.queryStringParameters.coachId;

  if (!coachId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing coachId query parameter' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  }

  const client = new MongoClient(process.env.MONGO_DB_URI);

  try {
    await client.connect();
    const db = client.db('calorieai');
    const collection = db.collection('coach_requests');

    // If stored as ObjectId, uncomment:
    // const query = { coachId: new ObjectId(coachId) };
    const query = { coachId }; // assuming string

    const requests = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    return {
      statusCode: 200,
      body: JSON.stringify(requests),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  } catch (err) {
    console.error('Error fetching coach requests:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  } finally {
    await client.close();
  }
};
