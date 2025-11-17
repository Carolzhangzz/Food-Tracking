// geminiRoutes.js - 修复版本
// 修复问题：
// 1. 添加缺失的 getDefaultResponse 函数
// 2. 添加缺失的 shouldEndBasedOnControl 函数
// 3. 修复 Gemini API 数据格式问题

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
      const geminiModule = await import("@google/generative-ai");
      GoogleGenAI = geminiModule.GoogleGenerativeAI;

      ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

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

// 🔧 新增：获取默认响应的函数
function getDefaultResponse(questionControl, mealType) {
  const currentIndex = questionControl?.currentQuestionIndex || 0;
  
  // 根据餐食类型和问题索引返回对应的固定对话
  const responses = {
    breakfast: [
      "What did you have for breakfast, my child? Chef Hua once made me a small bowl of congee—soft yam pieces, a sprinkle of sesame on top.",
      "That sounds nice, child. How much did you have? I took a medium bowl—too much makes the day feel heavy.",
      "Oh? And what made you choose that, child? Decisions aren't always easy, are they?",
      "Good decision. How did your body feel, my child—while you ate, or after?",
      "Why did you choose this meal, my child? You've always had your reasons—wise ones, I'm sure."
    ],
    lunch: [
      "What did you have for lunch, my child? I just finished steamed rice, a small clay pot of braised tofu, and some greens from the garden.",
      "Wow, love it! What portion size did you have? Chef Hua always praised your sense for portions.",
      "Oh? How did you decide that amount? Your master used to weigh every portion by feeling alone.",
      "Great! How did your body feel, as you ate… and after? Your master always said the body speaks softly, if we care to listen.",
      "What made you choose this meal, my child? Chef Hua always believed our cravings have stories to tell."
    ],
    dinner: [
      "Evening's come, my child. What did you have for dinner? I made a little soup with lotus root and mushrooms.",
      "Ah, that sounds comforting. How much did you have?",
      "Hmm… and what guided you to eat that amount? Chef Hua used to say a good cook measures without scale.",
      "Tell me truly—did the meal sit well within you? How did your body feel?",
      "And why that dish tonight? Sometimes what we choose to eat tells us what we're missing in spirit."
    ]
  };

  const mealResponses = responses[mealType] || responses.breakfast;
  
  // 如果已经问完所有问题，返回结束语
  if (currentIndex >= mealResponses.length) {
    return "Thanks for sharing your meal with me! I have recorded your meal information.";
  }
  
  return mealResponses[currentIndex] || "Tell me more about your meal.";
}

// 🔧 新增：判断是否应该结束的函数
function shouldEndBasedOnControl(questionControl, turnCount) {
  const currentIndex = questionControl?.currentQuestionIndex || 0;
  const maxQuestions = questionControl?.maxQuestions || 5;
  
  // 如果已经问完所有问题
  if (currentIndex >= maxQuestions) {
    return true;
  }
  
  // 如果轮数过多
  if (turnCount >= 6) {
    return true;
  }
  
  return false;
}

