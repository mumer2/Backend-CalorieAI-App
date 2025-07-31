// Step 1: Backend Function to store subscription
// File: netlify/functions/storeSubscription.js

const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_DB_URI; 
const client = new MongoClient(uri);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const db = client.db('calorieai');
    const collection = db.collection('subscriptions');

    const result = await collection.insertOne(data);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscription stored', id: result.insertedId }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to store subscription' }),
    };
  }
};
