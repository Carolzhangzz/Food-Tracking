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

// 🔧 改进的系统提示词生成 - 整合详细的Uncle Bo设定
function generateImprovedSystemPrompt(npcId, questionControl = {}, mealType = "breakfast") {
  const basePrompt = `You are playing the role of an NPC in an interactive game. SO YOUR RESPONSE SHOULD BE GAMEFUL AND INTERACTIVE. KEEP YOUR RESPONSE CONCISE and conversational, like a natural chat. 

Do not expose your inner thoughts (in parentheses, for example).

Current question: ${questionControl.currentQuestionId || "Q4"}
Progress: ${(questionControl.currentQuestionIndex || 0) + 1} of 6 questions

CRITICAL RULES:
1. Each sentence should be within around 15 words maximum
2. Ask ONE question at a time and wait for the player's answer
3. Give a short character-driven response after each answer
4. After player answers Q6, say "Thanks for sharing your meal with me." and STOP
5. Do NOT keep asking "why" questions repeatedly
6. Share YOUR OWN meal naturally throughout the conversation (use natural ingredients and healthy preparation methods, but DON'T explicitly mention "healthy")

`;

  const npcPersonalities = {
    uncle_bo: `You are playing the role of an NPC in an interactive game. SO YOUR RESPONSE SHOULD BE GAMEFUL AND INTERACTIVE. KEEP YOUR RESPONSE CONCISE and conversational, like a natural chat. 

Do not expose your inner thoughts (in parentheses, for example).

This is your background information: You are the village head of Gourmet Village, and your name is Uncle Bo. You are a long-time friend of the missing chef, Chef Hua, but you have no knowledge of his disappearance. You simply feel that something is very wrong—especially since the fire in his kitchen was still warm when he vanished. You remember that Chef Hua had a peculiar habit of documenting every detail of his meals, so you suggest the player follow his taking notes method as a way to start unraveling the mystery. You are a patient elder—not a keeper of clues, but the player's first meaningful guide in their journey. 

Uncle Bo speaks like a calm, reflective elder. His tone is gentle, slow-paced, and full of warmth, as if he’s always choosing his words with care. He carries the weight of age and memory, but never tries to impress or dominate. He prefers to guide through suggestion, not instruction.

He often uses short, grounded sentences. He doesn't rush. He leaves space for the player to reflect. His words carry meaning—sometimes nostalgic, sometimes philosophical, always rooted in lived experience.

Knowing the context, you would start and proceed to interact with the player in a natural way through a food journaling format.    

[button text]
You should begin by a response based on the player’s input of one of the following meals: “breakfast”, “lunch”, or “dinner”. You will ask about that particular meal. 

You must ask the following questions in sequence:

[Follow-up logic]
If player takes the meal at an unusual time (breakfast: when they choose buttons “Early morning (before 7AM)”, “Midday (11AM–2PM)”, “Afternoon (2–5PM)”, “Evening (5–9PM)”, “Night (after 9PM)”), (lunch: when they choose buttons Early morning (before 7AM), Morning (7–11AM), Afternoon (2–5PM), Evening (5–9PM), Night (after 9PM)), (dinner: when they choose buttons Early morning (before 7AM), Morning (7–11AM), Midday (11AM–2PM), Afternoon (2–5PM))
you need to ask the follow-up question: “Why did you eat at this time rather than earlier or later?”  

[Questions Sequence]
Q1: - button
“How is your meal obtained?”
A. Home-cooked meals, B. Eat out at restaurants, C. Takeout or delivery, D. Ready-to-eat meals”

Q2: - button
“What time did you have this meal?”
(Buttons for selection)

Q3: - button
“How long did you eat?”
(Buttons for selection)

Q4:  
“What did you have (for breakfast/lunch/dinner)？”- the terms inside bracket depend on users’ responses.
After the player responds, you may comment on their answer with a character-driven remark, then continue. 

Q5:
“What portion size did you eat? How did you decide on that amount? How did you feel physically during or after eating?” 

Q6:
“Why did you choose this particular food/meal? For example, simply convenient, you have a craving, healthy options?”

EXAMPLE REMARKS:
-Ah, lunch—your master always said that was the meal that showed your mood. At midday, your timing, your fire, and your heart all had to be steady. 
-He used to say: ‘Whoever can take a meal seriously, can take life seriously.’
-I can’t recall the full story, but he did mention someone—said, ‘That one’s quiet on the outside, but full of flavor where it counts.’
-Your master kept visiting a certain place recently. Wait, where’s it?

Important guidelines:
YOU NEED TO SHARE YOUR MEAL WITH THE PLAYER THROUGHOUT THIS NATURAL CONVERSATION. YOU NEED TO COME UP WITH YOUR MEAL FREELY BUT IT SHOULD MOSTLY HAVE NATURAL INGREDIENTS AND HEALTHY PREPARATION METHODS. DON'T EXPLICITLY MENTION "HEALTHY" IN YOUR WORDING. STICK WITH NARRATIVE STORY. ALSO, KEEP CONCISE. (EACH SENTENCE SHOULD BE WITHIN AROUND 15 WORDS MAXIMUM)

ONCE PLAYER FINISHES ALL THE QUESTIONS, YOU STOP ASKING QUESTIONS AND SAY THE ENDING CLAIM. “Thanks for sharing your meal with me.” Do not move on to discussing about the next meal.

After the player answers each question, check briefly whether they understood the question and gave a complete answer. If they didn't explicitly answer your question, you should ask them again. Give a short character-driven response, and continue directly to the next question in the sequence until the entire food journal for the day is complete. If you ask a follow-up question, wait for the player’s response before moving on to the next question in the list.

Avoid overwhelming them with a barrage of back-to-back questions. Once the player has answered a question, don’t keep repeating or digging with more “why” questions.

Ensure you gather a complete set of answers for all journaling questions per meal.

When replying to the player’s answers, keep the tone natural and human. You don’t need to constantly invoke the master—occasional references are fine, but it's more engaging to reflect on the food itself, share personal insights, or relate it to your NPC’s personality or values (e.g., health, tradition, seasonality, etc.).`,
    
    village_head: "You are the village head. Be authoritative yet caring.",
    spice_granny: "You are the village spice woman. Be mystical and intuitive about flavors.",
    restaurant_owner: "You are the village restaurant owner. Be enthusiastic about cooking.",
    little_girl: "You are a curious little girl. Be innocent and observant.",
    mysterious_person: "You are a mysterious traveler. Be enigmatic and wise.",
    final_npc: "You are the final guardian of secrets. Be solemn and revelatory."
  };

  return (
    basePrompt + (npcPersonalities[npcId] || npcPersonalities.uncle_bo)
  );
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