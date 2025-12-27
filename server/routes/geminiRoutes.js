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

// 🔧 新增：获取默认响应的函数 (当 Gemini 失败时)
function getDefaultResponse(questionControl, mealType, language = "en") {
  const currentId = questionControl?.currentQuestionId || "Q4";
  
  const responses = {
    Q1: {
      en: "Ah, I see. How is your meal obtained? A. Home-cooked, B. Restaurant, C. Takeout, D. Ready-to-eat.",
      zh: "原来如此。那你的这顿饭是怎么获得的？A. 家里做的, B. 在餐厅吃, C. 外卖, D. 即食餐。"
    },
    Q2: {
      en: "What time did you have this meal, my child?",
      zh: "你是什么时候吃的这顿饭，孩子？"
    },
    Q3: {
      en: "And how long did you spend eating it?",
      zh: "那你吃了多久呢？"
    },
    Q_TIME_FOLLOWUP: {
      en: "That's an unusual time. Why did you eat at this time rather than earlier or later?",
      zh: "这个时间挺少见的。为什么在这个时间吃饭，而不是早一点或晚一点？"
    },
    Q4: {
      en: `What did you have for ${mealType}? I just finished a small bowl of congee with soft yam.`,
      zh: `那你${mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'}吃了什么呢？我刚喝了一小碗山药粥。`
    },
    Q5: {
      en: "What portion size did you eat? How did you decide on that amount? How did you feel physically during or after eating?",
      zh: "你吃了多少份量？你是如何决定这个份量的？吃的时候或吃完后身体感觉如何？"
    },
    Q6: {
      en: "Why did you choose this particular food? Simply convenient, or a craving?",
      zh: "为什么选择吃这个呢？是因为方便，还是想吃？"
    }
  };

  const msgSet = responses[currentId] || responses.Q4;
  return msgSet[language] || msgSet.en;
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
    const lang = req.body.language || "en";
    return res.json({
      success: true,
      message: getDefaultResponse(questionControl, mealType, lang),
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

    const systemPrompt = generateImprovedSystemPrompt(npcId, questionControl, mealType);
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
    const lang = req.body.language || "en";
    const fallbackResponse = getDefaultResponse(questionControl, mealType, lang);
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
    "谢谢你和我分享这顿饭",
    "谢谢你详细的分享",
    "谢谢你与我分享餐食",
    "我已经记录下了你的餐食信息",
    "记录完成",
    // 🔧 移除 "good job! keep doing this" 避免误判
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
      parts: [{ text: systemPrompt }],
    });

    contents.push({
      role: "model",
      parts: [
        {
          text: "I understand. I will play my role and ask only the specified current question.",
        },
      ],
    });
  }

  // 添加上下文摘要
  let contextSummary = `User is recording their ${mealType}. `;
  if (mealAnswers && Object.keys(mealAnswers).length > 0) {
    contextSummary += "Previous answers: " + JSON.stringify(mealAnswers);
  }
  
  contents.push({
    role: "user",
    parts: [{ text: contextSummary }],
  });
  
  contents.push({
    role: "model",
    parts: [{ text: "Acknowledged." }],
  });

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

// 🔧 改进的系统提示词生成 - 整合详细的Uncle Bo设定
function generateImprovedSystemPrompt(npcId, questionControl = {}, mealType = "breakfast") {
  const currentQ = questionControl.currentQuestionId || "Q4";
  const progress = (questionControl.currentQuestionIndex || 0) + 1;
  
  const basePrompt = `You are playing the role of an NPC in an interactive game. 
YOUR PRIMARY GOAL: Ask the player the CURRENT question specified below in your unique character voice.

CURRENT TASK:
- You must ask about: ${currentQ}
- Progress: ${progress} of 6 questions

STRICT RULES:
1. DO NOT skip ahead. ONLY ask the current question.
2. Keep your response CONCISE (max 20 words).
3. Do not expose inner thoughts.
4. Share a tiny bit of your own meal or a master's memory if it fits your character.
5. If the current question is Q1, Q2, or Q3, remember that the player will see BUTTONS to answer, so your question should lead naturally to those choices.

CHARACTER VOICE:
`;

  const npcPersonalities = {
    uncle_bo: `You are Uncle Bo, the village head. A calm, reflective elder. 
His tone is gentle and slow-paced. He guides through suggestion.
Example: "Ah, breakfast... the most important start. Tell me, child, how did you get your meal today?" (for Q1)

Background: Long-time friend of missing Chef Hua. Suggests player follows Hua's journaling method to find clues.`,
// ... rest remains same or similar ...

    
    village_head: "You are the village head. Be authoritative yet caring.",
    shop_owner: "You are the shop owner, Grace. Practical, busy but friendly.",
    spice_granny: "You are the village spice woman. Be mystical and intuitive about flavors.",
    restaurant_owner: "You are the village restaurant owner. Be enthusiastic about cooking.",
    fisherman: "You are a quiet fisherman. Reflective and calm.",
    old_friend: "You are an old friend of the master. Nostalgic and helpful.",
    secret_apprentice: "You are the final apprentice, Mira. Mysterious and insightful."
  };

  const personality = npcPersonalities[npcId] || npcPersonalities.uncle_bo;
  
  return basePrompt + personality + `\n\nJOURNALING CONTEXT:\n- Meal type: ${mealType}\n- Question definitions:\n  Q1: obtain method\n  Q2: time\n  Q3: duration\n  Q4: specific food items\n  Q5: portion/feelings\n  Q6: reason/why\n\nREMEMBER: ONLY ASK ${currentQ}.`;
}

// Helper function for meal examples
function getMealExample(mealType) {
  const examples = {
    breakfast: "Chef Hua once made me a small bowl of congee—soft yam pieces, a sprinkle of sesame on top.",
    lunch: "I just finished steamed rice, a small clay pot of braised tofu, and some greens from the garden.",
    dinner: "I made a little soup with lotus root and mushrooms."
  };
  return examples[mealType] || examples.breakfast;
}

module.exports = router;