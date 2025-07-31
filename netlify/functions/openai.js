const axios = require("axios");

exports.handler = async function (event) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("❌ GROQ_API_KEY is missing in environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing GROQ_API_KEY in environment" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Only POST allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { question, lang } = body;

  if (!question) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Question is required" }),
    };
  }

  // 👇 Prepend instruction for Chinese
  const localizedPrompt =
    lang === "zh"
      ? `请用中文回答以下问题：${question}`
      : question;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: localizedPrompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const answer = response.data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ answer }),
    };
  } catch (error) {
    console.error("❌ Groq API error:", error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Groq request failed",
        details: error.response?.data || error.message,
      }),
    };
  }
};


// const axios = require("axios");

// exports.handler = async function (event) {
//   const apiKey = process.env.GROQ_API_KEY;

//   if (!apiKey) {
//     console.error("❌ GROQ_API_KEY is missing in environment variables.");
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: "Missing GROQ_API_KEY in environment" }),
//     };
//   }

//   if (event.httpMethod !== "POST") {
//     return {
//       statusCode: 405,
//       body: JSON.stringify({ error: "Only POST allowed" }),
//     };
//   }

//   let body;
//   try {
//     body = JSON.parse(event.body);
//   } catch {
//     return {
//       statusCode: 400,
//       body: JSON.stringify({ error: "Invalid JSON" }),
//     };
//   }

//   const { question } = body;
//   if (!question) {
//     return {
//       statusCode: 400,
//       body: JSON.stringify({ error: "Question is required" }),
//     };
//   }

//   try {
//     const response = await axios.post(
//       "https://api.groq.com/openai/v1/chat/completions",
//       {
//         model: "llama3-8b-8192", // ✅ Updated to supported model
//         messages: [{ role: "user", content: question }],
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${apiKey}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const answer = response.data.choices[0].message.content;

//     return {
//       statusCode: 200,
//       body: JSON.stringify({ answer }),
//     };
//   } catch (error) {
//     console.error("❌ Groq API error:", error.response?.data || error.message);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         error: "Groq request failed",
//         details: error.response?.data || error.message,
//       }),
//     };
//   }
// };
