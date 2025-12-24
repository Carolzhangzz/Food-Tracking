// src/phaser/DialogScene.js - Fixed & Consolidated
import Phaser from "phaser";
import npc1bg from "../assets/npc/npc1bg.png";
import npc2bg from "../assets/npc/npc2bg.png";
import npc3bg from "../assets/npc/npc3bg.png";
import npc4bg from "../assets/npc/npc4bg.png";
import npc5bg from "../assets/npc/npc5bg.png";
import npc6bg from "../assets/npc/npc6bg.png";
import npc7bg from "../assets/npc/npc7bg.png";
import DialogSystem from "./DialogSystem.js";
import {
  createDialogBox,
  createReturnButton,
  showChoiceButtons,
} from "./DialogUI.js";

const UI_FONT = "'Arial', sans-serif";
const MAX_TURNS_MEAL = 6;
const API_URL = process.env.REACT_APP_API_URL;

export default class DialogScene extends Phaser.Scene {
  constructor() {
    super({ key: "DialogScene" });
    this.initializeProperties();
  }

  // -------- Initialization --------
  initializeProperties() {
    // Base
    this.currentNPC = null;
    this.npcManager = null;
    this.playerData = {};
    this.mainScene = null;
    this.uiManager = null;

    // Dialog states
    this.isTyping = false;
    this.isWaitingForInput = false;
    this.currentDialogState = "waiting_for_api";
    this.dialogPhase = "initial"; // initial | continuing | meal_selection | meal_recording | completed
    this.dialogTurnCount = 0;
    this.maxDialogTurns = 5;
    this.chatCycleTurns = 0;
    this.choicePending = false;

    // Meal states
    this.availableMealTypes = [];
    this.selectedMealType = null;
    this.mealAnswers = {};
    this.questionAnswers = {};
    this.questionGroups = {};
    this.mealSubmitted = false;
    this.isSubmittingMeal = false;
    this.mealSaved = false;
    this.mealSaveInProgress = false;
    this._submittedSet = new Set();
    this.lastRecordResult = null;

    // Tracking
    this.dialogHistory = [];
    this.conversationHistory = [];
    this.currentText = "";
    this.scrollOffset = 0;
    this.vagueCount = 1;

    // Device / UI
    this.isMobile = false;
    this.timers = [];
    this.eventListeners = [];
    this.dynamicButtons = [];
    this.fixedQuestionButtons = [];
    this.mealButtons = [];
    this.textInput = null;
    this.textarea = null;
    this.onUserSubmit = null;
    this.keyboardState = {
      originalHeight: 0,
      currentHeight: 0,
      isOpen: false,
      listeners: [],
      resizeTimer: null,
    };

    // ConvAI / Gemini
    this.useConvAI = false;
    this.convaiSessionId = "-1";

    // 修复：统一问题索引管理
    this.currentQuestionIndex = 0;
    this.geminiTurnCount = 0;
    this.maxGeminiTurns = MAX_TURNS_MEAL;
    this.useGeminiDefault = false;
    this.needUnusualTimeQuestion = false;
    this.needDetailedDescription = false;
    this.askedQuestions = new Set();
    this.questionAttempts = 0;
    this.maxQuestionAttempts = 2;
    this.geminiQuestionOrder = ["Q4", "Q5", "Q6"];

    // Intro fallback
    this.introMode = { active: false, sentences: [], cursor: 0, turns: 0 };

    // NPC map/visit
    this.npcMap = new Map();
    this.npcVisitCount = {};

    // Debug
    this.debugMode = true;


  }

  async init(data) {
    this.quickLogMode = false;
    this.currentNPC = data.npcId;
    this.npcManager = data.npcManager;
    this.playerData = data.playerData || {};
    this.mainScene = data.mainScene;
    this.useConvAI = !!data.useConvAI;
    this.convaiSessionId = "-1";
    this.npcVisitCount = this.npcVisitCount || {};

    // 初始化 UI 管理器（如果主场景有的话）
    this.uiManager = this.mainScene?.uiManager || null;

    // Available meals for this NPC today
    const availableNPC = this.npcManager?.availableNPCs?.find(
      (n) => n.npcId === this.currentNPC
    );
    this.availableMealTypes = availableNPC
      ? availableNPC.availableMealTypes || []
      : [];

    // Mobile check
    this.isMobile = this.scale.width < 768;

    if (this.debugMode) {
      console.log("=== DialogScene init ===");
      console.log("NPC:", this.currentNPC);
      console.log("Player:", this.playerData);
      console.log("Available meals:", this.availableMealTypes);
    }

    this.initKeyboardHandling();

    // 从数据库获取玩家进度
    try {
      const response = await fetch(`/api/game/player-status/${this.playerData.playerId}`);
      const statusData = await response.json();

      if (statusData.success) {
        // 更新可用的 NPC
        this.availableNPCId = statusData.availableNPCId;

        // 更新今日用餐进度
        this.playerData.todayMeals = statusData.todayMeals;

        // 检查当前 NPC 是否可用
        if (this.currentNPC !== this.availableNPCId) {
          console.warn("⚠️ 当前 NPC 不可用，应该对话的 NPC 是:", this.availableNPCId);
        }
      }
    } catch (error) {
      console.error("获取玩家状态失败:", error);
    }

    // 从数据库获取玩家进度
    try {
      const response = await fetch(`/api/game/player-status/${this.playerData.playerId}`);
      const statusData = await response.json();

      if (statusData.success) {
        // 更新可用的 NPC
        this.availableNPCId = statusData.availableNPCId;

        // 更新今日用餐进度
        this.playerData.todayMeals = statusData.todayMeals;

        // 检查当前 NPC 是否可用
        if (this.currentNPC !== this.availableNPCId) {
          console.warn("⚠️ 当前 NPC 不可用，应该对话的 NPC 是:", this.availableNPCId);
        }
      }
    } catch (error) {
      console.error("获取玩家状态失败:", error);
    }
  }

  // ---- Soft keyboard / viewport ----
  initKeyboardHandling() {
    if (typeof window === "undefined") return;
    this.keyboardState.originalHeight = window.innerHeight;

    const handleViewportChange = this.debounce(
      () => this.processViewportChange(),
      100
    );

    if (window.visualViewport) {
      const vvListener = () => handleViewportChange();
      window.visualViewport.addEventListener("resize", vvListener);
      this.keyboardState.listeners.push({
        target: window.visualViewport,
        event: "resize",
        handler: vvListener,
      });
    }
  }

  cleanupAllVisuals() {
    console.log("🧹 清理 DialogScene 视觉元素");

    try {
      // 清理背景
      if (this.npcBackground) {
        this.npcBackground.destroy();
        this.npcBackground = null;
      }

      if (this.solidBackground) {
        this.solidBackground.destroy();
        this.solidBackground = null;
      }

      // 清理对话框
      if (this.dialogBg) {
        this.dialogBg.clear();
        this.dialogBg.destroy();
        this.dialogBg = null;
      }

      // 清理所有按钮
      [
        this.dynamicButtons,
        this.fixedQuestionButtons,
        this.mealButtons,
      ].forEach((arr) => {
        if (arr && Array.isArray(arr)) {
          arr.forEach((btn) => btn && btn.destroy && btn.destroy());
        }
      });
      this.dynamicButtons = [];
      this.fixedQuestionButtons = [];
      this.mealButtons = [];

      // 清理所有矩形和图形对象
      this.children.list.forEach((child) => {
        if (
          child.type === "Graphics" ||
          child.type === "Rectangle" ||
          child.type === "Image"
        ) {
          if (
            child.texture &&
            child.texture.key &&
            child.texture.key.includes("bg")
          ) {
            child.destroy();
          }
        }
      });
    } catch (error) {
      console.error("清理失败:", error);
    }
  }

  processViewportChange() {
    const currentHeight = this.getCurrentViewportHeight();
    const heightDiff = this.keyboardState.originalHeight - currentHeight;
    this.keyboardState.isOpen = heightDiff > 150;
    this.keyboardState.currentHeight = currentHeight;
    if (this.keyboardState.isOpen) this.adjustDialogForKeyboard();
    else this.restoreDialogPosition();
  }

  getCurrentViewportHeight() {
    if (typeof window === "undefined") return 600;
    return window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
  }

  debounce(func, wait) {
    return (...args) => {
      if (this.keyboardState.resizeTimer)
        clearTimeout(this.keyboardState.resizeTimer);
      this.keyboardState.resizeTimer = setTimeout(
        () => func.apply(this, args),
        wait
      );
    };
  }

  adjustDialogForKeyboard() {
    const availableHeight = this.keyboardState.currentHeight;
    const boxHeight = Math.min(availableHeight * 0.35, 200);
    const boxY = 10;
    if (this.dialogBg && this.dialogText)
      this.recreateDialogBox(boxHeight, boxY);
  }

  recreateDialogBox(boxHeight, boxY) {
    const { width } = this.scale;
    const padding = this.isMobile ? 15 : 20;
    const borderRadius = this.isMobile ? 8 : 12;
    const textPadding = this.isMobile ? 20 : 25;

    if (this.dialogBg) {
      this.dialogBg.clear();
      this.dialogBg.fillStyle(0x1a1a2e, 0.9);
      this.dialogBg.fillRoundedRect(
        padding,
        boxY,
        width - padding * 2,
        boxHeight,
        borderRadius
      );
      this.dialogBg.lineStyle(2, 0x4a5568);
      this.dialogBg.strokeRoundedRect(
        padding,
        boxY,
        width - padding * 2,
        boxHeight,
        borderRadius
      );
    }

    if (this.dialogText) {
      this.dialogText.setPosition(textPadding, boxY + 20);
      this.dialogText.setWordWrapWidth(width - textPadding * 2);
    }

    if (this.continueHint)
      this.continueHint.setPosition(width - 40, boxHeight + boxY - 25);

    if (this.scrollMask) {
      this.scrollMask.clear();
      this.scrollMask.fillStyle(0xffffff);
      this.scrollMask.fillRect(
        textPadding,
        boxY + 20,
        width - textPadding * 2,
        boxHeight - 40
      );
      const mask = this.scrollMask.createGeometryMask();
      this.dialogText.setMask(mask);
    }

    this.dialogBoxInfo = {
      x: textPadding,
      y: boxY + 20,
      width: width - textPadding * 2,
      height: boxHeight - 40,
      maxHeight: boxHeight - 40,
    };

    if (this.updateConversationDisplay) this.updateConversationDisplay();
  }

  restoreDialogPosition() {
    const { height } = this.scale;
    const boxHeight = this.isMobile ? height * 0.45 : height * 0.4;
    const boxY = 10;
    if (this.dialogBg && this.dialogText)
      this.recreateDialogBox(boxHeight, boxY);
  }

  // -------- Preload --------
  preload() {
    this.load.image("npc1bg", npc1bg);
    this.load.image("npc2bg", npc2bg);
    this.load.image("npc3bg", npc3bg);
    this.load.image("npc4bg", npc4bg);
    this.load.image("npc5bg", npc5bg);
    this.load.image("npc6bg", npc6bg);
    this.load.image("npc7bg", npc7bg);
    if (this.debugMode) console.log("DialogScene assets loaded");
  }

