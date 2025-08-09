const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/convai-chat', async (req, res) => {
  try {
    // 1. 提取并校验必填参数
    const { userText, charID, sessionID, voiceResponse } = req.body;

    // 检查关键参数是否存在
    if (!userText || userText.trim() === '') {
      console.error("ConvAI请求失败：缺少userText或内容为空");
      return res.status(400).json({
        error: "Missing required field: userText (cannot be empty)",
        detail: "用户输入内容不能为空"
      });
    }

    if (!charID || charID.trim() === '') {
      console.error("ConvAI请求失败：缺少charID或内容为空");
      return res.status(400).json({
        error: "Missing required field: charID (cannot be empty)",
        detail: "NPC角色ID不能为空"
      });
    }

    // 2. 检查API密钥是否配置
    if (!process.env.CONVAI_API_KEY) {
      console.error("ConvAI请求失败：未配置CONVAI_API_KEY环境变量");
      return res.status(500).json({
        error: "Server configuration error",
        detail: "ConvAI API密钥未配置"
      });
    }

    // 3. 构建请求参数（确保格式正确）
    const formData = new URLSearchParams();
    formData.append("userText", userText.trim()); // 去除首尾空格
    formData.append("charID", charID.trim());
    formData.append("sessionID", sessionID?.trim() || "-1"); // 处理可能的空值
    formData.append("voiceResponse", voiceResponse === true ? "True" : "False");

    console.log(`发送ConvAI请求：charID=${charID}, userText=${userText.substring(0, 30)}...`);

    // 4. 调用ConvAI API
    const response = await axios.post(
      "https://api.convai.com/character/getResponse",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "CONVAI-API-KEY": process.env.CONVAI_API_KEY,
        },
        timeout: 10000, // 10秒超时，避免长期阻塞
      }
    );

    console.log(`ConvAI响应成功：charID=${charID}, 响应长度=${response.data.length || '未知'}`);
    res.json(response.data);

  } catch (error) {
    // 5. 精细化错误处理
    let errorMsg = "ConvAI API call failed";
    let errorDetail = "";
    let statusCode = 500;

    if (error.code === 'ECONNABORTED') {
      // 超时错误
      errorMsg = "ConvAI API request timed out";
      errorDetail = "请求ConvAI服务超时，请稍后重试";
    } else if (error.response) {
      // 服务器返回错误响应（如401、403、404等）
      statusCode = error.response.status;
      errorDetail = error.response.data || `HTTP ${statusCode} response`;
      console.error(`ConvAI API返回错误：status=${statusCode}, data=${JSON.stringify(errorDetail)}`);
    } else if (error.request) {
      // 无响应（网络问题）
      errorDetail = "No response received from ConvAI API (network issue)";
      console.error(`ConvAI API无响应：${error.message}`);
    } else {
      // 其他错误（如参数处理错误）
      errorDetail = error.message;
      console.error(`ConvAI请求准备失败：${error.message}`);
    }

    // 根据错误类型返回更准确的状态码
    res.status(statusCode).json({
      error: errorMsg,
      detail: errorDetail,
      charID: req.body.charID || "unknown" // 方便定位哪个NPC出错
    });
  }
});

module.exports = router;