// 完全匹配前端期望的 gemini-chat 接口
router.post("/gemini-chat", async (req, res) => {
  console.log("=== Gemini Chat API 调用 ===");
  console.log("请求体:", JSON.stringify(req.body, null, 2));

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
    console.log("⚠️ GEMINI_API_KEY 未设置，使用默认响应");
    return res.json({
      success: true,
      message: getDefaultResponse(questionControl, mealType),
      isComplete: shouldEndBasedOnControl(questionControl, turnCount),
    });
  }

  try {
    // 🔧 关键修复：先检查是否应该结束
    if (shouldEndDialog(turnCount, questionControl, userInput)) {
      return res.json({
        success: true,
        message:
          "Thanks for sharing your meal with me! I have recorded your meal information.",
        isComplete: true,
      });
    }

    // 确保 Gemini AI 已初始化
    const geminiAI = await initializeGeminiAI();

    const systemPrompt = generateImprovedSystemPrompt(npcId, questionControl);
    console.log("系统提示词长度:", systemPrompt.length);

    // 🔧 修复：构建内容数组，确保所有parts都有有效的text
    let contents = buildImprovedContents(
      systemPrompt,
      mealType,
      mealAnswers,
      dialogHistory,
      userInput,
      questionControl
    );

    // 🔧 关键修复：验证和清理contents
    contents = contents.filter(content => {
      if (!content.parts || content.parts.length === 0) {
        console.warn("⚠️ 发现空的parts，已过滤");
        return false;
      }
      
      // 确保每个part都有text
      content.parts = content.parts.filter(part => {
        if (!part.text || part.text.trim() === '') {
          console.warn("⚠️ 发现空的text，已过滤");
          return false;
        }
        return true;
      });
      
      return content.parts.length > 0;
    });

    console.log("发送内容数量:", contents.length);
    console.log("问题控制状态:", questionControl);

    // Gemini API 调用 - 尝试多个模型
    let response;
    const modelsToTry = ["gemini-2.0-flash-exp", "gemini-1.5-flash"];

    let lastError = null;
    for (const model of modelsToTry) {
      try {
        console.log(`🔄 尝试模型: ${model}`);

        const modelInstance = geminiAI.getGenerativeModel({ 
          model: model,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
            topP: 0.9,
          },
        });
        
        const result = await modelInstance.generateContent({
          contents: contents,
        });

        // 🔧 修复：正确提取文本内容（新 API 格式）
        let text = "";
        try {
          text = result.response.text();
        } catch (e) {
          // 如果 text() 不是函数，尝试从 candidates 提取
          if (result.response && result.response.candidates) {
            const candidate = result.response.candidates[0];
            if (candidate && candidate.content && candidate.content.parts) {
              text = candidate.content.parts
                .map((part) => part.text || "")
                .join("");
            }
          }
        }

        response = text.trim();
        console.log(`✅ 模型 ${model} 成功，响应长度:`, response.length);
        break;
      } catch (error) {
        console.log(`❌ 模型 ${model} 失败:`, error.message);
        if (error.response) {
          console.log("错误详情:", JSON.stringify(error.response.data || error.response, null, 2));
        }
        lastError = error;
        continue;
      }
    }

    if (!response) {
      console.log("🔄 所有 Gemini 模型失败，使用默认响应");
      response = getDefaultResponse(questionControl, mealType);
    }

    console.log("📤 最终响应:", response.substring(0, 100) + "...");

    // 检查是否包含结束语
    const containsEnding = detectEndingInResponse(response);
    console.log("🏁 是否包含结束语:", containsEnding);

    // 返回完全匹配前端期望的格式
    res.json({
      success: true,
      message: response,
      isComplete: containsEnding,
    });
  } catch (err) {
    console.error("💥 Gemini API 错误:", err);
    console.error("错误堆栈:", err.stack);

    // 出错时使用默认响应
    const fallbackResponse = getDefaultResponse(questionControl, mealType);
    res.json({
      success: true, // 注意：即使 Gemini 出错，我们也返回成功，使用默认响应
      message: fallbackResponse,
      isComplete: shouldEndBasedOnControl(questionControl, turnCount),
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
  if (questionControl.currentQuestionIndex >= 5) {
    return true;
  }

  // 检查是否是明确的结束信号
  const lowerInput = (userInput || '').toLowerCase();
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
  const lowerResponse = (response || '').toLowerCase();

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

// 🔧 修复：构建改进的内容数组，确保所有数据都有效
function buildImprovedContents(
  systemPrompt,
  mealType,
  mealAnswers,
  dialogHistory,
  userInput,
  questionControl
) {
  let contents = [];

  // 添加系统指令 - 确保text不为空
  if (systemPrompt && systemPrompt.trim()) {
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
  }

  // 添加餐食类型信息
  if (mealType && mealType.trim()) {
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
    let hasContent = false;
    
    if (mealAnswers.obtainMethod && mealAnswers.obtainMethod.text) {
      answersText += `How I got it: ${mealAnswers.obtainMethod.text}\n`;
      hasContent = true;
    }
    if (mealAnswers.mealTime && mealAnswers.mealTime.text) {
      answersText += `When I ate: ${mealAnswers.mealTime.text}\n`;
      hasContent = true;
    }
    if (mealAnswers.duration && mealAnswers.duration.text) {
      answersText += `Duration: ${mealAnswers.duration.text}\n`;
      hasContent = true;
    }

    if (hasContent) {
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
    contents.push({
      role: "user",
      parts: [
        {
          text: `Current question index: ${questionControl.currentQuestionIndex}, Already asked: ${questionControl.askedQuestions?.join(", ") || "none"}`,
        },
      ],
    });
  }

  // 添加对话历史 - 确保内容有效
  if (dialogHistory && Array.isArray(dialogHistory) && dialogHistory.length > 0) {
    dialogHistory.forEach((entry) => {
      if (entry.content && entry.content.trim()) {
        const role = entry.type === "user" ? "user" : "model";
        contents.push({
          role: role,
          parts: [{ text: entry.content }],
        });
      }
    });
  }

  // 添加当前用户输入 - 确保不为空
  if (userInput && userInput.trim()) {
    contents.push({
      role: "user",
      parts: [{ text: userInput }],
    });
  }

  return contents;
}

// 改进的系统提示词生成
function generateImprovedSystemPrompt(npcId, questionControl = {}) {
  const basePrompt = `You are helping a player record their meal. 

CRITICAL INSTRUCTION: You must ask questions in sequence and NEVER repeat a question once answered.

Current progress: Question ${(questionControl.currentQuestionIndex || 0) + 1} of 5
Already asked: ${questionControl.askedQuestions?.join(", ") || "none"}

RULES:
1. Ask ONE question at a time
2. Wait for the user's answer before moving to the next question  
3. NEVER repeat a question that has been asked
4. After all 5 questions are answered, say "Thanks for sharing your meal with me!" and stop
5. Keep responses under 50 words
6. Stay in character as the NPC

`;

  const npcPersonalities = {
    village_head: `You are Uncle Bo, the village head of Gourmet Village. Speak like a calm, reflective elder with gentle, warm words.

FIXED DIALOGUE SEQUENCE FOR BREAKFAST (use exactly as written, in this order):
1. "What did you have for breakfast, my child? Chef Hua once made me a small bowl of congee—soft yam pieces, a sprinkle of sesame on top."
2. "That sounds nice, child. How much did you have? I took a medium bowl—too much makes the day feel heavy."
3. "Oh? And what made you choose that, child? Decisions aren't always easy, are they?"
4. "Good decision. How did your body feel, my child—while you ate, or after?"
5. "Why did you choose this meal, my child? You've always had your reasons—wise ones, I'm sure."

FIXED DIALOGUE SEQUENCE FOR LUNCH (use exactly as written, in this order):
1. "What did you have for lunch, my child? I just finished steamed rice, a small clay pot of braised tofu, and some greens from the garden."
2. "Wow, love it! What portion size did you have? Chef Hua always praised your sense for portions."
3. "Oh? How did you decide that amount? Your master used to weigh every portion by feeling alone."
4. "Great! How did your body feel, as you ate… and after? Your master always said the body speaks softly, if we care to listen."
5. "What made you choose this meal, my child? Chef Hua always believed our cravings have stories to tell."

FIXED DIALOGUE SEQUENCE FOR DINNER (use exactly as written, in this order):
1. "Evening's come, my child. What did you have for dinner? I made a little soup with lotus root and mushrooms."
2. "Ah, that sounds comforting. How much did you have?"
3. "Hmm… and what guided you to eat that amount? Chef Hua used to say a good cook measures without scale."
4. "Tell me truly—did the meal sit well within you? How did your body feel?"
5. "And why that dish tonight? Sometimes what we choose to eat tells us what we're missing in spirit."`,
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