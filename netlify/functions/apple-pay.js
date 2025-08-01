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
    const { userId, amount, plan } = JSON.parse(event.body);

    if (!userId || !amount || !plan) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId, amount or plan' }),
      };
    }

    const planLabel = plan === 'yearly' ? 'Yearly' : 'Monthly';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Includes Apple Pay
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Calorie AI ${planLabel} Subscription`,
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan,
        isSubscription: true,
      },
      success_url: 'https://successscreen.netlify.app/success.html',
      cancel_url: 'https://successscreen.netlify.app/cancel.html',
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
