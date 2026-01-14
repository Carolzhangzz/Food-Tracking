const express = require("express");
const router = express.Router();
const { MealRecord } = require("../models");

// 🚀 使用 Groq API 生成最终报告（免费且快速）
router.post("/generate-final-report", async (req, res) => {
  const { playerId } = req.body;
  console.log(`📜 [Backend] 使用 Groq API 为玩家 ${playerId} 生成报告...`);
  
  let meals = null;
  
  try {
    meals = await MealRecord.findAll({
      where: { playerId },
      order: [['day', 'ASC'], ['recordedAt', 'ASC']]
    });

    if (!meals || meals.length === 0) {
      return res.status(404).json({ success: false, error: "No meal records found." });
    }

    // 提取所有真实食物数据
    const mealSummary = meals.map(m => {
      let details = `📅 Day ${m.day} - ${m.mealType}:\n`;
      
      if (m.mealAnswers && typeof m.mealAnswers === 'object') {
        const answers = m.mealAnswers;
        if (answers.Q1) details += `  🍽️ How obtained: ${answers.Q1}\n`;
        if (answers.Q2) details += `  ⏰ Meal time: ${answers.Q2}\n`;
        if (answers.Q3) details += `  ⏱️ Duration: ${answers.Q3}\n`;
        if (answers.Q4) details += `  🥘 What they ate: ${answers.Q4}\n`;
        if (answers.Q5) details += `  📏 Portion size: ${answers.Q5}\n`;
        if (answers.Q6) details += `  🤔 How decided amount: ${answers.Q6}\n`;
        if (answers.Q7) details += `  💪 Physical feeling: ${answers.Q7}\n`;
        if (answers.Q8) details += `  ❤️ Why chose this: ${answers.Q8}\n`;
      } else {
        details += `  🥘 Food: ${m.mealContent}\n`;
      }
      
      return details;
    }).join("\n");

    // 🆕 使用用户提供的详细 Prompt 模板
    const prompt = `You are Master Chef Hua from Gourmet Village. The player has completed their 7-day food journaling journey and is now receiving their final personalized recipe.

PLAYER'S COMPLETE 7-DAY MEAL RECORDS:
${mealSummary}

YOUR TASK:
The player has now received the final recipe. As they read it, they discover that the recipe is created from the same ingredients they logged and ate during their journey in the game.

1. **7-Day Summary**: List all the main ingredients and dishes the player has chosen or consumed across all meals.

2. **Personalized Recipe Menu**: Create a FULL MEAL using the player's actual ingredients/dishes:
   - **Starter** – Use ingredients/dishes from their early meals or appetizers
   - **Main Course** – Based on their most common main dishes
   - **Side Dish** – Use vegetables/sides they mentioned
   - **Dessert** – Based on sweet foods or create a healthy option from their ingredients
   - **Drink** – Based on beverages mentioned or create a healthy tea/drink

   For EACH dish, provide:
   - Name (creative but based on their actual food)
   - Ingredients (from what they ate)
   - Cooking method (use their mentioned cooking styles: steamed, grilled, stir-fried, etc.)
   - Tip (practical advice)

3. **Health Analysis**: Compare their ingredients with healthy eating principles (balance, variety, nutrition). Clearly show:
   - What supports a healthy diet
   - What might be less healthy
   - Simple swaps or additions to improve nutrition (using examples from what they actually ate)

4. **Tone**: Friendly and encouraging. Focus on positive reinforcement. Emphasize that healthy dishes can be made from everyday choices.

5. **Template Example** (adapt to the player's actual meals):
   "Based on the meals you've shared over the last 7 days, this recipe combines the ingredients, flavors, and cooking styles you described. It's designed as a full meal you could actually make at home – a reflection of your journey in Gourmet Village."

CRITICAL: Return ONLY a valid JSON object with this EXACT structure:

{
  "title": {
    "en": "Your Personal Recipe from Gourmet Village",
    "zh": "你的美食村专属食谱"
  },
  "mealSummary": {
    "en": "2-3 sentence summary of player's 7-day eating patterns, mentioning specific foods",
    "zh": "2-3句总结玩家7天的饮食模式，提及具体食物"
  },
  "recipe": {
    "intro": {
      "en": "Based on the meals you've shared...",
      "zh": "根据你过去7天分享的餐食..."
    },
    "starter": {
      "name": { "en": "Creative name based on their food", "zh": "基于他们食物的创意名称" },
      "ingredients": { "en": "Their actual ingredients", "zh": "他们的实际食材" },
      "method": { "en": "Cooking method using their style", "zh": "使用他们风格的烹饪方法" },
      "tip": { "en": "Practical tip", "zh": "实用建议" }
    },
    "main": {
      "name": { "en": "Main course name", "zh": "主菜名称" },
      "ingredients": { "en": "Ingredients from their meals", "zh": "来自他们餐食的食材" },
      "method": { "en": "Cooking method", "zh": "烹饪方法" },
      "tip": { "en": "Tip", "zh": "建议" }
    },
    "side": {
      "name": { "en": "Side dish name", "zh": "配菜名称" },
      "ingredients": { "en": "Ingredients", "zh": "食材" },
      "method": { "en": "Method", "zh": "方法" },
      "tip": { "en": "Tip", "zh": "建议" }
    },
    "dessert": {
      "name": { "en": "Dessert name", "zh": "甜点名称" },
      "ingredients": { "en": "Ingredients", "zh": "食材" },
      "method": { "en": "Method", "zh": "方法" },
      "tip": { "en": "Tip", "zh": "建议" }
    },
    "drink": {
      "name": { "en": "Drink name", "zh": "饮品名称" },
      "ingredients": { "en": "Ingredients", "zh": "食材" },
      "method": { "en": "Method", "zh": "方法" }
    }
  },
  "healthAnalysis": {
    "en": "Detailed 200+ word analysis: what supports healthy diet, what could be improved, specific swaps/additions based on their actual meals",
    "zh": "详细200字以上分析：哪些支持健康饮食、哪些可以改进、基于实际餐食的具体替换/添加建议"
  },
  "letterFromMaster": {
    "en": "Dear Apprentice,\\n\\nI knew you'd find this place. Based on your journey and the meals you recorded...\\n\\n– Master Hua",
    "zh": "亲爱的徒弟，\\n\\n我就知道你会找到这里。根据你的旅程和你记录的餐食...\\n\\n——华主厨"
  },
  "wisdom": {
    "en": "True flavor comes not from rare ingredients, but from paying attention to what you eat and why.",
    "zh": "真正的美味不在于稀有的食材，而在于关注你吃什么以及为何而吃。"
  }
}

Return ONLY the JSON. No markdown, no code blocks, no extra text.`;

    // 🚀 调用 Groq API
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY 未配置");
    }

    console.log("🔄 调用 Groq API...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Groq 推荐的高性能模型
        messages: [
          {
            role: "system",
            content: "You are Master Chef Hua, a wise and caring chef who creates personalized recipes based on people's actual eating habits. You always return valid JSON responses."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let text = data.choices[0]?.message?.content;

    if (!text || !text.trim()) {
      throw new Error("Groq API 返回空响应");
    }

    console.log(`✅ Groq API 响应成功，长度: ${text.length}`);
    console.log(`📄 响应预览:\n${text.substring(0, 300)}...`);

    // 解析 JSON
    let report = null;
    
    try {
      report = JSON.parse(text);
    } catch (e1) {
      console.log("⚠️ 直接解析失败，尝试提取 JSON...");
      
      // 清理 markdown 代码块
      let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 提取 JSON 对象
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          report = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error("❌ JSON 提取后仍无法解析:", e2.message);
        }
      }
    }

    if (!report || !report.title || !report.recipe || !report.letterFromMaster) {
      throw new Error(`报告结构不完整。响应: ${text.substring(0, 200)}...`);
    }
    
    console.log("✅ 报告解析成功，包含字段:", Object.keys(report));

    res.json({ success: true, report, source: "groq" });

  } catch (error) {
    console.error("❌ Groq 报告生成失败:", error);
    
    // 使用后备报告
    console.log("⚠️ 使用后备报告模板...");
    
    try {
      if (!meals) {
        meals = await MealRecord.findAll({
          where: { playerId },
          order: [['day', 'ASC'], ['recordedAt', 'ASC']]
        });
      }
      
      if (!meals || meals.length === 0) {
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
      console.error("❌ 后备报告失败:", fallbackError);
      return res.status(500).json({ 
        success: false, 
        error: "报告生成系统暂时不可用",
        detail: fallbackError.message
      });
    }
  }
});

// 🔧 后备报告生成函数（当 AI 不可用时使用）- 使用真实食物数据
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
  
  // 🔧 从真实餐食数据中提取食物信息
  const realFoods = meals.map(m => {
    // 优先使用 Q4 (吃了什么) 的详细描述
    if (m.mealAnswers && m.mealAnswers.Q4) {
      return m.mealAnswers.Q4;
    }
    // 其次使用 mealContent
    if (m.mealContent) {
      return m.mealContent;
    }
    return null;
  }).filter(Boolean);
  
  // 生成基于真实食物的食谱
  const personalizedRecipe = generatePersonalizedRecipeFromMeals(meals, realFoods);
  
  // 生成包含真实食物的健康分析
  const foodMentions = realFoods.length > 0 
    ? ` Your meals included: ${realFoods.slice(0, 5).join(', ')}${realFoods.length > 5 ? ', and more' : ''}.`
    : '';
  const foodMentionsZh = realFoods.length > 0
    ? ` 你的餐食包括：${realFoods.slice(0, 5).join('、')}${realFoods.length > 5 ? '等' : ''}。`
    : '';
  
  return {
    title: {
      en: "Your Culinary Journey - Final Report",
      zh: "你的美食之旅 - 最终报告"
    },
    mealSummary: {
      en: `Over ${dayCount} day${dayCount > 1 ? 's' : ''}, you recorded ${meals.length} meal${meals.length > 1 ? 's' : ''}, showing dedication to mindful eating.${foodMentions}`,
      zh: `在 ${dayCount} 天里，你记录了 ${meals.length} 顿餐食，展现了对正念饮食的坚持。${foodMentionsZh}`
    },
    recipe: personalizedRecipe,
    healthAnalysis: {
      en: `Your ${dayCount}-day food journal shows commitment to tracking your eating habits.${foodMentions} Key observations: You recorded a variety of meal types${mealTypes.length > 0 ? ` (${mealTypes.join(', ')})` : ''}, which is excellent for understanding your eating patterns. For continued health: aim for balanced meals with vegetables, whole grains, and lean proteins; stay hydrated; and maintain regular meal times. Remember, every meal is an opportunity to nourish both body and mind.`,
      zh: `你的 ${dayCount} 天饮食日记显示了你对记录饮食习惯的投入。${foodMentionsZh}主要观察：你记录了多种餐食类型${mealTypes.length > 0 ? `（${mealTypes.join('、')}）` : ''}，这对于了解你的饮食模式非常好。为了持续健康：争取摄入均衡的餐食，包括蔬菜、全谷物和瘦肉蛋白；保持水分充足；维持规律的进餐时间。记住，每一餐都是滋养身心的机会。`
    },
    letterFromMaster: {
      en: `Dear Apprentice,\n\nI knew you'd find this place.\n\nCongratulations on completing your ${dayCount}-day journey. Though I couldn't generate a fully personalized analysis today, I reviewed all your meals: ${realFoods.slice(0, 3).join(', ')}${realFoods.length > 3 ? ', and more' : ''}. The act of recording itself is transformative. You've taken important steps toward mindful eating.\n\nI've made a decision — I want to share my way of cooking with more people. Something that reflects people's taste, stays true to the roots of this village, and is also a healthier take on a classic.\n\nBest of luck. I'm proud of you. Until we meet again.\n\n– Master Hua`,
      zh: `亲爱的徒弟，\n\n我就知道你会找到这里。\n\n恭喜你完成了 ${dayCount} 天的旅程。虽然今天我无法生成完全个性化的分析，但我查看了你所有的餐食：${realFoods.slice(0, 3).join('、')}${realFoods.length > 3 ? '等' : ''}。记录本身就是变革性的。你已经迈出了通往正念饮食的重要步伐。\n\n我做了一个决定——我想与更多人分享我的烹饪方式。它反映了人们的口味，忠于这个村庄的根源，也是经典菜式的更健康诠释。\n\n祝你好运。我为你感到骄傲。后会有期。\n\n——华主厨`
    },
    wisdom: {
      en: "True flavor comes not from rare ingredients, but from paying attention to what you eat, why you eat, and who you become through it.",
      zh: "真正的美味不在于稀有的食材，而在于关注你吃什么、为何而吃，以及通过它你成为了怎样的人。"
    }
  };
}

