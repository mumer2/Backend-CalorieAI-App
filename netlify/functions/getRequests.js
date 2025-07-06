const { connectToDatabase } = require('./db');
const Request = require('./models/Request');

exports.handler = async () => {
  try {
    await connectToDatabase();

    // Only fetch requests with "pending" status
    const requests = await Request.find({ status: 'pending' }).sort({ createdAt: -1 });

    return {
      statusCode: 200,
      body: JSON.stringify(requests),
    };
  } catch (error) {
    console.error("❌ Get Requests Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' }),
    };
  }
};
