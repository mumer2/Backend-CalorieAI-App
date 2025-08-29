const { MongoClient } = require("mongodb");
const AlipaySdk = require("alipay-sdk").default;
const crypto = require("crypto");

let cachedDb = null;

const connectToDatabase = async (uri) => {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  cachedDb = client.db("calorieai"); // your DB name
  return cachedDb;
};

// Initialize Alipay SDK
const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const params = new URLSearchParams(event.body);
  const notifyData = Object.fromEntries(params);

  // ✅ Verify Alipay signature
  const isValid = alipaySdk.checkNotifySign(notifyData);
  if (!isValid) {
    console.error("❌ Invalid Alipay signature");
    return { statusCode: 400, body: "Invalid signature" };
  }

  // ✅ Payment successful
  if (notifyData.trade_status === "TRADE_SUCCESS") {
    const userId = notifyData.passback_params; // you pass metadata here when creating order
    const amount = parseFloat(notifyData.total_amount);

    try {
      const db = await connectToDatabase(process.env.MONGO_DB_URI);
      const users = db.collection("users");
      const history = db.collection("subscription_history");

      await users.updateOne(
        { userId },
        { $set: { isSubscribed: true } },
        { upsert: true }
      );

      await history.insertOne({
        userId,
        method: "Alipay (WAP)",
        amount,
        createdAt: new Date(),
      });

      console.log(`✅ Subscription recorded for user ${userId}`);
    } catch (err) {
      console.error("❌ MongoDB error:", err.message);
      return { statusCode: 500, body: "Database error" };
    }
  }

  // ✅ Always return success response to Alipay
  return {
    statusCode: 200,
    body: "success",
  };
};
