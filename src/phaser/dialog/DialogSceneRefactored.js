// src/phaser/dialog/DialogSceneRefactored.js
// 重构后的对话场景 - 模块化设计

import Phaser from "phaser";
import DialogStateManager from "./DialogStateManager.js";
import ConvAIHandler from "./ConvAIHandler.js";
import GeminiHandler from "./GeminiHandler.js";
import MealRecordingHandler from "./MealRecordingHandler.js";
import ClueManager from "./ClueManager.js";
import DialogUIManager from "./DialogUIManager.js";
import { getNPCIntroSegments } from "../config/NPCIntros.js";

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

    this.isForcedSequence = true; // 强制执行问答序列
    this.isSubmitting = false; // 防止重复提交
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
    console.log("🎬 DialogScene create() 开始");
    
    try {
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
    } catch (error) {
      console.error("❌ DialogScene create() 出错:", error);
      console.error("❌ 错误堆栈:", error.stack);
      throw error;
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
    if (this.scale.height > this.scale.width) {
      console.warn("⚠️ 检测到竖屏，显示旋转提示");
      alert("请将手机横过来以继续对话！\nPlease rotate your phone to landscape mode!");
      this.showRotationMessage();
      return;
    }

    try {
      // 1. 创建背景
      console.log("🖼️ 创建对话背景...");
      this.createBackground();

      // 2. 创建现代化UI
      console.log("🖥️ 创建对话UI盒子...");
      this.uiManager.createDialogBox();

      // 🔧 3. 加载并显示历史对话记录 (不阻塞后续流程)
      console.log("📚 加载历史记录...");
      this.loadAndDisplayHistory().then(() => {
        console.log("✅ 历史记录加载完成");
      }).catch(err => {
        console.error("❌ 历史记录加载失败:", err);
      });

      // 4. 开始对话流程
      console.log("🎤 启动对话流...");
      this.startDialogFlow();

      console.log("✅ DialogScene 逻辑执行完毕");
    } catch (error) {
      console.error("❌ DialogScene create() 核心逻辑报错:", error);
      alert("对话加载出错，请刷新页面");
    }
  }
  
  // 🔧 新增：加载并显示历史对话记录
  async loadAndDisplayHistory() {
    console.log("📚 加载历史对话记录...");
    
    try {
      // 🔧 修复 API 地址：本地开发环境强制指向 3001
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const API_URL = (hostname === 'localhost' || hostname === '127.0.0.1' || window.location.port === '3000')
        ? `${protocol}//${hostname}:3001/api`
        : `${protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}/api`;

      console.log(`📡 [DialogScene] 尝试获取历史记录: ${API_URL}/conversation-history`);
      
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
    
    // Phase 0: NPC开场白（首次见面时）
    const shouldPlayIntro = await this.checkAndPlayNPCIntro();
    
    if (!shouldPlayIntro) {
      console.log("⏭️ 跳过开场白，直接进入对话");
    }
    
    // Phase 1: ConvAI开场白
    await this.playConvAIIntro();
  }

  /**
   * 检查并播放NPC开场白
   * @returns {Promise<boolean>} 是否播放了开场白
   */
  async checkAndPlayNPCIntro() {
    try {
      // 检查该NPC的开场白是否已观看
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || "https://foodtracking-t1-2f2d3e0bfd08.herokuapp.com"}/api/game/check-intro-watched`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: this.playerId,
            npcId: this.currentNPC,
            day: this.currentDay
          })
        }
      );

      const data = await response.json();
      const isFirstMeet = !data.introWatched;

      if (isFirstMeet) {
        console.log("🎬 首次见面，播放开场白");
        await this.playNPCIntro();
        
        // 标记开场白已观看
        await this.markIntroAsWatched();
        return true;
      } else {
        // 非首次见面，询问是否重看
        const shouldReplay = await this.uiManager.showIntroSkipPrompt(this.currentNPC);
        
        if (!shouldReplay) {
          console.log("🔄 玩家选择重看开场白");
          await this.playNPCIntro();
          return true;
        } else {
          console.log("⏭️ 玩家选择跳过开场白");
          return false;
        }
      }
    } catch (error) {
      console.error("❌ 检查开场白状态失败:", error);
      // 出错时默认播放开场白
      await this.playNPCIntro();
      return true;
    }
  }

  /**
   * 播放NPC开场白（对话框内逐句展示）
   */
  async playNPCIntro() {
    const lang = this.playerData.language || "zh";
    const segments = getNPCIntroSegments(this.currentNPC, lang);

    console.log(`🎬 播放开场白：${this.currentNPC}，共${segments.length}段`);

    // 逐段显示，玩家点击Continue进入下一段
    for (let i = 0; i < segments.length; i++) {
      await new Promise((resolve) => {
        this.uiManager.showIntroSegment(segments[i].text, resolve);
      });
    }

    console.log("✅ 开场白播放完成");
  }

  /**
   * 标记开场白已观看
   */
  async markIntroAsWatched() {
    try {
      await fetch(
        `${process.env.REACT_APP_API_URL || "https://foodtracking-t1-2f2d3e0bfd08.herokuapp.com"}/api/game/mark-intro-watched`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: this.playerId,
            npcId: this.currentNPC,
            day: this.currentDay
          })
        }
      );
      console.log("✅ 已标记开场白为已观看");
    } catch (error) {
      console.error("❌ 标记开场白失败:", error);
    }
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
        
        let response = await this.convaiHandler.callAPI(userInput, this.currentNPC);
        
        // 🔧 关键修复：如果 ConvAI 失败（500 错误或超限），自动回退到 Gemini
        if (!response.success) {
          console.warn("⚠️ ConvAI 失败，正在尝试回退到 Gemini...");
          const geminiFallback = await this.geminiHandler.getGeminiResponse(
            userInput,
            this.currentNPC,
            "conversation",
            this.uiManager.getMessageHistory(),
            {},
            { currentQuestionId: null } // 表示自由聊天模式
          );
          
          if (geminiFallback.success) {
            response = {
              success: true,
              message: geminiFallback.message
            };
          }
        }

        this.uiManager.hideTypingIndicator();
        
        if (response.success) {
          this.uiManager.addMessage("NPC", response.message);
        } else {
          // 如果全部都失败了
          this.uiManager.addMessage("NPC", lang === "zh" ? "我也在思考这件事..." : "I'm thinking about that too...");
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
      let response = await this.convaiHandler.callAPI(userInput, this.currentNPC);
      
      // 🔧 关键修复：如果 ConvAI 失败，回退到 Gemini
      if (!response.success) {
        console.warn("⚠️ ConvAI 失败，正在尝试回退到 Gemini (FreeChat)...");
        const geminiFallback = await this.geminiHandler.getGeminiResponse(
          userInput,
          this.currentNPC,
          "conversation",
          this.uiManager.getMessageHistory(),
          {},
          { currentQuestionId: null }
        );
        
        if (geminiFallback.success) {
          response = {
            success: true,
            message: geminiFallback.message
          };
        }
      }

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
    const questionControl = {
      currentQuestionId: this.currentQuestionId,
      currentQuestionIndex: this.mealHandler.getQuestionIndex(this.currentQuestionId),
      maxQuestions: 8, // 所有NPC统一8个问题 (不包括条件性的 Q_TIME_FOLLOWUP)
      isForcedSequence: true // 🔧 强制执行完整序列
    };
    
    const mealAnswers = this.stateManager.questionAnswers;
    const dialogHistory = this.uiManager.getMessageHistory();
    const npcId = this.currentNPC || "uncle_bo";

    // 🔧 获取核心问题意图，传给 Gemini
    const coreQuestion = this.mealHandler.getCoreQuestion(this.currentQuestionId, lang, mealType);

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
      questionControl,
      coreQuestion // 🔧 传递核心问题
    );
    
    this.uiManager.hideTypingIndicator();
    
    // 🔧 检查 Gemini 是否发出了结束信号
    // 只有当当前问题 ID 为空（表示所有预设问题都已问完）时，才允许 Gemini 结束对话
    if (geminiResult.success && geminiResult.isComplete && !this.currentQuestionId) {
      console.log("🏁 Gemini 指示对话已完成，且预设问题已全部结束。");
      
      // 显示 Gemini 的最后一条消息（如果是结语，确保只显示一次）
      if (geminiResult.message) {
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
    if (this.isSubmitting) {
      console.warn("⚠️ [DialogScene] 正在提交中，跳过重复请求");
      return;
    }
    
    this.isSubmitting = true;
    console.log("🎉 [DialogScene] 开始提交餐食记录...");
    
    const lang = this.playerData.language || "zh";
    const mealType = this.stateManager.selectedMealType;
    
    // 提交到后端
    this.uiManager.updateStatus("正在保存...");
    this.uiManager.showTypingIndicator();
    
    // 🔧 修复 NPC 名字提取逻辑
    let npcNameStr = "NPC";
    if (typeof this.npcData?.name === 'object') {
      npcNameStr = this.npcData.name[lang] || this.npcData.name.zh || this.npcData.name.en;
    } else if (typeof this.npcData?.name === 'string') {
      npcNameStr = this.npcData.name;
    }

    try {
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
        
        // 🔧 直接从前端数据获取线索
        const { getNPCClue, getNPCName } = await import('../../data/npcClues.js');
        const actualNPCName = getNPCName(this.currentNPC, lang);
        
        let clueType, clueText, clueData;
        if (mealType === "dinner") {
          clueType = "true";
          clueData = getNPCClue(this.currentNPC, "true", 0, lang);
          clueText = clueData ? clueData.text : "Good job!";
        } else {
          clueType = "vague";
          const clueKey = `${this.playerId}_${this.currentNPC}_vague_count`;
          const previousVagueCount = parseInt(localStorage.getItem(clueKey) || '0');
          const vagueIndex = Math.min(previousVagueCount, 1);
          clueData = getNPCClue(this.currentNPC, "vague", vagueIndex, lang);
          clueText = clueData ? clueData.text : "Great job!";
          localStorage.setItem(clueKey, (previousVagueCount + 1).toString());
        }
        
        // 🔧 只有当 Gemini 还没说结束语时，我们才显示线索
        // 我们改为让线索晚一点出现，并只显示一次
        if (clueText) {
          console.log("🗝️ NPC 正在说出线索...");
          this.uiManager.addMessage("NPC", clueText);
          
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

        // 🔧 同步数据到 React UI (地图进度图标)
        if (this.mainScene && this.mainScene.updatePlayerdata) {
          const remaining = result.currentDayMealsRemaining || result.availableMealTypes || [];
          console.log("🔄 [DialogScene] 同步餐食进度到 React UI, 剩余餐食:", remaining);
          
          this.playerData = {
            ...this.playerData,
            currentDayMealsRemaining: remaining,
            availableMealTypes: remaining
          };
          
          this.mainScene.updatePlayerdata(this.playerData);

          // 🎬 检查是否为Day 7的任意一餐，询问玩家是否完成游戏
          if (this.currentDay >= 7) {
            console.log("🎬 [DialogScene] Day 7 记录完成，询问是否完成游戏");
            
            const shouldFinish = await this.askToFinishGame();
            
            if (shouldFinish) {
              console.log("🎉 [DialogScene] 玩家选择完成游戏，显示结局");
              // 保存对话历史
              await this.saveConversationHistory(this.stateManager.conversationHistory);
              
              // 显示黑幕 → 信件 → Final Report
              await this.showGameEnding();
              return;
            }
          }
        }
        
        // 🔧 保存对话历史到数据库
        await this.saveConversationHistory(this.stateManager.conversationHistory);
        
        await this.delay(3000);
        this.returnToMainScene();
      } else {
        console.error("❌ 保存失败:", result.error);
        this.isSubmitting = false;
        this.uiManager.updateStatus("❌ 保存失败");
      }
    } catch (error) {
      console.error("❌ 提交异常:", error);
      this.isSubmitting = false;
      this.uiManager.hideTypingIndicator();
    }
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
    
    // 🔧 修复 NPC ID 到背景图的映射，确保与 NPCManager 一致
    const npcBgMapping = {
      "uncle_bo": "npc1bg",
      "shop_owner": "npc2bg",
      "spice_granny": "npc3bg",
      "restaurant_owner": "npc4bg",
      "fisherman": "npc5bg",
      "old_friend": "npc6bg",
      "secret_apprentice": "npc7bg",
      // 兼容可能出现的数字 ID 格式
      "npc1": "npc1bg",
      "npc2": "npc2bg",
      "npc3": "npc3bg",
      "npc4": "npc4bg",
      "npc5": "npc5bg",
      "npc6": "npc6bg",
      "npc7": "npc7bg"
    };

    const bgKey = npcBgMapping[this.currentNPC] || "npc1bg";
    console.log(`🖼️ [DialogScene] NPC: ${this.currentNPC}, 选择背景: ${bgKey}`);
    
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey);
      bg.setDepth(1);
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale);
      console.log(`✅ [DialogScene] 背景贴图已显示: ${bgKey}`);
    } else {
      console.warn(`⚠️ [DialogScene] 背景贴图不存在: ${bgKey}, 使用默认深色背景`);
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

  /**
   * 询问玩家是否完成游戏（Day 7餐食记录后）
   * @returns {Promise<boolean>} true=完成游戏，false=继续记录
   */
  async askToFinishGame() {
    return new Promise((resolve) => {
      const lang = this.playerData?.language || "zh";
      
      const question = lang === "zh"
        ? "恭喜你完成了这餐的记录！你想现在完成游戏查看结局，还是继续记录其他餐食？"
        : "Congratulations on completing this meal! Would you like to finish the game and see the ending now, or continue recording more meals?";

      this.uiManager.addMessage("NPC", question);

      const finishText = lang === "zh" ? "✅ 完成游戏" : "✅ Finish Game";
      const continueText = lang === "zh" ? "📝 继续记录" : "📝 Continue Recording";

      const options = [
        { text: finishText, value: "finish" },
        { text: continueText, value: "continue" }
      ];

      this.uiManager.showButtons(options, (choice) => {
        resolve(choice === "finish");
      });
    });
  }

  /**
   * 显示游戏结局：黑幕 → 信件 → Final Report
   */
  async showGameEnding() {
    console.log("🎬 [GameEnding] 开始显示游戏结局");

    // 1. 黑幕淡入
    await this.showBlackScreen();

    // 2. 显示华师父的信件
    await this.showMasterLetter();

    // 3. 提示解锁食谱
    await this.showUnlockRecipePrompt();

    // 4. 触发 Final Report
    this.triggerFinalReport();
  }

  /**
   * 显示黑幕
   */
  async showBlackScreen() {
    return new Promise((resolve) => {
      const blackScreen = document.createElement("div");
      blackScreen.id = "game-ending-black-screen";
      blackScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        z-index: 9999;
        opacity: 0;
        transition: opacity 2s ease;
      `;

      document.body.appendChild(blackScreen);

      // 淡入
      setTimeout(() => {
        blackScreen.style.opacity = "1";
      }, 100);

      // 等待淡入完成
      setTimeout(() => {
        resolve();
      }, 2500);
    });
  }

  /**
   * 显示华师父的信件（同步播放语音）
   */
  async showMasterLetter() {
    return new Promise((resolve) => {
      const lang = this.playerData?.language || "zh";
      const playerName = this.playerData?.playerName || (lang === "zh" ? "学徒" : "Apprentice");

      const letterContent = lang === "zh" 
        ? `亲爱的${playerName}，

我就知道你能找到这里。

恭喜你找到了食谱。

很抱歉我没能在村子里见到你。我已经离开了。

你能猜到我现在在哪里吗？

我做了一个决定——我想把我的烹饪方式分享给更多的人。一种反映人们口味、忠于村庄根源、同时也是经典的更健康诠释的烹饪方式。

祝你好运。我为你感到骄傲。我们会再见的。

—— 你的华师父`
        : `Dear ${playerName},

I knew you'd find this place.

Congratulations on finding the recipe.

I'm sorry I didn't meet you in the village. I've already left.

Can you guess where I am now?

I've made a decision — I want to share my way of cooking with more people. Something that reflects people's taste, stays true to the roots of this village, and is also a healthier take on a classic.

Best of luck. I'm proud of you. Until we meet again.

– Your Master Hua`;

      // 🎵 创建音频对象
      const chefHuaAudio = new Audio('/assets/audio/chefhua.mp3');
      chefHuaAudio.volume = 0.7;  // 设置音量为70%
      
      console.log("🎵 [MasterLetter] 准备播放华师父语音");
      
      // 添加音频加载错误处理
      chefHuaAudio.onerror = (e) => {
        console.error("❌ [MasterLetter] 音频加载失败:", e);
        console.error("音频路径: /assets/audio/chefhua.mp3");
      };
      
      chefHuaAudio.oncanplaythrough = () => {
        console.log("✅ [MasterLetter] 音频已加载完毕，可以播放");
      };

      const letterContainer = document.createElement("div");
      letterContainer.id = "master-letter-container";
      letterContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        background: rgba(245, 240, 230, 0.95);
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        z-index: 10000;
        opacity: 0;
        transition: opacity 1.5s ease;
        font-family: 'Georgia', serif;
        color: #2c2c2c;
        line-height: 1.8;
      `;

      const letterTitle = document.createElement("div");
      letterTitle.textContent = lang === "zh" ? "来自华师父的信" : "A Letter from Master Hua";
      letterTitle.style.cssText = `
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 30px;
        text-align: center;
        color: #6b4423;
      `;

      const letterText = document.createElement("div");
      letterText.textContent = letterContent;
      letterText.style.cssText = `
        font-size: 18px;
        white-space: pre-wrap;
        margin-bottom: 30px;
      `;

      const continueBtn = document.createElement("button");
      continueBtn.textContent = lang === "zh" ? "继续" : "Continue";
      continueBtn.style.cssText = `
        display: block;
        margin: 0 auto;
        padding: 15px 40px;
        font-size: 18px;
        font-weight: 600;
        background: #6b4423;
        color: white;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
      `;

      continueBtn.onmouseover = () => {
        continueBtn.style.background = "#8b5a3c";
        continueBtn.style.transform = "translateY(-2px)";
      };
      continueBtn.onmouseout = () => {
        continueBtn.style.background = "#6b4423";
        continueBtn.style.transform = "translateY(0)";
      };

      continueBtn.onclick = () => {
        // 🎵 停止音频播放
        console.log("🔇 [MasterLetter] 停止语音播放");
        chefHuaAudio.pause();
        chefHuaAudio.currentTime = 0;
        
        letterContainer.style.opacity = "0";
        setTimeout(() => {
          letterContainer.remove();
          resolve();
        }, 1000);
      };

      letterContainer.appendChild(letterTitle);
      letterContainer.appendChild(letterText);
      letterContainer.appendChild(continueBtn);
      document.body.appendChild(letterContainer);

      // 淡入信件并播放语音
      setTimeout(() => {
        letterContainer.style.opacity = "1";
        
        // 🎵 开始播放语音（增强错误处理）
        chefHuaAudio.play().then(() => {
          console.log("✅ [MasterLetter] 语音播放开始");
          // 显示音频播放指示器
          const audioIndicator = document.createElement("div");
          audioIndicator.id = "audio-indicator";
          audioIndicator.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(99, 102, 241, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: pulse 2s ease-in-out infinite;
          `;
          audioIndicator.innerHTML = `🎵 ${lang === "zh" ? "华师父的声音..." : "Master Hua's voice..."}`;
          letterContainer.appendChild(audioIndicator);
          
          // 音频结束时移除指示器
          chefHuaAudio.onended = () => {
            if (audioIndicator && audioIndicator.parentNode) {
              audioIndicator.remove();
            }
          };
        }).catch(err => {
          console.error("❌ [MasterLetter] 语音播放失败:", err);
          console.error("可能原因: 浏览器自动播放策略、音频文件不存在、或网络问题");
          
          // 添加用户提示：音频无法自动播放
          const audioHint = document.createElement("div");
          audioHint.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(245, 158, 11, 0.9);
            color: white;
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.3s;
          `;
          audioHint.innerHTML = `🔊 ${lang === "zh" ? "点击播放语音" : "Click to play audio"}`;
          audioHint.onclick = () => {
            chefHuaAudio.play().then(() => {
              console.log("✅ 用户手动触发，语音播放成功");
              audioHint.innerHTML = `🎵 ${lang === "zh" ? "正在播放..." : "Playing..."}`;
              setTimeout(() => audioHint.remove(), 2000);
            }).catch(e => {
              console.error("❌ 即使用户点击也无法播放:", e);
              audioHint.innerHTML = `❌ ${lang === "zh" ? "音频不可用" : "Audio unavailable"}`;
            });
          };
          letterContainer.appendChild(audioHint);
        });
      }, 500);

      // 🎵 音频播放完成时自动显示"继续"按钮的提示效果
      chefHuaAudio.onended = () => {
        console.log("✅ [MasterLetter] 语音播放完成");
        continueBtn.style.animation = "pulse 1s ease-in-out infinite";
      };
    });
  }

  /**
   * 显示解锁食谱提示
   */
  async showUnlockRecipePrompt() {
    return new Promise((resolve) => {
      const lang = this.playerData?.language || "zh";

      const promptContainer = document.createElement("div");
      promptContainer.id = "unlock-recipe-prompt";
      promptContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 10001;
        opacity: 0;
        transition: opacity 1s ease;
      `;

      const promptText = document.createElement("div");
      promptText.textContent = lang === "zh" 
        ? "🎉 现在解锁你的食谱！" 
        : "🎉 Unlock Your Recipe Right Now!";
      promptText.style.cssText = `
        font-size: 36px;
        font-weight: bold;
        color: #fff;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
        margin-bottom: 30px;
      `;

      const unlockBtn = document.createElement("button");
      unlockBtn.textContent = lang === "zh" ? "🗝️ 解锁" : "🗝️ Unlock";
      unlockBtn.style.cssText = `
        padding: 20px 60px;
        font-size: 24px;
        font-weight: bold;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        border: none;
        border-radius: 15px;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 10px 30px rgba(245, 158, 11, 0.5);
      `;

      unlockBtn.onmouseover = () => {
        unlockBtn.style.transform = "scale(1.1)";
        unlockBtn.style.boxShadow = "0 15px 40px rgba(245, 158, 11, 0.7)";
      };
      unlockBtn.onmouseout = () => {
        unlockBtn.style.transform = "scale(1)";
        unlockBtn.style.boxShadow = "0 10px 30px rgba(245, 158, 11, 0.5)";
      };

      unlockBtn.onclick = () => {
        promptContainer.style.opacity = "0";
        setTimeout(() => {
          promptContainer.remove();
          resolve();
        }, 800);
      };

      promptContainer.appendChild(promptText);
      promptContainer.appendChild(unlockBtn);
      document.body.appendChild(promptContainer);

      // 淡入
      setTimeout(() => {
        promptContainer.style.opacity = "1";
      }, 300);
    });
  }

  /**
   * 触发 Final Report
   */
  triggerFinalReport() {
    console.log("🏆 [GameEnding] 触发 Final Report");

    // 清理黑幕
    const blackScreen = document.getElementById("game-ending-black-screen");
    if (blackScreen) {
      blackScreen.remove();
    }

    // 设置游戏完成状态
    if (this.mainScene && this.mainScene.updatePlayerdata) {
      this.mainScene.updatePlayerdata({
        ...this.playerData,
        gameCompleted: true,
        currentDayMealsRemaining: []
      });
    }

    // 返回主场景并触发报告
    this.returnToMainScene();
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
      
      // 🔧 关键：从后端重新拉取一次状态，确保主场景的 playerData 和 NPC 状态是最新的
      if (mainScene.npcManager) {
        console.log("🔄 对话结束，触发 NPC 管理器刷新状态...");
        mainScene.npcManager.refreshAvailableNPCs().then(() => {
          console.log("✅ 主场景数据已通过 NPC 管理器同步刷新");
        }).catch(err => {
          console.error("❌ 刷新 NPC 状态失败:", err);
          // 兜底：仅本地更新
          mainScene.npcManager.updateNPCStates();
        });
      }
    }
  }

  // ==================== 场景生命周期 ====================
  async refreshLanguage() {
    const lang = this.playerData?.language || "zh";
    console.log(`🌐 [DialogScene] 刷新对话界面语言: ${lang}`);
    
    // 1. 更新 UI 标题和状态
    if (this.uiManager) {
      const npcName = this.npcData?.name[lang] || this.npcData?.name.zh;
      this.uiManager.updateNPCName(npcName);
    }
    
    // 2. 如果正在显示选项，重新渲染选项
    if (this.stateManager.currentState === 'meal_selection') {
      this.showMealSelection();
    } else if (this.stateManager.currentState === 'meal_recording') {
      const currentQuestionId = this.stateManager.currentQuestionId;
      if (currentQuestionId && (currentQuestionId === 'Q1' || currentQuestionId === 'Q2' || currentQuestionId === 'Q3')) {
        this.askNextQuestion(); // 重新触发当前问题的渲染
      }
    }
  }

  // ... 现有的其他方法 ...
  shutdown() {
    console.log("🛑 DialogScene关闭");
    if (this.uiManager) {
      this.uiManager.destroy();
    }
  }
}

