const { connectToDatabase } = require("./db");
const Request = require("./models/Request");

exports.handler = async (event) => {
  if (event.httpMethod !== "PATCH") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    await connectToDatabase();

    const { id, status, answer } = JSON.parse(event.body);

    if (!id || !status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing id or status" }),
      };
    }

    const updated = await Request.findByIdAndUpdate(
      id,
      {
        status,
        ...(answer && { answer }), // only include answer if provided
      },
      { new: true }
    );

    if (!updated) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Request not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Request updated", request: updated }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
