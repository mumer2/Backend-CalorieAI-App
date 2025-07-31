const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_DB_URI;
const DB_NAME = "calorieai"; // database name
const COLLECTION_NAME = "subscriptions"; // collection storing subscriptions

exports.handler = async () => {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const subs = db.collection(COLLECTION_NAME);

    const now = new Date().toISOString();

    // Find and update expired subscriptions
    const result = await subs.updateMany(
      { endDate: { $lt: now }, status: { $ne: "expired" } },
      { $set: { status: "expired" } }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Expired ${result.modifiedCount} subscriptions.`,
      }),
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
