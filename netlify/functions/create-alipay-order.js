const forge = require("node-forge");

const APP_ID = process.env.ALIPAY_APP_ID;
const GATEWAY = "https://openapi.alipay.com/gateway.do";
const PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY;
const NOTIFY_URL = process.env.ALIPAY_NOTIFY_URL;
const RETURN_URL = process.env.ALIPAY_RETURN_URL; // user redirect after payment

exports.handler = async function (event, context) {
  try {
    const { plan } = JSON.parse(event.body || "{}");
    const planPrices = { monthly: "50.00", yearly: "399.00" }; // Alipay expects plain numbers, no ¥

    if (!plan || !planPrices[plan]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid plan" }),
      };
    }

    // Build biz_content for WAP pay
    const bizContent = {
      out_trade_no: "ORDER_" + Date.now(),
      product_code: "QUICK_WAP_WAY", // required for wap.pay
      total_amount: planPrices[plan],
      subject: `Calorie AI App ${plan} subscription`,
    };

    // Build params
    const params = {
      app_id: APP_ID,
      method: "alipay.trade.wap.pay", // WAP payment
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
      notify_url: NOTIFY_URL,
      return_url: RETURN_URL,
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
    console.error("Alipay WAP error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
