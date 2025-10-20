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

  init(data) {
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
    // visit count
    this.npcVisitCount[this.currentNPC] =
      (this.npcVisitCount[this.currentNPC] || 0) + 1;

    this.setupBackground();
    this.setupUI();
    this.setupControls();

    // Dialog system
    this.dialogSystem = new DialogSystem(this);
    this.dialogSystem.setNPCManager(this.npcManager);
    this.dialogSystem.on("dialogEnded", this.handleDialogEnded, this);

    // Scene lifecycle
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);

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
  }

  setupBackground() {
    const { width, height } = this.scale;
    const npc = this.npcManager?.getNPCById(this.currentNPC);

    this.add.rectangle(width / 2, height / 2, width, height, 0x2a2a2a);

    if (npc?.backgroundKey) {
      if (this.textures.exists(npc.backgroundKey)) {
        this.add
          .image(width / 2, height / 2, npc.backgroundKey)
          .setDisplaySize(width, height);
        console.log(
          `Background set for NPC ${this.currentNPC}: ${npc.backgroundKey}`
        );
      } else {
        console.warn(`Background texture not found: ${npc.backgroundKey}`);
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
      }
    } else {
      console.warn("No backgroundKey for NPC:", npc);
      this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }
  }

  setupUI() {
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
  }

  createTopDialogBox() {
    const { width, height } = this.scale;
    const safeTopMargin = 120;
    const safeBottomMargin = 150;
    const outerPad = this.isMobile ? 12 : 16;
    const innerPad = this.isMobile ? 16 : 20;
    const borderRadius = this.isMobile ? 8 : 12;

    const availableHeight = height - safeTopMargin - safeBottomMargin;
    const maxBoxHeight = 300;
    const boxHeight = Math.min(
      this.isMobile ? availableHeight * 0.6 : availableHeight * 0.5,
      maxBoxHeight
    );
    const boxY = safeTopMargin;
    const boxX = outerPad;
    const boxW = width - outerPad * 2;

    const textX = boxX + innerPad;
    const textY = boxY + innerPad;
    const textW = boxW - innerPad * 2;
    const hintBottomPad = this.isMobile ? 16 : 20;
    const textVisibleH = boxHeight - innerPad * 2 - hintBottomPad;

    const fontSizeNum = this.isMobile ? 14 : 16;
    const lineSpacing = this.isMobile ? 4 : 6;

    // BG
    this.dialogBg = this.add.graphics();
    this.dialogBg.fillStyle(0x1a1a2e, 0.9);
    this.dialogBg.fillRoundedRect(boxX, boxY, boxW, boxHeight, borderRadius);
    this.dialogBg.lineStyle(2, 0x4a5568);
    this.dialogBg.strokeRoundedRect(boxX, boxY, boxW, boxHeight, borderRadius);
    this.dialogBg.setDepth(5);

    // Text
    this.dialogText = this.add
      .text(textX, textY, "", {
        fontSize: `${fontSizeNum}px`,
        fontFamily: UI_FONT,
        fill: "#f8fafc",
        align: "left",
        wordWrap: { width: textW, useAdvancedWrap: true },
        lineSpacing: lineSpacing + 2,
      })
      .setShadow(0, 1, "#000000", 2);
    this.dialogText.setDepth(10);
    this.dialogText.setWordWrapWidth(textW, true);

    // Continue hint
    const hintX = boxX + boxW - innerPad - 12;
    const hintY = boxY + boxHeight - innerPad - 18;
    this.continueHint = this.add.text(hintX, hintY, "▼", {
      fontSize: `${fontSizeNum}px`,
      fontFamily: "monospace",
      fill: "#ffd700",
    });
    this.continueHint.setOrigin(0.5).setVisible(false).setDepth(15);

    this.tweens.add({
      targets: this.continueHint,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // Geometry mask
    this.dialogBoxInfo = {
      x: textX,
      y: textY,
      width: textW,
      height: textVisibleH,
      maxHeight: textVisibleH,
    };
    this.scrollMask = this.add.graphics();
    this.scrollMask.fillStyle(0xffffff);
    this.scrollMask.fillRect(textX, textY, textW, textVisibleH);
    this.scrollMask.setVisible(false);
    const mask = this.scrollMask.createGeometryMask();
    this.dialogText.setMask(mask);
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
    if (typeof document === "undefined") return;

    this.clearTextInput();

    const { width, height } = this.scale;

    // Create input container
    const inputContainer = document.createElement("div");
    inputContainer.style.position = "fixed";
    inputContainer.style.bottom = "20px";
    inputContainer.style.left = "50%";
    inputContainer.style.transform = "translateX(-50%)";
    inputContainer.style.width = this.isMobile ? "90%" : "400px";
    inputContainer.style.maxWidth = "500px";
    inputContainer.style.zIndex = "1000";
    inputContainer.style.display = "flex";
    inputContainer.style.gap = "8px";

    // Create text input
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
    this.textInput.style.padding = "12px";
    this.textInput.style.border = "2px solid #4a5568";
    this.textInput.style.borderRadius = "8px";
    this.textInput.style.backgroundColor = "#2d3748";
    this.textInput.style.color = "#ffffff";
    this.textInput.style.fontSize = this.isMobile ? "16px" : "14px";
    this.textInput.style.fontFamily = "Arial, sans-serif";

    // Improve mobile typing behavior
    try {
      this.textInput.setAttribute('inputmode','text');
      this.textInput.setAttribute('autocapitalize','off');
      this.textInput.setAttribute('autocorrect','off');
      this.textInput.setAttribute('spellcheck','false');
    } catch (e) {}
    if (this.isMobile) {
      this.textInput.rows = "3";
      this.textInput.style.resize = "none";
    }

    // Create submit button
    const submitButton = document.createElement("button");
    submitButton.textContent =
      this.playerData?.language === "zh" ? "发送" : "Send";
    submitButton.style.padding = "12px 16px";
    submitButton.style.border = "none";
    submitButton.style.borderRadius = "8px";
    submitButton.style.backgroundColor = "#10b981";
    submitButton.style.color = "#ffffff";
    submitButton.style.fontSize = this.isMobile ? "16px" : "14px";
    submitButton.style.fontFamily = "Arial, sans-serif";
    submitButton.style.cursor = "pointer";
    submitButton.style.whiteSpace = "nowrap";

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
    inputContainer.appendChild(this.textInput);
    inputContainer.appendChild(submitButton);
    document.body.appendChild(inputContainer);

    this.inputContainer = inputContainer;
    this.isWaitingForInput = true;

    // Focus input
    setTimeout(() => {
      if (this.textInput) {
        this.textInput.focus();
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
        } catch {}
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
    try {
      const response = await this.callConvaiAPI("hello");
      if (response.success) {
        this.convaiSessionId = response.sessionId;
        this.showSingleMessage("npc", response.message, () => {
          this.dialogPhase = "initial";
          this.updateStatus("");
          this.showInitialChoices();
        });
      } else {
        throw new Error("ConvAI API failed");
      }
    } catch (error) {
      console.error("Error calling ConvAI API:", error);
      this.primeIntroFallback();
      const first = this.getNextIntroChunk();
      if (first) {
        await new Promise((res) => this.showSingleMessage("npc", first, res));
        this.dialogPhase = "continuing";
        this.updateStatus("");
        this.waitForUserInput();
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
      village_head: {
        en: `Three days ago, he left the village without a word. The fire in his kitchen was still warm—but he was gone.`,
        zh: "三天前，他离开村子时一句话也没说。厨房里的火还温着——可他已经不见了。",
      },
      shop_owner: {
        en: `Hey, you're back. Recently, your master kept going on about greenwood seeds.`,
        zh: "嘿，你回来了。最近你师父一直在念叨青木籽。",
      },
      spice_woman: {
        en: `That bit of broth on your lip — you tasted your master's greenwood seed soup, didn't you?`,
        zh: "你嘴角还沾着汤呢——是不是尝过你师父的青木籽汤？",
      },
      restaurant_owner: {
        en: `I'm Han. I run this place now. Those spices—you got them from her, didn't you?`,
        zh: "我是韩，现在由我来经营这家店。那些香料——你是从她那里得到的吧？",
      },
      fisherman: {
        en: `I'm Wei. The river has always been my place of calm.`,
        zh: "我是魏。河水一直是我心里的安宁之地。",
      },
      old_friend: {
        en: `It's strange seeing you here. Your master and I—we grew up like brothers.`,
        zh: "真奇怪，会在这里见到你。你师父和我——我们是一起长大的。",
      },
      secret_apprentice: {
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
    if (this.debugMode) console.log("=== 连续对话模式 ===");
    this.dialogPhase = "continuing";
    this.dialogTurnCount = 0;
    this.canSkipToMeal = false;
    this.chatCycleTurns = 0;
    this.choicePending = false;
    this.waitForUserInput();
  }

  waitForUserInput() {
    if (this.debugMode) {
      console.log("=== 等待用户输入 ===");
      console.log("阶段:", this.dialogPhase);
    }
    this.enableInputBox();
    this.onUserSubmit = async (userMessage) => {
      try {
        await this.handleUserInput(userMessage);
      } catch (error) {
        console.error("Error in user submit handler:", error);
        await this.handleError(error);
      }
    };
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
          if (this.introMode?.active) {
            const chunk = this.getNextIntroChunk();
            response = chunk
              ? { success: true, message: chunk, meta: { introFallback: true } }
              : { success: false, error: "no-more-intro" };
          } else {
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

    return ends.some((p) => lowerText.includes(p)) ||
           endsZh.some((p) => text.includes(p));
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

  // -------- Meal selection & fixed Qs --------
  proceedToMealSelection() {
    this.clearTextInput();
    this.clearAllButtons();
    this.dialogPhase = "meal_selection";
    this.choicePending = false;
    this.chatCycleTurns = 0;
    this.questionGroups = {};
    this.questionAnswers = {};
    setTimeout(() => this.showMealSelectionButtons(), 200);
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
        this.mealAnswers[q.key] = { text: null, index: null };
      }
    });

    this.fixedQuestionButtons = [];

    const topMargin = 50;
    const bottomMargin = 100;
    const questionsHeight = availableHeight - topMargin - bottomMargin;

    let currentY = topMargin;
    const questionSpacing = Math.min(
      (questionsHeight / questions.length) * 0.85,
      140
    );
    const optionSpacing = Math.min(questionSpacing / 6, 30);
    const fontSize = this.isMobile ? "11px" : "13px";
    const titleFontSize = this.isMobile ? "13px" : "15px";

    questions.forEach((question, qIndex) => {
      const groupKey = question.key;
      this.questionGroups[groupKey] = [];

      const questionTitle = this.add.text(width / 2, currentY, question.title, {
        fontSize: titleFontSize,
        fontFamily: "monospace",
        fill: "#f1f5f9",
        align: "center",
        fontStyle: "bold",
      });
      questionTitle.setOrigin(0.5);
      questionTitle.setDepth(20);
      this.fixedQuestionButtons.push(questionTitle);

      currentY += 30;

      question.options.forEach((option, oIndex) => {
        const button = this.add.text(width / 2, currentY, option, {
          fontSize: fontSize,
          fontFamily: "monospace",
          fill: "#e2e8f0",
          backgroundColor: "#4a5568",
          padding: { x: 12, y: 6 },
        });

        button.setOrigin(0.5);
        button.setInteractive({ useHandCursor: true });
        button.setDepth(20);

        button.on("pointerdown", () => {
          this.selectFixedQuestionAnswer(question.key, option, oIndex, qIndex);
        });

        button.on("pointerover", () => button.setTint(0x667eea));
        button.on("pointerout", () => button.clearTint());

        this.fixedQuestionButtons.push(button);
        this.questionGroups[groupKey].push(button);
        currentY += optionSpacing;
      });

      currentY += questionSpacing - question.options.length * optionSpacing;
    });

    const submitY = Math.min(currentY + 20, availableHeight - 50);
    this.submitButton = this.add.text(
      width / 2,
      submitY,
      this.playerData.language === "zh" ? "提交所有答案" : "Submit All Answers",
      {
        fontSize: this.isMobile ? "14px" : "16px",
        fontFamily: "monospace",
        fill: "#ffffff",
        backgroundColor: "#10b981",
        padding: { x: 20, y: 10 },
      }
    );
    this.submitButton.setOrigin(0.5);
    this.submitButton.setDepth(20);
    this.submitButton.setVisible(false);

    this.submitButton.setInteractive({ useHandCursor: true });
    this.submitButton.on("pointerdown", () => this.submitAllFixedAnswers());
    this.submitButton.on("pointerover", () =>
      this.submitButton.setTint(0x059669)
    );
    this.submitButton.on("pointerout", () => this.submitButton.clearTint());

    this.fixedQuestionButtons.push(this.submitButton);
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
        ? `你这顿（${
            meal === "breakfast" ? "早餐" : meal === "lunch" ? "午餐" : "晚餐"
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
  async callConvaiAPI(userMessage) {
    if (this.debugMode) {
      console.log("=== 调用 ConvAI API ===");
      console.log("用户消息:", userMessage);
      console.log("当前NPC:", this.currentNPC);
      console.log("会话ID:", this.convaiSessionId);
    }

    this.npcMap = new Map([
      ["village_head", "37c1ea8e-4aec-11f0-a14e-42010a7be01f"],
      ["shop_owner", "425d25d4-73a6-11f0-8dad-42010a7be01f"],
      ["spice_woman", "a425409e-73a6-11f0-a309-42010a7be01f"],
      ["restaurant_owner", "6c4ed624-4b26-11f0-854d-42010a7be01f"],
      ["fisherman", "2e287d62-4b28-11f0-b155-42010a7be01f"],
      ["old_friend", "0443174e-73a7-11f0-b26c-42010a7be01f"],
      ["secret_apprentice", "a9394c0e-4d88-11f0-b18a-42010a7be01f"],
    ]);

    const charID = this.npcMap.get(this.currentNPC);

    try {
      const requestBody = {
        userText: userMessage,
        charID: charID,
        sessionID: this.convaiSessionId,
        voiceResponse: "False",
      };

      if (this.debugMode) {
        console.log("请求体:", requestBody);
        console.log("API URL:", `${API_URL}/convai-chat`);
      }

      const response = await fetch(`${API_URL}/convai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (this.debugMode) {
        console.log("HTTP响应状态:", response.status);
        console.log("HTTP响应OK:", response.ok);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (this.debugMode) {
        console.log("ConvAI 响应数据:", data);
      }

      return {
        success: true,
        message: data.text || "ConvAI 无返回文本",
        sessionId: data.sessionID || this.convaiSessionId,
      };
    } catch (error) {
      console.error("Error calling ConvAI API:", error);
      return {
        success: false,
        error: error.message || "ConvAI API call failed",
        message:
          this.playerData.language === "zh"
            ? "对不起，发生了错误。请稍后再试。"
            : "Sorry, an error occurred. Please try again later.",
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
        const stage =
          recordResult?.mealStage ??
          (this.selectedMealType === "breakfast"
            ? 1
            : this.selectedMealType === "lunch"
            ? 2
            : 3);

        let clueText = recordResult?.clueText;
        if (!clueText || !clueText.trim()) {
          if (stage === 1 || stage === 2) {
            clueText = this.getVagueResponse(this.currentNPC, stage);
          } else {
            clueText = this.getClueForNPC(this.currentNPC);
          }
        }

        this.npcManager.addClue(
          this.currentNPC,
          clueText,
          this.npcManager.getCurrentDay(),
          stage
        );

        this.showClueObtainedNotification();

        this.showSingleMessage("npc", clueText, async () => {
          this.dialogPhase = "completed";

          if (stage === 3) {
            await this.npcManager.completeNPCInteraction(this.currentNPC);
            this.npcManager.checkAndUpdateCurrentDay?.();
          }

          this.notifyMealRecorded();
          this.showDoneButtons();
        });

        return;
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
    try {
      // 1) 先清理本场景 UI/事件
      this.shutdown();

      // 2) 强制复位 MainScene 的交互与布局状态
      if (this.mainScene) {
        // 彻底关掉“键盘开启”态，恢复视口高度
        this.mainScene.keyboardState.isOpen = false;
        const { width } = this.mainScene.scale;
        this.mainScene.cameras.main.setViewport(
          0,
          0,
          width,
          this.mainScene.keyboardState.originalHeight
        );

        // 关键：允许触控/点按
        this.mainScene._touchControlsDisabled = false;

        // 通知 UI（有就调，没有也不报错）
        this.mainScene.uiManager?.handleKeyboardToggle?.(false);

        // 恢复输入
        this.mainScene.input.enabled = true;

        // 你主场景里若实现了额外复位逻辑，这里会调用
        this.mainScene.improvedEndDialog?.();

        // 3) 刷新“今天”的 NPC，让同一天能继续点午餐/晚餐
        this.npcManager?.refreshAvailableNPCs?.();
        this.npcManager?.rebindClickAreasForCurrentDay?.();
      }
    } finally {
      // 4) 关闭对话场景，把主场景顶到前台
      this.scene.stop();
      this.mainScene?.scene?.bringToTop?.();
      this.mainScene?.scene?.resume?.();
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
      } catch {}
      this.scene.stop("DialogScene");
      this.scene.resume("MainScene");
    });
  }

  shutdown() {
    // 先清 DOM 输入与按钮，避免残留
    this.clearTextInput?.();
    this.clearAllButtons?.();
    // 停掉打字/计时器
    if (this.timers && Array.isArray(this.timers)) {
      this.timers.forEach((t) => {
        try {
          this.time.removeEvent(t);
        } catch {}
      });
      this.timers.length = 0;
    }

    // 移除所有注册的 DOM/viewport 监听
    if (this.eventListeners && Array.isArray(this.eventListeners)) {
      this.eventListeners.forEach((l) => {
        try {
          l.target.removeEventListener(l.event, l.handler);
        } catch {}
      });
      this.eventListeners.length = 0;
    }

    // 解除文本 mask，避免遮罩留在画面上
    try {
      this.dialogText?.clearMask?.();
    } catch {}
    try {
      this.scrollMask?.destroy?.();
    } catch {}

    // 销毁对话 UI
    try {
      this.dialogBg?.destroy?.();
    } catch {}
    try {
      this.dialogText?.destroy?.();
    } catch {}
    try {
      this.continueHint?.destroy?.();
    } catch {}
    if (this.dynamicButtons && Array.isArray(this.dynamicButtons)) {
      this.dynamicButtons.forEach((b) => {
        try {
          b.destroy?.();
        } catch {}
      });
      this.dynamicButtons.length = 0;
    }
    try {
      this.returnButton?.destroy?.();
    } catch {}
    try {
      this.statusText?.destroy?.();
    } catch {}
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
        } catch {}

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
