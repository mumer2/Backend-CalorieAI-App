const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_DB_URI;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  if (!uri) {
    console.error("❌ MongoDB URI not set in environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server configuration error: missing DB URI" }),
    };
  }

  try {
    const { name, email, password, role, referralCode } = JSON.parse(event.body);

    if (!name || !email || !password || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'All fields (name, email, password, role) are required' }),
      };
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    // Check if user already exists
    const existingUser = await users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      await client.close();
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'User already exists' }),
      };
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Initial points for new user
    let points = 50;

    // Create new user document
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: role.toLowerCase(),
      points,
      referredUsers: [],
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);
    const insertedId = result.insertedId;

    // Generate referral code (e.g., last 6 characters of ObjectId)
    const newReferralCode = insertedId.toHexString().slice(-6);

    // Save referral code to user document
    await users.updateOne(
      { _id: insertedId },
      { $set: { referralCode: newReferralCode } }
    );

    // Reward referrer if referralCode was used
    if (referralCode) {
      const referrer = await users.findOne({ referralCode });

      if (referrer) {
        await users.updateOne(
          { _id: referrer._id },
          {
            $inc: { points: 50 },
            $push: { referredUsers: insertedId.toHexString() },
          }
        );
      }
    }

    await client.close();

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'User registered and rewarded successfully',
        userId: insertedId.toString(),
        points: points,
        referralCode: newReferralCode,
      }),
    };
  } catch (err) {
    console.error('❌ Signup error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Server error',
        error: err.message,
      }),
    };
  }
};