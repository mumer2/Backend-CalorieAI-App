exports.handler = async function(event, context) {
  // Parse request body
  const { plan } = JSON.parse(event.body || '{}');

  // Mock plan price mapping
  const planPrices = {
    monthly: 9.99,
    yearly: 99.99,
  };

  if (!plan || !planPrices[plan]) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid plan' }),
    };
  }

  // TODO: Integrate with Alipay API here.
  // For demo, return a mock payment URL.
  // In production, generate a real payment URL using Alipay's API.
  const paymentUrl = `https://openapi.alipay.com/gateway.do?plan=${plan}&amount=${planPrices[plan]}`;

  return {
    statusCode: 200,
    body: JSON.stringify({ paymentUrl }),
  };
};