const forge = require('node-forge');

const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY;

function verifySignature(params, signature) {
  // Remove sign and sign_type from params
  const filtered = {};
  Object.keys(params)
    .filter(key => key !== 'sign' && key !== 'sign_type')
    .sort()
    .forEach(key => {
      filtered[key] = params[key];
    });

  // Build the string to verify
  const signString = Object.keys(filtered)
    .map(key => `${key}=${filtered[key]}`)
    .join('&');

  // Verify signature
  const publicKey = forge.pki.publicKeyFromPem(ALIPAY_PUBLIC_KEY);
  const md = forge.md.sha256.create();
  md.update(signString, 'utf8');
  const decodedSignature = forge.util.decode64(signature);

  return publicKey.verify(md.digest().bytes(), decodedSignature);
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse Alipay notification (x-www-form-urlencoded)
  const params = {};
  event.body.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });

  const signature = params.sign;

  // Verify signature
  if (!verifySignature(params, signature)) {
    return { statusCode: 400, body: 'Invalid signature' };
  }

  // TODO: Check trade_status, update your database, etc.
  // Example: if (params.trade_status === 'TRADE_SUCCESS') { ... }

  // Respond with 'success' to acknowledge receipt
  return {
    statusCode: 200,
    body: 'success',
  };
};