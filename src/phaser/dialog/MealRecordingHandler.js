// src/phaser/dialog/MealRecordingHandler.js
// 🔧 重构版：前3个按钮选择 + 后3个自由回复 + 时间检查

const API_URL = process.env.REACT_APP_API_URL;

export default class MealRecordingHandler {
  constructor(scene) {
    this.scene = scene;
    this.questions = this.initializeQuestions();
    this.currentQuestionIndex = 0;
    this.mealAnswers = {};
    this.needsTimeFollowUp = false;
  }

  // 🔧 初始化7个固定问题（Q1-Q3按钮，Q4-Q6自由，Q_time_followup条件性）
  initializeQuestions() {
    return {
      // === 按钮选择问题 ===
      Q1: {
        id: "Q1",
        type: "choice",
        coreQuestion: {
          en: "How is your meal obtained?",
          zh: "你的这顿饭是怎么获得的？"
        },
        text: {
          en: "How is your meal obtained?",
          zh: "你的这顿饭是怎么获得的？"
        },
        options: {
          en: [
            "Home-cooked meals",
            "Eat out at restaurants",
            "Takeout or delivery",
            "Ready-to-eat meals"
          ],
          zh: [
            "家里做的",
            "在餐厅吃",
            "外卖或配送",
            "即食餐"
          ]
        }
      },
      Q2: {
        id: "Q2",
        type: "choice",
        coreQuestion: {
          en: "What time did you have this meal?",
          zh: "你什么时候吃的这顿饭？"
        },
        text: {
          en: "What time did you have this meal?",
          zh: "你什么时候吃的这顿饭？"
        },
        options: {
          en: [
            "Early morning (before 7AM)",
            "Morning (7–11AM)",
            "Midday (11AM–2PM)",
            "Afternoon (2–5PM)",
            "Evening (5–9PM)",
            "Night (after 9PM)"
          ],
          zh: [
            "清晨（7点前）",
            "早上（7点-11点）",
            "中午（11点-14点）",
            "下午（14点-17点）",
            "傍晚（17点-21点）",
            "晚上（21点后）"
          ]
        }
      },
      Q3: {
        id: "Q3",
        type: "choice",
        coreQuestion: {
          en: "How long did you eat?",
          zh: "你吃了多久？"
        },
        text: {
          en: "How long did you eat?",
          zh: "你吃了多久？"
        },
        options: {
          en: [
            "Less than 10 minutes",
            "10–30 minutes",
            "30–60 minutes",
            "More than 60 minutes"
          ],
          zh: [
            "少于10分钟",
            "10-30分钟",
            "30-60分钟",
            "超过60分钟"
          ]
        }
      },
      // === 自由回复问题 ===
      Q4: {
        id: "Q4",
        type: "input",
        coreQuestion: {
          en: "What did you have for [MEAL]?",
          zh: "你吃了什么（[MEAL]）？"
        },
        text: {
          en: "What did you have (for [MEAL])?",
          zh: "你吃了什么（[MEAL]）？"
        }
      },
      Q5: {
        id: "Q5",
        type: "input",
        coreQuestion: {
          en: "What portion size did you eat? How did you decide on that amount? How did you feel physically during or after eating?",
          zh: "你吃了多少份量？你是如何决定这个份量的？吃的时候或吃完后身体感觉如何？"
        },
        text: {
          en: "What portion size did you eat? How did you decide on that amount? How did you feel physically during or after eating?",
          zh: "你吃了多少份量？你是如何决定这个份量的？吃的时候或吃完后身体感觉如何？"
        }
      },
      Q6: {
        id: "Q6",
        type: "input",
        coreQuestion: {
          en: "Why did you choose this particular food/meal? For example, simply convenient, you have a craving, healthy options?",
          zh: "你为什么选择这顿饭？比如，方便、想吃、健康选择？"
        },
        text: {
          en: "Why did you choose this particular food/meal? For example, simply convenient, you have a craving, healthy options?",
          zh: "你为什么选择这顿饭？比如，方便、想吃、健康选择？"
        }
      },
      // === 条件性问题（时间不合理时） ===
      Q_TIME_FOLLOWUP: {
        id: "Q_TIME_FOLLOWUP",
        type: "input",
        coreQuestion: {
          en: "Why did you eat at this time rather than earlier or later?",
          zh: "你为什么在这个时间吃饭，而不是早一点或晚一点？"
        },
        text: {
          en: "Why did you eat at this time rather than earlier or later?",
          zh: "你为什么在这个时间吃饭，而不是早一点或晚一点？"
        }
      }
    };
  }

