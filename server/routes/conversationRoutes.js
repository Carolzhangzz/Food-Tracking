
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/convai-chat', async (req, res) => {
  const { userText, charID, sessionID, voiceResponse } = req.body;
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
          "CONVAI-API-KEY": process.env.CONVAI_API_KEY,
        },   
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("ConvAI error:", error.response?.data || error.message);
    res.status(500).json({
      error: "ConvAI API call failed",
      detail: error.response?.data || error.message,
    });
  }
});

module.exports = router;
