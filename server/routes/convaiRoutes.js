const express = require('express');
const router = express.Router();
const axios = require('axios');

// 🔧 获取所有可用的 ConvAI API Keys
const getConvAIKeys = () => {
  const keys = [];
  // 查找 CONVAI_API_KEY, CONVAI_API_KEY_2, CONVAI_API_KEY_3 等
  if (process.env.CONVAI_API_KEY) keys.push(process.env.CONVAI_API_KEY);
  
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('CONVAI_API_KEY_') && process.env[key]) {
      keys.push(process.env[key]);
    }
  });
  return keys;
};

router.post('/convai-chat', async (req, res) => {
  const { userText, charID, sessionID, voiceResponse } = req.body;
  const apiKeys = getConvAIKeys();
  
  if (apiKeys.length === 0) {
    return res.status(500).json({ error: "No ConvAI API Keys configured" });
  }

  let lastError = null;

  // 🔄 轮询尝试每个 Key
  for (let i = 0; i < apiKeys.length; i++) {
    const currentKey = apiKeys[i];
    try {
      const formData = new URLSearchParams();
      formData.append("userText", userText);
      formData.append("charID", charID);
      formData.append("sessionID", sessionID || "-1");
      formData.append("voiceResponse", voiceResponse || "False");

      const response = await axios.post(
        "https://api.convai.com/character/getResponse",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "CONVAI-API-KEY": currentKey,
          },
          timeout: 10000 // 10秒超时
        }
      );

      // 如果成功，直接返回
      console.log(`✅ ConvAI 使用 Key #${i + 1} 成功`);
      return res.json(response.data);

    } catch (error) {
      const errorData = error.response?.data || error.message;
      const errorMsg = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
      
      lastError = errorData;

      // 🔍 检查是否为额度超限错误
      const isLimitExceeded = errorMsg.includes("exceeded usage limits") || 
                             (error.response?.status === 429) ||
                             (error.response?.status === 403 && errorMsg.includes("limit"));

      if (isLimitExceeded) {
        console.warn(`⚠️ ConvAI Key #${i + 1} 额度已耗尽，尝试下一个...`);
        continue; // 尝试循环中的下一个 Key
      } else {
        // 如果是其他类型的错误（如参数错误），直接报错不再重试
        console.error(`❌ ConvAI Key #${i + 1} 报错:`, errorData);
        break; 
      }
    }
  }

  // 如果所有 Key 都失败了
  res.status(500).json({
    error: "All ConvAI API calls failed",
    detail: lastError,
  });
});

module.exports = router;