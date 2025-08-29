const forge = require("node-forge");

const APP_ID = process.env.ALIPAY_APP_ID;
const GATEWAY = "https://openapi.alipay.com/gateway.do";
const PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY;
const NOTIFY_URL = process.env.ALIPAY_NOTIFY_URL;
const RETURN_URL = process.env.ALIPAY_RETURN_URL; // User redirected after payment

exports.handler = async function (event, context) {
  try {
    const { plan, channel } = JSON.parse(event.body || "{}"); 
    // channel = "web" or "wap"
    
    const planPrices = { monthly: "50.00", yearly: "399.00" };

    if (!plan || !planPrices[plan]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid plan" }),
      };
    }

    // Order info
    const bizContent = {
      out_trade_no: "ORDER_" + Date.now(),
      product_code: channel === "wap" ? "QUICK_WAP_WAY" : "FAST_INSTANT_TRADE_PAY",
      total_amount: planPrices[plan],
      subject: `Calorie AI App ${plan} subscription`,
    };

    // Base params
    const params = {
      app_id: APP_ID,
      method: channel === "wap" ? "alipay.trade.wap.pay" : "alipay.trade.page.pay",
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
      notify_url: NOTIFY_URL,
      return_url: RETURN_URL,
    };

    // 1) Normalize private key
    const privateKeyPem = PRIVATE_KEY.replace(/\\n/g, "\n");

    // 2) Sort and sign params
    const orderedString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const md = forge.md.sha256.create();
    md.update(orderedString, "utf8");
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const signature = forge.util.encode64(privateKey.sign(md));

    // 3) Build the payment URL
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
