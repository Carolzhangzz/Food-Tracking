const express = require("express");
const router = express.Router();
const { MealRecord } = require("../models");

// 🔧 采用官方最新 @google/genai 调用方式
router.post("/generate-final-report", async (req, res) => {
  const { playerId } = req.body;
  console.log(`📜 [Backend] 正在使用最新 GenAI SDK 为玩家 ${playerId} 生成报告...`);
  
  try {
    const meals = await MealRecord.findAll({
      where: { playerId },
      order: [['day', 'ASC'], ['recordedAt', 'ASC']]
    });

    if (!meals || meals.length === 0) {
      return res.status(404).json({ success: false, error: "No meal records found." });
    }

    const mealSummary = meals.map(m => `Day ${m.day} - ${m.mealType}: ${m.mealContent}`).join("\n");

    const prompt = `You are Master Chef Hua. The player has just completed a 7-day food journaling journey in Gourmet Village. Based on their meals, create a comprehensive final report.

PLAYER'S 7-DAY MEAL RECORDS:
${mealSummary}

YOUR TASK:
1. Analyze the ingredients and meals the player logged over 7 days
2. Create a complete recipe menu (Starter, Main Course, Side, Dessert, Drink) based on THEIR actual ingredients and cooking styles
3. Provide a health analysis comparing their choices with healthy eating principles (balance, variety, nutrition)
4. Highlight which ingredients/meals support a healthy diet and which could be improved
5. Suggest simple swaps or additions to improve nutritional value, using what they actually ate as examples
6. Write a heartfelt letter from Master Hua to the player

TONE: Friendly, encouraging, positive reinforcement. Focus on what they did well and gently guide improvements.

IMPORTANT: Return ONLY a valid JSON object with this exact structure:

{
  "title": {
    "en": "Your Personal Recipe from Gourmet Village",
    "zh": "你的美食村专属食谱"
  },
  "mealSummary": {
    "en": "A brief summary of the player's 7-day eating patterns in 2-3 sentences",
    "zh": "玩家7天饮食模式的简要总结（2-3句）"
  },
  "recipe": {
    "intro": {
      "en": "Based on the meals you've shared over the last 7 days, this recipe combines the ingredients, flavors, and cooking styles you described.",
      "zh": "根据你过去7天分享的餐食，这份食谱结合了你描述的食材、味道和烹饪方式。"
    },
    "starter": {
      "name": { "en": "Starter name", "zh": "前菜名称" },
      "ingredients": { "en": "List of ingredients", "zh": "食材列表" },
      "method": { "en": "Cooking method", "zh": "烹饪方法" },
      "tip": { "en": "A helpful tip", "zh": "小贴士" }
    },
    "main": {
      "name": { "en": "Main course name", "zh": "主菜名称" },
      "ingredients": { "en": "List of ingredients", "zh": "食材列表" },
      "method": { "en": "Cooking method", "zh": "烹饪方法" },
      "tip": { "en": "A helpful tip", "zh": "小贴士" }
    },
    "side": {
      "name": { "en": "Side dish name", "zh": "配菜名称" },
      "ingredients": { "en": "List of ingredients", "zh": "食材列表" },
      "method": { "en": "Cooking method", "zh": "烹饪方法" },
      "tip": { "en": "A helpful tip", "zh": "小贴士" }
    },
    "dessert": {
      "name": { "en": "Dessert name", "zh": "甜点名称" },
      "ingredients": { "en": "List of ingredients", "zh": "食材列表" },
      "method": { "en": "Cooking method", "zh": "烹饪方法" },
      "tip": { "en": "A helpful tip", "zh": "小贴士" }
    },
    "drink": {
      "name": { "en": "Drink name", "zh": "饮品名称" },
      "ingredients": { "en": "List of ingredients", "zh": "食材列表" },
      "method": { "en": "Preparation method", "zh": "制作方法" }
    }
  },
  "healthAnalysis": {
    "en": "Detailed health analysis (200+ words): what they did well, what could be improved, specific suggestions based on their actual meals",
    "zh": "详细健康分析（200字以上）：他们做得好的地方、可以改进的地方、基于实际餐食的具体建议"
  },
  "letterFromMaster": {
    "en": "Dear [Player],\\n\\nI knew you'd find this place. Congratulations on finding the recipe...\\n\\n– Master Hua",
    "zh": "亲爱的[玩家]，\\n\\n我就知道你会找到这里。恭喜你找到了食谱...\\n\\n——华主厨"
  },
  "wisdom": {
    "en": "True flavor comes not from rare ingredients, but from paying attention.",
    "zh": "真正的美味不在于稀有的食材，而在于用心。"
  }
}

Remember: Return ONLY the JSON object. No markdown, no code blocks, no extra text.`;

    // 🔧 使用与 geminiRoutes.js 相同的调用方式
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 🔧 使用与 geminiRoutes.js 相同的模型列表（优先使用更稳定的模型）
    // 注意：gemini-2.0-flash-exp 可能有配额限制，所以放在最后
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"];
    let text = null;
    let lastError = null;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`🔄 尝试模型: ${modelName}`);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096, // 增加输出长度限制
            topP: 0.9,
          }
        });
        
        // 🔧 使用与 geminiRoutes.js 完全一致的调用格式
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        
        // 🔧 健壮的文本提取（与 geminiRoutes.js 一致）
        try {
          text = result.response.text();
        } catch (e) {
          // 如果 text() 不是函数，尝试从 candidates 提取
          if (result.response && result.response.candidates) {
            const candidate = result.response.candidates[0];
            if (candidate && candidate.content && candidate.content.parts) {
              text = candidate.content.parts.map((part) => part.text || "").join("");
            }
          }
        }
        
        if (text && text.trim()) {
          console.log(`✅ 模型 ${modelName} 调用成功，响应长度: ${text.length}`);
          break; // 成功了就跳出循环
        } else {
          throw new Error("响应为空");
        }
      } catch (err) {
        console.log(`⚠️ 模型 ${modelName} 失败: ${err.message}`);
        
        // 如果是 429 配额错误，记录但继续尝试其他模型
        if (err.status === 429) {
          console.log(`⚠️ 模型 ${modelName} 配额已满，尝试下一个模型...`);
        }
        
        lastError = err;
        // 继续尝试下一个模型
      }
    }
    
    if (!text || !text.trim()) {
      throw lastError || new Error("所有模型都失败了");
    }
    console.log(`✅ AI 响应成功，长度: ${text.length}`);
    console.log(`📄 AI 返回内容预览:\n${text.substring(0, 500)}...`);

    // 🔧 改进的 JSON 提取逻辑
    let report = null;
    
    // 先尝试直接解析（如果 AI 返回纯 JSON）
    try {
      report = JSON.parse(text);
    } catch (e1) {
      // 如果失败，尝试从文本中提取 JSON
      console.log("⚠️ 直接解析失败，尝试提取 JSON...");
      
      // 移除可能的 markdown 代码块标记
      let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 尝试匹配 JSON 对象
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          report = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error("❌ JSON 提取后仍无法解析:", e2.message);
          console.error("提取的内容:", jsonMatch[0].substring(0, 200));
        }
      }
    }

    if (!report || !report.title || !report.recipe || !report.letterFromMaster) {
      throw new Error(`Could not parse valid report. Missing required fields. AI response: ${text.substring(0, 200)}...`);
    }
    
    console.log("✅ 报告解析成功，包含以下字段:", Object.keys(report));

    res.json({ success: true, report });
  } catch (error) {
    console.error("❌ 报告生成失败 (GenAI SDK):", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      detail: "Please check if your GEMINI_API_KEY is valid and has access to gemini-1.5-flash."
    });
  }
});

module.exports = router;
