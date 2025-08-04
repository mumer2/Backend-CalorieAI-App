const axios = require('axios');

let cachedToken = null;
let tokenExpireTime = 0;

const APP_KEY = 'YOUR_UMENG_APP_KEY';       // Replace with your Umeng AppKey
const APP_SECRET = 'YOUR_UMENG_APP_SECRET'; // Replace with your Umeng AppSecret

async function getUmengAccessToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpireTime) {
    return cachedToken;
  }

  const response = await axios.post('https://api.umeng.com/open_api/auth/token', {
    grant_type: 'client_credentials',
    client_id: APP_KEY,
    client_secret: APP_SECRET,
  });

  cachedToken = response.data.access_token;
  tokenExpireTime = now + (response.data.expires_in * 1000) - 60 * 1000;

  return cachedToken;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { userId, event: eventName, timestamp = Date.now() } = body;

    if (!userId || !eventName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or event' }),
      };
    }

    const token = await getUmengAccessToken();

    const response = await axios.post(
      'https://api.umeng.com/open_api/analytics/event',
      {
        app_key: APP_KEY,
        event_name: eventName,
        user_id: userId,
        timestamp,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Umeng API error:', err?.response?.data || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send event to Umeng' }),
    };
  }
};