// 🆕 基于真实餐食生成个性化食谱
function generatePersonalizedRecipeFromMeals(meals, realFoods) {
  if (!realFoods || realFoods.length === 0) {
    return generateDefaultRecipe();
  }
  
  // 简单地使用前几个真实食物作为食谱建议
  const food1 = realFoods[0] || "Mixed vegetables";
  const food2 = realFoods[1] || "Rice with protein";
  const food3 = realFoods[2] || "Fresh salad";
  
  return {
    intro: {
      en: `Based on your meals over the past ${meals.length} days, here's a recipe inspired by what you actually ate:`,
      zh: `根据你过去 ${meals.length} 天的餐食，这是一份受你实际饮食启发的食谱：`
    },
    starter: {
      name: { en: `Inspired by: ${food1}`, zh: `灵感来自：${food1}` },
      ingredients: { en: `Based on ${food1}, use similar fresh ingredients`, zh: `基于 ${food1}，使用类似的新鲜食材` },
      method: { en: "Prepare using your preferred method", zh: "使用你喜欢的方式准备" },
      tip: { en: "Keep the portions similar to what you recorded", zh: "保持与你记录的份量相近" }
    },
    main: {
      name: { en: `Your Style: ${food2}`, zh: `你的风格：${food2}` },
      ingredients: { en: `Based on ${food2}, with your favorite seasonings`, zh: `基于 ${food2}，配上你喜欢的调味料` },
      method: { en: "Cook the way you enjoy most", zh: "用你最喜欢的方式烹饪" },
      tip: { en: "Balance with vegetables for nutrition", zh: "搭配蔬菜以获得均衡营养" }
    },
    side: {
      name: { en: `Based on: ${food3}`, zh: `基于：${food3}` },
      ingredients: { en: `Similar to ${food3}, add variety with different vegetables`, zh: `类似 ${food3}，用不同蔬菜增加多样性` },
      method: { en: "Use healthy cooking methods", zh: "使用健康的烹饪方法" },
      tip: { en: "Seasonal vegetables taste better", zh: "时令蔬菜味道更好" }
    },
    dessert: {
      name: { en: "Light & Healthy Finish", zh: "清淡健康收尾" },
      ingredients: { en: "Fresh fruit, yogurt", zh: "新鲜水果、酸奶" },
      method: { en: "Serve fresh fruits as dessert", zh: "用新鲜水果作为甜点" },
      tip: { en: "Natural sweetness is best", zh: "天然的甜味最好" }
    },
    drink: {
      name: { en: "Refreshing Beverage", zh: "清爽饮品" },
      ingredients: { en: "Water, herbal tea, or fresh juice", zh: "水、草本茶或鲜榨果汁" },
      method: { en: "Stay hydrated throughout the day", zh: "全天保持水分" }
    }
  };
}

