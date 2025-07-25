// apple-pay.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { userId, amount } = JSON.parse(event.body);

    if (!userId || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or amount' }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // ✅ Apple Pay is supported under 'card'
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Calorie AI Subscription',
            },
            unit_amount: amount * 100, // convert dollars to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        isSubscription: true,
      },
      success_url: 'https://yourdomain.com/success.html',
      cancel_url: 'https://yourdomain.com/cancel.html',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ paymentUrl: session.url }),
    };
  } catch (err) {
    console.error('❌ Stripe session error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
