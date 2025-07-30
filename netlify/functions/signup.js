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

    // Check if user already exists by email or phone
    const existingUser = await users.findOne({
      $or: [
        email ? { email: email.toLowerCase() } : {},
        phone ? { phone } : {},
      ],
    });

    if (existingUser) {
      await client.close();
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'User with same email or phone already exists' }),
      };
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Initial points
    let points = 50;

    // Create user object
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

    // Insert user
    const result = await users.insertOne(newUser);
    const insertedId = result.insertedId;

    // Generate referral code
    const newReferralCode = insertedId.toHexString().slice(-6);
    await users.updateOne(
      { _id: insertedId },
      { $set: { referralCode: newReferralCode } }
    );

    // Handle referral
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
        points,
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
