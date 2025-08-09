// routes/convaiRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/convai-chat', async (req, res) => {
  const { userText, charID } = req.body || {};
  let { sessionID, voiceResponse } = req.body || {};

  // 基本校验
  if (!userText || !String(userText).trim()) {
    return res.status(400).json({ error: 'Missing userText' });
  }
  if (!charID || !String(charID).trim()) {
    return res.status(400).json({ error: 'Missing charID' });
  }
  const apiKey = process.env.CONVAI_API_KEY;
  if (!apiKey) {
    console.error('❌ 缺少 CONVAI_API_KEY');
    // ▶️ 直接降级，别让前端卡住
    return res.json({
      text: '（NPC占位）今天先跳过对话，直接去记录你的餐食吧。',
      isFallback: true,
      skipToMeal: true,
    });
  }

  // 规范化参数
  sessionID = typeof sessionID === 'string' ? sessionID.trim() : '';
  const basePayload = {
    userText: String(userText).trim(),
    charID: String(charID).trim(),
    ...(sessionID ? { sessionID } : {}),
    voiceResponse: !!voiceResponse,
  };

  // 第一次尝试：表单 + CONVAI-API-KEY
  const tryForm = async () => {
    const form = new URLSearchParams();
    form.append('userText', basePayload.userText);
    form.append('charID', basePayload.charID);
    if (basePayload.sessionID) form.append('sessionID', basePayload.sessionID);
    form.append('voiceResponse', basePayload.voiceResponse ? 'True' : 'False');

    return axios.post('https://api.convai.com/character/getResponse', form, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'CONVAI-API-KEY': apiKey,
      },
      timeout: 15000,
      validateStatus: () => true,
    });
  };

  // 第二次兜底：JSON + Bearer
  const tryJsonBearer = async () => {
    return axios.post('https://api.convai.com/character/getResponse', basePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 15000,
      validateStatus: () => true,
    });
  };

  // ✅ 统一的降级返回
  const returnFallback = (why) => {
    console.warn('⚠️ ConvAI 降级启用：', why);
    return res.json({
      text: '（NPC占位）今天先跳过对话，直接去记录你的餐食吧。',
      isFallback: true,
      skipToMeal: true,
      reason: why, // 便于前端/日志定位
    });
  };

  try {
    console.log('➡️ 调用 ConvAI(表单/KEY) payload=', {
      ...basePayload,
      userText: basePayload.userText.slice(0, 50) + (basePayload.userText.length > 50 ? '…' : '')
    });

    let resp = await tryForm();
    let bodyText = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    console.log(`⬅️ ConvAI(表单/KEY) status=${resp.status} body~=${bodyText.slice(0, 200)}`);

    // 如果配额/权限问题，直接降级；否则再试 JSON/Bearer
    if (resp.status === 401 || resp.status === 403) {
      return returnFallback(`status=${resp.status}`);
    }

    // 非 2xx 再试一次 JSON + Bearer
    if (!(resp.status >= 200 && resp.status < 300)) {
      console.warn('⚠️ 表单方式非2xx，改用 JSON+Bearer 重试…');
      resp = await tryJsonBearer();
      bodyText = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      console.log(`⬅️ ConvAI(JSON/Bearer) status=${resp.status} body~=${bodyText.slice(0, 200)}`);

      if (resp.status === 401 || resp.status === 403) {
        return returnFallback(`status=${resp.status}`);
      }
    }

    if (resp.status >= 200 && resp.status < 300) {
      return res.json(resp.data);
    }

    // 其它非2xx：统一走降级
    return returnFallback(`non-2xx=${resp.status}`);

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      return returnFallback('timeout');
    }
    if (err.response) {
      // 服务返回了响应，但不是 2xx
      const st = err.response.status;
      if (st === 401 || st === 403) {
        return returnFallback(`status=${st}`);
      }
      return returnFallback(`bad-response=${st}`);
    }
    // 网络/未知异常
    return returnFallback(`exception=${err.message}`);
  }
});
module.exports = router;