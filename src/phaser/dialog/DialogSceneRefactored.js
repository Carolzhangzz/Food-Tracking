// src/phaser/dialog/DialogSceneRefactored.js
// 重构后的对话场景 - 模块化设计

import Phaser from "phaser";
import DialogStateManager from "./DialogStateManager.js";
import ConvAIHandler from "./ConvAIHandler.js";
import GeminiHandler from "./GeminiHandler.js";
import MealRecordingHandler from "./MealRecordingHandler.js";
import ClueManager from "./ClueManager.js";
import DialogUIManager from "./DialogUIManager.js";

// NPC背景图导入
import npc1bg from "../../assets/npc/npc1bg.png";
import npc2bg from "../../assets/npc/npc2bg.png";
import npc3bg from "../../assets/npc/npc3bg.png";
import npc4bg from "../../assets/npc/npc4bg.png";
import npc5bg from "../../assets/npc/npc5bg.png";
import npc6bg from "../../assets/npc/npc6bg.png";
import npc7bg from "../../assets/npc/npc7bg.png";

export default class DialogSceneRefactored extends Phaser.Scene {
  constructor() {
    super({ key: "DialogSceneRefactored" });
  }

  // ==================== 初始化 ====================
  async init(data) {
    console.log("🎬 DialogScene初始化", data);

    // 基础数据
    this.currentNPC = data.npcId;
    this.npcManager = data.npcManager;
    this.playerData = data.playerData || {};
    this.mainScene = data.mainScene;
    this.playerId = data.playerId;
    this.currentDay = data.currentDay || 1;
    this.isMobile = this.scale.width < 768;

    // 🔧 获取NPC完整数据（包括名字）
    this.npcData = this.npcManager?.npcData?.find(n => n.id === this.currentNPC) || {
      id: this.currentNPC,
      name: data.npcName || "NPC"
    };

    // 可用餐食
    const availableNPC = this.npcManager?.availableNPCs?.find(
      (n) => n.npcId === this.currentNPC
    );
    this.availableMealTypes = availableNPC?.availableMealTypes || [];

    // 🔧 初始化所有模块
    this.stateManager = new DialogStateManager(this);
    this.convaiHandler = new ConvAIHandler(this);
    this.geminiHandler = new GeminiHandler(this);
    this.mealHandler = new MealRecordingHandler(this);
    this.clueManager = new ClueManager(this);
    this.uiManager = new DialogUIManager(this);

    console.log("✅ 所有模块已初始化");
  }

  // ==================== 资源加载 ====================
  preload() {
    // 加载NPC背景图
    this.load.image("npc1bg", npc1bg);
    this.load.image("npc2bg", npc2bg);
    this.load.image("npc3bg", npc3bg);
    this.load.image("npc4bg", npc4bg);
    this.load.image("npc5bg", npc5bg);
    this.load.image("npc6bg", npc6bg);
    this.load.image("npc7bg", npc7bg);
  }

  // ==================== 场景创建 ====================
  async create() {
    const { width, height } = this.scale;

    // 🔧 修复：彻底禁用 Phaser 的键盘捕捉，确保 HTML 输入框可以正常按空格、退格等
    if (this.input && this.input.keyboard) {
      console.log("⌨️ 正在禁用 Phaser 键盘监听 (对话模式)...");
      // 禁用整个键盘插件
      this.input.keyboard.enabled = false;
      // 清除所有按键捕获（防止冒泡被阻止）
      if (typeof this.input.keyboard.clearCaptures === 'function') {
        this.input.keyboard.clearCaptures();
      }
    }

    // 监听场景关闭或停止，恢复键盘捕捉
    const restoreKeyboard = () => {
      if (this.input && this.input.keyboard) {
        console.log("⌨️ 正在恢复 Phaser 键盘监听...");
        this.input.keyboard.enabled = true;
      }
    };
    this.events.on('shutdown', restoreKeyboard);
    this.events.on('pause', restoreKeyboard);
    this.events.on('destroy', restoreKeyboard);

    // 检查横屏
    if (height > width) {
      this.showRotationMessage();
      return;
    }

    // 1. 创建背景
    this.createBackground();

    // 2. 创建现代化UI
    this.uiManager.createDialogBox();

    // 🔧 3. 加载并显示历史对话记录
    await this.loadAndDisplayHistory();

    // 4. 开始对话流程
    this.startDialogFlow();

    console.log("✅ DialogScene创建完成");
  }
  
