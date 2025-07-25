const fetch = require('node-fetch');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { amount, userId } = body;

  if (!amount || !userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing amount or userId' }),
    };
  }

  try {
    // Step 1: Get PayPal access token
    const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authRes.json();
    const accessToken = authData.access_token;

    // Step 2: Create PayPal order
    const orderRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'USD', value: amount.toString() } }],
        application_context: {
          brand_name: 'Calorie AI',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: `https://successscreen.netlify.app/success.html?userId=${userId}&paid=true`,
          cancel_url: `https://successscreen.netlify.app/success.html?userId=${userId}&paid=false`,
        },
      }),
    });

    const orderData = await orderRes.json();
    const approvalUrl = orderData.links.find(link => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No approval URL returned by PayPal' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ approvalUrl, orderId: orderData.id }),
    };
  } catch (err) {
    console.error('PayPal Pay Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
