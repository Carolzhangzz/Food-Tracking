// === Gemini API 诊断工具 (动态导入版本) ===
const express = require("express");
const router = express.Router();

// 全局变量存储 Gemini AI 实例
let ai = null;
let GoogleGenAI = null;

// 异步初始化 Gemini AI
async function initializeGeminiAI() {
  if (!ai && !GoogleGenAI) {
    try {
      // 动态导入 ES Module
      const geminiModule = await import("@google/genai");
      GoogleGenAI = geminiModule.GoogleGenAI;

      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });

      console.log("=== Gemini 初始化成功 ===");
      console.log(
        "API Key 状态:",
        process.env.GEMINI_API_KEY ? "exists" : "missing"
      );
      console.log(
        "API Key:",
        process.env.GEMINI_API_KEY
          ? process.env.GEMINI_API_KEY.substring(0, 10) + "..."
          : "未设置"
      );
    } catch (error) {
      console.error("Gemini 初始化失败:", error);
      throw error;
    }
  }
  return ai;
}

// 完全匹配前端期望的 gemini-chat 接口
router.post("/gemini-chat", async (req, res) => {
  console.log("=== Gemini Chat API 调用 ===");
  console.log("请求体:", req.body);

  const {
    userInput,
    npcId,
    mealType,
    dialogHistory,
    mealAnswers,
    turnCount = 0,
    questionControl = {}, // 新增：问题控制信息
  } = req.body;

  // 基本验证
  if (!userInput || !npcId) {
    return res.status(400).json({
      success: false,
      error: "缺少必要参数: userInput 或 npcId",
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY 未设置",
    });
  }

  try {
    // 确保 Gemini AI 已初始化
    const geminiAI = await initializeGeminiAI();

    // 检查是否应该结束对话
    if (shouldEndDialog(turnCount, questionControl, userInput)) {
      return res.json({
        success: true,
        message: "Thanks for sharing your meal with me!",
        isComplete: true,
      });
    }

    const systemPrompt = generateImprovedSystemPrompt(npcId, questionControl);
    console.log("系统提示词长度:", systemPrompt.length);

    // 构建内容数组
    let contents = buildImprovedContents(
      systemPrompt,
      mealType,
      mealAnswers,
      dialogHistory,
      userInput,
      questionControl
    );

    console.log("发送内容数量:", contents.length);
    console.log("用户输入:", userInput);

    // Gemini API 调用 - 尝试多个模型
    let response;
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];

    let lastError = null;
    for (const model of modelsToTry) {
      try {
        console.log(`尝试模型: ${model}`);

        response = await geminiAI.models.generateContent({
          model: model,
          contents: contents,
          config: {
            temperature: 0.7,
            maxOutputTokens: 150,
            topP: 1,
            // 对于 Gemini 2.5，可以禁用思考功能来减少延迟
            ...(model.includes("2.5") && {
              thinkingConfig: {
                thinkingBudget: 0, // 禁用思考功能
              },
            }),
          },
        });

        console.log(`✅ 模型 ${model} 成功`);
        break;
      } catch (error) {
        console.log(`❌ 模型 ${model} 失败:`, error.message);
        lastError = error;
        continue;
      }
    }

    if (!response) {
      throw lastError || new Error("所有模型都不可用");
    }

    const reply = response.text || "";
    console.log("Gemini 响应:", reply.substring(0, 100) + "...");

    // 检查是否包含结束语
    const containsEnding = detectEndingInResponse(reply);
    console.log("是否包含结束语:", containsEnding);

    // 返回完全匹配前端期望的格式
    res.json({
      success: true,
      message: reply,
      isComplete: containsEnding,
    });
  } catch (err) {
    console.error("Gemini API 错误:", err);

    // 返回匹配前端期望的错误格式
    res.status(500).json({
      success: false,
      error: "Gemini API 调用失败",
      details: err.message,
    });
  }
});

// 新增：检查是否应该结束对话
function shouldEndDialog(turnCount, questionControl, userInput) {
  // 检查轮数限制
  if (turnCount >= 6) {
    return true;
  }

  // 检查问题完成情况
  if (questionControl.currentQuestionIndex >= 3) {
    return true;
  }

  // 检查是否是明确的结束信号
  const lowerInput = userInput.toLowerCase();
  const endSignals = [
    "谢谢",
    "完成了",
    "结束",
    "thanks",
    "done",
    "finish",
    "complete",
  ];
  if (endSignals.some((signal) => lowerInput.includes(signal))) {
    return true;
  }

  return false;
}

// 新增：检测响应中的结束语
function detectEndingInResponse(response) {
  const lowerResponse = response.toLowerCase();

  // 如果是问句，不是结束
  if (/\?\s*$/.test(lowerResponse)) {
    return false;
  }

  // 检测结束关键词
  const endingPhrases = [
    "thanks for sharing your meal with me",
    "thank you for sharing your meal with me",
    "谢谢你详细的分享",
    "谢谢你与我分享餐食",
    "我已经记录下了你的餐食信息",
    "记录完成",
    "good job! keep doing this",
    "little by little, you'll start to understand",
  ];

  return endingPhrases.some((phrase) => lowerResponse.includes(phrase));
}

