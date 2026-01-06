// src/phaser/dialog/MealRecordingHandler.js
// 🔧 重构版：支持 Type A (Q1-Q6) 和 Type B (Q1-Q3)

const API_URL = process.env.REACT_APP_API_URL;

export default class MealRecordingHandler {
  constructor(scene) {
    this.scene = scene;
    this.questions = this.initializeQuestions();
    this.mealAnswers = {};
    this.needsTimeFollowUp = false;
  }

  // 🔧 初始化问题库
  initializeQuestions() {
    return {
      typeA: {
        sequence: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"],
        questions: {
          Q1: {
            id: "Q1",
            type: "choice",
            coreQuestion: { en: "Ask how they obtained this meal", zh: "询问玩家这顿饭是如何获得的" },
            text: { en: "How is your meal obtained?", zh: "你的这顿饭是怎么获得的？" },
            options: {
              en: ["Home-cooked meals", "Eat out at restaurants", "Takeout or delivery", "Ready-to-eat meals"],
              zh: ["家里做的", "在餐厅吃", "外卖或配送", "即食餐"]
            }
          },
          Q2: {
            id: "Q2",
            type: "choice",
            coreQuestion: { en: "Ask what time they had this meal", zh: "询问玩家吃这顿饭的时间" },
            text: { en: "What time did you have this meal?", zh: "你什么时候吃的这顿饭？" },
            options: {
              en: ["Early morning (before 7AM)", "Morning (7–11AM)", "Midday (11AM–2PM)", "Afternoon (2–5PM)", "Evening (5–9PM)", "Night (after 9PM)"],
              zh: ["清晨（7点前）", "早上（7点-11点）", "中午（11点-14点）", "下午（14点-17点）", "傍晚（17点-21点）", "晚上（21点后）"]
            }
          },
          Q3: {
            id: "Q3",
            type: "choice",
            coreQuestion: { en: "Ask how long they spent eating", zh: "询问玩家吃了多久" },
            text: { en: "How long did you eat?", zh: "你吃了多久？" },
            options: {
              en: ["Less than 10 minutes", "10–30 minutes", "30–60 minutes", "More than 60 minutes"],
              zh: ["少于10分钟", "10-30分钟", "30-60分钟", "超过60分钟"]
            }
          },
          Q4: {
            id: "Q4",
            type: "input",
            coreQuestion: { en: "Ask what foods they consumed during this meal", zh: "询问玩家在这顿饭中吃了哪些食物" },
            text: { en: "What did you have (for [MEAL])?", zh: "你吃了什么（[MEAL]）？" }
          },
          Q5: {
            id: "Q5",
            type: "input",
            coreQuestion: { en: "Ask what portion size they consumed", zh: "询问玩家吃了多少份量" },
            text: { en: "What portion size did you eat?", zh: "你吃了多少份量？" }
          },
          Q6: {
            id: "Q6",
            type: "input",
            coreQuestion: { en: "Ask how they determined the portion size", zh: "询问玩家如何决定这个份量" },
            text: { en: "How did you decide on that amount?", zh: "你是如何决定这个份量的？" }
          },
          Q7: {
            id: "Q7",
            type: "input",
            coreQuestion: { en: "Ask how their body felt during or after eating", zh: "询问玩家吃的时候或吃完后身体感觉如何" },
            text: { en: "How did your body feel, as you ate... and after?", zh: "你吃的时候和吃完后身体感觉如何？" }
          },
          Q8: {
            id: "Q8",
            type: "input",
            coreQuestion: { en: "Ask why they chose this particular food instead of other options", zh: "询问为什么选择这个特定的食物而不是其他选项" },
            text: { en: "Why did you choose this particular food/meal instead of other options?", zh: "你为什么选择这顿饭而不是其他选项？" }
          }
        }
      },
      typeB: {
        sequence: ["Q1", "Q2", "Q3", "Q4", "Q5"],
        questions: {
          Q1: {
            id: "Q1",
            type: "input",
            coreQuestion: { en: "Ask what foods they consumed during this meal", zh: "询问玩家在这顿饭中吃了哪些食物" },
            text: { en: "What did you have (for [MEAL])?", zh: "你吃了什么（[MEAL]）？" }
          },
          Q2: {
            id: "Q2",
            type: "input",
            coreQuestion: { en: "Ask what portion size they consumed", zh: "询问玩家吃了多少份量" },
            text: { en: "What portion size did you eat?", zh: "你吃了多少份量？" }
          },
          Q3: {
            id: "Q3",
            type: "input",
            coreQuestion: { en: "Ask how they determined the portion size", zh: "询问玩家如何决定这个份量" },
            text: { en: "How did you decide on that amount?", zh: "你是如何决定这个份量的？" }
          },
          Q4: {
            id: "Q4",
            type: "input",
            coreQuestion: { en: "Ask how their body felt during or after eating", zh: "询问玩家吃的时候或吃完后身体感觉如何" },
            text: { en: "How did your body feel, as you ate... and after?", zh: "你吃的时候和吃完后身体感觉如何？" }
          },
          Q5: {
            id: "Q5",
            type: "input",
            coreQuestion: { en: "Ask why they chose this particular food instead of other options", zh: "询问为什么选择这个特定的食物而不是其他选项" },
            text: { en: "Why did you choose this particular food/meal instead of other options?", zh: "你为什么选择这顿饭而不是其他选项？" }
          }
        }
      },
      Q_TIME_FOLLOWUP: {
        id: "Q_TIME_FOLLOWUP",
        type: "input",
        coreQuestion: { en: "Ask why they ate at this unusual time rather than earlier or later", zh: "询问为什么在这个不寻常的时间吃饭，而不是早一点或晚一点" },
        text: { en: "Why did you eat at this time rather than earlier or later?", zh: "你为什么在这个时间吃饭，而不是早一点或晚一点？" }
      }
    };
  }

