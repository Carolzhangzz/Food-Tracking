// 新增依赖
const express = require("express");
const fetch = require("node-fetch"); // 如果你用的是 node-fetch
const router = express.Router();

// 新增 POST /convai-chat 路由
router.post("/convai-chat", async (req, res) => {
  const { userText, charID, sessionID, voiceResponse } = req.body;

  try {
    const formData = new URLSearchParams();
    formData.append("userText", userText);
    formData.append("charID", charID);
    formData.append("sessionID", sessionID);
    formData.append("voiceResponse", voiceResponse);

    const response = await fetch("https://api.convai.com/character/getResponse", {
      method: "POST",
      headers: {
        "CONVAI-API-KEY": process.env.CONVAI_API_KEY, // 你可以从 .env 获取
      },
      body: formData,
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Convai proxy error:", err);
    res.status(500).json({ error: "Convai API failed" });
  }
});

module.exports = router;
