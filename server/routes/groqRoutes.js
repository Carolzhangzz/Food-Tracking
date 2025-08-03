// === 最终 Groq API 诊断工具 ===
const express = require("express");
const router = express.Router();
const { Groq } = require("groq-sdk");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

console.log("=== Groq 初始化 ===");
console.log("API Key 状态:", process.env.GROQ_API_KEY ? "exists" : "missing");
//把api key 打印出来
console.log("API Key:", process.env.GROQ_API_KEY || "未设置");

// 完全匹配前端期望的 groq-chat 接口
router.post("/groq-chat", async (req, res) => {
  console.log("=== Groq Chat API 调用 ===");
  console.log("请求体:", req.body);

  const { userInput, npcId, mealType, dialogHistory, mealAnswers } = req.body;

  // 基本验证
  if (!userInput || !npcId) {
    return res.status(400).json({
      success: false,
      error: "缺少必要参数: userInput 或 npcId",
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "GROQ_API_KEY 未设置",
    });
  }

  try {
    const systemPrompt = generateSystemPrompt(npcId);
    console.log("系统提示词长度:", systemPrompt.length);

    // 构建消息 - 完全匹配前端期望
    const messages = [{ role: "system", content: systemPrompt }];

    // 添加餐食类型信息
    if (mealType) {
      messages.push({
        role: "user",
        content: `I want to record my ${mealType}.`,
      });
      messages.push({
        role: "assistant",
        content: "Great! I'll help you record your meal.",
      });
    }

    // 添加固定问题的答案
    if (mealAnswers) {
      let answersText = "My meal details:\n";
      if (mealAnswers.obtainMethod) {
        answersText += `How I got it: ${mealAnswers.obtainMethod.text}\n`;
      }
      if (mealAnswers.mealTime) {
        answersText += `When I ate: ${mealAnswers.mealTime.text}\n`;
      }
      if (mealAnswers.duration) {
        answersText += `Duration: ${mealAnswers.duration.text}\n`;
      }

      if (answersText !== "My meal details:\n") {
        messages.push({ role: "user", content: answersText });
        messages.push({
          role: "assistant",
          content: "Thank you. Now tell me more about your meal experience.",
        });
      }
    }

    // 添加对话历史（限制数量）
    if (dialogHistory && dialogHistory.length > 0) {
      const recentHistory = dialogHistory.slice(-4);
      recentHistory.forEach((entry) => {
        if (entry.type === "assistant") {
          messages.push({ role: "assistant", content: entry.content });
        } else if (entry.type === "user") {
          messages.push({ role: "user", content: entry.content });
        }
      });
    }

    // 添加当前用户输入
    messages.push({ role: "user", content: userInput });

    console.log("发送消息数量:", messages.length);
    console.log("用户输入:", userInput);

    // API 调用 - 尝试多个模型
    let completion;
    const modelsToTry = [
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "gemma2-9b-it",
    ];

    let lastError = null;
    for (const model of modelsToTry) {
      try {
        console.log(`尝试模型: ${model}`);
        completion = await groq.chat.completions.create({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 150,
          top_p: 1,
          stream: false,
          stop: null,
        });

        console.log(`✅ 模型 ${model} 成功`);
        break;
      } catch (error) {
        console.log(`❌ 模型 ${model} 失败:`, error.message);
        lastError = error;
        continue;
      }
    }

    if (!completion) {
      throw lastError || new Error("所有模型都不可用");
    }

    const reply = completion.choices[0]?.message?.content || "";
    console.log("Groq 响应:", reply.substring(0, 100) + "...");

    // 检查是否包含结束语
    const containsEnding = reply
      .toLowerCase()
      .includes("thanks for sharing your meal with me");
    console.log("是否包含结束语:", containsEnding);

    // 返回完全匹配前端期望的格式
    res.json({
      success: true,
      message: reply,
      isComplete: containsEnding,
      // 注意：不包含 model 字段，因为前端不需要
    });
  } catch (err) {
    console.error("Groq API 错误:", err);

    // 返回匹配前端期望的错误格式
    res.status(500).json({
      success: false,
      error: "Groq API 调用失败",
      details: err.message,
    });
  }
});

// 保持你原有的系统提示词函数
function generateSystemPrompt(npcId) {
  const prompts = {
    village_head: `You are Uncle Bo, the village head. You help players record their meals through conversation.

Your personality: Calm, reflective elder who speaks gently. Use short sentences.

Ask these questions in sequence:
1. "What did you have for your meal?"
2. "What portion size did you eat? How did you decide on that amount?"
3. "Why did you choose this particular food?"

Give brief, warm responses between questions. End with "Thanks for sharing your meal with me." when done.

Keep responses under 50 words.`,

    shop_owner: `You are the village shopkeeper. You knew Chef Hua well. Help record meals while sharing insights about ingredients.

Follow the same question sequence with your practical, knowledgeable personality.`,

    spice_woman: `You are the village spice woman. You're mysterious and wise about herbs and spices.

Follow the same question sequence, focusing on flavors and deeper meanings.`,

    restaurant_owner: `You are the village restaurant owner. You're passionate about cooking and respect Chef Hua.

Follow the same question sequence with your chef's perspective.`,

    fisherman: `You are the village fisherman. You're simple, direct, but wise about simple living.

Follow the same question sequence with your down-to-earth personality.`,

    old_friend: `You are Chef Hua's old friend. You're nostalgic and gentle.

Follow the same question sequence while reminiscing about memories.`,

    secret_apprentice: `You are Chef Hua's secret apprentice. You're young, eager, but careful.

Follow the same question sequence with enthusiasm but caution.`,
  };

  return prompts[npcId] || prompts.village_head;
}

module.exports = router;

// /*
// === 测试步骤 ===

// 1. 首先测试官方模板:
// curl -X POST http://localhost:3001/api/test-template

// 2. 如果成功，测试 generate:
// curl -X POST http://localhost:3001/api/generate \
//   -H "Content-Type: application/json" \
//   -d '{"prompt": "Hello"}'

// 3. 最后测试 groq-chat:
// curl -X POST http://localhost:3001/api/groq-chat \
//   -H "Content-Type: application/json" \
//   -d '{"userInput": "Hello", "npcId": "village_head"}'

// === 关键变化 ===

// 1. 使用 "llama-3.3-70b-versatile" 模型
// 2. 使用官方模板的确切参数
// 3. 设置 stream: false (不使用流式)
// 4. 使用 max_tokens 而不是 max_completion_tokens
// 5. 简化了消息构建逻辑