  // 🔧 新增：加载并显示历史对话记录
  async loadAndDisplayHistory() {
    console.log("📚 加载历史对话记录...");
    
    try {
      const API_URL = process.env.REACT_APP_API_URL;
      const response = await fetch(
        `${API_URL}/conversation-history?playerId=${this.playerId}&npcId=${this.currentNPC}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.history && data.history.length > 0) {
          const lastConversation = data.history[0];
          const previousMessages = lastConversation.conversationData?.history || [];
          
          if (previousMessages.length > 0) {
            console.log(`✅ 找到 ${previousMessages.length} 条历史消息`);
            
            const lang = this.playerData?.language || "zh";
            const headerText = lang === "zh" ? "--- 之前的对话记录 ---" : "--- Previous Conversation ---";
            
            this.uiManager.addMessage("System", headerText);
            
            // 显示历史消息（最多显示最近15条）
            const messagesToShow = previousMessages.slice(-15);
            
            messagesToShow.forEach((msg) => {
              this.uiManager.addMessage(msg.speaker, msg.text);
            });
            
            // 添加分隔符
            const separator = lang === "zh" ? "--- 新对话开始 ---" : "--- New Conversation ---";
            this.uiManager.addMessage("System", separator);
          } else {
            console.log("📭 没有历史对话记录");
          }
        } else {
          console.log("📭 没有历史对话记录");
        }
      } else {
        console.warn("⚠️ 加载历史对话失败:", response.status);
      }
    } catch (error) {
      console.error("❌ 加载历史对话错误:", error);
    }
  }

  // ==================== 对话流程 ====================
  async startDialogFlow() {
    console.log("🎤 开始对话流程");
    
    // Phase 1: ConvAI开场白
    await this.playConvAIIntro();
  }

  async playConvAIIntro() {
    this.uiManager.updateStatus("正在开始对话...");
    this.uiManager.showTypingIndicator();

    try {
      const response = await this.convaiHandler.callAPI("hello", this.currentNPC);
      
      this.uiManager.hideTypingIndicator();
      
      if (response.success) {
        console.log("✅ ConvAI开场白成功");
        
        // 显示开场白
        this.uiManager.addMessage("NPC", response.message);
        
        // 🔧 Phase 2: 自由回复环节（NEW!）
        await this.delay(500);
        this.showFreeResponsePrompt();
      } else {
        // Fallback: 使用默认开场白
        console.log("⚠️ ConvAI失败，使用Fallback");
        const fallbackIntro = this.convaiHandler.getDefaultIntro(
          this.currentNPC,
          this.playerData.language || "en"
        );
        this.uiManager.addMessage("NPC", fallbackIntro);
        await this.delay(500);
        this.showFreeResponsePrompt();
      }
    } catch (error) {
      console.error("❌ 对话流程错误:", error);
      this.uiManager.hideTypingIndicator();
      this.uiManager.updateStatus("发生错误");
    }
  }

  // 🔧 新增：显示自由回复提示
  showFreeResponsePrompt() {
    console.log("💬 显示自由回复环节");
    const lang = this.playerData.language || "zh";
    
    // 🔧 移除按钮选择，改为纯自由输入，让流程更自然
    const prompt = lang === "zh"
      ? "你可以和我说说话，或者告诉我你想记录哪顿饭（早餐/午餐/晚餐）。"
      : "You can chat with me, or tell me which meal you'd like to record (breakfast/lunch/dinner).";
    
    this.uiManager.addMessage("NPC", prompt);
    
    this.uiManager.showInputBox(async (userInput) => {
      const lowerInput = userInput.toLowerCase();
      const isMealRecord = lowerInput.includes("breakfast") || lowerInput.includes("lunch") || lowerInput.includes("dinner") || 
                          userInput.includes("早餐") || userInput.includes("午餐") || userInput.includes("晚餐") ||
                          userInput.includes("记录") || lowerInput.includes("record");

      if (isMealRecord) {
        // 如果提到记录餐食，进入餐食选择
        this.showMealSelection();
      } else {
        // 否则继续自由聊天
        this.uiManager.addMessage("Player", userInput, lang === "zh" ? "你" : "You");
        this.uiManager.showTypingIndicator();
        
        const response = await this.convaiHandler.callAPI(userInput, this.currentNPC);
        this.uiManager.hideTypingIndicator();
        
        if (response.success) {
          this.uiManager.addMessage("NPC", response.message);
        }
        
        await this.delay(800);
        this.showFreeResponsePrompt();
      }
    });
  }

  // 🔧 新增：开始自由聊天
  async startFreeChat() {
    console.log("💬 开始自由聊天");
    const lang = this.playerData.language || "zh";
    
    const chatPrompt = lang === "zh"
      ? "你想说什么？（随时可以选择记录餐食）"
      : "What would you like to say? (You can record a meal anytime)";
    
    this.uiManager.addMessage("NPC", chatPrompt);
    
    this.uiManager.showInputBox(async (userInput) => {
      // 🔧 添加玩家消息
      const lang = this.playerData?.language || "zh";
      this.uiManager.addMessage("Player", userInput, lang === "zh" ? "你" : "You");
      
      // 调用ConvAI继续对话
      this.uiManager.showTypingIndicator();
      const response = await this.convaiHandler.callAPI(userInput, this.currentNPC);
      this.uiManager.hideTypingIndicator();
      
      if (response.success) {
        this.uiManager.addMessage("NPC", response.message);
      }
      
      // 再次显示选择
      await this.delay(800);
      this.showFreeResponsePrompt();
    });
  }

  // 显示餐食选择
  showMealSelection() {
    console.log("🍽️ 显示餐食选择");
    this.stateManager.setPhase("meal_selection");

    // 检查可用餐食
    if (!this.availableMealTypes || this.availableMealTypes.length === 0) {
      const lang = this.playerData.language || "zh";
      const message = lang === "zh" 
        ? "今天的餐食已经全部记录完了，明天再来吧！"
        : "All meals for today have been recorded, come back tomorrow!";
      
      this.uiManager.addMessage("NPC", message);
      
      setTimeout(() => {
        this.returnToMainScene();
      }, 2000);
      return;
    }

    // 显示问题和按钮
    const lang = this.playerData.language || "zh";
    const question = lang === "zh" 
      ? "选择要记录的餐食类型:"
      : "Which meal do you want to record?";
    
    this.uiManager.addMessage("NPC", question);

    // 创建餐食按钮
    const mealNames = {
      breakfast: lang === "zh" ? "早餐" : "Breakfast",
      lunch: lang === "zh" ? "午餐" : "Lunch",
      dinner: lang === "zh" ? "晚餐" : "Dinner",
    };

    const options = this.availableMealTypes.map(mealType => ({
      text: mealNames[mealType] || mealType,
      value: mealType,
    }));

    this.uiManager.showButtons(options, (selectedMeal) => {
      this.onMealSelected(selectedMeal);
    });
  }

  // 餐食被选择
  onMealSelected(mealType) {
    console.log(`✅ 选择了餐食: ${mealType}`);
    this.stateManager.selectMealType(mealType);
    this.stateManager.setPhase("meal_recording");
    
    // 🔧 重置MealHandler状态
    this.mealHandler.reset();
    
    // 🔧 开始新的问题序列：Q1→Q2→Q3→[Q_TIME_FOLLOWUP]→Q4→Q5→Q6
    this.currentQuestionId = "Q1";
    this.askNextQuestion();
  }

  // 🔧 询问下一个问题（Q1-Q3硬编码，Q4-Q6接入Gemini AI）
  async askNextQuestion(userAnswer = null) {
    if (!this.currentQuestionId) {
      // 所有问题已完成
      this.completeMealRecording();
      return;
    }

    const lang = this.playerData.language || "zh";
    const mealType = this.stateManager.selectedMealType;
    const questionType = this.mealHandler.getQuestionType(this.currentQuestionId);
    
    console.log(`❓ 准备提问: ${this.currentQuestionId}, 类型: ${questionType}`);

    // ========================================
    // 🔧 全程调用 Gemini 获取 character-driven 的问题文本
    // ========================================
    const questionControl = {
      currentQuestionId: this.currentQuestionId,
      currentQuestionIndex: this.mealHandler.getQuestionIndex(this.currentQuestionId),
      maxQuestions: 6
    };
    
    const mealAnswers = this.stateManager.questionAnswers;
    const dialogHistory = this.uiManager.getMessageHistory();
    const npcId = this.currentNPC || "uncle_bo";

    // 🔧 调用 Gemini 获取 character-driven 的问题文本
    this.uiManager.showTypingIndicator();
    
    // 如果是第一个问题且没有 userAnswer，userInput 为餐食类型
    const userInput = userAnswer || `I want to record my ${mealType}`;
    
    const geminiResult = await this.geminiHandler.getGeminiResponse(
      userInput,
      npcId,
      mealType,
      dialogHistory,
      mealAnswers,
      questionControl
    );
    
    this.uiManager.hideTypingIndicator();
    
    // 🔧 检查 Gemini 是否发出了结束信号（Q6 之后）
    if (geminiResult.success && geminiResult.isComplete) {
      console.log("🏁 Gemini 指示对话已完成，正在提交餐食记录以获取线索...");
      if (geminiResult.message && !geminiResult.message.toLowerCase().includes("thanks for sharing")) {
        this.uiManager.addMessage("NPC", geminiResult.message);
      }
      await this.delay(500);
      this.completeMealRecording();
      return;
    }
    
    const questionText = geminiResult.success ? geminiResult.message : this.mealHandler.getQuestionText(this.currentQuestionId, lang, mealType);
    
    // 显示问题文本
    this.uiManager.addMessage("NPC", questionText);
    await this.delay(300);
    
    // 🔧 根据问题类型显示交互组件
    if (questionType === "choice") {
      const options = this.mealHandler.getQuestionOptions(this.currentQuestionId, lang);
      console.log(`🔘 显示按钮选项:`, options);
      this.uiManager.showButtons(options, (answer) => {
        this.onQuestionAnswered(this.currentQuestionId, answer);
      });
    } else {
      console.log(`⌨️ 显示输入框 (${this.currentQuestionId})`);
      this.uiManager.showInputBox((answer) => {
        this.onQuestionAnswered(this.currentQuestionId, answer);
      });
    }
  }

  // 🔧 问题被回答
  async onQuestionAnswered(questionId, answer) {
    console.log(`✅ 回答: ${questionId} = ${JSON.stringify(answer)}`);
    
    // 显示玩家的回答
    const lang = this.playerData?.language || "zh";
    const displayText = typeof answer === 'object' ? (answer.text || answer.value) : answer;
    this.uiManager.addMessage("Player", displayText, lang === "zh" ? "你" : "You");
    
    // 🔧 增加一个小延迟，确保玩家消息先渲染出来
    await this.delay(300);

    // 保存答案
    const mealType = this.stateManager.selectedMealType;
    this.mealHandler.saveAnswer(questionId, answer, mealType);
    this.stateManager.recordAnswer(questionId, answer);
    
    // 🔧 获取下一个问题ID（会自动处理时间follow-up逻辑）
    const nextQuestionId = this.mealHandler.getNextQuestionId(questionId);
    this.currentQuestionId = nextQuestionId;
    
    console.log(`➡️ 下一个问题: ${this.currentQuestionId}`);
    
    // 继续下一个问题，并将当前的答案传递给 Gemini 产生 character-driven 的回应
    this.askNextQuestion(displayText);
  }

  // 完成餐食记录
  async completeMealRecording() {
    console.log("🎉 餐食记录完成");
    
    const lang = this.playerData.language || "zh";
    const mealType = this.stateManager.selectedMealType;
    
    // 提交到后端
    this.uiManager.updateStatus("正在保存...");
    this.uiManager.showTypingIndicator();
    
    const conversationHistory = this.uiManager.getMessageHistory();
    
    // 🔧 修复 NPC 名字提取逻辑
    let npcNameStr = "NPC";
    if (typeof this.npcData?.name === 'object') {
      npcNameStr = this.npcData.name[lang] || this.npcData.name.zh || this.npcData.name.en;
    } else if (typeof this.npcData?.name === 'string') {
      npcNameStr = this.npcData.name;
    }

    const result = await this.mealHandler.submitMealRecord(
      this.playerId,
      this.currentNPC,
      npcNameStr,
      mealType,
      this.stateManager.questionAnswers,
      this.currentDay
    );

    this.uiManager.hideTypingIndicator();

    if (result.success) {
      console.log("✅ [DialogScene] 餐食记录保存成功:", result);
      this.stateManager.markMealSubmitted(result);
      this.uiManager.updateStatus("✅ 保存成功");
      
      // 🔧 直接从前端数据获取线索（更可靠！）
      const { getNPCClue, getNPCName } = await import('../../data/npcClues.js');
      
      // 🔧 确保使用正确的NPC名字
      const actualNPCName = getNPCName(this.currentNPC, lang);
      
      // 判断应该给什么类型的线索
      let clueType, clueText, clueData;
      
      if (mealType === "dinner") {
        // 晚餐：给真实线索
        clueType = "true";
        clueData = getNPCClue(this.currentNPC, "true", 0, lang);
        clueText = clueData ? clueData.text : "Good job!";
        console.log("🗝️ [前端] 晚餐 - 给予真实线索:", clueText.substring(0, 50) + "...");
      } else {
        // 早餐/午餐：给模糊线索
        clueType = "vague";
        // 获取该NPC已给过几次vague线索（从本地存储或初始化）
        const clueKey = `${this.playerId}_${this.currentNPC}_vague_count`;
        const previousVagueCount = parseInt(localStorage.getItem(clueKey) || '0');
        const vagueIndex = Math.min(previousVagueCount, 1); // 最多2个vague clue
        
        clueData = getNPCClue(this.currentNPC, "vague", vagueIndex, lang);
        clueText = clueData ? clueData.text : "Great job!";
        
        // 更新计数
        localStorage.setItem(clueKey, (previousVagueCount + 1).toString());
        console.log(`🌫️ [前端] ${mealType} - 给予模糊线索 ${vagueIndex + 1}:`, clueText.substring(0, 50) + "...");
      }
      
      // NPC说出线索
      if (clueText) {
        console.log("🗝️ NPC 正在说出线索...");
        this.uiManager.addMessage("NPC", clueText);
        
        // 添加到本地线索列表（确保立即显示）
        if (this.mainScene && this.mainScene.uiManager) {
          this.mainScene.uiManager.addClue({
            npcId: this.currentNPC,
            npcName: actualNPCName,
            clue: clueText,
            clueType: clueType,
            day: this.currentDay,
            mealType: mealType
          }, true);
        }
        
        await this.delay(1000);
      }

      // 最后说结束语
      const completionMsg = this.mealHandler.getCompletionMessage(lang);
      this.uiManager.addMessage("NPC", completionMsg);
      
      // 🔧 同步数据到 React UI (地图进度图标)
      if (this.mainScene && this.mainScene.updatePlayerdata) {
        const remaining = result.currentDayMealsRemaining || result.availableMealTypes || [];
        console.log("🔄 [DialogScene] 同步餐食进度到 React UI, 剩余餐食:", remaining);
        
        // 🔧 关键：检查是否完成所有 7 天任务
        const isGameComplete = this.currentDay >= 7 && remaining.length === 0;
        
        if (isGameComplete) {
          console.log("🎉 [DialogScene] 恭喜！全周餐食记录已完成！");
        }

        // 🔧 必须先更新本地的 playerData，否则后续逻辑使用的是旧数据
        this.playerData = {
          ...this.playerData,
          currentDayMealsRemaining: remaining,
          availableMealTypes: remaining,
          gameCompleted: isGameComplete // 🔧 标记游戏已完成
        };
        
        this.mainScene.updatePlayerdata(this.playerData);
      } else {
        console.warn("⚠️ [DialogScene] 无法同步到 React UI: mainScene.updatePlayerdata 未定义");
      }
      
      // 🔧 保存对话历史
      await this.saveConversationHistory(conversationHistory);
      
      // 🔧 显示线索或vague回复
      if (result.clueText) {
        if (result.clueType === "true") {
          await this.showTrueClue(result.clueText, result.clueData);
        } else {
          await this.showVagueClue(result.clueText);
        }
      }
    } else {
      console.error("❌ 餐食保存失败:", result.error);
      this.uiManager.updateStatus("❌ 保存失败: " + (result.error || "未知错误"));
    }

    // 🔧 修复：显示按钮让玩家选择，而不是立刻返回
    this.showCompletionOptions();
  }
  
  // 🔧 新增：显示对话完成后的选项
  showCompletionOptions() {
    const lang = this.playerData?.language || "zh";
    
    const options = [
      {
        text: lang === "zh" ? "📖 查看对话记录" : "📖 View Conversation",
        value: "view_history"
      },
      {
        text: lang === "zh" ? "🗺️ 返回地图" : "🗺️ Return to Map",
        value: "return_map"
      }
    ];
    
    // 显示选项按钮
    this.uiManager.showButtons(options, (choice) => {
      if (choice === "view_history") {
        // 玩家可以继续查看对话记录，不做任何操作（对话框保持打开）
        const message = lang === "zh" 
          ? "你可以滚动查看对话记录，或者点击右上角关闭按钮返回地图。"
          : "You can scroll to view the conversation history, or click the close button to return to the map.";
        this.uiManager.addMessage("System", message);
        
        // 再次显示返回地图按钮
        setTimeout(() => {
          this.uiManager.showButtons([options[1]], (choice) => {
            this.returnToMainScene();
          });
        }, 500);
      } else {
        this.returnToMainScene();
      }
    });
  }
  
  // 🔧 新增：保存对话历史到数据库
  async saveConversationHistory(history) {
    console.log("💾 保存对话历史...");
    
    try {
      const API_URL = process.env.REACT_APP_API_URL;
      const response = await fetch(`${API_URL}/save-conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: this.playerId,
          npcId: this.currentNPC,
          conversationType: "meal_recording",
          conversationData: {
            mealType: this.stateManager.selectedMealType,
            day: this.currentDay,
            history: history,
            timestamp: new Date().toISOString(),
          },
        }),
      });
      
      if (response.ok) {
        console.log("✅ 对话历史保存成功");
      } else {
        console.error("⚠️ 对话历史保存失败:", response.status);
      }
    } catch (error) {
      console.error("❌ 保存对话历史错误:", error);
    }
  }

  // 🔧 显示真实线索（晚餐）- 带高亮关键词
  async showTrueClue(clueText, clueData) {
    console.log("🎯 显示TRUE线索");
    const lang = this.playerData?.language || "zh";
    
    // 高亮显示
    this.uiManager.addMessage("System", lang === "zh" ? "🎁 你获得了一条重要线索！" : "🎁 You received an important clue!");
    await this.delay(500);
    
    // 处理**关键词**高亮
    const highlightedText = clueText.replace(
      /\*\*(.*?)\*\*/g, 
      '<span style="color:#ffd700;font-weight:bold;text-shadow:0 0 5px #ffd700;">$1</span>'
    );
    
    this.uiManager.addMessage("NPC", highlightedText, null, true); // true = 允许HTML
    await this.delay(1500);
    
    // 如果有下一个NPC提示
    if (clueData?.nextNPC) {
      const nextNPCHint = lang === "zh" 
        ? `💡 提示：下一步可以去找 ${clueData.nextNPC}`
        : `💡 Hint: Next, you can look for ${clueData.nextNPC}`;
      this.uiManager.addMessage("System", nextNPCHint);
    }
    
    // 🔧 统一使用 this.mainScene
    if (this.mainScene?.uiManager) {
      try {
        await this.mainScene.uiManager.loadCluesFromAPI();
      } catch (e) {
        console.log("更新线索本失败:", e);
      }
    }
  }

  // 🔧 显示vague线索（早餐/午餐）
  async showVagueClue(clueText) {
    console.log("💬 显示VAGUE线索");
    const lang = this.playerData?.language || "zh";
    
    // 🔧 即使是 vague 线索也支持 ** 关键词高亮
    const highlightedText = clueText.replace(
      /\*\*(.*?)\*\*/g, 
      '<span style="color:#ffd700;font-weight:bold;text-shadow:0 0 5px #ffd700;">$1</span>'
    );
    
    // NPC说vague的话
    this.uiManager.addMessage("NPC", highlightedText, null, true);
    await this.delay(1000);
    
    // 给一个小提示
    const hint = lang === "zh" 
      ? "💭 看来需要完成今天的最后一餐才能获得更多信息..."
      : "💭 It seems you need to finish today's last meal for more information...";
    this.uiManager.addMessage("System", hint);

    // 🔧 新增：即使是vague线索也尝试更新一下线索本（因为后端也会保存vague线索）
    if (this.mainScene?.uiManager) {
      try {
        await this.mainScene.uiManager.loadCluesFromAPI();
      } catch (e) {
        console.log("更新线索本失败:", e);
      }
    }
  }

  // ==================== UI辅助方法 ====================
  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  createBackground() {
    const { width, height } = this.scale;
    
    // NPC ID到背景图的映射
    const npcBgMapping = {
      "uncle_bo": "npc1bg",
      "village_head": "npc2bg",
      "spice_granny": "npc3bg",
      "restaurant_owner": "npc4bg",
      "little_girl": "npc5bg",
      "mysterious_person": "npc6bg",
      "final_npc": "npc7bg"
    };

    const bgKey = npcBgMapping[this.currentNPC] || "npc1bg";
    
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey);
      bg.setDepth(1);
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale);
      console.log(`🎨 使用背景: ${bgKey}`);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e).setDepth(1);
    }
  }

  showRotationMessage() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, "请横屏体验对话", {
      fontSize: "22px",
      color: "#fff",
      backgroundColor: "#000000aa",
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setDepth(100);
  }

  returnToMainScene() {
    console.log("🔙 返回主场景");
    
    // 清理UI（移除DOM元素）
    this.uiManager.cleanup();
    
    // 停止当前场景
    this.scene.stop("DialogSceneRefactored");
    
    // 恢复主场景
    const mainScene = this.scene.get("MainScene");
    if (mainScene) {
      this.scene.resume("MainScene");
      
      // 刷新NPC状态
      if (mainScene.npcManager) {
        mainScene.npcManager.updateNPCStates();
      }
    }
  }

  // ==================== 场景生命周期 ====================
  shutdown() {
    console.log("🛑 DialogScene关闭");
    if (this.uiManager) {
      this.uiManager.destroy();
    }
  }
}

