// src/phaser/dialog/DialogSceneRefactored.js
// 重构后的对话场景 - 模块化设计

import Phaser from "phaser";
import DialogStateManager from "./DialogStateManager.js";
import ConvAIHandler from "./ConvAIHandler.js";
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
  create() {
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

    // 3. 开始对话流程
    this.startDialogFlow();

    console.log("✅ DialogScene创建完成");
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
        
        // 等待一下让玩家阅读
        await this.delay(800);
        
        // Phase 2: 直接进入餐食选择
        this.showMealSelection();
      } else {
        // Fallback: 使用默认开场白
        console.log("⚠️ ConvAI失败，使用Fallback");
        const fallbackIntro = this.convaiHandler.getDefaultIntro(
          this.currentNPC,
          this.playerData.language || "en"
        );
        this.uiManager.addMessage("NPC", fallbackIntro);
        await this.delay(800);
        this.showMealSelection();
      }
    } catch (error) {
      console.error("❌ 对话流程错误:", error);
      this.uiManager.hideTypingIndicator();
      this.uiManager.updateStatus("发生错误");
    }
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
    
    // 开始问答
    this.askNextQuestion();
  }

  // 询问下一个问题
  askNextQuestion() {
    const nextQuestion = this.mealHandler.getNextQuestion(
      this.stateManager.askedQuestions
    );

    if (!nextQuestion) {
      // 所有问题已完成
      this.completeMealRecording();
      return;
    }

    const lang = this.playerData.language || "zh";
    const questionText = this.mealHandler.getQuestionText(nextQuestion, lang);
    const options = this.mealHandler.getQuestionOptions(nextQuestion, lang);

    this.uiManager.addMessage("NPC", questionText);

    // 🔧 options已经是对象数组格式 { text, value, isOther }
    this.uiManager.showButtons(options, (answer) => {
      this.onQuestionAnswered(nextQuestion, answer);
    });
  }

  // 问题被回答
  onQuestionAnswered(questionId, answer) {
    console.log(`✅ 回答: ${questionId} = ${answer}`);
    this.stateManager.recordAnswer(questionId, answer);
    
    // 继续下一个问题
    this.askNextQuestion();
  }

  // 完成餐食记录
  async completeMealRecording() {
    console.log("🎉 餐食记录完成");
    
    const lang = this.playerData.language || "zh";
    const completionMsg = this.mealHandler.getCompletionMessage(lang);
    
    this.uiManager.addMessage("NPC", completionMsg);

    // 提交到后端
    this.uiManager.updateStatus("正在保存...");
    this.uiManager.showTypingIndicator();
    
    const result = await this.mealHandler.submitMealRecord(
      this.playerId,
      this.currentNPC,
      this.stateManager.selectedMealType,
      this.stateManager.questionAnswers,
      this.currentDay
    );

    this.uiManager.hideTypingIndicator();

    if (result.success) {
      this.stateManager.markMealSubmitted(result);
      this.uiManager.updateStatus("✅ 保存成功");
      
      // 🔧 判断是否给线索（只有晚餐才有可能给线索）
      console.log("🍽️ 餐食类型:", this.stateManager.selectedMealType);
      console.log("🎁 是否给线索:", result.shouldGiveClue);
      
      if (this.stateManager.selectedMealType === "dinner" && result.shouldGiveClue) {
        await this.giveClue();
      } else if (this.stateManager.selectedMealType !== "dinner") {
        // 非晚餐给vague回复
        await this.giveVagueResponse();
      }
    } else {
      this.uiManager.updateStatus("❌ 保存失败");
    }

    // 返回地图
    setTimeout(() => {
      this.returnToMainScene();
    }, 3000);
  }

  // 给线索
  async giveClue() {
    console.log("🔍 给予线索");
    
    const lang = this.playerData.language || "zh";
    const clueResult = await this.clueManager.getClueForNPC(this.currentNPC, lang);
    
    if (clueResult.success) {
      this.uiManager.addMessage("System", "🎁 你获得了一条线索！");
      await this.delay(500);
      this.uiManager.addMessage("NPC", clueResult.clue);
      
      // 保存线索
      await this.clueManager.saveClueToDatabase(
        this.playerId,
        this.currentNPC,
        clueResult.clue,
        this.currentDay
      );
      
      // 更新UI
      this.clueManager.notifyUIManager({
        npcId: this.currentNPC,
        npcName: this.npcManager?.npcData?.find(n => n.id === this.currentNPC)?.name[lang] || this.currentNPC,
        clue: clueResult.clue,
      });
    }
  }

  // 给vague回复
  async giveVagueResponse() {
    console.log("💬 给予vague回复");
    
    const lang = this.playerData.language || "zh";
    const vagueCount = this.calculateVagueCount();
    const vagueMsg = this.mealHandler.getVagueResponse(vagueCount, lang);
    
    this.uiManager.addMessage("NPC", vagueMsg);
    await this.delay(1000);
  }

  // 计算vague回复次数
  calculateVagueCount() {
    // TODO: 从数据库查询该NPC的非晚餐记录次数
    return 1;
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

