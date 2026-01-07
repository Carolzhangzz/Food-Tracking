const express = require("express");
const router = express.Router();
const { MealRecord } = require("../models");

// 🔧 采用官方最新 @google/genai 调用方式
router.post("/generate-final-report", async (req, res) => {
  const { playerId } = req.body;
  console.log(`📜 [Backend] 正在使用最新 GenAI SDK 为玩家 ${playerId} 生成报告...`);
  
  // 🔧 将 meals 移到外部作用域，以便 catch 块也能访问
  let meals = null;
  
  try {
    meals = await MealRecord.findAll({
      where: { playerId },
      order: [['day', 'ASC'], ['recordedAt', 'ASC']]
    });

    if (!meals || meals.length === 0) {
      return res.status(404).json({ success: false, error: "No meal records found." });
    }

    // 🔧 使用详细的 mealAnswers 而不仅仅是 mealContent
    const mealSummary = meals.map(m => {
      let details = `Day ${m.day} - ${m.mealType}:\n`;
      
      // 基础内容
      details += `  Food: ${m.mealContent}\n`;
      
      // 如果有详细答案，添加更多信息
      if (m.mealAnswers && typeof m.mealAnswers === 'object') {
        const answers = m.mealAnswers;
        
        // Q1: 获取方式
        if (answers.Q1) details += `  How obtained: ${answers.Q1}\n`;
        
        // Q2: 时间
        if (answers.Q2) details += `  Meal time: ${answers.Q2}\n`;
        
        // Q3: 用餐时长
        if (answers.Q3) details += `  Duration: ${answers.Q3}\n`;
        
        // Q4: 吃了什么（详细）
        if (answers.Q4) details += `  What they ate: ${answers.Q4}\n`;
        
        // Q5: 份量
        if (answers.Q5) details += `  Portion size: ${answers.Q5}\n`;
        
        // Q6: 如何决定份量
        if (answers.Q6) details += `  How decided amount: ${answers.Q6}\n`;
        
        // Q7: 身体感觉
        if (answers.Q7) details += `  Physical feeling: ${answers.Q7}\n`;
        
        // Q8: 为什么选择这个食物
        if (answers.Q8) details += `  Why chose this: ${answers.Q8}\n`;
      }
      
      return details;
    }).join("\n");

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
    
    // 🔧 任何错误都使用后备报告（确保玩家总能看到报告）
    console.log("⚠️ AI 生成失败，使用后备报告模板...");
    
    try {
      // 如果 meals 未定义（数据库查询失败），尝试重新获取
      if (!meals) {
        console.log("🔄 重新获取餐食数据...");
        meals = await MealRecord.findAll({
          where: { playerId },
          order: [['day', 'ASC'], ['recordedAt', 'ASC']]
        });
      }
      
      // 如果还是没有数据，使用空数组生成基础报告
      if (!meals || meals.length === 0) {
        console.log("⚠️ 没有餐食数据，生成基础模板报告");
        meals = [];
      }
      
      const fallbackReport = generateFallbackReport(meals);
      return res.json({ 
        success: true, 
        report: fallbackReport, 
        isFallback: true,
        message: "AI 暂时不可用，为您生成了标准报告"
      });
    } catch (fallbackError) {
      console.error("❌ 后备报告也失败:", fallbackError);
      return res.status(500).json({ 
        success: false, 
        error: "报告生成系统暂时不可用",
        detail: fallbackError.message
      });
    }
  }
});

