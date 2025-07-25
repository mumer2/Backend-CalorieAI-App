const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, userId } = JSON.parse(event.body);
    const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
    const base = 'https://api-m.sandbox.paypal.com'; // Use live URL in production

    const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');

    // Get access token
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const { access_token } = await tokenRes.json();

    // Create order
    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: 'USD', value: amount },
            custom_id: userId,
          },
        ],
        application_context: {
          return_url: 'https://your-app.com/success',
          cancel_url: 'https://your-app.com/cancel',
        },
      }),
    });

    const data = await orderRes.json();
    const approvalUrl = data.links?.find((l) => l.rel === 'approve')?.href;

    return {
      statusCode: 200,
      body: JSON.stringify({ approvalUrl }),
    };
  } catch (err) {
    console.error('PayPal error:', err);
    return { statusCode: 500, body: 'PayPal order error' };
  }
};
