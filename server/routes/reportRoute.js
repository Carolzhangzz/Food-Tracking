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

    // 🆕 增强版 Prompt - 创造性菜谱 + 营养分析
    const prompt = `You are Master Chef Hua from Gourmet Village, a professional chef and nutritionist. The player has completed their 7-day food journaling journey. Based on ALL the ingredients they consumed, you will CREATE NEW HEALTHY RECIPES (not copy their exact dishes) and provide professional nutrition analysis.

PLAYER'S COMPLETE 7-DAY MEAL RECORDS:
${mealSummary}

YOUR TASK:

1. **Extract ALL Ingredients**: From their 7-day records, identify ALL ingredients they consumed (vegetables, proteins, grains, seasonings, etc.)

2. **Create NEW Restaurant-Style Dishes**: Using their ingredients, CREATE NEW, HEALTHIER recipes that:
   - Combine their ingredients in creative, balanced ways
   - Are NOT just copies of what they ate
   - Follow healthy cooking principles (balanced nutrients, proper portions)
   - Are restaurant-quality dishes with appealing names
   - Include 5 courses: Starter, Main, Side, Dessert, Drink

   For EACH dish, provide:
   - **Name**: Creative, restaurant-style dish name (bilingual)
   - **Ingredients**: List of specific ingredients with amounts (e.g., "200g chicken breast, 100g broccoli")
   - **Calories**: Estimated calories per serving (e.g., "~350 kcal")
   - **Steps**: Detailed 4-6 step cooking instructions
   - **Cooking Time**: Total time needed (e.g., "25 minutes")
   - **Tip**: Professional cooking tip

3. **Professional Nutrition Analysis**: Analyze their 7-day eating patterns and provide:
   
   **Macronutrients Assessment**:
   - **Protein**: Adequacy, sources quality, recommendations
   - **Carbohydrates**: Type (refined vs whole grains), balance, suggestions
   - **Fats**: Healthy vs unhealthy fats, balance
   - **Fiber**: Intake level, sources, recommendations
   
   **Micronutrients & Other**:
   - Vitamins & minerals coverage
   - Hydration patterns
   - Meal timing & frequency
   
   **Specific Recommendations**: 3-5 actionable improvements based on their actual data

4. **Tone**: Professional yet warm. Like a nutritionist + chef consultation.

5. **Important**: The recipes should be INSPIRED BY but NOT IDENTICAL TO what they ate. Transform their ingredients into healthier, more balanced versions.

CRITICAL: Return ONLY a valid JSON object with this EXACT structure:

{
  "title": {
    "en": "Your Personalized Health Recipe Collection",
    "zh": "你的专属健康食谱集"
  },
  "mealSummary": {
    "en": "2-3 sentence summary mentioning their key ingredients and eating patterns",
    "zh": "2-3句总结，提及关键食材和饮食模式"
  },
  "recipe": {
    "intro": {
      "en": "I've analyzed all the ingredients from your 7-day journey and created these NEW healthy recipes inspired by what you love...",
      "zh": "我分析了你7天旅程中的所有食材，创造了这些受你喜爱的食物启发的全新健康食谱..."
    },
    "starter": {
      "name": { "en": "Creative NEW dish name", "zh": "创意新菜名" },
      "ingredients": { "en": "200g ingredient A, 100g ingredient B, etc.", "zh": "200克食材A，100克食材B等" },
      "calories": "~280 kcal",
      "steps": { 
        "en": ["Step 1: Detailed instruction", "Step 2: ...", "Step 3: ...", "Step 4: ..."],
        "zh": ["步骤1：详细说明", "步骤2：...", "步骤3：...", "步骤4：..."]
      },
      "cookingTime": { "en": "20 minutes", "zh": "20分钟" },
      "tip": { "en": "Professional tip", "zh": "专业建议" }
    },
    "main": {
      "name": { "en": "NEW main dish name", "zh": "新主菜名称" },
      "ingredients": { "en": "300g protein, 150g vegetables, etc.", "zh": "300克蛋白质，150克蔬菜等" },
      "calories": "~450 kcal",
      "steps": {
        "en": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5..."],
        "zh": ["步骤1...", "步骤2...", "步骤3...", "步骤4...", "步骤5..."]
      },
      "cookingTime": { "en": "30 minutes", "zh": "30分钟" },
      "tip": { "en": "Tip", "zh": "建议" }
    },
    "side": {
      "name": { "en": "NEW side dish", "zh": "新配菜" },
      "ingredients": { "en": "Ingredients with amounts", "zh": "带分量的食材" },
      "calories": "~120 kcal",
      "steps": {
        "en": ["Step 1...", "Step 2...", "Step 3...", "Step 4..."],
        "zh": ["步骤1...", "步骤2...", "步骤3...", "步骤4..."]
      },
      "cookingTime": { "en": "15 minutes", "zh": "15分钟" },
      "tip": { "en": "Tip", "zh": "建议" }
    },
    "dessert": {
      "name": { "en": "Healthy dessert", "zh": "健康甜点" },
      "ingredients": { "en": "Ingredients", "zh": "食材" },
      "calories": "~180 kcal",
      "steps": {
        "en": ["Step 1...", "Step 2...", "Step 3..."],
        "zh": ["步骤1...", "步骤2...", "步骤3..."]
      },
      "cookingTime": { "en": "10 minutes", "zh": "10分钟" },
      "tip": { "en": "Tip", "zh": "建议" }
    },
    "drink": {
      "name": { "en": "Healthy drink", "zh": "健康饮品" },
      "ingredients": { "en": "Ingredients", "zh": "食材" },
      "calories": "~60 kcal",
      "steps": {
        "en": ["Step 1...", "Step 2..."],
        "zh": ["步骤1...", "步骤2..."]
      },
      "cookingTime": { "en": "5 minutes", "zh": "5分钟" }
    }
  },
  "nutritionAnalysis": {
    "protein": {
      "en": "Assessment of protein intake, quality of sources, recommendations (50-80 words)",
      "zh": "蛋白质摄入评估、来源质量、建议（50-80字）"
    },
    "carbohydrates": {
      "en": "Carb types (refined vs whole grain), balance assessment, suggestions (50-80 words)",
      "zh": "碳水类型（精制vs全谷物）、平衡评估、建议（50-80字）"
    },
    "fiber": {
      "en": "Fiber intake level, sources, recommendations (40-60 words)",
      "zh": "膳食纤维摄入水平、来源、建议（40-60字）"
    },
    "fats": {
      "en": "Healthy vs unhealthy fats, balance, suggestions (40-60 words)",
      "zh": "健康与不健康脂肪、平衡、建议（40-60字）"
    },
    "overall": {
      "en": "Overall nutrition summary and 3-5 actionable improvements (80-100 words)",
      "zh": "整体营养总结及3-5个可操作的改进建议（80-100字）"
    }
  },
  "letterFromMaster": {
    "en": "Dear Apprentice,\\n\\nI've studied your 7-day journey carefully. The recipes above are my gift to you – new creations inspired by the ingredients you love, but reimagined for better health...\\n\\n– Master Hua",
    "zh": "亲爱的徒弟，\\n\\n我仔细研究了你的7天旅程。上面的食谱是我送给你的礼物——基于你喜爱的食材创作的新菜式，但重新设计得更健康...\\n\\n——华主厨"
  },
  "wisdom": {
    "en": "Great cooking isn't about copying recipes – it's about understanding ingredients and creating balance.",
    "zh": "伟大的烹饪不在于复制食谱，而在于理解食材并创造平衡。"
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
      nutritionAnalysis: {
        protein: {
          en: "Start tracking your meals to receive personalized protein intake analysis.",
          zh: "开始记录餐食以获得个性化的蛋白质摄入分析。"
        },
        carbohydrates: {
          en: "Track your carbohydrate sources and balance.",
          zh: "追踪你的碳水化合物来源和平衡。"
        },
        fiber: {
          en: "Monitor your fiber intake for better digestive health.",
          zh: "监测你的膳食纤维摄入以改善消化健康。"
        },
        fats: {
          en: "Track healthy vs unhealthy fats in your diet.",
          zh: "追踪饮食中的健康与不健康脂肪。"
        },
        overall: {
          en: "Begin your food journaling journey to receive comprehensive nutrition analysis.",
          zh: "开始你的饮食日记之旅以获得全面的营养分析。"
        }
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
    nutritionAnalysis: {
      protein: {
        en: `Based on your ${dayCount}-day journal, assess your protein sources and aim for lean meats, fish, eggs, and plant proteins.`,
        zh: `根据你 ${dayCount} 天的记录，评估你的蛋白质来源，建议选择瘦肉、鱼类、鸡蛋和植物蛋白。`
      },
      carbohydrates: {
        en: `Your meals show varied carbohydrate sources. Consider incorporating more whole grains for sustained energy.`,
        zh: `你的餐食显示多样的碳水来源。建议加入更多全谷物以获得持久能量。`
      },
      fiber: {
        en: `Aim to include more vegetables, fruits, and whole grains to meet daily fiber needs (25-30g).`,
        zh: `建议增加蔬菜、水果和全谷物以满足每日纤维需求（25-30克）。`
      },
      fats: {
        en: `Balance your fat intake with healthy sources like olive oil, nuts, and avocado while limiting fried foods.`,
        zh: `平衡脂肪摄入，选择橄榄油、坚果和牛油果等健康来源，同时限制油炸食品。`
      },
      overall: {
        en: `Your ${dayCount}-day journey shows commitment.${foodMentions} Key improvements: aim for balanced meals with vegetables, whole grains, and lean proteins; stay hydrated; maintain regular meal times. Every meal nourishes body and mind.`,
        zh: `你的 ${dayCount} 天旅程展现了专注。${foodMentionsZh}关键改进：争取均衡餐食（蔬菜、全谷物、瘦肉蛋白）；保持水分；规律进餐。每一餐都滋养身心。`
      }
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
      en: `Based on your ${meals.length}-day journey, here are NEW healthy recipes inspired by what you ate:`,
      zh: `根据你 ${meals.length} 天的旅程，这些是受你饮食启发的全新健康食谱：`
    },
    starter: {
      name: { en: `Inspired by: ${food1}`, zh: `灵感来自：${food1}` },
      ingredients: { en: `200g fresh ingredients similar to ${food1}`, zh: `200克类似 ${food1} 的新鲜食材` },
      calories: "~250 kcal",
      steps: {
        en: ["Prepare fresh ingredients", "Season lightly", "Cook using healthy method", "Serve fresh"],
        zh: ["准备新鲜食材", "轻度调味", "用健康方式烹饪", "趁新鲜食用"]
      },
      cookingTime: { en: "15 minutes", zh: "15分钟" },
      tip: { en: "Keep portions similar to what you recorded", zh: "保持与你记录的份量相近" }
    },
    main: {
      name: { en: `Your Style: ${food2}`, zh: `你的风格：${food2}` },
      ingredients: { en: `300g base (like ${food2}), vegetables, seasonings`, zh: `300克主料（类似 ${food2}）、蔬菜、调味料` },
      calories: "~450 kcal",
      steps: {
        en: ["Prep main ingredients", "Add favorite seasonings", "Cook to preference", "Balance with vegetables", "Serve hot"],
        zh: ["准备主料", "加入喜欢的调味料", "按喜好烹饪", "搭配蔬菜平衡", "趁热食用"]
      },
      cookingTime: { en: "25 minutes", zh: "25分钟" },
      tip: { en: "Balance with vegetables for nutrition", zh: "搭配蔬菜以获得均衡营养" }
    },
    side: {
      name: { en: `Based on: ${food3}`, zh: `基于：${food3}` },
      ingredients: { en: `150g vegetables similar to ${food3}`, zh: `150克类似 ${food3} 的蔬菜` },
      calories: "~100 kcal",
      steps: {
        en: ["Wash vegetables", "Use healthy cooking method", "Season lightly", "Serve as side"],
        zh: ["清洗蔬菜", "使用健康烹饪方法", "轻度调味", "作为配菜"]
      },
      cookingTime: { en: "12 minutes", zh: "12分钟" },
      tip: { en: "Seasonal vegetables taste better", zh: "时令蔬菜味道更好" }
    },
    dessert: {
      name: { en: "Light & Healthy Finish", zh: "清淡健康收尾" },
      ingredients: { en: "100g fresh fruit, 50g yogurt", zh: "100克新鲜水果、50克酸奶" },
      calories: "~120 kcal",
      steps: {
        en: ["Slice fresh fruits", "Add yogurt", "Serve chilled"],
        zh: ["切片新鲜水果", "加入酸奶", "冷藏后食用"]
      },
      cookingTime: { en: "5 minutes", zh: "5分钟" },
      tip: { en: "Natural sweetness is best", zh: "天然的甜味最好" }
    },
    drink: {
      name: { en: "Refreshing Beverage", zh: "清爽饮品" },
      ingredients: { en: "300ml water, herbal tea, or fresh juice", zh: "300毫升水、草本茶或鲜榨果汁" },
      calories: "~30 kcal",
      steps: {
        en: ["Choose healthy beverage", "Serve fresh"],
        zh: ["选择健康饮品", "新鲜饮用"]
      },
      cookingTime: { en: "3 minutes", zh: "3分钟" }
    }
  };
}

//生成默认食谱
function generateDefaultRecipe() {
  return {
    intro: {
      en: "Welcome to your personalized recipe collection. These dishes are designed to inspire balanced, healthy eating.",
      zh: "欢迎查看你的个性化食谱集。这些菜式旨在启发均衡、健康的饮食。"
    },
    starter: {
      name: { en: "Herb & Tofu Dumplings", zh: "香草豆腐饺子" },
      ingredients: { en: "200g tofu, 50g mixed herbs, 20g ginger, 2 tbsp soy sauce, dumpling wrappers", zh: "200克豆腐、50克混合香草、20克生姜、2汤匙酱油、饺子皮" },
      calories: "~240 kcal",
      steps: {
        en: ["Mash tofu and mix with herbs, ginger, soy sauce", "Place filling in wrappers and seal", "Steam for 6-8 minutes over high heat", "Serve with light dipping sauce"],
        zh: ["豆腐捣碎，与香草、姜、酱油混合", "将馅料放入饺子皮中封口", "大火蒸6-8分钟", "配清淡蘸汁食用"]
      },
      cookingTime: { en: "20 minutes", zh: "20分钟" },
      tip: { en: "Add vegetables for extra fiber", zh: "添加蔬菜以增加纤维" }
    },
    main: {
      name: { en: "Protein & Whole Grain Bowl", zh: "蛋白质全谷物碗" },
      ingredients: { en: "150g brown rice, 200g grilled chicken or tofu, 100g leafy greens, 1 tbsp sauce", zh: "150克糙米、200克烤鸡肉或豆腐、100克绿叶蔬菜、1汤匙酱汁" },
      calories: "~480 kcal",
      steps: {
        en: ["Cook brown rice according to package", "Grill chicken or tofu until golden", "Blanch leafy greens", "Assemble in bowl and drizzle with sauce", "Serve warm"],
        zh: ["按说明煮糙米", "将鸡肉或豆腐烤至金黄", "焯绿叶蔬菜", "在碗中组装并淋上酱汁", "趁温热食用"]
      },
      cookingTime: { en: "30 minutes", zh: "30分钟" },
      tip: { en: "Whole grains provide sustained energy", zh: "全谷物提供持久能量" }
    },
    side: {
      name: { en: "Seasonal Vegetable Medley", zh: "时令蔬菜什锦" },
      ingredients: { en: "150g mixed seasonal vegetables", zh: "150克混合时令蔬菜" },
      calories: "~80 kcal",
      steps: {
        en: ["Wash and cut vegetables", "Stir-fry or steam briefly", "Season lightly", "Serve as side"],
        zh: ["清洗并切蔬菜", "快速炒或蒸", "轻度调味", "作为配菜"]
      },
      cookingTime: { en: "10 minutes", zh: "10分钟" },
      tip: { en: "Use seasonal vegetables for best flavor", zh: "使用时令蔬菜味道最好" }
    },
    dessert: {
      name: { en: "Fruit Yogurt Cup", zh: "水果酸奶杯" },
      ingredients: { en: "100g yogurt, 80g seasonal fruit, 1 tsp honey", zh: "100克酸奶、80克时令水果、1茶匙蜂蜜" },
      calories: "~150 kcal",
      steps: {
        en: ["Layer yogurt in cup", "Add sliced fruits", "Drizzle with honey", "Serve chilled"],
        zh: ["酸奶分层放入杯中", "加入切片水果", "淋上蜂蜜", "冷藏后食用"]
      },
      cookingTime: { en: "5 minutes", zh: "5分钟" },
      tip: { en: "Natural sweetness is healthiest", zh: "天然甜味最健康" }
    },
    drink: {
      name: { en: "Herbal Wellness Tea", zh: "草本养生茶" },
      ingredients: { en: "300ml hot water, herbal tea bag or fresh herbs", zh: "300毫升热水、草本茶包或新鲜香草" },
      calories: "~5 kcal",
      steps: {
        en: ["Boil water", "Steep tea for 3-5 minutes", "Enjoy warm"],
        zh: ["烧开水", "浸泡茶3-5分钟", "温热饮用"]
      },
      cookingTime: { en: "5 minutes", zh: "5分钟" }
    }
  };
}

module.exports = router;