// 🔧 后备报告生成函数（当 AI 不可用时使用）
function generateFallbackReport(meals) {
  // 处理空数据的情况
  if (!meals || meals.length === 0) {
    return {
      title: {
        en: "Your Culinary Journey - Final Report",
        zh: "你的美食之旅 - 最终报告"
      },
      mealSummary: {
        en: "Welcome to your final report. Start recording your meals to receive a personalized analysis!",
        zh: "欢迎查看你的最终报告。开始记录你的餐食以获得个性化分析！"
      },
      recipe: generateDefaultRecipe(),
      healthAnalysis: {
        en: "Begin your food journaling journey to receive personalized health insights and recommendations based on your eating patterns.",
        zh: "开始你的饮食日记之旅，根据你的饮食模式获得个性化的健康见解和建议。"
      },
      letterFromMaster: {
        en: `Dear Apprentice,\n\nI knew you'd find this place.\n\nThough your journey is just beginning, I want you to know that the path to mindful eating starts with a single meal, a single moment of awareness.\n\nI've made a decision — I want to share my way of cooking with more people. Something that reflects people's taste, stays true to the roots of this village, and is also a healthier take on a classic.\n\nBest of luck. I'm proud of you for starting. Until we meet again.\n\n– Master Hua`,
        zh: `亲爱的徒弟，\n\n我就知道你会找到这里。\n\n虽然你的旅程才刚刚开始，但我想让你知道，通往正念饮食的道路始于一顿饭、一刻觉知。\n\n我做了一个决定——我想与更多人分享我的烹饪方式。它反映了人们的口味，忠于这个村庄的根源，也是经典菜式的更健康诠释。\n\n祝你好运。我为你的开始感到骄傲。后会有期。\n\n——华主厨`
      },
      wisdom: {
        en: "True flavor comes not from rare ingredients, but from paying attention to what you eat, why you eat, and who you become through it.",
        zh: "真正的美味不在于稀有的食材，而在于关注你吃什么、为何而吃，以及通过它你成为了怎样的人。"
      }
    };
  }
  
  const mealTypes = [...new Set(meals.map(m => m.mealType))];
  const dayCount = [...new Set(meals.map(m => m.day))].length;
  
  return {
    title: {
      en: "Your Culinary Journey - Final Report",
      zh: "你的美食之旅 - 最终报告"
    },
    mealSummary: {
      en: `Over ${dayCount} day${dayCount > 1 ? 's' : ''}, you recorded ${meals.length} meal${meals.length > 1 ? 's' : ''}, showing dedication to mindful eating.`,
      zh: `在 ${dayCount} 天里，你记录了 ${meals.length} 顿餐食，展现了对正念饮食的坚持。`
    },
    recipe: generateDefaultRecipe(),
    healthAnalysis: {
      en: `Your ${dayCount}-day food journal shows commitment to tracking your eating habits. Key observations: You recorded a variety of meal types${mealTypes.length > 0 ? ` (${mealTypes.join(', ')})` : ''}, which is excellent for understanding your eating patterns. For continued health: aim for balanced meals with vegetables, whole grains, and lean proteins; stay hydrated; and maintain regular meal times. Remember, every meal is an opportunity to nourish both body and mind.`,
      zh: `你的 ${dayCount} 天饮食日记显示了你对记录饮食习惯的投入。主要观察：你记录了多种餐食类型${mealTypes.length > 0 ? `（${mealTypes.join('、')}）` : ''}，这对于了解你的饮食模式非常好。为了持续健康：争取摄入均衡的餐食，包括蔬菜、全谷物和瘦肉蛋白；保持水分充足；维持规律的进餐时间。记住，每一餐都是滋养身心的机会。`
    },
    letterFromMaster: {
      en: `Dear Apprentice,\n\nI knew you'd find this place.\n\nCongratulations on completing your ${dayCount}-day journey. Though I couldn't generate a fully personalized analysis today, know that the act of recording itself is transformative. You've taken important steps toward mindful eating.\n\nI've made a decision — I want to share my way of cooking with more people. Something that reflects people's taste, stays true to the roots of this village, and is also a healthier take on a classic.\n\nBest of luck. I'm proud of you. Until we meet again.\n\n– Master Hua`,
      zh: `亲爱的徒弟，\n\n我就知道你会找到这里。\n\n恭喜你完成了 ${dayCount} 天的旅程。虽然今天我无法生成完全个性化的分析，但要知道，记录本身就是变革性的。你已经迈出了通往正念饮食的重要步伐。\n\n我做了一个决定——我想与更多人分享我的烹饪方式。它反映了人们的口味，忠于这个村庄的根源，也是经典菜式的更健康诠释。\n\n祝你好运。我为你感到骄傲。后会有期。\n\n——华主厨`
    },
    wisdom: {
      en: "True flavor comes not from rare ingredients, but from paying attention to what you eat, why you eat, and who you become through it.",
      zh: "真正的美味不在于稀有的食材，而在于关注你吃什么、为何而吃，以及通过它你成为了怎样的人。"
    }
  };
}

// 生成默认食谱
function generateDefaultRecipe() {
  return {
    intro: {
      en: "Here's a balanced meal plan inspired by healthy eating principles:",
      zh: "这是一份受健康饮食原则启发的均衡膳食计划："
    },
    starter: {
      name: { en: "Fresh Garden Salad", zh: "新鲜田园沙拉" },
      ingredients: { en: "Mixed greens, cherry tomatoes, cucumber, olive oil, lemon", zh: "混合蔬菜、樱桃番茄、黄瓜、橄榄油、柠檬" },
      method: { en: "Toss all ingredients together and dress with olive oil and lemon.", zh: "将所有食材混合，用橄榄油和柠檬调味。" },
      tip: { en: "Add protein like grilled chicken or tofu for a complete meal.", zh: "加入烤鸡肉或豆腐作为蛋白质，让餐食更完整。" }
    },
    main: {
      name: { en: "Balanced Bowl", zh: "均衡碗" },
      ingredients: { en: "Brown rice, grilled protein, steamed vegetables, sesame seeds", zh: "糙米、烤制蛋白质、蒸蔬菜、芝麻" },
      method: { en: "Arrange all components in a bowl. Drizzle with your favorite sauce.", zh: "将所有成分摆放在碗中，淋上你喜欢的酱汁。" },
      tip: { en: "Vary your protein sources throughout the week.", zh: "每周变换不同的蛋白质来源。" }
    },
    side: {
      name: { en: "Roasted Seasonal Vegetables", zh: "烤时令蔬菜" },
      ingredients: { en: "Seasonal vegetables, olive oil, herbs, garlic", zh: "时令蔬菜、橄榄油、香草、大蒜" },
      method: { en: "Roast vegetables with olive oil and herbs at 200°C for 25 minutes.", zh: "将蔬菜与橄榄油和香草一起在 200°C 烤 25 分钟。" },
      tip: { en: "Roasting brings out natural sweetness in vegetables.", zh: "烤制能带出蔬菜的天然甜味。" }
    },
    dessert: {
      name: { en: "Fruit & Yogurt Parfait", zh: "水果酸奶杯" },
      ingredients: { en: "Greek yogurt, mixed berries, honey, granola", zh: "希腊酸奶、混合浆果、蜂蜜、格兰诺拉麦片" },
      method: { en: "Layer yogurt, berries, and granola. Drizzle with honey.", zh: "分层放入酸奶、浆果和格兰诺拉麦片，淋上蜂蜜。" },
      tip: { en: "Prepare the night before for a quick breakfast.", zh: "前一晚准备好，作为快速早餐。" }
    },
    drink: {
      name: { en: "Herbal Infusion", zh: "草本茶" },
      ingredients: { en: "Your favorite herbal tea, hot water, optional honey", zh: "你喜欢的草本茶、热水、可选蜂蜜" },
      method: { en: "Steep tea in hot water for 5 minutes. Add honey if desired.", zh: "将茶叶在热水中浸泡 5 分钟，根据需要加入蜂蜜。" }
    }
  };
}

module.exports = router;

module.exports = router;
