// src/phaser/dialog/DialogStateManager.js
// 对话状态管理器

export default class DialogStateManager {
  constructor(scene) {
    this.scene = scene;
    this.reset();
  }

  reset() {
    // 对话状态
    this.currentPhase = "initial"; // initial | meal_selection | meal_recording | completed
    this.isTyping = false;
    this.isWaitingForInput = false;
    this.dialogTurnCount = 0;
    this.maxDialogTurns = 5;

    // 餐食状态
    this.selectedMealType = null;
    this.mealAnswers = {};
    this.questionAnswers = {};
    this.mealSubmitted = false;
    this.isSubmittingMeal = false;
    this._submittedSet = new Set();
    this.lastRecordResult = null;

    // 问题索引
    this.currentQuestionIndex = 0;
    this.askedQuestions = new Set();
    this.questionAttempts = 0;
    this.maxQuestionAttempts = 2;

    // 对话历史
    this.dialogHistory = [];
    this.conversationHistory = [];
  }

  // 设置对话阶段
  setPhase(phase) {
    console.log(`📝 对话阶段变更: ${this.currentPhase} → ${phase}`);
    this.currentPhase = phase;
  }

  // 获取当前阶段
  getPhase() {
    return this.currentPhase;
  }

  // 选择餐食类型
  selectMealType(mealType) {
    this.selectedMealType = mealType;
    this.mealAnswers = {};
    this.questionAnswers = {};
    this.currentQuestionIndex = 0;
    this.askedQuestions.clear();
    console.log(`🍽️ 选择餐食: ${mealType}`);
  }

  // 记录答案
  recordAnswer(questionId, answer) {
    this.questionAnswers[questionId] = answer;
    this.askedQuestions.add(questionId);
    console.log(`✅ 记录答案: ${questionId} = ${answer}`);
  }

  // 添加到对话历史
  addToHistory(speaker, content) {
    this.dialogHistory.push({ speaker, content, timestamp: Date.now() });
    this.conversationHistory.push({ type: speaker, content });
  }

  // 检查是否可以提交餐食
  canSubmitMeal() {
    return !this.mealSubmitted && 
           !this.isSubmittingMeal && 
           this.selectedMealType &&
           Object.keys(this.questionAnswers).length >= 3; // 至少回答3个问题
  }

  // 标记餐食已提交
  markMealSubmitted(result) {
    this.mealSubmitted = true;
    this.lastRecordResult = result;
    this._submittedSet.add(this.selectedMealType);
    console.log(`✅ 餐食已提交: ${this.selectedMealType}`);
  }

  // 检查餐食是否已提交
  isMealAlreadySubmitted(mealType) {
    return this._submittedSet.has(mealType);
  }

  // 获取状态摘要
  getSummary() {
    return {
      phase: this.currentPhase,
      selectedMeal: this.selectedMealType,
      answersCount: Object.keys(this.questionAnswers).length,
      submitted: this.mealSubmitted,
      historyLength: this.dialogHistory.length,
    };
  }
}

