const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_DB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    const { email, password, role } = JSON.parse(event.body);

    if (!email || !password || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'All fields are required' }),
      };
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user || user.role.toLowerCase() !== role.toLowerCase()) {
      await client.close();
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'User not found or role mismatch' }),
      };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      await client.close();
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid password' }),
      };
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await client.close();

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
        role: user.role,
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          points: user.points || 0,
          referralCode: user.referralCode || '',
        },
      }),
    };
  } catch (err) {
    console.error('Login error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Login error', error: err.message }),
    };
  }
};