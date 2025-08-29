const forge = require('node-forge');

const APP_ID = 'YOUR_APP_ID';
const GATEWAY = 'https://openapi.alipay.com/gateway.do';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----`;

exports.handler = async function(event, context) {
  const { plan } = JSON.parse(event.body || '{}');
  const planPrices = { monthly: 9.99, yearly: 99.99 };

  if (!plan || !planPrices[plan]) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan' }) };
  }

  // Build biz_content
  const bizContent = {
    out_trade_no: 'ORDER_' + Date.now(),
    product_code: 'FAST_INSTANT_TRADE_PAY',
    total_amount: planPrices[plan],
    subject: `Calorie AI App ${plan} subscription`
  };

  // Build params
  const params = {
    app_id: APP_ID,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    version: '1.0',
    biz_content: JSON.stringify(bizContent),
    notify_url: 'https://yourdomain.com/api/alipay-notify' // Set your notify URL
  };

  // Create the string to sign
  const ordered = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');

  // Sign the string
  const md = forge.md.sha256.create();
  md.update(ordered, 'utf8');
  const privateKey = forge.pki.privateKeyFromPem(PRIVATE_KEY);
  const signature = forge.util.encode64(privateKey.sign(md));

  // Build the payment URL
  const urlParams = new URLSearchParams(params);
  urlParams.append('sign', signature);

  const paymentUrl = `${GATEWAY}?${urlParams.toString()}`;

  return {
    statusCode: 200,
    body: JSON.stringify({ paymentUrl }),
  };
};