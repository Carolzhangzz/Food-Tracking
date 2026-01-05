// src/phaser/dialog/GeminiHandler.js
// Gemini AI处理器 - 用于食物日志问答 - 对接后端 gemini-chat 接口

const API_URL = process.env.REACT_APP_API_URL;

export default class GeminiHandler {
  constructor(scene) {
    this.scene = scene;
    this.turnCount = 0;
  }

  /**
   * 使用 Gemini AI 进行食物日志对话
   * @param {string} userInput 玩家当前的输入（如果是第一个问题，可能是餐食类型）
   * @param {string} npcId NPC标识符
   * @param {string} mealType 餐食类型 (breakfast/lunch/dinner)
   * @param {Array} dialogHistory 之前的对话历史
   * @param {Object} mealAnswers 已收集的餐食答案
   * @param {Object} questionControl 当前问题进度控制
   * @param {Object} coreQuestion 核心问题意图 (包含 en, zh)
   */
  async getGeminiResponse(userInput, npcId, mealType, dialogHistory, mealAnswers, questionControl, coreQuestion) {
    this.turnCount++;
    
    try {
      console.log(`🤖 Gemini AI 请求 (Turn ${this.turnCount}):`, { npcId, mealType, questionId: questionControl.currentQuestionId });

      const response = await fetch(`${API_URL}/gemini-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput: userInput,
          npcId: npcId,
          mealType: mealType,
          dialogHistory: dialogHistory,
          mealAnswers: mealAnswers,
          turnCount: this.turnCount,
          questionControl: questionControl,
          coreQuestion: coreQuestion // 🔧 传递核心意图
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Gemini API returned error");
      }

      console.log(`✅ Gemini AI 响应:`, data.message);

      return {
        success: true,
        message: data.message,
        isComplete: data.isComplete || false
      };
    } catch (error) {
      console.error("❌ Gemini AI 调用失败:", error);
      return {
        success: false,
        error: error.message,
        message: this.getFallbackMessage(questionControl, mealType)
      };
    }
  }

  // 获取回退消息（当 Gemini 失败时）
  getFallbackMessage(questionControl, mealType) {
    const lang = this.scene.playerData?.language || "zh";
    const questionId = questionControl.currentQuestionId;
    
    const fallbacks = {
      Q4: {
        zh: `那你 ${mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'} 吃了什么呢？`,
        en: `So, what did you have for ${mealType}?`
      },
      Q5: {
        zh: "你吃了多少分量？感觉怎么样？",
        en: "What portion size did you eat? How did it feel?"
      },
      Q6: {
        zh: "为什么选择吃这个呢？",
        en: "Why did you choose this particular meal?"
      },
      Q_TIME_FOLLOWUP: {
        zh: "你为什么在这个时间吃饭，而不是早一点或晚一点？",
        en: "Why did you eat at this time rather than earlier or later?"
      }
    };

    const msgSet = fallbacks[questionId] || fallbacks.Q4;
    return msgSet[lang] || msgSet.en;
  }

  // 重置状态
  reset() {
    this.turnCount = 0;
  }
}
