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
    const { name, email, phone, password, role, referralCode } = JSON.parse(event.body);

    if (!name || !password || !role || (!email && !phone)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Name, password, role, and either email or phone are required',
        }),
      };
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    // Check if user already exists (by email or phone)
    const query = [];
    if (email) query.push({ email: email.toLowerCase() });
    if (phone) query.push({ phone });

    if (query.length === 0) {
      await client.close();
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid input: missing email and phone' }),
      };
    }

    const existingUser = await users.findOne({ $or: query });

    if (existingUser) {
      await client.close();
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'User with same email or phone already exists' }),
      };
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    let points = 50;
    const newUser = {
      name: name.trim(),
      passwordHash,
      role: role.toLowerCase(),
      points,
      referredUsers: [],
      createdAt: new Date(),
    };

    if (email) newUser.email = email.toLowerCase();
    if (phone) newUser.phone = phone;

    const result = await users.insertOne(newUser);
    const insertedId = result.insertedId;

    // Create referral code (last 6 chars of ObjectId)
    const generatedReferralCode = insertedId.toHexString().slice(-6);

    await users.updateOne(
      { _id: insertedId },
      { $set: { referralCode: generatedReferralCode } }
    );

    // Handle referral if provided
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
        message: 'User registered successfully',
        userId: insertedId.toString(),
        points,
        referralCode: generatedReferralCode,
      }),
    };
  } catch (error) {
    console.error('❌ Signup Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  }
};
