const mongoose = require("mongoose");

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "calorieAI",
    });

    isConnected = conn.connections[0].readyState;
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}

exports.connectToDatabase = connectToDatabase; // ✅ use this instead of module.exports
