const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');

const generateNonceStr = () => Math.random().toString(36).substr(2, 15);

exports.handler = async (event) => {
  try {
    const { total_fee = 1, out_trade_no = Date.now() } = JSON.parse(event.body || '{}');

    const appid = 'wxd34d223a7b58e5fd'; // ✅ Your WeChat App ID
    const mch_id = '1498214512';        // ✅ Your Merchant ID
    const key = '201508BeijingZJoyTechnologyCoLTD'; // ✅ Your WeChat API v2 Key
    const notify_url = 'https://backend-calorieai-app.netlify.app/.netlify/functions/wechat-notify';
    const trade_type = 'MWEB';
    const scene_info = JSON.stringify({
      h5_info: {
        type: 'Wap',
        wap_url: 'https://yourfrontenddomain.com', // Replace with your frontend domain
        wap_name: 'CalorieAI',
      },
    });

    const params = {
      appid,
      mch_id,
      nonce_str: generateNonceStr(),
      body: 'CalorieAI Recharge',
      out_trade_no: out_trade_no.toString(),
      total_fee: total_fee.toString(), // Amount in fen
      spbill_create_ip: '127.0.0.1',   // Can be your server IP
      notify_url,
      trade_type,
      scene_info,
    };

    // ✅ Generate sign string (filter out undefined or empty values)
    const stringA = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== '')
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const stringSignTemp = `${stringA}&key=${key}`;
    const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();

    // ✅ Build XML payload
    const builder = new xml2js.Builder({ rootName: 'xml', headless: true, cdata: true });
    const xmlData = builder.buildObject({ ...params, sign });

    // ✅ Send request to WeChat Pay
    const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xmlData, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    });

    // ✅ Parse XML response
    const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });

    if (parsed.xml && parsed.xml.return_code === 'SUCCESS' && parsed.xml.result_code === 'SUCCESS') {
      return {
        statusCode: 200,
        body: JSON.stringify({ mweb_url: parsed.xml.mweb_url }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: parsed.xml.return_msg || parsed.xml.err_code_des || 'WeChat Pay error',
        }),
      };
    }

  } catch (err) {
    console.error('WeChat Pay error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Unexpected error' }),
    };
  }
};
