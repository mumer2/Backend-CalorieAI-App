const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');

const generateNonceStr = () => Math.random().toString(36).substr(2, 15);

exports.handler = async (event) => {
  const { total_fee = 1, out_trade_no = Date.now() } = JSON.parse(event.body || '{}');

  const appid = 'wxd34d223a7b58e5fd'; // Your WeChat app ID
  const mch_id = '1498214512';
  const key = '201508BeijingZJoyTechnologyCoLTD'; // API v2 key from WeChat merchant platform
  const notify_url = 'https://backend-calorieai-app.netlify.app/.netlify/functions/wechat-notify';
  const trade_type = 'MWEB';
  const scene_info = JSON.stringify({
    h5_info: {
      type: 'Wap',
      wap_url: 'https://yourfrontenddomain.com',
      wap_name: 'CalorieAI',
    },
  });

  const params = {
    appid,
    mch_id,
    nonce_str: generateNonceStr(),
    body: 'CalorieAI Recharge',
    out_trade_no: out_trade_no.toString(),
    total_fee: total_fee.toString(),
    spbill_create_ip: '127.0.0.1',
    notify_url,
    trade_type,
    scene_info,
  };

  // Create sign
  const stringA = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  const stringSignTemp = `${stringA}&key=${key}`;
  const sign = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();

  const builder = new xml2js.Builder({ rootName: 'xml', headless: true });
  const xmlData = builder.buildObject({ ...params, sign });

  try {
    const res = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xmlData, {
      headers: { 'Content-Type': 'text/xml' },
    });

    const parsed = await xml2js.parseStringPromise(res.data, { explicitArray: false });

    if (parsed.xml && parsed.xml.return_code === 'SUCCESS') {
      return {
        statusCode: 200,
        body: JSON.stringify({ mweb_url: parsed.xml.mweb_url }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: parsed.xml.return_msg || 'WeChat Pay error' }),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
