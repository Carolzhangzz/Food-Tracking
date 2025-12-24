// src/phaser/dialog/MealRecordingHandler.js
// 餐食记录处理器 - 处理Groq API的食物日志问答

const API_URL = process.env.REACT_APP_API_URL;

export default class MealRecordingHandler {
  constructor(scene) {
    this.scene = scene;
    this.questions = this.initializeQuestions();
  }

  // 初始化预定义的问题和选项
  initializeQuestions() {
    return {
      Q1: {
        text: {
          en: "What did you eat?",
          zh: "你吃了什么？"
        },
        options: {
          en: ["Rice", "Noodles", "Bread", "Vegetables", "Meat", "Soup"],
          zh: ["米饭", "面条", "面包", "蔬菜", "肉类", "汤"]
        }
      },
      Q2: {
        text: {
          en: "How much did you eat?",
          zh: "你吃了多少？"
        },
        options: {
          en: ["A little", "Normal amount", "A lot", "Too much"],
          zh: ["一点点", "正常量", "很多", "太多了"]
        }
      },
      Q3: {
        text: {
          en: "How did it taste?",
          zh: "味道怎么样？"
        },
        options: {
          en: ["Delicious", "Good", "Okay", "Not good"],
          zh: ["很美味", "不错", "还行", "不好吃"]
        }
      },
      Q4: {
        text: {
          en: "Did you eat with anyone?",
          zh: "你和谁一起吃的？"
        },
        options: {
          en: ["Alone", "With family", "With friends", "With colleagues"],
          zh: ["独自一人", "和家人", "和朋友", "和同事"]
        }
      },
      Q5: {
        text: {
          en: "Where did you eat?",
          zh: "你在哪里吃的？"
        },
        options: {
          en: ["At home", "At restaurant", "At work", "On the go"],
          zh: ["在家", "在餐厅", "在工作地点", "在路上"]
        }
      },
      Q6: {
        text: {
          en: "How do you feel after eating?",
          zh: "吃完后感觉如何？"
        },
        options: {
          en: ["Very satisfied", "Satisfied", "Still hungry", "Too full"],
          zh: ["非常满足", "满足", "还有点饿", "太撑了"]
        }
      }
    };
  }

  // 获取问题文本
  getQuestionText(questionId, language = "en") {
    const question = this.questions[questionId];
    return question ? question.text[language] || question.text.en : "";
  }

  // 获取问题选项
  getQuestionOptions(questionId, language = "en") {
    const question = this.questions[questionId];
    return question ? question.options[language] || question.options.en : [];
  }

  // 获取下一个问题ID
  getNextQuestion(answeredQuestions) {
    const allQuestions = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"];
    return allQuestions.find(q => !answeredQuestions.has(q));
  }

  // 检查是否完成所有必需问题
  isRecordingComplete(answeredQuestions) {
    const requiredQuestions = ["Q1", "Q2", "Q3"]; // 至少要回答这3个问题
    return requiredQuestions.every(q => answeredQuestions.has(q));
  }

  // 提交餐食记录到后端
  async submitMealRecord(playerId, npcId, mealType, answers, currentDay) {
    console.log("📤 提交餐食记录:", { playerId, npcId, mealType, currentDay });

    try {
      const response = await fetch(`${API_URL}/record-meal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: playerId,
          npcId: npcId,
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
    return Object.entries(answers)
      .map(([question, answer]) => `${question}: ${answer}`)
      .join("; ");
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
}

