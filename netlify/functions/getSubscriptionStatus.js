const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_DB_URI;
const DB_NAME = "calorieai";

exports.handler = async (event) => {
  const { userId } = event.queryStringParameters;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing userId" }),
    };
  }

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const subs = db.collection("subscriptions");

    const latest = await subs
      .find({ userId })
      .sort({ endDate: -1 })
      .limit(1)
      .toArray();

    if (!latest.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "none" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: latest[0].status }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: err.message }),
    };
  } finally {
    await client.close();
  }
};
