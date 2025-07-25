const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { userId, price } = JSON.parse(event.body || '{}');
  if (!userId || !price) {
    return { statusCode: 400, body: 'Missing userId or price' };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'apple_pay'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: price * 100,
            product_data: {
              name: 'Premium Subscription'
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://yourapp.netlify.app/success?userId=${userId}`,
      cancel_url: `https://yourapp.netlify.app/cancel`,
      metadata: { userId, type: 'subscription' },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ paymentUrl: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};