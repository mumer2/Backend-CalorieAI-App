const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_DB_URI;
const DB_NAME = "calorieai";
const COLLECTION_NAME = "subscriptions";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { userId, plan, method, startDate, endDate } = JSON.parse(event.body);

  if (!userId || !plan || !method || !startDate || !endDate) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  const subscription = {
    userId,
    plan,
    method,
    startDate,
    endDate,
    status: "active", // <--- NEW
  };

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const subs = db.collection(COLLECTION_NAME);

    await subs.insertOne(subscription);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Subscription saved successfully" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Error", details: err.message }),
    };
  } finally {
    await client.close();
  }
};