//生成默认食谱
function generateDefaultRecipe() {
  return {
    summary: {
      en: "Based on your meals over the past 7 days, you have chosen a mix of grains, vegetables, proteins, and snacks. Your most frequent ingredients include rice, leafy greens, chicken or tofu, eggs, and fruits.",
      zh: "根据你过去 7 天记录的饮食，你的选择包含谷物、蔬菜、蛋白质和水果。最常出现的食材包括米饭、绿叶蔬菜、鸡肉或豆腐、鸡蛋以及水果。"
    },

    analysis: {
      en: "Your meals show a good balance between carbohydrates and protein, and you include vegetables regularly. Some days are higher in refined carbs and lower in fiber. Adding more whole grains and legumes could improve overall nutrition.",
      zh: "你的饮食在碳水化合物和蛋白质之间较为均衡，并且经常包含蔬菜。但部分天数精制碳水偏多、膳食纤维偏少。增加全谷物和豆类可以进一步提升营养质量。"
    },

    suggestions: {
      en: "Simple improvements could include swapping white rice for brown rice, adding beans or lentils to bowls, and pairing snacks with fruit or yogurt.",
      zh: "简单的改进方式包括：用糙米替代白米，在主食中加入豆类或扁豆，零食时搭配水果或酸奶。"
    },

    finalRecipe: {
      intro: {
        en: "This final recipe is inspired by the ingredients you logged during your journey in Gourmet Village. It reflects your everyday choices and shows how they can come together into a balanced meal.",
        zh: "这份最终食谱灵感来自你在《美食村》旅程中记录的真实食材，展现了日常选择如何组合成一顿均衡的餐食。"
      },

      starter: {
        name: { en: "Herb & Tofu Dumplings", zh: "香草豆腐饺子" },
        ingredients: { en: "Tofu, mixed herbs, ginger, soy sauce, wrappers", zh: "豆腐、混合香草、生姜、酱油、饺子皮" },
        method: { en: "Mix filling, wrap, and steam for 6–8 minutes.", zh: "混合馅料包制，蒸 6–8 分钟。" }
      },

      main: {
        name: { en: "Protein & Whole Grain Bowl", zh: "蛋白质全谷物碗" },
        ingredients: { en: "Brown rice, grilled chicken or tofu, leafy greens", zh: "糙米、烤鸡肉或豆腐、绿叶蔬菜" },
        method: { en: "Assemble all components and drizzle with light sauce.", zh: "将所有食材组合，淋上清淡酱汁。" }
      },

      dessert: {
        name: { en: "Fruit Yogurt Cup", zh: "水果酸奶杯" },
        ingredients: { en: "Yogurt, seasonal fruit, honey", zh: "酸奶、时令水果、蜂蜜" },
        method: { en: "Layer and serve chilled.", zh: "分层放置，冷藏后食用。" }
      },

      closing: {
        en: "This menu shows that healthy meals can grow naturally from everyday choices. Keep exploring, and your next week can be even more balanced and delicious.",
        zh: "这份菜单说明，健康饮食可以从日常选择自然生长出来。继续探索，你的下一周会更加均衡而美味。"
      }
    }
  };
}

module.exports = router;

module.exports = router;
