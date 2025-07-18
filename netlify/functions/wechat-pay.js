// =============================
// STEP-BY-STEP: WeChat Pay H5 Integration using Node.js (Netlify Function Compatible)
// =============================

/**
 * This function:
 * 1. Creates a WeChat H5 payment order
 * 2. Signs parameters using API v2 key
 * 3. Returns the "mweb_url" to open in WebView (React Native / Expo)
 */

const axios = require("axios");
const crypto = require("crypto");
const xml2js = require("xml2js");
require("dotenv").config();

const generateNonceStr = () => Math.random().toString(36).substring(2, 15);

exports.handler = async (event) => {
  try {
    // Step 1: Parse Request Body
    const { total_fee = 1, out_trade_no = Date.now() } = JSON.parse(event.body || "{}");

    // Step 2: Configure Credentials
    const appid = process.env.WECHAT_APPID;
    const mch_id = process.env.WECHAT_MCH_ID;
    const key = process.env.WECHAT_API_KEY;

    const notify_url =
      "https://backend-calorieai-app.netlify.app/.netlify/functions/wechat-notify";
    const trade_type = "MWEB";
  const scene_info = JSON.stringify({
  h5_info: {
    type: "Wap",
    wap_url: "https://calorieai-app.netlify.app",
    wap_name: "Calorie AI",
  },
});


    // Step 3: Build Parameters
    const params = {
      appid,
      mch_id,
      nonce_str: generateNonceStr(),
      body: "Subscription Payment",
      out_trade_no: out_trade_no.toString(),
      total_fee: total_fee.toString(),
      spbill_create_ip: "127.0.0.1",
      notify_url,
      trade_type,
      scene_info,
    };

    // Step 4: Generate Sign
    const stringA = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== "")
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const stringSignTemp = `${stringA}&key=${key}`;
    const sign = crypto
      .createHash("md5")
      .update(stringSignTemp, "utf8")
      .digest("hex")
      .toUpperCase();

    // Step 5: Build XML
    const builder = new xml2js.Builder({
      rootName: "xml",
      headless: true,
      cdata: true,
    });
    const xmlData = builder.buildObject({ ...params, sign });

    // Step 6: Send Unified Order Request
    const response = await axios.post(
      "https://api.mch.weixin.qq.com/pay/unifiedorder",
      xmlData,
      {
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      }
    );

    // Step 7: Parse XML Response
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
    });
    const result = parsed.xml;

    console.log("WeChat Pay Response:", result);

    if (result.return_code === "SUCCESS" && result.result_code === "SUCCESS") {
      return {
        statusCode: 200,
        body: JSON.stringify({ mweb_url: result.mweb_url }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: result.return_msg || result.err_code_des || "WeChat Pay error",
          raw: result,
        }),
      };
    }
  } catch (err) {
    console.error("WeChat Pay Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unexpected error" }),
    };
  }
};