  // 获取问题文本（替换[MEAL]占位符）
  getQuestionText(questionId, language = "en", mealType = "this meal") {
    const question = this.questions[questionId];
    if (!question) return "";

    let text = question.text[language] || question.text.en;
    
    // 替换餐食类型占位符
    const mealNames = {
      breakfast: language === "zh" ? "早餐" : "breakfast",
      lunch: language === "zh" ? "午餐" : "lunch",
      dinner: language === "zh" ? "晚餐" : "dinner"
    };
    
    text = text.replace("[MEAL]", mealNames[mealType] || mealType);
    
    return text;
  }

  // 获取问题选项（仅用于Q1-Q3）
  getQuestionOptions(questionId, language = "en") {
    const question = this.questions[questionId];
    if (!question || !question.options) return [];
    
    const options = question.options[language] || question.options.en;
    return options.map(text => ({ text, value: text, isOther: false }));
  }

  // 获取问题类型
  getQuestionType(questionId) {
    const question = this.questions[questionId];
    return question ? question.type : "input";
  }

  // 🔧 检查餐食时间是否不合常理
  checkUnusualMealTime(answer, mealType) {
    // 这里的answer可能是字符串文本，也可能是对象 {text, value}
    const timeText = typeof answer === 'object' ? answer.text || answer.value : answer;
    
    console.log(`⏰ 检查时间: mealType=${mealType}, answer=`, answer);
    console.log(`⏰ 时间文本: "${timeText}"`);
    
    // 获取问题的选项列表（英文，用于稳定判断）
    const options = this.questions.Q2.options.en;
    console.log(`⏰ 可用选项:`, options);
    
    // 尝试多种匹配方式
    let index = -1;
    
    // 方法1：完全匹配
    index = options.findIndex(opt => opt === timeText);
    
    // 方法2：包含匹配
    if (index === -1) {
      index = options.findIndex(opt => 
        timeText.toLowerCase().includes(opt.toLowerCase()) || 
        opt.toLowerCase().includes(timeText.toLowerCase())
      );
    }
    
    // 方法3：提取时间段关键词
    if (index === -1) {
      const lowerTime = timeText.toLowerCase();
      if (lowerTime.includes('before 7') || lowerTime.includes('early')) index = 0;
      else if (lowerTime.includes('7') && lowerTime.includes('11')) index = 1;
      else if (lowerTime.includes('11') && lowerTime.includes('2')) index = 2;
      else if (lowerTime.includes('2') && lowerTime.includes('5')) index = 3;
      else if (lowerTime.includes('5') && lowerTime.includes('9')) index = 4;
      else if (lowerTime.includes('after 9') || (lowerTime.includes('night') && !lowerTime.includes('midday'))) index = 5;
    }
    
    console.log(`⏰ 匹配到的索引: ${index}`);
    
    // 如果找不到索引，说明是自定义输入（通过"其他"选项），默认认为不寻常
    if (index === -1) {
      console.log(`⏰ 未找到匹配，认为时间不寻常`);
      return true;
    }

    // 索引从0开始：0:Before 7AM, 1:7-11AM, 2:11AM-2PM, 3:2-5PM, 4:5-9PM, 5:After 9PM
    let isUnusual = false;
    
    if (mealType === "breakfast") {
      // 早餐：除了索引0(Before 7AM)和索引1(7-11AM)以外都是不寻常
      isUnusual = (index !== 0 && index !== 1);
      console.log(`⏰ 早餐时间检查: index=${index}, isUnusual=${isUnusual}`);
    } else if (mealType === "lunch") {
      // 午餐：除了 11AM-2PM (索引2) 以外都是不寻常
      isUnusual = (index !== 2);
      console.log(`⏰ 午餐时间检查: index=${index}, isUnusual=${isUnusual}`);
    } else if (mealType === "dinner") {
      // 晚餐：除了 5-9PM (索引4) 和 After 9PM (索引5) 以外都是不寻常
      isUnusual = (index < 4);
      console.log(`⏰ 晚餐时间检查: index=${index}, isUnusual=${isUnusual}`);
    }
    
    console.log(`⏰ 最终结果: ${isUnusual ? '需要' : '不需要'}follow-up问题`);
    return isUnusual;
  }

  // 保存答案并检查是否需要时间follow-up
  saveAnswer(questionId, answer, mealType) {
    this.mealAnswers[questionId] = answer;
    console.log(`📝 保存答案: ${questionId} = ${JSON.stringify(answer)}`);
    
    // 如果是Q2（meal_time），检查时间是否合理
    if (questionId === "Q2") {
      this.needsTimeFollowUp = this.checkUnusualMealTime(answer.value || answer, mealType);
      console.log(`⏰ 时间检查结果: needsFollowUp = ${this.needsTimeFollowUp}`);
    }
  }

