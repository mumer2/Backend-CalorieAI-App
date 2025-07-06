const { connectToDatabase } = require("./db");
const Request = require("./models/Request");

exports.handler = async (event) => {
  await connectToDatabase();

  const { userId } = event.queryStringParameters;

  try {
    const requests = await Request.find({ userId }).sort({ createdAt: -1 });
    return {
      statusCode: 200,
      body: JSON.stringify(requests),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};