  // -------- Create --------
  create() {
    // ✅ 修复：定义 width 和 height 变量
    const { width, height } = this.scale;

    // ✅ 检查是否横屏，否则旋转
    if (height > width) {
      const rotationMsg = this.add
        .text(width / 2, height / 2, "请横屏体验对话", {
          fontSize: "22px",
          color: "#fff",
          backgroundColor: "#000000aa",
          padding: { x: 20, y: 12 },
        })
        .setOrigin(0.5)
        .setDepth(100);
      return;
    }

    // visit count
    this.npcVisitCount[this.currentNPC] =
      (this.npcVisitCount[this.currentNPC] || 0) + 1;

    // 🔧 修复：创建可销毁的背景容器
    this.backgroundContainer = this.add.container(0, 0);
    this.backgroundContainer.setDepth(0);

    // 🔧 NPC ID 到背景图编号的映射
    const npcBgMapping = {
      "uncle_bo": "npc1bg",           // Day 1
      "village_head": "npc2bg",       // Day 2
      "spice_granny": "npc3bg",       // Day 3
      "restaurant_owner": "npc4bg",   // Day 4
      "little_girl": "npc5bg",        // Day 5
      "mysterious_person": "npc6bg",  // Day 6
      "final_npc": "npc7bg"           // Day 7
    };

    // 根据NPC创建背景
    if (this.currentNPC) {
      try {
        const bgKey = npcBgMapping[this.currentNPC] || "npc1bg"; // 默认使用npc1bg
        console.log(`🎨 使用NPC背景: ${this.currentNPC} -> ${bgKey}`);

        if (this.textures.exists(bgKey)) {
          // 使用 NPC 背景图
          const bg = this.add.image(width / 2, height / 2, bgKey);
          bg.setDepth(1);

          // 缩放背景以填充整个屏幕
          const scale = Math.max(width / bg.width, height / bg.height);
          bg.setScale(scale);

          this.npcBackground = bg;
          this.backgroundContainer.add(this.npcBackground);
        } else {
          console.warn(`⚠️ 背景图不存在: ${bgKey}`);
          // 纯色背景
          this.solidBackground = this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x1a1a2e
          );
          this.solidBackground.setDepth(1);
          this.backgroundContainer.add(this.solidBackground);
        }
      } catch (err) {
        console.error("❌ Background error:", err);
        // 回退到纯色背景
        this.solidBackground = this.add.rectangle(
          width / 2,
          height / 2,
          width,
          height,
          0x1a1a2e
        );
        this.solidBackground.setDepth(1);
        this.backgroundContainer.add(this.solidBackground);
      }
    } else {
      // 默认背景
      this.solidBackground = this.add.rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x1a1a2e
      );
      this.solidBackground.setDepth(1);
      this.backgroundContainer.add(this.solidBackground);
    }

    // 在 create() 方法中添加 resize 监听
    this.scale.on("resize", this.handleDialogResize, this);

    // 🔧 创建UI和控制（包括对话框）
    this.setupUI();
    this.setupControls();

    // Dialog system
    this.dialogSystem = new DialogSystem(this);
    this.dialogSystem.setNPCManager(this.npcManager);
    this.dialogSystem.on("dialogEnded", this.handleDialogEnded, this);

    // Scene lifecycle
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);

    console.log("✅ DialogScene UI创建完成，准备开始对话");

    // Start
    if (this.useConvAI) {
      this.startConversation();
    } else {
      const lang = this.playerData?.language || "en";
      const greet =
        lang === "zh"
          ? "嗨！回来啦！我们直接记录这顿吧。"
          : "Hey, welcome back! Let's log this meal.";
      this.showSingleMessage("npc", greet, () => this.proceedToMealSelection());
    }

    // 🔧 强制横屏比例
    this.scale.on("resize", this.handleResize, this);
    this.handleResize();
  }

  // 🔧 已删除setupBackground()，背景在create()方法中已创建

  setupUI() {
    console.log("🎨 DialogScene.setupUI() 开始...");

    this.createTopDialogBox();
    createReturnButton(this);
    this.updateStatus("");

    const { width, height } = this.scale;
    const statusY = this.isMobile ? height - 30 : height - 40;
    this.statusText = this.add.text(width / 2, statusY, "", {
      fontSize: this.isMobile ? "12px" : "14px",
      fontFamily: "monospace",
      fill: "#94a3b8",
      align: "center",
    });
    this.statusText.setOrigin(0.5);
    this.statusText.setDepth(50);  // 🔧 确保状态文字在上层
    this.statusText.setScrollFactor(0);  // 🔧 固定在屏幕上

    console.log("✅ DialogScene.setupUI() 完成");
  }

  createTopDialogBox() {
    const { width, height } = this.scale;

    // 🔧 简化：使用全屏中央对话框（适应手机和PC）
    const boxPadding = Math.min(width * 0.05, 40);  // 左右边距
    const boxW = width - boxPadding * 2;  // 对话框宽度
    const boxH = Math.min(height * 0.5, 400);  // 对话框高度
    const boxX = boxPadding;
    const boxY = (height - boxH) / 2;  // 垂直居中

    console.log(`📐 创建对话框: ${boxW}x${boxH} at (${boxX}, ${boxY}), screen=${width}x${height}`);

    // 🎨 美化对话框
    this.dialogBg = this.add.graphics();

    // 阴影
    this.dialogBg.fillStyle(0x000000, 0.4);
    this.dialogBg.fillRoundedRect(boxX + 6, boxY + 6, boxW, boxH, 16);

    // 主背景
    this.dialogBg.fillStyle(0x0f172a, 0.98);
    this.dialogBg.fillRoundedRect(boxX, boxY, boxW, boxH, 16);

    // 渐变边框
    this.dialogBg.lineStyle(4, 0x6366f1, 0.9);
    this.dialogBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 16);

    // 内发光
    this.dialogBg.lineStyle(2, 0x818cf8, 0.6);
    this.dialogBg.strokeRoundedRect(boxX + 3, boxY + 3, boxW - 6, boxH - 6, 14);

    this.dialogBg.setDepth(10);
    this.dialogBg.setScrollFactor(0);

    // 文本区域
    const textPadding = 30;
    const textY = boxY + textPadding;
    const textW = boxW - textPadding * 2;
    const fontSize = Math.min(20, Math.max(16, width / 50));

    this.dialogText = this.add
      .text(boxX + textPadding, textY, "", {
        fontSize: `${fontSize}px`,
        fontFamily: "'Segoe UI', 'Arial', sans-serif",
        fill: "#f1f5f9",
        wordWrap: { width: textW, useAdvancedWrap: true },
        lineSpacing: 8,
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setShadow(1, 1, "#000000", 3, false, true)
      .setDepth(11)
      .setScrollFactor(0);

    // 继续提示符
    const hintX = boxX + boxW - 30;
    const hintY = boxY + boxH - 30;
    this.continueHint = this.add.text(hintX, hintY, "▼", {
      fontSize: `${fontSize + 4}px`,
      fontFamily: "monospace",
      fill: "#fbbf24",
      stroke: "#92400e",
      strokeThickness: 2,
    });
    this.continueHint.setOrigin(0.5).setVisible(false).setDepth(15).setScrollFactor(0);
    this.continueHint.setShadow(0, 2, "#000000", 4, false, true);

    this.tweens.add({
      targets: this.continueHint,
      alpha: { from: 1, to: 0.4 },
      y: { from: hintY, to: hintY + 5 },
      duration: 800,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // Geometry mask
    this.dialogBoxInfo = {
      x: boxX + textPadding,
      y: textY,
      width: textW,
      height: boxH - textPadding * 2 - 40,
    };
  }

  setupControls() {
    const PAD = 32;
    const pointerHandler = (pointer) => {
      if (!this.dialogBoxInfo || this.isWaitingForInput) return;
      const { x, y, width, height } = this.dialogBoxInfo;
      const inBox =
        pointer.x >= x - PAD &&
        pointer.x <= x + width + PAD &&
        pointer.y >= y - PAD &&
        pointer.y <= y + height + PAD;
      if (inBox) this.handleContinue();
    };
    this.input.on("pointerdown", pointerHandler);
  }

  // -------- Input Box Methods --------
  enableInputBox() {
    console.log("🔧 enableInputBox 开始执行");

    if (typeof document === "undefined") {
      console.error("❌ document 未定义！");
      return;
    }

    console.log("   清除旧的输入框...");
    this.clearTextInput();

    const { width, height } = this.scale;

    // 🎨 美化输入容器
    const inputContainer = document.createElement("div");
    inputContainer.style.position = "fixed";
    inputContainer.style.bottom = "20px";
    inputContainer.style.left = "50%";
    inputContainer.style.transform = "translateX(-50%)";
    inputContainer.style.width = this.isMobile ? "90%" : "400px";
    inputContainer.style.maxWidth = "500px";
    inputContainer.style.zIndex = "1000";
    inputContainer.style.display = "flex";
    inputContainer.style.gap = "10px";
    inputContainer.style.filter = "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))";

    // 🎨 美化文本输入框
    this.textInput = document.createElement(
      this.isMobile ? "textarea" : "input"
    );
    if (!this.isMobile) {
      this.textInput.type = "text";
    }
    this.textInput.placeholder =
      this.playerData?.language === "zh"
        ? "输入你的回答..."
        : "Type your answer...";
    this.textInput.style.flex = "1";
    this.textInput.style.padding = "14px 16px";
    this.textInput.style.border = "2px solid #6366f1";
    this.textInput.style.borderRadius = "12px";
    this.textInput.style.backgroundColor = "#1e293b";
    this.textInput.style.color = "#f1f5f9";
    this.textInput.style.fontSize = this.isMobile ? "16px" : "15px";
    this.textInput.style.fontFamily = "'Segoe UI', Arial, sans-serif";
    this.textInput.style.outline = "none";
    this.textInput.style.transition = "all 0.3s ease";
    this.textInput.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.2)";

    // 添加焦点样式
    this.textInput.addEventListener('focus', () => {
      this.textInput.style.borderColor = "#818cf8";
      this.textInput.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.2)";
    });
    this.textInput.addEventListener('blur', () => {
      this.textInput.style.borderColor = "#6366f1";
      this.textInput.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.2)";
    });

    // Improve mobile typing behavior
    try {
      this.textInput.setAttribute("inputmode", "text");
      this.textInput.setAttribute("autocapitalize", "off");
      this.textInput.setAttribute("autocorrect", "off");
      this.textInput.setAttribute("spellcheck", "false");
    } catch (e) { }
    if (this.isMobile) {
      this.textInput.rows = "3";
      this.textInput.style.resize = "none";
    }

    // 🎨 美化提交按钮
    const submitButton = document.createElement("button");
    submitButton.textContent =
      this.playerData?.language === "zh" ? "发送" : "Send";
    submitButton.style.padding = "14px 24px";
    submitButton.style.border = "none";
    submitButton.style.borderRadius = "12px";
    submitButton.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
    submitButton.style.color = "#ffffff";
    submitButton.style.fontSize = this.isMobile ? "16px" : "15px";
    submitButton.style.fontFamily = "'Segoe UI', Arial, sans-serif";
    submitButton.style.fontWeight = "600";
    submitButton.style.cursor = "pointer";
    submitButton.style.whiteSpace = "nowrap";
    submitButton.style.transition = "all 0.3s ease";
    submitButton.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.4)";

    // 添加悬停效果
    submitButton.addEventListener('mouseenter', () => {
      submitButton.style.transform = "translateY(-2px)";
      submitButton.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.5)";
    });
    submitButton.addEventListener('mouseleave', () => {
      submitButton.style.transform = "translateY(0)";
      submitButton.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.4)";
    });
    submitButton.addEventListener('mousedown', () => {
      submitButton.style.transform = "translateY(0) scale(0.98)";
    });
    submitButton.addEventListener('mouseup', () => {
      submitButton.style.transform = "translateY(-2px)";
    });

    // Event listeners
    const handleSubmit = () => {
      const value = this.textInput.value.trim();
      if (value && this.onUserSubmit) {
        this.onUserSubmit(value);
      }
    };

    submitButton.addEventListener("click", handleSubmit);

    // Ensure space works on all devices by preventing Phaser from intercepting
    this.textInput.addEventListener("keydown", (e) => {
      // Do not prevent default so the character is still typed,
      // only stop propagation so Phaser/global handlers don't eat the space.
      e.stopPropagation();
      // On desktop, submit with Enter (without Shift)
      if (!this.isMobile && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    });

    // Desktop-only extras
    if (!this.isMobile) {
      this.textInput.addEventListener("keypress", (e) => {
        // Allow space key on mobile
        if (e.key === " ") {
          e.stopPropagation();
          return true;
        }
        // Enter handling moved to keydown listener for robustness.
      });

      // Also add input event listener for better mobile support
      this.textInput.addEventListener("input", (e) => {
        // Ensure input changes are captured properly
        e.stopPropagation();
      });
    }

    // Add to DOM
    console.log("   添加输入框到 DOM...");
    inputContainer.appendChild(this.textInput);
    inputContainer.appendChild(submitButton);
    document.body.appendChild(inputContainer);

    this.inputContainer = inputContainer;
    this.isWaitingForInput = true;

    console.log("   ✅ 输入框已添加到 DOM");
    console.log("   输入框可见性:", inputContainer.style.display);
    console.log("   输入框位置:", inputContainer.style.bottom, inputContainer.style.left);

    // Focus input
    setTimeout(() => {
      if (this.textInput) {
        this.textInput.focus();
        console.log("   ✅ 输入框已聚焦");
      }
    }, 100);
  }

  disableInputBox() {
    this.isWaitingForInput = false;
    this.clearTextInput();
  }

  clearTextInput() {
    if (this.inputContainer && this.inputContainer.parentNode) {
      this.inputContainer.parentNode.removeChild(this.inputContainer);
    }
    this.inputContainer = null;
    this.textInput = null;
    this.isWaitingForInput = false;
  }

  // -------- Flow controls --------
  handleContinue() {
    if (this.isTyping) return;
    switch (this.dialogPhase) {
      case "continuing":
        this.checkForSkipOption();
        break;
      default:
        break;
    }
  }

  checkForSkipOption() {
    if (
      (this.chatCycleTurns >= 3 || this.canSkipToMeal) &&
      !this.choicePending
    ) {
      this.showContinueOrSkipChoice();
    }
  }

  handleDialogResize() {
    const { width, height } = this.scale;

    // 调整背景大小
    if (this.npcBackground) {
      this.npcBackground.setDisplaySize(width, height);
      this.npcBackground.setPosition(width / 2, height / 2);
    }

    if (this.solidBackground) {
      this.solidBackground.setSize(width, height);
      this.solidBackground.setPosition(width / 2, height / 2);
    }

    // 重绘对话框
    if (this.dialogBg) {
      this.redrawDialogBox();
    }
  }

  handleDialogEnded() {
    this.returnToMainScene();
  }

  // -------- Text rendering --------
  preprocessDialogText(text) {
    if (!text || typeof text !== "string") return text;
    const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
    const hasEnglishWords = /[a-zA-Z]{2,}/.test(text);

    if (hasChineseChars && hasEnglishWords) {
      return text
        .replace(/([\u4e00-\u9fff])([a-zA-Z])/g, "$1​$2")
        .replace(/([a-zA-Z])([\u4e00-\u9fff])/g, "$1​$2")
        .replace(/([.!?。！？])\s+/g, "$1\n")
        .replace(/(\w{10,})/g, (m) => m.replace(/(.{8})/g, "$1​"));
    }

    if (!hasChineseChars && hasEnglishWords) {
      return text.replace(/([.!?])\s+/g, "$1\n").replace(/,\s+/g, ", ");
    }

    return text;
  }

  showSingleMessage(speaker, message, callback) {
    if (!this.sys || this.sys.isDestroyed) return;
    const npc = this.npcManager?.getNPCById(this.currentNPC);
    const npcName = npc ? npc.name : "NPC";
    const displayName = speaker === "npc" ? npcName : "Player";

    const processedMessage = this.preprocessDialogText(message);
    const fullMessage = `${displayName}: ${processedMessage}`;

    this.currentText = fullMessage;
    this.isTyping = true;
    if (this.dialogText) this.dialogText.setText("");
    if (this.continueHint) this.continueHint.setVisible(false);

    let currentChar = 0;
    const totalChars = fullMessage.length;
    const typeSpeed = this.isMobile ? 25 : 30;

    const typewriterTimer = this.time.addEvent({
      delay: typeSpeed,
      repeat: totalChars - 1,
      callback: () => {
        if (!this.sys || this.sys.isDestroyed) {
          typewriterTimer.remove(false);
          return;
        }
        currentChar++;
        let currentDisplayText = fullMessage
          .substring(0, currentChar)
          .replace(/​/g, "");
        try {
          if (this.dialogText) this.dialogText.setText(currentDisplayText);
        } catch { }
        if (currentChar >= totalChars) {
          this.isTyping = false;
          if (this.continueHint) this.continueHint.setVisible(true);
          this.addToConversationHistory(speaker, message);
          if (callback) callback();
        }
      },
    });
    this.timers.push(typewriterTimer);
  }

  addToConversationHistory(speaker, message) {
    const npc = this.npcManager?.getNPCById(this.currentNPC);
    const npcName = npc ? npc.name : "NPC";
    this.conversationHistory.push({
      speaker: speaker === "npc" ? npcName : "Player",
      message,
      timestamp: Date.now(),
    });
    this.updateConversationDisplay();
  }

  updateConversationDisplay() {
    if (!this.dialogText) return;
    let displayText = "";
    const lineHeight = this.isMobile ? 20 : 24;
    const dialogBoxHeight = this.isMobile ? 150 : 200;
    const maxVisibleLines = Math.floor(dialogBoxHeight / lineHeight) - 1;

    let allLines = [];
    this.conversationHistory.forEach((entry, index) => {
      if (index > 0) allLines.push("");
      allLines.push(`${entry.speaker}:`);
      const words = entry.message.split(" ");
      const maxCharsPerLine = this.isMobile ? 35 : 50;
      let currentLine = "";
      words.forEach((word) => {
        if (
          (currentLine + word).length > maxCharsPerLine &&
          currentLine.length > 0
        ) {
          allLines.push(currentLine);
          currentLine = word + " ";
        } else currentLine += word + " ";
      });
      if (currentLine.trim()) allLines.push(currentLine.trim());
    });

    const total = allLines.length;
    const maxStart = Math.max(0, total - maxVisibleLines);
    const offset = Phaser.Math.Clamp(this.scrollOffset || 0, 0, maxStart);
    const start = Math.max(0, total - maxVisibleLines - offset);
    const end = start + maxVisibleLines;
    const visibleLines = allLines.slice(start, end);
    displayText = visibleLines.join("\n");
    this.dialogText.setText(displayText);

    if (allLines.length > maxVisibleLines || (this.scrollOffset || 0) > 0)
      this.showScrollIndicator();
    else this.hideScrollIndicator();
  }

  showScrollIndicator() {
    if (!this.scrollIndicator) {
      const { width, height } = this.cameras.main;
      this.scrollIndicator = this.add.text(width - 30, height * 0.6, "↑↓", {
        fontSize: "12px",
        fontFamily: "monospace",
        fill: "#94a3b8",
      });
      this.scrollIndicator.setOrigin(0.5);
      this.scrollIndicator.setDepth(15);
    }
    this.scrollIndicator.setVisible(true);
  }

  hideScrollIndicator() {
    if (this.scrollIndicator) this.scrollIndicator.setVisible(false);
  }

  // -------- ConvAI / Gemini --------
  async startConversation() {
    console.log("Starting conversation with ConvAI");
    this.updateStatus("正在开始对话...");

    // 重置 introMode，防止重复显示开场白
    if (this.introMode) {
      this.introMode.active = false;
    }

    try {
      const response = await this.callConvaiAPI("hello");
      if (response.success) {
        this.convaiSessionId = response.sessionId;
        // 确保 introMode 已重置，避免在后续对话中使用 fallback
        if (this.introMode) {
          this.introMode.active = false;
        }
        console.log("✅ ConvAI开场白成功:", response.message);

        // 🔧 根据用户要求：开场白结束后直接进入餐食选择
        this.showSingleMessage("npc", response.message, () => {
          this.dialogPhase = "meal_selection";
          this.updateStatus("");
          console.log("💬 开场白完成，准备显示餐食选择");
          this.proceedToMealSelection(); // 直接显示 "Which meal do you want to record?"
        });
      } else {
        throw new Error("ConvAI API failed");
      }
    } catch (error) {
      console.error("❌ ConvAI API调用失败:", error);
      // 🔧 Fallback: 使用默认开场白
      this.primeIntroFallback();
      const first = this.getNextIntroChunk();
      if (first) {
        console.log("⚠️ 使用Fallback开场白:", first);
        await new Promise((res) => this.showSingleMessage("npc", first, res));
        this.dialogPhase = "meal_selection";
        this.updateStatus("");
        this.proceedToMealSelection(); // Fallback后也直接进入餐食选择
      } else {
        this.proceedToMealSelection();
      }
    }
  }

  primeIntroFallback() {
    const introText = this.getDefaultNPCIntro();
    this.introMode.active = true;
    this.introMode.sentences = this.splitIntoSentences(introText);
    this.introMode.cursor = 0;
    this.introMode.turns = 0;
  }

  getNextIntroChunk() {
    if (!this.introMode.active) return null;
    const s = this.introMode.sentences;
    const i = this.introMode.cursor;
    if (!s || i >= s.length) return null;
    const chunkSize = Math.min(2, s.length - i);
    const chunk = s.slice(i, i + chunkSize).join(" ");
    this.introMode.cursor += chunkSize;
    this.introMode.turns += 1;
    return chunk;
  }

  splitIntoSentences(text) {
    if (!text) return [];
    return text
      .split(/(?<=[\.!\?。？！…])\s*|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  getDefaultNPCIntro() {
    const language = this.playerData.language || "en";
    const npcIntros = {
      uncle_bo: {
        en: `Hey, you're back. Recently, your master kept going on about greenwood seeds.`,
        zh: "嘿，你回来了。最近你师父一直在念叨青木籽。",
      },
      village_head: {
        en: `Three days ago, he left the village without a word. The fire in his kitchen was still warm—but he was gone.`,
        zh: "三天前，他离开村子时一句话也没说。厨房里的火还温着——可他已经不见了。",
      },
      spice_granny: {
        en: `That bit of broth on your lip — you tasted your master's greenwood seed soup, didn't you?`,
        zh: "你嘴角还沾着汤呢——是不是尝过你师父的青木籽汤？",
      },
      restaurant_owner: {
        en: `I'm Han. I run this place now. Those spices—you got them from her, didn't you?`,
        zh: "我是韩，现在由我来经营这家店。那些香料——你是从她那里得到的吧？",
      },
      little_girl: {
        en: `I'm Wei. The river has always been my place of calm.`,
        zh: "我是魏。河水一直是我心里的安宁之地。",
      },
      mysterious_person: {
        en: `It's strange seeing you here. Your master and I—we grew up like brothers.`,
        zh: "真奇怪，会在这里见到你。你师父和我——我们是一起长大的。",
      },
      final_npc: {
        en: `You… you're the one he always mentioned. I'm Mei.`,
        zh: "你……你就是他常提到的那个人吧。我是梅。",
      },
    };
    const intro = npcIntros[this.currentNPC];
    return intro ? intro[language] || intro.en : "Hello...";
  }

  showInitialChoices() {
    showChoiceButtons(this, {
      continue: {
        text: this.playerData.language === "zh" ? "闲聊" : "Chatting",
        onClick: () => this.startContinuousDialog(),
      },
    });
  }



  startContinuousDialog() {
    console.log("💬 === 开始连续对话模式 ===");

    // 重置 introMode，防止在连续对话中重复显示开场白
    if (this.introMode) {
      this.introMode.active = false;
    }

    this.dialogPhase = "continuing";
    this.dialogTurnCount = 0;
    this.canSkipToMeal = false;
    this.chatCycleTurns = 0;
    this.choicePending = false;

    console.log("📝 准备显示输入框...");
    this.waitForUserInput();
    console.log("✅ waitForUserInput 已调用");
  }

  createTextInputElements() {
    const { width, height } = this.scale;

    // 移除旧的输入框
    if (this.textInput) {
      this.textInput.remove();
    }
    if (this.textarea) {
      this.textarea.remove();
    }

    if (this.isMobile) {
      // 移动端：使用 textarea
      const textarea = document.createElement("textarea");
      textarea.style.position = "absolute";
      textarea.style.left = "20px";
      textarea.style.bottom = "80px";
      textarea.style.width = `${width - 40}px`;
      textarea.style.height = "80px";
      textarea.style.fontSize = "16px";
      textarea.style.padding = "12px";
      textarea.style.backgroundColor = "#1a1a2e";
      textarea.style.color = "#e2e8f0";
      textarea.style.border = "2px solid #667eea";
      textarea.style.borderRadius = "8px";
      textarea.style.fontFamily = UI_FONT;
      textarea.style.resize = "none";
      textarea.style.display = "none"; // 初始隐藏
      textarea.placeholder = this.playerData.language === "zh"
        ? "在此输入你的回答..."
        : "Type your answer here...";

      document.body.appendChild(textarea);
      this.textarea = textarea;

      // 添加事件监听
      textarea.addEventListener("input", () => {
        // 可以添加实时验证
      });

    } else {
      // 桌面端：使用 input
      const input = document.createElement("input");
      input.type = "text";
      input.style.position = "absolute";
      input.style.left = "20px";
      input.style.bottom = "80px";
      input.style.width = `${width - 200}px`;
      input.style.height = "50px";
      input.style.fontSize = "18px";
      input.style.padding = "12px";
      input.style.backgroundColor = "#1a1a2e";
      input.style.color = "#e2e8f0";
      input.style.border = "2px solid #667eea";
      input.style.borderRadius = "8px";
      input.style.fontFamily = UI_FONT;
      input.style.display = "none"; // 初始隐藏
      input.placeholder = this.playerData.language === "zh"
        ? "在此输入你的回答..."
        : "Type your answer here...";

      document.body.appendChild(input);
      this.textInput = input;

      // 回车提交
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && this.isWaitingForInput) {
          this.submitUserInput();
        }
      });
    }

    console.log("✅ Input elements created:", {
      isMobile: this.isMobile,
      hasTextarea: !!this.textarea,
      hasTextInput: !!this.textInput
    });
  }

  waitForUserInput() {
    this.isWaitingForInput = true;
    this.currentDialogState = "waiting_for_input";

    // 确保输入框存在
    if (!this.textInput && !this.textarea) {
      this.createTextInputElements();
    }

    // 显示输入框
    if (this.isMobile && this.textarea) {
      this.textarea.style.display = "block";
      this.textarea.focus();
    } else if (this.textInput) {
      this.textInput.style.display = "block";
      this.textInput.focus();
    }

    console.log("✅ Input field is now visible and focused");
  }


  async handleUserInput(input) {
    if (this.debugMode) {
      console.log("=== 处理用户输入 ===", input, "阶段:", this.dialogPhase);
    }
    this.clearTextInput();

    if (this.dialogPhase === "continuing") this.dialogTurnCount++;
    this.addToConversationHistory("player", input);
    this.dialogHistory.push({ type: "user", content: input });
    this.updateStatus("正在思考...");

    try {
      let response;
      switch (this.dialogPhase) {
        case "continuing":
          // 只有在 ConvAI 失败且明确激活了 introMode 时才使用 fallback
          // 如果已经有会话ID，说明ConvAI正常工作，应该使用ConvAI而不是fallback
          if (this.introMode?.active && !this.convaiSessionId) {
            const chunk = this.getNextIntroChunk();
            response = chunk
              ? { success: true, message: chunk, meta: { introFallback: true } }
              : { success: false, error: "no-more-intro" };
          } else {
            // 如果已经有ConvAI会话，确保不使用fallback
            if (this.introMode?.active) {
              this.introMode.active = false;
            }
            response = await this.callConvaiAPI(input);
          }
          break;
        case "meal_recording":
          response = await this.callGeminiAPI(input);
          break;
        default:
          throw new Error(`Unknown dialog phase: ${this.dialogPhase}`);
      }

      if (response && response.success) {
        this.dialogHistory.push({
          type: "assistant",
          content: response.message,
        });
        this.updateStatus("");
        await this.processResponse(response);
      } else {
        this.updateStatus("");
        await this.handleResponseError(response);
      }
    } catch (error) {
      console.error("Error in handleUserInput:", error);
      this.updateStatus("");
      await this.handleError(error);
    }
  }

  async processResponse(response) {
    return new Promise((resolve) => {
      this.showSingleMessage("npc", response.message, () => {
        if (this.dialogPhase === "continuing") {
          this.chatCycleTurns = (this.chatCycleTurns || 0) + 1;
          if (this.checkForTriggerPhrase(response.message)) {
            this.proceedToMealSelection();
          } else if (this.chatCycleTurns >= 3) {
            this.showContinueOrSkipChoice();
          } else {
            setTimeout(() => this.waitForUserInput(), 500);
          }
        } else if (this.dialogPhase === "meal_recording") {
          this.geminiTurnCount = (this.geminiTurnCount || 0) + 1;
          const assistantEnds = this.detectThankYouMessage(response.message);
          const isQuestion = /\?\s*$/.test(response.message.trim());
          const reachedCap = this.geminiTurnCount >= this.maxGeminiTurns;

          const mealText = this.extractMealContentFromHistory();
          const hasMeaningfulMeal = !!(mealText && mealText.trim().length >= 3);

          if (
            !isQuestion &&
            (assistantEnds || (reachedCap && hasMeaningfulMeal))
          ) {
            this.dialogPhase = "completed";
            this.submitMealOnce();
            return resolve();
          }

          if (reachedCap && !hasMeaningfulMeal) {
            const tip =
              this.playerData.language === "zh"
                ? "我还没听到你这餐具体吃了什么哦～随便写几样：比如“米饭、土豆牛肉、青菜”。"
                : "I still didn't catch what exactly you had. For example: 'rice, beef & potato, greens'.";
            this.showSingleMessage("npc", tip, () => {
              this.waitForUserInput();
              resolve();
            });
            return;
          }

          setTimeout(() => this.waitForUserInput(), 200);
        }
        resolve();
      });
    });
  }

  checkForTriggerPhrase(message) {
    const npcTriggerMap = {
      village_head: "I believe those records hold the key",
      shop_owner: "He always stood right here before leaving",
      spice_woman: "She whispered to me about a secret ingredient",
      restaurant_owner: "Only the bold flavors can reveal the truth",
      fisherman: "He dropped a note into the river that day",
      old_friend: "You remember our old recipe book, right?",
      secret_apprentice: "I saw him writing in that journal again...",
    };
    const triggerPhrase = npcTriggerMap[this.currentNPC];
    return triggerPhrase && message.includes(triggerPhrase);
  }

  // 检测结束/总结类消息（包括“下顿再来”等提示）
  detectThankYouMessage(text) {
    const lowerText = (text || "").toLowerCase();
    console.log("检测结束消息:", lowerText);
    if (/\?\s*$/.test(lowerText)) return false; // 结尾是问号就不是结束

    const ends = [
      "thanks for sharing your meal with me",
      "thank you for sharing your meal with me",
      "good job! keep doing this",
      "little by little, you'll start to understand",
      "no need to rush",
      "take it one meal at a time",
      // 新增：非 dinner 场景常见的“下顿再来”提示
      "come back after your next meal",
      "come back in a few hours",
      "let's talk again after you've finished your last meal",
    ];

    const endsZh = [
      "谢谢你分享你的餐食",
      "谢谢你与我分享餐食",
      "干得好！继续这样做",
      "一点一点地，你会开始理解",
      "不需要着急",
      "一次吃一顿饭",
      "等你下一餐后再来",
      "下次用餐后再来",
      "过几个小时再回来吧",
      "等你吃完今天最后一顿饭后我们再聊",
    ];

    return (
      ends.some((p) => lowerText.includes(p)) ||
      endsZh.some((p) => text.includes(p))
    );
  }

  showContinueOrSkipChoice() {
    this.choicePending = true;
    this.disableInputBox();
    showChoiceButtons(this, {
      continue: {
        text: this.playerData.language === "zh" ? "继续聊天" : "Keep chatting",
        onClick: () => {
          this.clearAllButtons();
          this.updateStatus("");
          this.chatCycleTurns = 0;
          this.choicePending = false;
          this.dialogPhase = "continuing";
          this.waitForUserInput();
        },
      },
      record: {
        text: this.playerData.language === "zh" ? "记录食物" : "Record meal",
        onClick: () => {
          this.clearAllButtons();
          this.updateStatus("");
          this.choicePending = false;
          this.proceedToMealSelection();
        },
      },
    });
  }

  selectMealType(mealType) {
    console.log("✅ 选择餐食类型:", mealType);

    this.selectedMealType = mealType;
    this.dialogPhase = "meal_recording";

    // 清除选择按钮
    if (this.dynamicButtons) {
      this.dynamicButtons.forEach(btn => btn.destroy());
      this.dynamicButtons = [];
    }

    // 进入固定问题或 AI 对话
    if (this.currentNPC === 'village_head') {
      // 村长使用 Gemini AI
      this.startGeminiChat();
    } else {
      // 其他 NPC 使用固定问题
      this.showAllFixedQuestions();
    }
  }

  // -------- Meal selection & fixed Qs --------
  proceedToMealSelection() {
    console.log("🍽️ 显示餐食选择");

    const question = this.playerData.language === "zh"
      ? "你想记录哪一餐？"
      : "Which meal do you want to record?";

    this.showSingleMessage("npc", question, () => {
      // 显示餐食选择按钮
      const mealOptions = {};

      if (this.availableMealTypes.includes('breakfast')) {
        mealOptions.breakfast = {
          text: this.playerData.language === "zh" ? "早餐 🍳" : "Breakfast 🍳",
          onClick: () => this.selectMealType('breakfast'),
        };
      }

      if (this.availableMealTypes.includes('lunch')) {
        mealOptions.lunch = {
          text: this.playerData.language === "zh" ? "午餐 🍜" : "Lunch 🍜",
          onClick: () => this.selectMealType('lunch'),
        };
      }

      if (this.availableMealTypes.includes('dinner')) {
        mealOptions.dinner = {
          text: this.playerData.language === "zh" ? "晚餐 🍖" : "Dinner 🍖",
          onClick: () => this.selectMealType('dinner'),
        };
      }

      showChoiceButtons(this, mealOptions);
    });
  }

  showMealSelectionButtons() {
    this.clearAllButtons();
    if (!this.availableMealTypes || this.availableMealTypes.length === 0) {
      this.showSingleMessage(
        "npc",
        this.playerData.language === "zh"
          ? "今天的餐食已经全部记录完了，明天再来吧！"
          : "All meals for today have been recorded, come back tomorrow!",
        () => {
          this.dialogPhase = "completed";
          this.returnToMainScene();
        }
      );
      return;
    }

    const { width, height } = this.scale;
    this.mealButtons = [];

    const startY = height * 0.6;
    const buttonSpacing = this.isMobile ? 70 : 90;
    const fontSize = this.isMobile ? "16px" : "20px";
    const padding = this.isMobile ? { x: 20, y: 12 } : { x: 30, y: 15 };

    const qText = this.add.text(
      width / 2,
      startY - 80,
      this.playerData.language === "zh"
        ? "选择要记录的餐食类型:"
        : "Which meal do you want to record?",
      {
        fontSize: this.isMobile ? "16px" : "18px",
        fontFamily: "monospace",
        fill: "#e2e8f0",
        align: "center",
      }
    );
    qText.setOrigin(0.5);
    qText.setDepth(20);
    this.questionText = qText;

    const mealTypeNames = {
      breakfast: this.playerData.language === "zh" ? "早餐" : "Breakfast",
      lunch: this.playerData.language === "zh" ? "午餐" : "Lunch",
      dinner: this.playerData.language === "zh" ? "晚餐" : "Dinner",
    };

    this.availableMealTypes.forEach((mealType, index) => {
      const buttonY = startY + index * buttonSpacing;
      const displayName = mealTypeNames[mealType] || mealType;
      const button = this.add.text(width / 2, buttonY, displayName, {
        fontSize,
        fontFamily: "monospace",
        fill: "#e2e8f0",
        backgroundColor: "#4a5568",
        padding,
      });
      this.dynamicButtons.push(button);
      button.setOrigin(0.5);
      button.setInteractive({ useHandCursor: true });
      button.setDepth(20);
      button.on("pointerdown", () => this.selectMeal(mealType, displayName));
      button.on("pointerover", () => button.setTint(0x667eea));
      button.on("pointerout", () => button.clearTint());
      this.mealButtons.push(button);
    });
  }

  async selectMeal(mealType, displayName) {
    this.mealSubmitted = false;
    this.isSubmittingMeal = false;
    this.mealSaveInProgress = false;
    this.mealSaved = false;
    this.lastRecordResult = null;
    this._submittedSet = this._submittedSet || new Set();
    this.dialogHistory = [];

    if (!this.availableMealTypes.includes(mealType)) {
      const lang = this.playerData?.language;
      const warning =
        lang === "zh"
          ? `${displayName}今天已记录过，确定要重新记录吗？`
          : `${displayName} already recorded today. Record again?`;
      const userConfirmed = await this.showCustomConfirm(warning);
      if (!userConfirmed) return;
    }

    this.clearAllButtons();
    this.selectedMealType = mealType;
    this.addToConversationHistory("player", displayName);
    this.mealAnswers = { mealType };

    this.needUnusualTimeQuestion = this.checkUnusualMealTime();
    this.showAllFixedQuestions();
  }

  showCustomConfirm(message) {
    return new Promise((resolve) => {
      const { width, height } = this.scale;
      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.7);
      overlay.fillRect(0, 0, width, height);
      overlay.setDepth(200);

      const dialogWidth = Math.min(400, width * 0.8);
      const dialogHeight = 150;
      const dialogX = (width - dialogWidth) / 2;
      const dialogY = (height - dialogHeight) / 2;

      const dialog = this.add.graphics();
      dialog.fillStyle(0x2d3748, 1);
      dialog.fillRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 10);
      dialog.lineStyle(2, 0x4a5568);
      dialog.strokeRoundedRect(dialogX, dialogY, dialogWidth, dialogHeight, 10);
      dialog.setDepth(201);

      const text = this.add.text(width / 2, dialogY + 50, message, {
        fontSize: this.isMobile ? "14px" : "16px",
        fontFamily: "Arial, sans-serif",
        fill: "#ffffff",
        align: "center",
        wordWrap: { width: dialogWidth - 40 },
      });
      text.setOrigin(0.5);
      text.setDepth(202);

      const buttonY = dialogY + dialogHeight - 40;
      const yesText = this.playerData?.language === "zh" ? "确定" : "Yes";
      const noText = this.playerData?.language === "zh" ? "取消" : "No";

      const yesButton = this.add.text(width / 2 - 60, buttonY, yesText, {
        fontSize: "14px",
        fontFamily: "Arial, sans-serif",
        fill: "#ffffff",
        backgroundColor: "#48bb78",
        padding: { x: 20, y: 10 },
      });
      yesButton.setOrigin(0.5);
      yesButton.setDepth(202);
      yesButton.setInteractive({ useHandCursor: true });

      const noButton = this.add.text(width / 2 + 60, buttonY, noText, {
        fontSize: "14px",
        fontFamily: "Arial, sans-serif",
        fill: "#ffffff",
        backgroundColor: "#e53e3e",
        padding: { x: 20, y: 10 },
      });
      noButton.setOrigin(0.5);
      noButton.setDepth(202);
      noButton.setInteractive({ useHandCursor: true });

      const cleanup = () => {
        overlay.destroy();
        dialog.destroy();
        text.destroy();
        yesButton.destroy();
        noButton.destroy();
      };

      yesButton.on("pointerdown", () => {
        cleanup();
        resolve(true);
      });

      noButton.on("pointerdown", () => {
        cleanup();
        resolve(false);
      });
    });
  }

  // 显示所有固定问题
  // 修改 showAllFixedQuestions 方法，让村长使用 AI 对话而不是固定问题
  showAllFixedQuestions() {
    if (this.debugMode) {
      console.log("=== 显示所有固定问题 ===", this.mealAnswers);
    }

    this.mealAnswers = this.mealAnswers || {};
    this.mealAnswers.mealType =
      this.mealAnswers.mealType || this.selectedMealType;
    this.questionAnswers = {};
    this.questionGroups = {};

    const { width, height } = this.scale;

    this.clearAllButtons();

    // 隐藏对话框
    if (this.dialogBg) this.dialogBg.setVisible(false);
    if (this.dialogText) this.dialogText.setVisible(false);
    if (this.continueHint) this.continueHint.setVisible(false);
    if (this.scrollIndicatorUp) this.scrollIndicatorUp.setVisible(false);
    if (this.scrollIndicatorDown) this.scrollIndicatorDown.setVisible(false);
    this.clearTextInput();

    const availableHeight = this.keyboardState.isOpen
      ? this.keyboardState.currentHeight
      : height;

    // 如果是村长，使用 AI 对话而不是固定问题
    if (this.currentNPCId === "village_head") {
      this.startAIDialog();
      return;
    }

    // 其他 NPC 继续使用固定问题
    const questions = [
      {
        title:
          this.playerData.language === "zh"
            ? "1. 你的餐食是如何获得的？"
            : "1. How is your meal obtained?",
        options:
          this.playerData.language === "zh"
            ? ["A. 家里做的", "B. 餐厅用餐", "C. 外卖/打包", "D. 即食食品"]
            : [
              "A. Home-cooked meals",
              "B. Eat out at restaurants",
              "C. Takeout or delivery",
              "D. Ready-to-eat meals",
            ],
        key: "obtainMethod",
      },
      {
        title:
          this.playerData.language === "zh"
            ? "2. 你什么时候吃的这餐？"
            : "2. What time did you have this meal?",
        options:
          this.playerData.language === "zh"
            ? [
              "A. 清晨 (7点前)",
              "B. 上午 (7-11点)",
              "C. 中午 (11点-下午2点)",
              "D. 下午 (下午2-5点)",
              "E. 傍晚 (下午5-9点)",
              "F. 夜晚 (9点后)",
            ]
            : [
              "A. Early morning (before 7:00 AM)",
              "B. Morning (7:00—11:00 AM)",
              "C. Midday (11:00 AM—2:00 PM)",
              "D. Afternoon (2:00—5:00 PM)",
              "E. Evening (5:00—9:00 PM)",
              "F. Night (after 9:00 PM)",
            ],
        key: "mealTime",
      },
      {
        title:
          this.playerData.language === "zh"
            ? "3. 你用了多长时间吃完？"
            : "3. How long did you eat?",
        options:
          this.playerData.language === "zh"
            ? ["A. 不到10分钟", "B. 10-30分钟", "C. 30-60分钟", "D. 超过60分钟"]
            : [
              "A. Less than 10 minutes",
              "B. 10—30 minutes",
              "C. 30—60 minutes",
              "D. More than 60 minutes",
            ],
        key: "duration",
      },
    ];

    questions.forEach((q) => {
      if (!this.mealAnswers[q.key]) {
        this.showQuestion(q);
      }
    });
  }

  // 添加新的 AI 对话方法
  startAIDialog() {
    // 显示对话框
    if (this.dialogBg) this.dialogBg.setVisible(true);
    if (this.dialogText) this.dialogText.setVisible(true);

    // 开始 AI 对话
    this.sendMessageToAI("", true); // 发送空消息开始对话
  }

  // 选择固定问题答案
  selectFixedQuestionAnswer(questionKey, answer, answerIndex, questionIndex) {
    this.questionGroups = this.questionGroups || {};
    this.questionGroups[questionKey] = this.questionGroups[questionKey] || [];
    this.mealAnswers = this.mealAnswers || {};

    if (this.debugMode) {
      console.log("=== 选择固定问题答案 ===");
      console.log("问题:", questionKey, "答案:", answer);
    }

    this.questionAnswers[questionKey] = { text: answer, index: answerIndex };
    this.mealAnswers[questionKey] = { text: answer, index: answerIndex };

    this.addToConversationHistory("player", answer);

    (this.questionGroups[questionKey] || []).forEach((btn) => {
      btn.clearTint();
      btn.setAlpha(0.7);
    });

    const clickedButton = (this.questionGroups[questionKey] || []).find(
      (btn) => btn.text === answer
    );

    if (clickedButton) {
      clickedButton.setTint(0x10b981);
      clickedButton.setAlpha(1);
    }

    const totalQuestions = 3;
    const answeredQuestions = Object.keys(this.questionAnswers).length;

    if (this.debugMode) {
      console.log("已回答问题数:", answeredQuestions, "/", totalQuestions);
    }

    if (answeredQuestions >= totalQuestions) {
      this.submitButton.setVisible(true);
      this.submitButton.setTint(0x10b981);
    }
  }

  // 提交所有固定答案
  async submitAllFixedAnswers() {
    if (this.debugMode) {
      console.log("=== 提交所有固定答案 ===");
      console.log("所有答案:", this.mealAnswers);
    }

    this.clearAllButtons();

    // 恢复对话框显示
    if (this.dialogBg) this.dialogBg.setVisible(true);
    if (this.dialogText) this.dialogText.setVisible(true);
    if (this.continueHint) this.continueHint.setVisible(true);

    this.startGeminiChat();
  }

  // 开始Gemini对话
  async startGeminiChat() {
    if (this.debugMode) {
      console.log("=== 开始 Gemini 对话 ===");
      console.log("餐食类型:", this.selectedMealType);
      console.log("固定答案:", this.mealAnswers);
    }

    this.clearAllButtons();
    this.dialogPhase = "meal_recording";

    this.askedQuestions = new Set();
    this.questionAttempts = 0;
    this.geminiQuestionIndex = 0;
    this.mealSubmitted = false;
    this.isSubmittingMeal = false;
    this.geminiTurnCount = 0;
    this.maxGeminiTurns = 6;
    this.useGeminiDefault = false;

    this._submittedSet = this._submittedSet || new Set();
    const dayKey = this.npcManager?.getCurrentDay() || 0;
    const mealKey = `${dayKey}_${this.selectedMealType}`;
    this._submittedSet.delete(mealKey);

    this.dialogHistory = this.dialogHistory || [];
    this.needUnusualTimeQuestion = this.checkUnusualMealTime();

    let startMessage;

    if (this.needUnusualTimeQuestion) {
      startMessage =
        this.playerData.language === "zh"
          ? "我注意到你在一个不寻常的时间用餐。为什么你选择在这个时间而不是更早或更晚用餐呢？"
          : "I notice you had your meal at an unusual time. Why did you eat at this time rather than earlier or later?";
      this.needDetailedDescription = true;
    } else {
      const firstQ = this.getNextGeminiDefaultQuestion();
      startMessage =
        firstQ ||
        (this.playerData.language === "zh"
          ? "我们从这顿吃了什么开始吧。"
          : "Let's start with what you had.");
      this.needDetailedDescription = false;
    }

    this.showSingleMessage("npc", startMessage, () => {
      this.waitForUserInput();
    });
  }

  // 获取下一个Gemini默认问题
  getNextGeminiDefaultQuestion() {
    const meal = this.selectedMealType || "meal";

    if (this.needUnusualTimeQuestion && this.geminiQuestionIndex === 0) {
      this.geminiQuestionIndex++;
      return this.playerData.language === "zh"
        ? "你为什么在这个时间点进餐？为什么不是更早或更晚？"
        : "Why did you eat at this time rather than earlier or later?";
    }

    const templates = [
      this.playerData.language === "zh"
        ? `你这顿（${meal === "breakfast" ? "早餐" : meal === "lunch" ? "午餐" : "晚餐"
        }）吃了什么？`
        : `What did you have for ${meal}?`,
      this.playerData.language === "zh"
        ? "你大概吃了多少分量？你是如何决定这个量的？用餐期间/之后身体感觉如何？"
        : "What portion size did you eat? How did you decide on that amount? How did you feel physically during or after eating?",
      this.playerData.language === "zh"
        ? "你为什么选择这顿食物？例如：图方便、馋了、或是更健康的选择？"
        : "Why did you choose this particular food/meal? For example, convenience, a craving, or healthier options?",
    ];

    const idx = this.needUnusualTimeQuestion
      ? this.geminiQuestionIndex - 1
      : this.geminiQuestionIndex;
    const q = templates[idx] || null;
    if (q) this.geminiQuestionIndex++;
    return q;
  }

  // 检查用餐时间是否异常
  checkUnusualMealTime() {
    const mealTime = this.mealAnswers?.mealTime;
    const mealType = this.selectedMealType?.toLowerCase();

    if (!mealTime || typeof mealTime.index !== "number") {
      return false;
    }

    const timeIndex = mealTime.index;

    const normalTimes = {
      breakfast: [1],
      lunch: [2, 3],
      dinner: [4, 5],
    };

    const normalTimeRange = normalTimes[mealType];

    if (!normalTimeRange) {
      return false;
    }

    return !normalTimeRange.includes(timeIndex);
  }

  // 调用ConvAI API
  async callConvaiAPI(userText = "hello") {
    try {
      console.log("📞 调用 ConvAI API:", userText);

      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/convai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userText,
          charID: this.npcManager.getNPCById(this.currentNPC)?.convaiCharID || '',
          sessionID: this.convaiSessionId || '-1',
          voiceResponse: 'False',
        }),
      });

      if (!response.ok) {
        throw new Error(`ConvAI API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ ConvAI API 响应:", data);

      return {
        success: true,
        message: data.text || data.message || '',
        sessionId: data.sessionId || this.convaiSessionId,
      };
    } catch (error) {
      console.error("❌ ConvAI API 调用失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 调用Gemini API
  async callGeminiAPI(userInput) {
    if (this.debugMode) {
      console.log("=== 调用 Gemini API ===");
      console.log("用户输入:", userInput);
      console.log("当前问题索引:", this.currentQuestionIndex);
      console.log("已问问题:", Array.from(this.askedQuestions));
      console.log("Gemini轮数:", this.geminiTurnCount);
    }

    if (
      this.geminiTurnCount >= this.maxGeminiTurns ||
      this.currentQuestionIndex >= this.geminiQuestionOrder.length
    ) {
      console.log("🔚 达到结束条件，强制结束对话");
      return {
        success: true,
        message:
          this.playerData.language === "zh"
            ? "谢谢你详细的分享！我已经记录下了你的餐食信息。"
            : "Thank you for sharing your meal with me! I have recorded your meal information.",
        isComplete: true,
      };
    }

    const mealContent = this.extractMealContentFromHistory();
    const hasValidMeal = mealContent && mealContent.trim().length >= 3;

    if (this.geminiTurnCount >= 4 && !hasValidMeal) {
      return {
        success: true,
        message:
          this.playerData.language === "zh"
            ? '我还没听到你这餐具体吃了什么呢～随便写几样：比如 "米饭、土豆牛肉、青菜"。'
            : "I still didn't catch what exactly you had. For example: 'rice, beef & potato, greens'.",
        isComplete: false,
      };
    }

    if (this.useGeminiDefault) {
      return this.getGeminiDefaultResponse(userInput);
    }

    try {
      const requestBody = {
        userInput: userInput,
        npcId: this.currentNPC,
        mealType: this.selectedMealType,
        mealAnswers: this.mealAnswers,
        dialogHistory: this.dialogHistory,
        turnCount: this.geminiTurnCount,
        questionControl: {
          currentQuestionIndex: this.currentQuestionIndex,
          askedQuestions: Array.from(this.askedQuestions),
          maxQuestions: this.geminiQuestionOrder.length,
          hasValidMealContent: hasValidMeal,
        },
      };

      if (this.debugMode) {
        console.log("📤 发送到Gemini的数据:", {
          npcId: requestBody.npcId,
          turnCount: requestBody.turnCount,
          questionControl: requestBody.questionControl,
          userInputLength: userInput.length,
        });
      }

      const response = await fetch(`${API_URL}/gemini-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (this.debugMode) {
        console.log("📥 Gemini API响应:", {
          success: data.success,
          messageLength: data.message?.length,
          isComplete: data.isComplete,
        });
      }

      if (data.success) {
        this.analyzeResponseAndUpdateProgress(data.message, userInput);

        return {
          success: true,
          message: data.message,
          isComplete: data.isComplete || this.shouldEndDialog(),
        };
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Gemini调用失败，进入默认问答：", err);
      this.useGeminiDefault = true;
      return this.buildGeminiDefaultResponse();
    }
  }

  // 获取Gemini默认响应
  getGeminiDefaultResponse(userInput) {
    const language = this.playerData.language || "en";

    if (this.geminiQuestionIndex === 0 && this.needUnusualTimeQuestion) {
      this.geminiQuestionIndex++;
      const timeQuestion =
        language === "zh"
          ? "我注意到你在一个不寻常的时间用餐。为什么你选择在这个时间而不是更早或更晚用餐呢？"
          : "Why did you eat at this time rather than earlier or later?";

      return {
        success: true,
        message: timeQuestion,
      };
    }

    const defaultQuestions = {
      zh: [
        `你${this.getMealName()}吃了什么？`,
        "你吃了多少？你是如何决定这个量的？吃的时候或吃完后身体感觉如何？",
        "为什么选择这种特定的食物/餐食？例如，只是方便，你有渴望，健康选择？",
      ],
      en: [
        `What did you have for ${this.selectedMealType}?`,
        "What portion size did you eat? How did you decide on that amount? How did you feel physically during or after eating?",
        "Why did you choose this particular food/meal? For example, simply convenient, you have a craving, healthy options?",
      ],
    };

    const questions = defaultQuestions[language] || defaultQuestions.en;

    if (this.geminiQuestionIndex < questions.length) {
      const question = questions[this.geminiQuestionIndex];
      this.geminiQuestionIndex++;

      return {
        success: true,
        message: question,
      };
    }

    const isDinner = this.selectedMealType === "dinner";
    let finalMessage;

    if (isDinner) {
      finalMessage =
        language === "zh"
          ? "干得好！继续这样做。一点一点地，你会开始理解——他当时在想什么，他在隐藏什么。\n\n不需要着急。这不是你可以强迫的事情——只需要一次吃一顿饭。\n\n他经常去格蕾丝的店买食材。他和华主厨回去的路很远。也许你会从她那里得到一些见解。"
          : "Good job! Keep doing this. Little by little, you'll start to understand—what he was thinking back then, and what he was hiding.\n\nNo need to rush. This isn't something you can force—just take it one meal at a time.\n\nHe often stopped by Grace's shop for ingredients. He and Chef Hua go way back. Maybe you will get some insights from her.";
    } else {
      const version = this.vagueCount;
      this.vagueCount = this.vagueCount === 1 ? 2 : 1;
      finalMessage = this.getVagueResponse(this.currentNPC, version);
    }

    return {
      success: true,
      message: finalMessage,
    };
  }

  // 构建Gemini默认响应
  buildGeminiDefaultResponse() {
    const q = this.getNextGeminiDefaultQuestion();
    if (!q) {
      return {
        success: true,
        message:
          this.playerData.language === "zh"
            ? "谢谢你的分享，我来整理一下。"
            : "Thanks for sharing. Let me summarize.",
      };
    }
    return { success: true, message: q };
  }

  // 分析响应并更新进度
  analyzeResponseAndUpdateProgress(response, userInput) {
    const lowerResponse = response.toLowerCase();

    if (this.isValidFoodResponse(userInput)) {
      const currentQuestion =
        this.geminiQuestionOrder[this.currentQuestionIndex];

      if (!this.askedQuestions.has(currentQuestion)) {
        this.askedQuestions.add(currentQuestion);

        if (this.responseAnswersCurrentQuestion(userInput, currentQuestion)) {
          this.currentQuestionIndex++;
          this.questionAttempts = 0;
        }
      }
    }

    if (this.detectThankYouMessage(response)) {
      this.currentQuestionIndex = this.geminiQuestionOrder.length;
    }
  }

  // 检查是否是有效的食物回答
  isValidFoodResponse(input) {
    const foodKeywords = [
      "吃",
      "饭",
      "菜",
      "肉",
      "鱼",
      "米",
      "面",
      "汤",
      "eat",
      "food",
      "meal",
      "rice",
      "fish",
      "meat",
      "soup",
      "chicken",
      "vegetable",
    ];
    const lowerInput = input.toLowerCase();

    return (
      foodKeywords.some((keyword) => lowerInput.includes(keyword)) &&
      input.trim().length > 3
    );
  }

  // 检查回答是否针对当前问题
  responseAnswersCurrentQuestion(input, questionType) {
    const lowerInput = input.toLowerCase();

    switch (questionType) {
      case "Q4":
        return this.isValidFoodResponse(input);
      case "Q5":
        return (
          lowerInput.includes("分量") ||
          lowerInput.includes("感觉") ||
          lowerInput.includes("portion") ||
          lowerInput.includes("feel")
        );
      case "Q6":
        return (
          lowerInput.includes("因为") ||
          lowerInput.includes("选择") ||
          lowerInput.includes("because") ||
          lowerInput.includes("choice")
        );
      default:
        return true;
    }
  }

  // 检查是否应该结束对话
  shouldEndDialog() {
    return (
      this.currentQuestionIndex >= this.geminiQuestionOrder.length ||
      this.geminiTurnCount >= this.maxGeminiTurns
    );
  }

  // 获取餐食名称
  getMealName() {
    const mealNames = {
      breakfast: this.playerData.language === "zh" ? "早餐" : "breakfast",
      lunch: this.playerData.language === "zh" ? "午餐" : "lunch",
      dinner: this.playerData.language === "zh" ? "晚餐" : "dinner",
    };
    return mealNames[this.selectedMealType] || this.selectedMealType;
  }

  // 提交餐食记录
  async submitMealOnce() {
    const dayKey = this.npcManager?.getCurrentDay
      ? this.npcManager.getCurrentDay()
      : 0;
    const mealKey = `${dayKey}_${this.selectedMealType}`;
    this._submittedSet = this._submittedSet || new Set();

    if (this.isSubmittingMeal) {
      console.log("正在提交中，本次跳过");
      return;
    }
    if (this._submittedSet.has(mealKey)) {
      console.log("该餐别已提交过，本次跳过:", mealKey);
      return;
    }

    this.isSubmittingMeal = true;
    this.showSubmissionProgress();

    try {
      let mealContent = "";

      if (this.textInput && this.textInput.value) {
        mealContent = this.textInput.value.trim();
      } else if (this.textarea && this.textarea.value) {
        mealContent = this.textarea.value.trim();
      } else {
        mealContent = this.extractMealContentFromHistory() || "";
      }

      if (!mealContent) {
        mealContent =
          this.playerData?.language === "zh"
            ? "未填写具体餐食"
            : "No detailed meal provided";
      }

      const result = await this.npcManager.recordMeal(
        this.currentNPC,
        this.selectedMealType,
        this.mealAnswers,
        this.dialogHistory,
        mealContent
      );

      this._submittedSet.add(mealKey);
      this.mealSubmitted = true;
      this.lastRecordResult = result;

      console.log("🍽️ 餐食提交结果:", {
        success: result?.success,
        newDay: result?.newDay,
        nextDayUnlocked: result?.nextDayUnlocked,
        isFirstMealToday: result?.isFirstMealToday,
      });

      if (result?.success) {
        setTimeout(() => {
          if (this.mainScene?.onMealRecorded) {
            this.mainScene.onMealRecorded();
          }
        }, 200);
      }

      await this.handleMealCompletion(result);
    } catch (err) {
      console.error("提交餐食记录失败:", err);
      await this.handleMealCompletion({
        success: false,
        error: err.message || String(err),
      });
    } finally {
      this.isSubmittingMeal = false;
      this.hideSubmissionProgress();
    }
  }

  // 显示提交进度
  showSubmissionProgress() {
    if (this.submissionProgress) return;

    const { width, height } = this.scale;

    this.submissionOverlay = this.add.graphics();
    this.submissionOverlay.fillStyle(0x000000, 0.3);
    this.submissionOverlay.fillRect(0, 0, width, height);
    this.submissionOverlay.setDepth(199);

    this.submissionProgress = this.add.text(
      width / 2,
      height / 2,
      this.playerData.language === "zh"
        ? "正在记录餐食..."
        : "Recording meal...",
      {
        fontSize: this.isMobile ? "16px" : "18px",
        fontFamily: "Arial, sans-serif",
        fill: "#ffffff",
        backgroundColor: "#4a5568",
        padding: { x: 20, y: 12 },
      }
    );

    this.submissionProgress.setOrigin(0.5);
    this.submissionProgress.setDepth(200);

    this.tweens.add({
      targets: this.submissionProgress,
      angle: 360,
      duration: 2000,
      repeat: -1,
      ease: "Linear",
    });
  }

  // 隐藏提交进度
  hideSubmissionProgress() {
    if (this.submissionProgress) {
      this.submissionProgress.destroy();
      this.submissionProgress = null;
    }
    if (this.submissionOverlay) {
      this.submissionOverlay.destroy();
      this.submissionOverlay = null;
    }
  }

  // 处理餐食完成
  async handleMealCompletion(
    recordResult = { success: true, shouldGiveClue: false }
  ) {
    try {
      if (this.debugMode) {
        console.log("处理餐食完成结果:", recordResult);
      }

      if (!recordResult) {
        throw new Error("记录结果为空");
      }

      if (!recordResult.success) {
        throw new Error(recordResult.error || "Failed to record meal");
      }

      if (recordResult.shouldGiveClue) {
        try {
          // 从数据库获取线索
          const clueResponse = await fetch(
            `/api/game/clue/${this.currentNPC}?language=${this.playerData.language}`
          );
          const clueData = await clueResponse.json();

          // 显示线索
          const clueText = clueData.clue;
          this.showSingleMessage("npc", clueText, () => {
            // 保存线索到 UIManager
            if (this.mainScene?.uiManager) {
              this.mainScene.uiManager.addClue({
                npcId: this.currentNPC,
                npcName: this.npcManager.getNPCNameByLanguage(this.currentNPC),
                clue: clueText,
              });
              console.log("✅ 线索已添加到线索本");
            }

            // 结束对话
            this.completeDialog();
          });
        } catch (error) {
          console.error("获取线索失败:", error);
          this.completeDialog();
        }
      } else {
        // 显示 vague 回复
        try {
          const vagueResponse = await fetch(
            `/api/game/vague-response/${this.currentNPC}?language=${this.playerData.language}&count=${this.vagueCount - 1}`
          );
          const vagueData = await vagueResponse.json();

          this.showSingleMessage("npc", vagueData.response, () => {
            this.completeDialog();
          });
        } catch (error) {
          console.error("获取 vague 回复失败:", error);
          this.completeDialog();
        }
      }


      const endMessage =
        this.playerData.language === "zh"
          ? "谢谢你的分享！记得按时吃饭哦。"
          : "Thanks for sharing! Remember to eat on time.";

      this.showSingleMessage("npc", endMessage, () => {
        this.dialogPhase = "completed";
        this.showDoneButtons();
      });
    } catch (error) {
      console.error("处理食物记录完成时出错:", error);
      this.showSingleMessage(
        "npc",
        this.playerData.language === "zh"
          ? "抱歉，记录餐食时出现了问题。请稍后再试。"
          : "Sorry, there was an error recording your meal. Please try again later.",
        () => {
          this.dialogPhase = "completed";
        }
      );
    }
  }

  // 显示线索获得通知
  showClueObtainedNotification() {
    const { width, height } = this.scale;

    const notification = this.add.text(
      width / 2,
      height * 0.3,
      this.playerData.language === "zh"
        ? "🎉 获得新线索！"
        : "🎉 New clue obtained!",
      {
        fontSize: this.isMobile ? "18px" : "20px",
        fontFamily: "Arial, sans-serif",
        fill: "#ffd700",
        backgroundColor: "#10b981",
        padding: { x: 16, y: 10 },
      }
    );

    notification.setOrigin(0.5);
    notification.setDepth(150);
    notification.setAlpha(0);

    this.tweens.add({
      targets: notification,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.5, to: 1.1 },
      scaleY: { from: 0.5, to: 1.1 },
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: notification,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: "Power2",
          onComplete: () => {
            this.tweens.add({
              targets: notification,
              alpha: 0,
              y: notification.y - 30,
              duration: 800,
              delay: 1500,
              onComplete: () => notification.destroy(),
            });
          },
        });
      },
    });
  }

  // 通知餐食记录
  notifyMealRecorded() {
    if (this.mainScene?.onMealRecorded) {
      this.mainScene.onMealRecorded();
    }
  }

  // 提取餐食内容
  extractMealContentFromHistory() {
    const mealPhaseHistory = this.dialogHistory.filter(
      (entry) =>
        entry.type === "user" && !this.isFixedQuestionAnswer(entry.content)
    );

    const mealDescriptions = mealPhaseHistory.map((entry) => entry.content);
    return mealDescriptions.join(" ");
  }

  // 判断是否是固定问题的答案
  isFixedQuestionAnswer(content) {
    const fixedAnswers = [
      "A. Home-cooked meals",
      "B. Eat out at restaurants",
      "C. Takeout or delivery",
      "D. Ready-to-eat meals",
      "A. Early morning",
      "B. Morning",
      "C. Midday",
      "D. Afternoon",
      "E. Evening",
      "F. Night",
      "A. Less than 10 minutes",
      "B. 10—30 minutes",
      "C. 30—60 minutes",
      "D. More than 60 minutes",
      "A. 家里做的",
      "B. 餐厅用餐",
      "C. 外卖/打包",
      "D. 即食食品",
      "A. 清晨 (7点前)",
      "B. 上午 (7-11点)",
      "C. 中午 (11点-下午2点)",
      "D. 下午 (下午2-5点)",
      "E. 傍晚 (下午5-9点)",
      "F. 夜晚 (9点后)",
      "A. 不到10分钟",
      "B. 10-30分钟",
      "C. 30-60分钟",
      "D. 超过60分钟",
    ];

    return fixedAnswers.some((answer) => content.includes(answer));
  }

  // 获取线索
  getClueForNPC(npcId) {
    const language = this.playerData?.language || "en";

    const clues = {
      village_head: {
        zh: "干得好！继续这样做。一点一点地，你会开始理解——他当时在想什么，他在隐藏什么。\n\n不需要着急。这不是你可以强迫的事情——只需要一次吃一顿饭。\n\n他经常去格蕾丝的店买食材。他和华主厨回去的路很远。也许你会从她那里得到一些见解。",
        en: "Good job! Keep doing this. Little by little, you'll start to understand—what he was thinking back then, and what he was hiding.\n\nNo need to rush. This isn't something you can force—just take it one meal at a time.\n\nHe often stopped by Grace's shop for ingredients. He and Chef Hua go way back. Maybe you will get some insights from her.",
      },
      shop_owner: {
        zh: "他最常买那几样料，可那天——他却突然问起'青木籽'。他以前从来不碰那玩意儿。\n\n他说需要做一道特别的汤。我问他为什么，他只是摇摇头说：'有些味道，一旦失去就再也找不回来了。'\n\n如果你想知道更多，去找香料婆婆吧。她可能知道那些青木籽的用途。",
        en: "He always bought the same ingredients, but that day—he suddenly asked about 'greenwood seeds'. He never touched those before.\n\nHe said he needed to make a special soup. When I asked why, he just shook his head and said: 'Some flavors, once lost, can never be found again.'\n\nIf you want to know more, go find the Spice Granny. She might know what those greenwood seeds are for.",
      },
      spice_woman: {
        zh: "青木籽...那是一种很特殊的香料。它能让人回忆起失去的味道，但也会带来痛苦的回忆。\n\n你师父那天来找我，眼中有种我从未见过的绝望。他说：'我需要找回那个味道，哪怕只是一次。'\n\n我给了他青木籽，但我警告过他——有些回忆最好还是不要找回来。",
        en: "Greenwood seeds... that's a very special spice. It can make people recall lost flavors, but it also brings painful memories.\n\nYour master came to me that day with a desperation I'd never seen before. He said: 'I need to find that flavor again, even if just once.'\n\nI gave him the greenwood seeds, but I warned him—some memories are better left unfound.",
      },
      restaurant_owner: {
        zh: "你师父和我的师父是老朋友了。那天他来我这里，说要做一道他很久没做过的菜。\n\n他的手在颤抖——我从未见过他这样。他说这可能是他最后一次做这道菜了。\n\n他做完后，尝了一口，然后就哭了。我问他怎么了，他只是说：'终于...我又尝到她的味道了。'",
        en: "Your master and my master were old friends. That day he came to my place, saying he wanted to cook a dish he hadn't made in a long time.\n\nHis hands were trembling—I'd never seen him like that. He said this might be the last time he'd cook this dish.\n\nAfter he finished cooking, he tasted it and started crying. When I asked what was wrong, he just said: 'Finally... I can taste her flavor again.'",
      },
      fisherman: {
        zh: "那天晚上，你师父来到河边找我。他手里拿着一张纸条，说这是他要留给你的。\n\n他告诉我，如果有一天你来找我，就把这个给你。纸条上写着一个地址——是村外的一个小屋。\n\n他说那里有他最珍贵的回忆，也有他最大的秘密。如果你准备好了，就去那里看看吧。",
        en: "That night, your master came to the riverside to find me. He held a note in his hand, saying it was for you.\n\nHe told me that if you ever came looking for me, I should give this to you. The note has an address—a small cottage outside the village.\n\nHe said that place holds his most precious memories and his biggest secret. When you're ready, go take a look.",
      },
      old_friend: {
        zh: "我和你师父从小一起长大，我太了解他了。那天他来找我，要我发誓永远不要告诉任何人他去了哪里。\n\n但现在...既然你已经走了这么远，我觉得你应该知道真相。他没有离开村子，他去了那个小屋——我们小时候经常去的地方。\n\n那里埋藏着一个秘密，关于一个他深爱但失去的人。也许...也许是时候让这个秘密重见天日了。",
        en: "Your master and I grew up together, I know him too well. That day he came to me, making me swear never to tell anyone where he went.\n\nBut now... since you've come this far, I think you should know the truth. He didn't leave the village, he went to that cottage—the place we used to visit as children.\n\nThere lies a secret about someone he loved deeply but lost. Maybe... maybe it's time for this secret to see the light of day.",
      },
      secret_apprentice: {
        zh: "师父在离开前教了我一道菜的做法。他说这是他最重要的秘方，但他再也不会做了。\n\n他让我把食谱藏在村外的小屋里，说如果有一天你来找我，就告诉你食谱的位置。\n\n那道菜的名字叫'思君汤'。师父说，这是他为一个再也见不到的人而创造的菜。现在，也许只有你能完成他未完成的心愿了。",
        en: "Before leaving, master taught me how to cook a dish. He said it was his most important recipe, but he would never cook it again.\n\nHe asked me to hide the recipe in the cottage outside the village, saying if you ever came looking for me, I should tell you where it is.\n\nThe dish is called 'Longing Soup'. Master said it was created for someone he could never see again. Now, perhaps only you can fulfill his unfinished wish.",
      },
    };

    const clue = clues[npcId];
    if (!clue) {
      return language === "zh"
        ? "很抱歉，我没有关于这个人的更多信息。"
        : "I'm sorry, I don't have more information about this person.";
    }

    return clue[language] || clue.en;
  }

  getVagueResponse(npcId, version = 1) {
    const language = this.playerData?.language || "en";

    const npcVagueResponses = {
      village_head: {
        zh: {
          1: "你师父常有个地方，他总去的...\n嗯，那又是哪里来着？\n啊，我记性不如从前了。\n\n哦！现在该我准备下顿饭的时候了。过几个小时再回来吧。兴许到时候什么会想起来的。",
          2: "我记得他总是去拜访一个女人...\n嗯，她又是谁来着？\n再给我点时间——等你吃完今天最后一顿饭后我们再聊吧。",
        },
        en: {
          1: "Your master used to have a place he visited all the time...\nHmm, where was it again?\nAh, my memory's not what it used to be.\n\nOh! It's time for me to prep for my next meal. Come back in a few hours. Maybe something will come back to me.",
          2: "I remember he always visited a woman...\nHmm, who was she again?\nGive me a bit more time — let's talk again after you've finished your last meal of the day.",
        },
      },
      shop_owner: {
        zh: {
          1: "最近总有些奇怪的事情发生...\n等你下一餐后再来找我吧，也许我能想起更多。",
          2: "那个青木籽的事情还在困扰我...\n晚些时候再聊吧。",
        },
        en: {
          1: "Strange things have been happening lately...\nCome back after your next meal, maybe I'll remember more.",
          2: "That greenwood seed matter still troubles me...\nLet's talk later.",
        },
      },
      spice_woman: {
        zh: {
          1: "香料的秘密不是一时半会儿能说清的...\n下次用餐后再来吧。",
          2: "那个味道...我需要时间想想。",
        },
        en: {
          1: "The secrets of spices can't be told in a moment...\nCome back after your next meal.",
          2: "That flavor... I need time to think.",
        },
      },
      restaurant_owner: {
        zh: {
          1: "厨房里总有说不完的故事...\n等你下顿饭后我们继续。",
          2: "有些味道只有用心才能体会...",
        },
        en: {
          1: "There are always endless stories in the kitchen...\nLet's continue after your next meal.",
          2: "Some flavors can only be felt with the heart...",
        },
      },
      fisherman: {
        zh: {
          1: "河水知道很多秘密...\n但现在不是说话的时候，稍后再来吧。",
          2: "你师父的事情...需要慢慢说。",
        },
        en: {
          1: "The river knows many secrets...\nBut now is not the time to talk, come back later.",
          2: "About your master... it needs to be told slowly.",
        },
      },
      old_friend: {
        zh: {
          1: "回忆总是断断续续的...\n等你吃完下一餐我们再聊。",
          2: "那些往事...让我再想想。",
        },
        en: {
          1: "Memories are always fragmented...\nLet's talk again after you finish your next meal.",
          2: "Those old days... let me think more.",
        },
      },
      secret_apprentice: {
        zh: {
          1: "师父教我的东西还在消化中...\n下次见面再分享吧。",
          2: "有些秘密不能随便说出来...",
        },
        en: {
          1: "I'm still digesting what master taught me...\nLet's share next time we meet.",
          2: "Some secrets can't be spoken casually...",
        },
      },
    };

    const npcResponses = npcVagueResponses[npcId];
    if (!npcResponses) {
      return language === "zh"
        ? "让我想想...等你下顿饭后再来吧。"
        : "Let me think... come back after your next meal.";
    }

    const languageResponses = npcResponses[language] || npcResponses.en;
    return languageResponses[version] || languageResponses[1];
  }

  returnToMainScene() {
    console.log("🔙 DialogScene: Returning to MainScene");

    try {
      // 清理所有视觉元素
      this.cleanupAllVisuals();

      // 移除 HTML 输入框
      if (this.textInput) {
        this.textInput.remove();
        this.textInput = null;
      }
      if (this.textarea) {
        this.textarea.remove();
        this.textarea = null;
      }

      // 清理所有定时器
      if (this.timers && this.timers.length > 0) {
        this.timers.forEach((timer) => {
          if (timer) {
            this.time.removeEvent(timer);
          }
        });
        this.timers = [];
      }

      // ⚠️ 关键修复：确保主场景已经启动
      const mainScene = this.scene.get("MainScene");

      if (!mainScene || !mainScene.scene.isActive()) {
        console.error("⚠️ MainScene 不存在或未激活，重新启动");
        this.scene.stop("DialogScene");
        this.scene.start("MainScene", {
          playerData: this.playerData,
          returnFromDialog: true
        });
        return;
      }

      // 正常情况：唤醒主场景
      this.scene.stop("DialogScene");
      this.scene.wake("MainScene");

      // 重新启用主场景的输入和相机
      mainScene.cameras.main.setVisible(true);
      mainScene.input.enabled = true;

      // 重新聚焦到玩家位置
      if (mainScene.player) {
        mainScene.cameras.main.startFollow(mainScene.player, true, 0.1, 0.1);
      }

      // 刷新 UI
      if (mainScene.uiManager) {
        mainScene.uiManager.updateMealProgress(this.playerData.todayMeals || {});
      }

      console.log("✅ Successfully returned to MainScene");

    } catch (error) {
      console.error("❌ Error returning to MainScene:", error);
      // 强制重启主场景
      this.scene.stop("DialogScene");
      this.scene.start("MainScene", { playerData: this.playerData });
    }
  }

  // DialogScene.js
  async finishMealAndExit() {
    // 1) 先保存餐食（有重入保护）
    const result = await this.saveMealRecord(); // 内部已做幂等处理

    // 2) 更新 UI 状态（比如勾掉已完成的餐别）
    try {
      this.uiManager?.markMealCompleted?.(this.selectedMealType);
    } catch (e) {
      console.warn("markMealCompleted not available:", e);
    }

    // 3) 友好提示一句（避免“等你下一顿饭回来”的误导）
    const okMsg =
      this.playerData?.language === "zh"
        ? "好的，这顿我记下了。今天先到这里，稍后再回来继续吧。"
        : "Got it, this meal is recorded. Let's pick this up later today.";

    this.showSingleMessage("npc", okMsg, () => {
      // 4) 彻底清理输入框与按钮
      this.uiManager?.hideTextInput?.();
      this.clearAllButtons();

      // 5) 结束对话场景、回到主场景
      try {
        this.dialogSystem?.endDialog?.();
      } catch { }
      this.scene.stop("DialogScene");
      this.scene.resume("MainScene");
    });
  }

  shutdown() {
    console.log("🛑 DialogScene shutdown");

    try {
      // 清理背景
      if (this.backgroundContainer) {
        this.backgroundContainer.destroy(true);
        this.backgroundContainer = null;
      }

      if (this.npcBackground) {
        this.npcBackground.destroy();
        this.npcBackground = null;
      }

      if (this.solidBackground) {
        this.solidBackground.destroy();
        this.solidBackground = null;
      }

      // 清理所有图形对象
      this.children.list.forEach((child) => {
        if (child && child.destroy) {
          try {
            child.destroy();
          } catch (e) {
            // 忽略销毁错误
          }
        }
      });
    } catch (error) {
      console.error("Shutdown error:", error);
    }

    // 清理定时器和监听器
    this.timers = [];
    this.eventListeners = [];

    // 重置状态
    this.resetSceneState();
  }

  // 更新状态显示
  updateStatus(text) {
    if (this.statusText) {
      this.statusText.setText(text);
      // 如果文本不为空，设置5秒后自动清空
      if (text) {
        const timer = this.time.delayedCall(5000, () => {
          if (this.statusText) this.statusText.setText("");
        });
        this.timers.push(timer);
      }
    }
  }

  // 清理所有按钮
  clearAllButtons() {
    // 清理动态按钮
    if (this.dynamicButtons) {
      this.dynamicButtons.forEach((button) => {
        if (button && button.destroy) button.destroy();
      });
      this.dynamicButtons = [];
    }

    // 也可以保留原有固定数组的清理，以防万一
    if (this.fixedQuestionButtons) {
      this.fixedQuestionButtons.forEach((button) => button.destroy());
      this.fixedQuestionButtons = [];
    }

    if (this.mealButtons) {
      this.mealButtons.forEach((button) => button.destroy());
      this.mealButtons = [];
    }

    if (this.questionText) {
      this.questionText.destroy();
      this.questionText = null;
    }

    if (this.submitButton) {
      this.submitButton.destroy();
      this.submitButton = null;
    }
  }

  async startGeminiChat() {
    if (this.debugMode) {
      console.log("=== 开始 Gemini 对话 ===");
      console.log("餐食类型:", this.selectedMealType);
      console.log("固定答案:", this.mealAnswers);
    }

    this.clearAllButtons();
    this.dialogPhase = "meal_recording";

    this.askedQuestions = new Set(); // 清空已问集合（很关键）
    this.questionAttempts = 0; // 重置单题重试计数
    this.geminiQuestionIndex = 0; // 默认问题游标从头开始

    // 新增：初始化 Gemini 对话轮数和默认模式状态
    this.mealSubmitted = false;
    this.isSubmittingMeal = false;
    this.geminiTurnCount = 0;
    this.maxGeminiTurns = 6; // MAX_TURNS_MEAL 的值
    this.useGeminiDefault = false; // 默认先尝试API
    this.geminiQuestionIndex = 0;

    // 🔧 重要：重置提交状态，防止重复提交保护机制误判
    this._submittedSet = this._submittedSet || new Set();
    // 清除当前餐食的提交记录，允许重新提交
    const dayKey = this.npcManager?.getCurrentDay() || 0;
    const mealKey = `${dayKey}_${this.selectedMealType}`;
    this._submittedSet.delete(mealKey);

    // 🔧 关键修复：确保对话历史干净，避免重复问题
    this.dialogHistory = this.dialogHistory || [];

    // 检查用餐时间是否异常
    this.needUnusualTimeQuestion = this.checkUnusualMealTime();

    let startMessage;

    if (this.needUnusualTimeQuestion) {
      startMessage =
        this.playerData.language === "zh"
          ? "我注意到你在一个不寻常的时间用餐。为什么你选择在这个时间而不是更早或更晚用餐呢？"
          : "I notice you had your meal at an unusual time. Why did you eat at this time rather than earlier or later?";
      this.needDetailedDescription = true;
    } else {
      // 改为：使用默认问题生成器的第一问（通常是 Q4：你这顿吃了什么？）
      const firstQ = this.getNextGeminiDefaultQuestion();
      startMessage =
        firstQ ||
        (this.playerData.language === "zh"
          ? "我们从这顿吃了什么开始吧。"
          : "Let's start with what you had.");
      this.needDetailedDescription = false;
    }

    this.showSingleMessage("npc", startMessage, () => {
      this.waitForUserInput();
    });
  }

  // 保存餐食记录（带重入保护）
  async saveMealRecord() {
    // 已经保存过就直接复用结果，避免重复写库
    if (this.mealSaved || this.mealSaveInProgress) {
      return this.lastRecordResult || { success: true, shouldGiveClue: false };
    }

    this.mealSaveInProgress = true;
    try {
      // 先从自由输入对话里提取
      let mealContent = (this.extractMealContentFromHistory() || "").trim();

      // 若用户没打字，仅点固定选项，则用固定题答案兜底生成
      if (!mealContent) {
        const qa = this.questionAnswers || {};
        const ans = this.mealAnswers || {};

        const parts = [];

        // 餐别显示名（已有工具函数的话优先用）
        try {
          const mealName =
            (this.getMealTypeDisplayName && this.getMealTypeDisplayName()) ||
            this.selectedMealType;
          if (mealName) {
            parts.push(
              this.playerData?.language === "zh"
                ? `餐别：${mealName}`
                : `Meal: ${mealName}`
            );
          }
        } catch { }

        const timeText =
          (qa.mealTime && qa.mealTime.text) ||
          (ans.mealTime && ans.mealTime.text);
        if (timeText) {
          parts.push(
            this.playerData?.language === "zh"
              ? `时间：${timeText}`
              : `Time: ${timeText}`
          );
        }

        const durationText =
          (qa.duration && qa.duration.text) ||
          (ans.duration && ans.duration.text);
        if (durationText) {
          parts.push(
            this.playerData?.language === "zh"
              ? `时长：${durationText}`
              : `Duration: ${durationText}`
          );
        }

        mealContent = parts.join("; ");
        if (!mealContent.trim()) {
          mealContent =
            this.playerData?.language === "zh"
              ? "本餐已记录。"
              : "Meal recorded.";
        }
      }

      const result = await this.npcManager.recordMeal(
        this.currentNPC,
        this.selectedMealType,
        this.mealAnswers,
        this.dialogHistory,
        mealContent
      );

      this.lastRecordResult = result;
      this.mealSaved = true;

      // 保存后可触发天数检查（若实现了）
      if (this.selectedMealType === "dinner") {
        this.npcManager.checkAndUpdateCurrentDay?.();
      }

      return result;
    } catch (e) {
      const result = { success: false, error: e.message };
      this.lastRecordResult = result;
      return result;
    } finally {
      this.mealSaveInProgress = false;
    }
  }

  checkUnusualMealTime() {
    const mealTime = this.mealAnswers?.mealTime;
    const mealType = this.selectedMealType?.toLowerCase();

    if (!mealTime || typeof mealTime.index !== "number") {
      return false;
    }

    const timeIndex = mealTime.index;

    // 定义正常时间范围（按选项索引）
    const normalTimes = {
      breakfast: [1], // B. Morning (7:00—11:00 AM)
      lunch: [2, 3], // C. Midday, D. Afternoon
      dinner: [4, 5], // E. Evening, F. Night
    };

    const normalTimeRange = normalTimes[mealType];

    if (!normalTimeRange) {
      return false;
    }

    // 如果用餐时间不在正常范围内，则认为是异常时间
    return !normalTimeRange.includes(timeIndex);
  }

  // 5. 修正 getMealTypeDisplayName 方法 - 添加缺失的方法
  getMealTypeDisplayName() {
    const mealTypeNames = {
      breakfast: this.playerData?.language === "zh" ? "早餐" : "Breakfast",
      lunch: this.playerData?.language === "zh" ? "午餐" : "Lunch",
      dinner: this.playerData?.language === "zh" ? "晚餐" : "Dinner",
    };

    return mealTypeNames[this.selectedMealType] || this.selectedMealType;
  }

  // 6. 修正 submitMealOnce 方法 - 优化重复提交逻辑
  async submitMealOnce() {
    const dayKey = this.npcManager?.getCurrentDay() || 0;
    const mealKey = `${dayKey}_${this.selectedMealType}`;

    this._submittedSet = this._submittedSet || new Set();

    if (this.isSubmittingMeal) {
      console.log("正在提交中，本次跳过");
      return;
    }

    // if (this.isSubmittingMeal) {
    //   if (this.debugMode) {
    //     console.log("正在提交中，本次跳过");
    //   }
    //   return;
    // }

    this.isSubmittingMeal = true;

    this.showSubmissionProgress();

    try {
      let mealContent = "";

      // 优先从文本输入获取
      if (this.textInput && this.textInput.value) {
        mealContent = this.textInput.value.trim();
      } else if (this.textarea && this.textarea.value) {
        mealContent = this.textarea.value.trim();
      } else {
        // 从对话历史提取
        mealContent = this.extractMealContentFromHistory() || "";
      }

      // 如果没有具体内容，生成默认描述
      if (!mealContent) {
        mealContent = this.generateDefaultMealDescription();
      }

      const result = await this.npcManager.recordMeal(
        this.currentNPC,
        this.selectedMealType,
        this.mealAnswers,
        this.dialogHistory,
        mealContent
      );

      this._submittedSet.add(mealKey);
      this.mealSubmitted = true;
      this.lastRecordResult = result;

      if (this.debugMode) {
        console.log("🍽️ 餐食提交结果:", {
          success: result?.success,
          newDay: result?.newDay,
          nextDayUnlocked: result?.nextDayUnlocked,
          isFirstMealToday: result?.isFirstMealToday,
        });
      }

      // 通知主场景更新
      if (result?.success) {
        setTimeout(() => {
          if (this.mainScene?.onMealRecorded) {
            this.mainScene.onMealRecorded();
          }
        }, 200);
      }

      await this.handleMealCompletion(result);
    } catch (err) {
      console.error("提交餐食记录失败:", err);
      await this.handleMealCompletion({
        success: false,
        error: err.message || String(err),
      });
    } finally {
      this.isSubmittingMeal = false;
      this.hideSubmissionProgress();
    }
  }

  // 7. 添加缺失的 generateDefaultMealDescription 方法
  generateDefaultMealDescription() {
    const qa = this.questionAnswers || {};
    const ans = this.mealAnswers || {};
    const parts = [];

    // 餐别
    const mealName = this.getMealTypeDisplayName();
    if (mealName) {
      parts.push(
        this.playerData?.language === "zh"
          ? `餐别：${mealName}`
          : `Meal: ${mealName}`
      );
    }

    // 获取方式
    const obtainText =
      (qa.obtainMethod && qa.obtainMethod.text) ||
      (ans.obtainMethod && ans.obtainMethod.text);
    if (obtainText) {
      parts.push(
        this.playerData?.language === "zh"
          ? `获取方式：${obtainText}`
          : `Method: ${obtainText}`
      );
    }

    // 用餐时间
    const timeText =
      (qa.mealTime && qa.mealTime.text) || (ans.mealTime && ans.mealTime.text);
    if (timeText) {
      parts.push(
        this.playerData?.language === "zh"
          ? `时间：${timeText}`
          : `Time: ${timeText}`
      );
    }

    // 用餐时长
    const durationText =
      (qa.duration && qa.duration.text) || (ans.duration && ans.duration.text);
    if (durationText) {
      parts.push(
        this.playerData?.language === "zh"
          ? `时长：${durationText}`
          : `Duration: ${durationText}`
      );
    }

    const content = parts.join("; ");
    return (
      content ||
      (this.playerData?.language === "zh" ? "本餐已记录。" : "Meal recorded.")
    );
  }
}

