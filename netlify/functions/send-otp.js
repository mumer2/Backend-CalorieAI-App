const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_DB_URI;
const EMAIL_USERNAME = process.env.EMAIL_USERNAME;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Email is required' }) };
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('calorieai');
    const users = db.collection('users');

    // ✅ Check if the email exists in DB
    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Email not found. Please check again.' }),
      };
    }

    // Generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now

    // Save OTP to DB
    await users.updateOne(
      { email: email.toLowerCase() },
      { $set: { otp, otpExpiresAt } }
    );

    // Send email using nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USERNAME,
        pass: EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `CalorieAI <${EMAIL_USERNAME}>`,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP to reset your password is: ${otp}\nIt will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OTP sent successfully' }),
    };
  } catch (err) {
    console.error('Send OTP Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server error', error: err.message }),
    };
  } finally {
    await client.close();
  }
};
