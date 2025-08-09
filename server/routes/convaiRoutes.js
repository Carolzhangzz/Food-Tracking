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
    return res.status(500).json({ error: 'Server missing CONVAI_API_KEY' });
  }

  // 规范化参数
  sessionID = typeof sessionID === 'string' ? sessionID.trim() : '';
  // 有些服务不喜欢 "-1"；让它自行分配：不传或传空
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
      validateStatus: () => true, // 不抛异常，自己判断
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

  try {
    console.log('➡️ 调用 ConvAI(表单/KEY) payload=', {
      ...basePayload,
      userText: basePayload.userText.slice(0, 50) + (basePayload.userText.length > 50 ? '…' : '')
    });

    let resp = await tryForm();
    let bodyText = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    console.log(`⬅️ ConvAI(表单/KEY) status=${resp.status} body~=${bodyText.slice(0, 200)}`);

    if (resp.status === 401 || resp.status === 403) {
      console.warn('⚠️ 表单+CONVAI-API-KEY 被拒，改用 JSON+Bearer 兜底重试…');

      resp = await tryJsonBearer();
      bodyText = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      console.log(`⬅️ ConvAI(JSON/Bearer) status=${resp.status} body~=${bodyText.slice(0, 200)}`);
    }

    if (resp.status >= 200 && resp.status < 300) {
      return res.json(resp.data);
    }

    // 非 2xx：把 ConvAI 的返回透出一点，便于前端提示/排错
    return res.status(502).json({
      error: 'ConvAI error',
      status: resp.status,
      details: resp.data || null,
    });
  } catch (err) {
    // 网络/超时等
    if (err.code === 'ECONNABORTED') {
      console.error('❌ ConvAI 超时');
      return res.status(504).json({ error: 'ConvAI timeout' });
    }
    if (err.response) {
      console.error('❌ ConvAI 响应错误：', err.response.status, err.response.data);
      return res.status(502).json({ error: 'ConvAI bad response', status: err.response.status, details: err.response.data });
    }
    console.error('❌ ConvAI 请求异常：', err.message);
    return res.status(500).json({ error: 'ConvAI request failed', details: err.message });
  }
});

module.exports = router;