  // 🔧 判断 NPC 属于哪种提问类型
  getNPCQuestionType(npcId) {
    const typeAMapping = ["uncle_bo", "restaurant_owner", "fisherman", "secret_apprentice"];
    return typeAMapping.includes(npcId) ? "typeA" : "typeB";
  }

  // 获取当前 NPC 的问题集
  getCurrentQuestions() {
    const npcId = this.scene.currentNPC;
    const type = this.getNPCQuestionType(npcId);
    return this.questions[type];
  }

  // 获取问题文本（支持占位符）
  getQuestionText(questionId, language = "en", mealType = "this meal") {
    const qSet = this.getCurrentQuestions();
    const question = qSet.questions[questionId] || this.questions.Q_TIME_FOLLOWUP;
    if (!question) return "";

    let text = question.text[language] || question.text.en;
    const mealNames = {
      breakfast: language === "zh" ? "早餐" : "breakfast",
      lunch: language === "zh" ? "午餐" : "lunch",
      dinner: language === "zh" ? "晚餐" : "dinner"
    };
    return text.replace("[MEAL]", mealNames[mealType] || mealType);
  }

  getCoreQuestion(questionId, language = "en", mealType = "this meal") {
    const qSet = this.getCurrentQuestions();
    const question = qSet.questions[questionId] || this.questions.Q_TIME_FOLLOWUP;
    if (!question) return null;
    return question.coreQuestion;
  }

  getQuestionOptions(questionId, language = "en") {
    const qSet = this.getCurrentQuestions();
    const question = qSet.questions[questionId];
    if (!question || !question.options) return [];
    const options = question.options[language] || question.options.en;
    return options.map(text => ({ text, value: text, isOther: false }));
  }

  getQuestionType(questionId) {
    if (questionId === "Q_TIME_FOLLOWUP") return "input";
    const qSet = this.getCurrentQuestions();
    return qSet.questions[questionId]?.type || "input";
  }

  // ⏰ 检查时间是否不寻常
  checkUnusualMealTime(answer, mealType) {
    const timeText = typeof answer === 'object' ? answer.text || answer.value : answer;
    const options = ["Early morning (before 7AM)", "Morning (7–11AM)", "Midday (11AM–2PM)", "Afternoon (2–5PM)", "Evening (5–9PM)", "Night (after 9PM)"];
    
    let index = options.findIndex(opt => timeText.toLowerCase().includes(opt.toLowerCase().split('(')[0].trim().toLowerCase()));
    if (index === -1) return true; // 自定义时间视为不寻常

    if (mealType === "breakfast") return index !== 0 && index !== 1;
    if (mealType === "lunch") return index !== 2;
    if (mealType === "dinner") return index < 4;
    return false;
  }

  saveAnswer(questionId, answer, mealType) {
    this.mealAnswers[questionId] = answer;
    if (questionId === "Q2" && this.getNPCQuestionType(this.scene.currentNPC) === "typeA") {
      this.needsTimeFollowUp = this.checkUnusualMealTime(answer, mealType);
    }
  }

  // 🔧 核心逻辑：获取下一个问题ID
  getNextQuestionId(currentQuestionId) {
    const qSet = this.getCurrentQuestions();
    const sequence = qSet.sequence;
    const type = this.getNPCQuestionType(this.scene.currentNPC);

    // 特殊追问处理 (仅 Type A)
    if (type === "typeA" && currentQuestionId === "Q2" && this.needsTimeFollowUp) {
      return "Q_TIME_FOLLOWUP";
    }
    if (currentQuestionId === "Q_TIME_FOLLOWUP") return "Q3";

    const currentIndex = sequence.indexOf(currentQuestionId);
    if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
      return sequence[currentIndex + 1];
    }
    return null; // 对话完成
  }

  getQuestionIndex(questionId) {
    if (questionId === "Q_TIME_FOLLOWUP") return 2.5;
    const qSet = this.getCurrentQuestions();
    return qSet.sequence.indexOf(questionId);
  }

  async submitMealRecord(playerId, npcId, npcName, mealType, answers, currentDay) {
    try {
      const response = await fetch(`${API_URL}/record-meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId, npcId, npcName, mealType, day: currentDay,
          mealContent: this.formatMealContent(answers),
          answers, timestamp: new Date().toISOString(),
        }),
      });
      return await response.json();
    } catch (error) {
      console.error("❌ Submit Error:", error);
      return { success: false, error: error.message };
    }
  }

  formatMealContent(answers) {
    return Object.entries(answers).map(([q, a]) => {
      const val = typeof a === 'object' ? a.value || a.text : a;
      return `${q}: ${val}`;
    }).join("; ");
  }

  getCompletionMessage(language = "en") {
    return language === "zh" ? "谢谢你和我分享这顿饭。" : "Thanks for sharing your meal with me.";
  }

  reset() {
    this.mealAnswers = {};
    this.needsTimeFollowUp = false;
  }
}