  // 🔧 获取下一个问题ID（按顺序：Q1→Q2→Q3→[Q_TIME_FOLLOWUP]→Q4→Q5→Q6）
  getNextQuestionId(currentQuestionId) {
    const sequence = ["Q1", "Q2", "Q3"];
    
    // 如果当前是Q3且需要时间follow-up
    if (currentQuestionId === "Q3" && this.needsTimeFollowUp) {
      return "Q_TIME_FOLLOWUP";
    }
    
    // 如果当前是Q3或Q_TIME_FOLLOWUP，进入自由回复阶段
    if (currentQuestionId === "Q3" || currentQuestionId === "Q_TIME_FOLLOWUP") {
      return "Q4";
    }
    
    if (currentQuestionId === "Q4") return "Q5";
    if (currentQuestionId === "Q5") return "Q6";
    if (currentQuestionId === "Q6") return null; // 完成
    
    // Q1→Q2→Q3
    const currentIndex = sequence.indexOf(currentQuestionId);
    if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
      return sequence[currentIndex + 1];
    }
    
    return null;
  }

  // 检查是否完成所有问题
  isComplete(currentQuestionId) {
    return currentQuestionId === null || currentQuestionId === "Q6";
  }

  // 获取问题索引
  getQuestionIndex(questionId) {
    const sequence = ["Q1", "Q2", "Q3", "Q_TIME_FOLLOWUP", "Q4", "Q5", "Q6"];
    return sequence.indexOf(questionId);
  }

  // 提交餐食记录到后端
  async submitMealRecord(playerId, npcId, npcName, mealType, answers, currentDay) {
    console.log("📤 提交餐食记录:", { playerId, npcId, npcName, mealType, currentDay });
    console.log("📤 餐食答案:", answers);

    try {
      const response = await fetch(`${API_URL}/record-meal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: playerId,
          npcId: npcId,
          npcName: npcName, // 🔧 必须传递名字，否则后端报错
          mealType: mealType,
          day: currentDay,
          mealContent: this.formatMealContent(answers),
          answers: answers,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "记录失败");
      }

      console.log("✅ 餐食记录成功:", result);
      
      return {
        success: true,
        shouldGiveClue: result.shouldGiveClue || false,
        clueText: result.clueText || null,
        clueType: result.clueType || null,
        clueData: result.clueData || null,
        currentDayMealsRemaining: result.currentDayMealsRemaining || [],
        availableMealTypes: result.availableMealTypes || [],
        mealStage: result.mealStage || "completed",
        message: result.message || "Meal recorded successfully",
      };

    } catch (error) {
      console.error("❌ 提交餐食记录失败:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to record meal",
      };
    }
  }

  // 格式化餐食内容（用于存储）
  formatMealContent(answers) {
    const formatted = [];
    const actualAnswers = answers || this.mealAnswers;
    
    Object.entries(actualAnswers).forEach(([questionId, answer]) => {
      const value = typeof answer === 'object' ? answer.value || answer.text : answer;
      formatted.push(`${questionId}: ${value}`);
    });
    
    return formatted.join("; ");
  }

  // 获取vague回复（非晚餐时）
  getVagueResponse(count, language = "en") {
    const responses = {
      1: {
        en: "It's nice hearing you share in such detail. I miss talking to Chef Hua about all things food, and all the little ingredients that make a dish special.\n\nI'll still be here till your next meal, so come back after that. Maybe then, the pieces will make more sense.",
        zh: "很高兴听你分享得这么详细。我想念和华师傅讨论食物的一切，那些让菜肴特别的小配料。\n\n我会一直在这里直到你的下一餐，所以之后再来吧。也许到那时，这些碎片会更有意义。"
      },
      2: {
        en: "I keep trying to remember exactly what he said about the greenwood seeds. It's right on the tip of my tongue.",
        zh: "我一直在努力回忆他到底说了什么关于青木籽的事。就在嘴边了。"
      }
    };

    const response = responses[count] || responses[2];
    return response[language] || response.en;
  }

  // 获取完成提示
  getCompletionMessage(language = "en") {
    return language === "zh" 
      ? "谢谢你和我分享这顿饭。" 
      : "Thanks for sharing your meal with me.";
  }

  // 重置状态
  reset() {
    this.currentQuestionIndex = 0;
    this.mealAnswers = {};
    this.needsTimeFollowUp = false;
  }
}
