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
    
    // 提示玩家可以自由回复或选择记录餐食
    const prompt = lang === "zh"
      ? "你想和我继续聊天，还是记录今天的餐食？"
      : "Would you like to chat more, or record your meal?";
    
    this.uiManager.addMessage("NPC", prompt);
    
    const options = [
      {
        text: lang === "zh" ? "💬 继续聊天" : "💬 Continue chatting",
        value: "chat",
        isOther: false,
      },
      {
        text: lang === "zh" ? "🍽️ 记录餐食" : "🍽️ Record meal",
        value: "record_meal",
        isOther: false,
      },
    ];
    
    this.uiManager.showButtons(options, (choice) => {
      if (choice === "chat") {
        this.startFreeChat();
      } else {
        this.showMealSelection();
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

  // 🔧 询问下一个问题（接入 Gemini AI）
  async askNextQuestion(userAnswer = null) {
    if (!this.currentQuestionId) {
      // 所有问题已完成
      this.completeMealRecording();
      return;
    }

    const lang = this.playerData.language || "zh";
    const mealType = this.stateManager.selectedMealType;
    const questionType = this.mealHandler.getQuestionType(this.currentQuestionId);
    
    // 🔧 准备上下文
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
    
    const questionText = geminiResult.success ? geminiResult.message : this.mealHandler.getQuestionText(this.currentQuestionId, lang, mealType);
    
    // 显示问题
    this.uiManager.addMessage("NPC", questionText);
    
    console.log(`❓ 提问: ${this.currentQuestionId}, 类型: ${questionType}`);

    if (questionType === "choice") {
      // Q1-Q3: 按钮选择
      const options = this.mealHandler.getQuestionOptions(this.currentQuestionId, lang);
      
      this.uiManager.showButtons(options, (answer) => {
        this.onQuestionAnswered(this.currentQuestionId, answer);
      });
    } else {
      // Q4-Q6 或 Q_TIME_FOLLOWUP: 自由输入
      this.uiManager.showInputBox((answer) => {
        this.onQuestionAnswered(this.currentQuestionId, answer);
      });
    }
  }

  // 🔧 问题被回答
  onQuestionAnswered(questionId, answer) {
    console.log(`✅ 回答: ${questionId} = ${JSON.stringify(answer)}`);
    
    // 显示玩家的回答
    const lang = this.playerData?.language || "zh";
    const displayText = typeof answer === 'object' ? (answer.text || answer.value) : answer;
    this.uiManager.addMessage("Player", displayText, lang === "zh" ? "你" : "You");
    
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
    const completionMsg = this.mealHandler.getCompletionMessage(lang);
    
    this.uiManager.addMessage("NPC", completionMsg);

    // 🔧 提交到后端（包含对话历史）
    this.uiManager.updateStatus("正在保存...");
    this.uiManager.showTypingIndicator();
    
    const conversationHistory = this.uiManager.getMessageHistory();
    
    const result = await this.mealHandler.submitMealRecord(
      this.playerId,
      this.currentNPC,
      this.stateManager.selectedMealType,
      this.stateManager.questionAnswers,
      this.currentDay
    );

    this.uiManager.hideTypingIndicator();

    if (result.success) {
      console.log("✅ 餐食保存成功");
      this.stateManager.markMealSubmitted(result);
      this.uiManager.updateStatus("✅ 保存成功");
      
      // 🔧 同步 React UI 数据
      if (this.mainScene && this.mainScene.updatePlayerdata) {
        console.log("🔄 同步餐食进度到 React UI:", result.currentDayMealsRemaining);
        const updatedData = {
          ...this.playerData,
          currentDayMealsRemaining: result.currentDayMealsRemaining,
          availableMealTypes: result.currentDayMealsRemaining // 兼容性别名
        };
        this.mainScene.updatePlayerdata(updatedData);
        // 同时更新当前场景的数据，防止下次打开时旧数据
        this.playerData = updatedData;
      }
      
      // 🔧 保存对话历史
      await this.saveConversationHistory(conversationHistory);
      
      // 🔧 显示线索或vague回复（后端已保存，直接显示返回的内容）
      console.log("🍽️ 餐食类型:", this.stateManager.selectedMealType);
      console.log("🎁 后端返回clueType:", result.clueType);
      console.log("📝 线索内容:", result.clueText);
      
      if (result.clueText) {
        if (result.clueType === "true") {
          // 🌙 晚餐 = 真实线索
          await this.showTrueClue(result.clueText, result.clueData);
        } else {
          // 🌞 早餐/午餐 = vague线索
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
    
    // 通知UIManager更新线索本
    if (this.scene?.scene?.get("MainScene")?.uiManager) {
      try {
        await this.scene.scene.get("MainScene").uiManager.loadCluesFromAPI();
      } catch (e) {
        console.log("更新线索本失败（非关键）:", e);
      }
    }
  }

  // 🔧 显示vague线索（早餐/午餐）
  async showVagueClue(clueText) {
    console.log("💬 显示VAGUE线索");
    const lang = this.playerData?.language || "zh";
    
    // NPC说vague的话
    this.uiManager.addMessage("NPC", clueText);
    await this.delay(1000);
    
    // 给一个小提示
    const hint = lang === "zh" 
      ? "💭 看来需要完成今天的最后一餐才能获得更多信息..."
      : "💭 It seems you need to finish today's last meal for more information...";
    this.uiManager.addMessage("System", hint);
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

