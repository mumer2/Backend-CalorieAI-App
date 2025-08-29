const forge = require("node-forge");

const APP_ID = process.env.ALIPAY_APP_ID;
const GATEWAY = "https://openapi.alipay.com/gateway.do";
const PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY;
const NOTIFY_URL = process.env.ALIPAY_NOTIFY_URL;

exports.handler = async function (event, context) {
  try {
    const { plan } = JSON.parse(event.body || "{}");
    const planPrices = { monthly: "¥50", yearly: "¥399" };

    if (!plan || !planPrices[plan]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid plan" }),
      };
    }

    // Build biz_content
    const bizContent = {
      out_trade_no: "ORDER_" + Date.now(),
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: planPrices[plan],
      subject: `Calorie AI App ${plan} subscription`,
    };

    // Build params
    const params = {
      app_id: APP_ID,
      method: "alipay.trade.page.pay",
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
      notify_url: NOTIFY_URL,
    };

    // Step 1: Normalize private key (fixes Netlify PEM issue)
    const privateKeyPem = PRIVATE_KEY.replace(/\\n/g, "\n");

    // Step 2: Sort params and build the string to sign
    const orderedString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    // Step 3: Sign with RSA2 (SHA256withRSA)
    const md = forge.md.sha256.create();
    md.update(orderedString, "utf8");
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const signature = forge.util.encode64(privateKey.sign(md));

    // Step 4: Build the payment URL
    const urlParams = new URLSearchParams(params);
    urlParams.append("sign", signature);

    const paymentUrl = `${GATEWAY}?${urlParams.toString()}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ paymentUrl }),
    };
  } catch (err) {
    console.error("Alipay error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