// 新增：构建改进的内容数组
function buildImprovedContents(
  systemPrompt,
  mealType,
  mealAnswers,
  dialogHistory,
  userInput,
  questionControl
) {
  let contents = [];

  // 添加系统指令
  contents.push({
    role: "user",
    parts: [{ text: `System: ${systemPrompt}` }],
  });

  contents.push({
    role: "model",
    parts: [
      {
        text: "I understand my role and will follow the instructions to avoid repetitive questions.",
      },
    ],
  });

  // 添加餐食类型信息
  if (mealType) {
    contents.push({
      role: "user",
      parts: [{ text: `I want to record my ${mealType}.` }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Great! I'll help you record your meal." }],
    });
  }

  // 添加固定问题的答案
  if (mealAnswers && Object.keys(mealAnswers).length > 0) {
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
      contents.push({
        role: "user",
        parts: [{ text: answersText }],
      });
      contents.push({
        role: "model",
        parts: [
          { text: "Thank you. Now tell me more about your meal experience." },
        ],
      });
    }
  }

  // 添加问题控制信息
  if (questionControl.currentQuestionIndex !== undefined) {
    const controlText = `Question Control: Currently at question ${
      questionControl.currentQuestionIndex + 1
    } of 3. Asked questions: ${
      questionControl.askedQuestions?.join(", ") || "none"
    }.`;
    contents.push({
      role: "user",
      parts: [{ text: controlText }],
    });
    contents.push({
      role: "model",
      parts: [
        {
          text: "Understood. I will follow the question sequence and not repeat questions.",
        },
      ],
    });
  }

  // 添加对话历史（限制数量）
  if (dialogHistory && dialogHistory.length > 0) {
    const recentHistory = dialogHistory.slice(-4);
    recentHistory.forEach((entry) => {
      if (entry.type === "assistant") {
        contents.push({
          role: "model",
          parts: [{ text: entry.content }],
        });
      } else if (entry.type === "user") {
        contents.push({
          role: "user",
          parts: [{ text: entry.content }],
        });
      }
    });
  }

  // 添加当前用户输入
  contents.push({
    role: "user",
    parts: [{ text: userInput }],
  });

  return contents;
}

// 保持你原有的系统提示词函数
// 改进的系统提示词生成
function generateImprovedSystemPrompt(npcId, questionControl = {}) {
  const basePrompt = `You are helping a player record their meal. 

CRITICAL INSTRUCTION: You must ask questions in sequence and NEVER repeat a question once answered.

Question sequence:
Q1: "What did you have for [meal type]?"
Q2: "What portion size did you eat? How did you decide on that amount? How did you feel physically during or after eating?"
Q3: "Why did you choose this particular food/meal? For example, convenience, craving, or health?"

Current progress: Question ${
    (questionControl.currentQuestionIndex || 0) + 1
  } of 3
Already asked: ${questionControl.askedQuestions?.join(", ") || "none"}

RULES:
1. Ask ONE question at a time
2. Wait for the user's answer before moving to the next question  
3. NEVER repeat a question that has been asked
4. After all 3 questions are answered, say "Thanks for sharing your meal with me!" and stop
5. Keep responses under 50 words
6. Stay in character as the NPC

`;

  const npcPersonalities = {
    village_head:
      "You are Uncle Bo, the village head. Speak calmly and wisely.",
    shop_owner:
      "You are the village shopkeeper. Be practical and knowledgeable about ingredients.",
    spice_woman:
      "You are the village spice woman. Be mystical and intuitive about flavors.",
    restaurant_owner:
      "You are the village restaurant owner. Be enthusiastic about cooking.",
    fisherman:
      "You are the village fisherman. Be simple, direct, and wise about simple living.",
    old_friend: "You are Chef Hua's old friend. Be nostalgic and gentle.",
    secret_apprentice:
      "You are Chef Hua's secret apprentice. Be young, eager but cautious.",
  };

  return (
    basePrompt + (npcPersonalities[npcId] || npcPersonalities.village_head)
  );
}

module.exports = router;

/*

=== 安装步骤 ===

1. 确保安装了 Gemini SDK:
npm install @google/genai

2. 设置环境变量 (.env 文件):
GEMINI_API_KEY=your_gemini_api_key_here

3. 在你的 app.js 中确保正确导入:
const geminiRoutes = require('./routes/geminiRoutes');
app.use('/api', geminiRoutes);

=== 测试命令 ===

curl -X POST http://localhost:3001/api/gemini-chat \
  -H "Content-Type: application/json" \
  -d '{"userInput": "Hello", "npcId": "village_head"}'
*/
