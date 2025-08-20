// src/phaser/DialogScene.js - 修复UI布局和添加默认回复逻辑
import Phaser from "phaser";
import npc1bg from "../assets/npc/npc1bg.png";
import npc2bg from "../assets/npc/npc2bg.png";
import npc3bg from "../assets/npc/npc3bg.png";
import npc4bg from "../assets/npc/npc4bg.png";
import npc5bg from "../assets/npc/npc5bg.png";
import npc6bg from "../assets/npc/npc6bg.png";
import npc7bg from "../assets/npc/npc7bg.png";
import DialogSystem from "./DialogSystem";
import {
  createDialogBox,
  createReturnButton,
  showChoiceButtons,
} from "./DialogUI.js";

const UI_FONT = "'Arial', sans-serif"; // 你也可以换成游戏里更清晰的字体
const MAX_TURNS_MEAL = 6;
const API_URL = process.env.REACT_APP_API_URL;

export default class DialogScene extends Phaser.Scene {
  constructor() {
    super({ key: "DialogScene" });
    this.currentNPC = null;
    this.npcManager = null;
    this.isTyping = false;
    this.isSubmittingMeal = false;
    this.mealSubmitted = false;
    // 和每个npc的开场白计数
    this.introMode = { active: false, sentences: [], cursor: 0, turns: 0 };
    this.currentDialogState = "waiting_for_api";
    this.mealType = null;
    this.mealRecorded = false;
    this.dialogHistory = [];
    this.currentText = "";
    this.isMobile = false;
    this.vagueCount = 1;
    this.conversationHistory = [];
    this.mealSaveInProgress = false;
    this.mealSaved = false;
    this.lastRecordResult = null;

    // 对话状态管理
    this.dialogPhase = "initial";
    this.canSkipToMeal = false;
    this.dialogTurnCount = 0;
    this.maxDialogTurns = 5;
    this.fixedQuestionPhase = "meal_type";
    this.mealAnswers = {};
    this.currentQuestionIndex = 0;
    this.availableMealTypes = [];

    // 资源清理追踪
    this.timers = [];
    this.eventListeners = [];

    // 调试标志
    this.debugMode = true;
    this.dynamicButtons = [];
    this.chatCycleTurns = 0;
    this.choicePending = false;

    // 新增：Gemini默认问题状态
    this.geminiQuestionIndex = 0;
    this.useGeminiDefault = false;
    this.needUnusualTimeQuestion = false;

    this.keyboardState = {
      originalHeight: 0,
      currentHeight: 0,
      isOpen: false,
      listeners: [],
      resizeTimer: null,
    };

    // 新增：防止重复提问的机制
    this.askedQuestions = new Set(); // 追踪已问过的问题
    this.questionAttempts = 0; // 当前问题尝试次数
    this.maxQuestionAttempts = 2; // 单个问题最大尝试次数
    this.geminiQuestionOrder = ["Q4", "Q5", "Q6"]; // 问题顺序
    this.currentQuestionIndex = 0; // 当前问题索引
  }

  init(data) {
    this.quickLogMode = false; // 默认关闭
    this.currentNPC = data.npcId;
    this.npcManager = data.npcManager;
    this.playerData = data.playerData;
    this.mainScene = data.mainScene;
    this.useConvAI = !!data.useConvAI;
    this.convaiSessionId = "-1";
    this.npcVisitCount = this.npcVisitCount || {};

    // 获取当前NPC可选择的餐食类型
    const availableNPC = this.npcManager.availableNPCs.find(
      (n) => n.npcId === this.currentNPC
    );
    this.availableMealTypes = availableNPC
      ? availableNPC.availableMealTypes || []
      : [];

    // 检测是否为移动端
    this.isMobile = this.scale.width < 768;

    if (this.debugMode) {
      console.log("=== DialogScene初始化 ===");
      console.log("当前NPC:", this.currentNPC);
      console.log("玩家数据:", this.playerData);
      console.log("可选餐食类型:", this.availableMealTypes);
    }
    this.initKeyboardHandling();
  }

  // 处理键盘状态变化
  processViewportChange() {
    const currentHeight = this.getCurrentViewportHeight();
    const heightDiff = this.keyboardState.originalHeight - currentHeight;

    this.keyboardState.isOpen = heightDiff > 150;
    this.keyboardState.currentHeight = currentHeight;

    if (this.keyboardState.isOpen) {
      this.adjustDialogForKeyboard();
    } else {
      this.restoreDialogPosition();
    }
  }

  preload() {
    const npc = this.npcManager.getNPCById(this.currentNPC);
    const imageName = {
      npc1bg: npc1bg,
      npc2bg: npc2bg,
      npc3bg: npc3bg,
      npc4bg: npc4bg,
      npc5bg: npc5bg,
      npc6bg: npc6bg,
      npc7bg: npc7bg,
    };
    if (npc?.backgroundKey) {
      const backgroundPath = imageName[npc.backgroundKey];
      if (backgroundPath) this.load.image(npc.backgroundKey, backgroundPath);
    }

    this.load.on("complete", () => {
      console.log("Preload complete, proceeding with dialog");
    });
  }

  create() {
    this.npcVisitCount[this.currentNPC] =
      (this.npcVisitCount[this.currentNPC] || 0) + 1;
    this.setupBackground();
    this.setupUI();
    this.setupControls();

    this.dialogSystem = new DialogSystem(this);
    this.dialogSystem.setNPCManager(this.npcManager);

    this.dialogSystem.on("dialogEnded", this.handleDialogEnded, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);

    // 分支：今天第一次（当天尚无餐）才走 ConvAI，否则打招呼直接进入食记
    if (this.useConvAI) {
      this.startConversation();
    } else {
      const lang = this.playerData?.language || "en";
      const greet =
        lang === "zh"
          ? "嗨！回来啦！我们直接记录这顿吧。"
          : "Hey, welcome back! Let's log this meal.";
      this.showSingleMessage("npc", greet, () => {
        this.proceedToMealSelection();
      });
    }
  }

  // 生成/重置该NPC的默认介绍句子
  primeIntroFallback() {
    const introText = this.getDefaultNPCIntro();
    this.introMode.active = true;
    this.introMode.sentences = this.splitIntoSentences(introText);
    this.introMode.cursor = 0;
    this.introMode.turns = 0;
  }

  // 取下一回合要播的 1~2 句；返回 null 表示没有了
  getNextIntroChunk() {
    if (!this.introMode.active) return null;
    const s = this.introMode.sentences;
    const i = this.introMode.cursor;
    if (!s || i >= s.length) return null;

    // 每回合最多 2 句（最后一回合可能 1 句或剩余全部）
    const chunkSize = Math.min(2, s.length - i);
    const chunk = s.slice(i, i + chunkSize).join(" ");
    this.introMode.cursor += chunkSize;
    this.introMode.turns += 1;
    return chunk;
  }

  // 将一段文本按句子切分（兼容中英文标点）
  splitIntoSentences(text) {
    if (!text) return [];
    // 英文句号/问号/感叹号，中文句号/问号/感叹号/省略号 + 换行
    const parts = text
      .split(/(?<=[\.!\?。？！…])\s*|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts;
  }

  // 逐句播放 NPC intro
  async playNPCIntroSequence() {
    const intro = this.getDefaultNPCIntro(); // 你已有该函数
    const sentences = this.splitIntoSentences(intro);
    for (const s of sentences) {
      await new Promise((res) => this.showSingleMessage("npc", s, res));
    }
  }

  async handleDialogEnded() {
    if (this.dialogPhase === "meal_recording") return;
    const dialogResult = this.dialogSystem.getDialogResult();
    console.log("对话结束，准备处理结果:", dialogResult);
    // 显示“完成”按钮，玩家点了再返回
    this.clearAllButtons?.();
    const text = this.playerData?.language === "zh" ? "完成" : "Done";
    const { width, height } = this.scale;
    const btn = this.add
      .text(width / 2, height * 0.82, text, {
        fontSize: this.isMobile ? "18px" : "20px",
        fontFamily: UI_FONT,
        backgroundColor: "#4a5568",
        padding: this.isMobile ? { x: 22, y: 14 } : { x: 28, y: 16 },
        color: "#fff",
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.returnToMainScene());
    this.showDoneButtons(); // 统一入口
  }

  // 🔸 在这里添加键盘处理方法
  initKeyboardHandling() {
    this.keyboardState.originalHeight = window.innerHeight;

    const handleViewportChange = this.debounce(() => {
      this.processViewportChange();
    }, 100);

    // Visual Viewport API
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

    if (this.keyboardState.isOpen) {
      this.adjustDialogForKeyboard();
    } else {
      this.restoreDialogPosition();
    }
  }

  // 🔸 还需要添加这些辅助方法
  getCurrentViewportHeight() {
    if (window.visualViewport) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  debounce(func, wait) {
    return (...args) => {
      if (this.keyboardState.resizeTimer) {
        clearTimeout(this.keyboardState.resizeTimer);
      }
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

    if (this.dialogBg && this.dialogText) {
      this.recreateDialogBox(boxHeight, boxY);
    }
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

    if (this.continueHint) {
      this.continueHint.setPosition(width - 40, boxHeight + boxY - 25);
    }

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

    // 同步记录
    this.dialogBoxInfo = {
      x: textPadding,
      y: boxY + 20,
      width: width - textPadding * 2,
      height: boxHeight - 40,
      maxHeight: boxHeight - 40,
    };

    // 重新刷新一遍当前显示内容
    this.updateConversationDisplay?.();
  }

  restoreDialogPosition() {
    const { height } = this.scale;
    const boxHeight = this.isMobile ? height * 0.45 : height * 0.4;
    const boxY = 10;

    if (this.dialogBg && this.dialogText) {
      this.recreateDialogBox(boxHeight, boxY);
    }
  }

  setupBackground() {
    const { width, height } = this.scale;
    const npc = this.npcManager.getNPCById(this.currentNPC);

    // 添加默认背景色
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
      console.warn("No backgroundKey found for NPC:", npc);
      this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }
  }

  setupUI() {
    const { width, height } = this.scale;

    // 修改：对话框放在上方
    this.createTopDialogBox();
    createReturnButton(this);
    this.updateStatus("");

    // 状态指示器
    const statusY = this.isMobile ? height - 30 : height - 40;
    this.statusText = this.add.text(width / 2, statusY, "", {
      fontSize: this.isMobile ? "12px" : "14px",
      fontFamily: "monospace",
      fill: "#94a3b8",
      align: "center",
    });
    this.statusText.setOrigin(0.5);
  }

  // 新增：创建顶部对话框
  // 在 DialogScene.js 的 createTopDialogBox 方法中修复定位问题

  createTopDialogBox() {
  const { width, height } = this.scale;

  // 安全边距：避免顶栏/底部按钮遮挡
  const safeTopMargin = 120;
  const safeBottomMargin = 150;

  // 统一“外边距”和“内边距”
  const outerPad = this.isMobile ? 12 : 16;   // 背景框离屏幕的外边距（左右）
  const innerPad = this.isMobile ? 16 : 20;   // 文字在背景框内的内边距
  const borderRadius = this.isMobile ? 8 : 12;

  // 计算对话框尺寸
  const availableHeight = height - safeTopMargin - safeBottomMargin;
  const maxBoxHeight = 300;
  const boxHeight = Math.min(this.isMobile ? availableHeight * 0.6 : availableHeight * 0.5, maxBoxHeight);
  const boxY = safeTopMargin;
  const boxX = outerPad;
  const boxW = width - outerPad * 2;

  // 统一文字区域（与遮罩使用同一套数值）
  const textX = boxX + innerPad;
  const textY = boxY + innerPad;
  const textW = boxW - innerPad * 2;
  const hintBottomPad = this.isMobile ? 16 : 20; // 为“继续提示”留空
  const textVisibleH = boxHeight - innerPad * 2 - hintBottomPad; // 文字可视高度

  // 字体与行距（移除自定义 metrics）
  const fontSizeNum = this.isMobile ? 14 : 16;
  const lineSpacing = this.isMobile ? 4 : 6;

  // 背景
  this.dialogBg = this.add.graphics();
  this.dialogBg.fillStyle(0x1a1a2e, 0.9);
  this.dialogBg.fillRoundedRect(boxX, boxY, boxW, boxHeight, borderRadius);
  this.dialogBg.lineStyle(2, 0x4a5568);
  this.dialogBg.strokeRoundedRect(boxX, boxY, boxW, boxHeight, borderRadius);
  this.dialogBg.setDepth(5);

  // 文字（不要手动 metrics；明确设置 wordWrapWidth）
  this.dialogText = this.add.text(textX, textY, "", {
    fontSize: `${fontSizeNum}px`,
    fontFamily: UI_FONT,
    fill: "#f8fafc",
    align: "left",
    wordWrap: { width: textW, useAdvancedWrap: true },
    lineSpacing: lineSpacing + 2,
  }).setShadow(0, 1, "#000000", 2);
  this.dialogText.setDepth(10);
  // 保险：某些 Phaser 版本更喜欢这个 API 来设置 wrap 宽度
  if (this.dialogText.setWordWrapWidth) this.dialogText.setWordWrapWidth(textW, true);

  // “继续”提示（确保在框内右下角）
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

  // 记录尺寸信息（供滚动/点击使用）
  this.dialogBoxInfo = {
    x: textX,
    y: textY,
    width: textW,
    height: textVisibleH,
    maxHeight: textVisibleH,
    boxY,
    boxHeight,
  };

  // 几何遮罩：严格与文字可视区域一致（不要用 textPadding 混用）
  this.scrollMask = this.add.graphics();
  this.scrollMask.fillStyle(0xffffff);
  this.scrollMask.fillRect(textX, textY, textW, textVisibleH);
  this.scrollMask.setVisible(false);
  const mask = this.scrollMask.createGeometryMask();
  this.dialogText.setMask(mask);

  // 统一层级（可选）
  this.dialogBg.setDepth(5);
  this.dialogText.setDepth(10);
  this.continueHint.setDepth(15);
}


  // 🔑 新增：智能文本预处理方法
  preprocessDialogText(text) {
    if (!text || typeof text !== "string") return text;

    // 检测语言
    const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
    const hasEnglishWords = /[a-zA-Z]{2,}/.test(text);

    if (hasChineseChars && hasEnglishWords) {
      // 混合语言文本：在中英文之间添加适当的分隔处理
      return (
        text
          // 在中文和英文之间添加零宽空格，帮助换行
          .replace(/([\u4e00-\u9fff])([a-zA-Z])/g, "$1​$2") // 中文后接英文
          .replace(/([a-zA-Z])([\u4e00-\u9fff])/g, "$1​$2") // 英文后接中文
          // 在标点后添加换行提示
          .replace(/([.!?。！？])\s+/g, "$1\n")
          // 处理长英文单词的换行
          .replace(/(\w{10,})/g, (match) => {
            // 对于特别长的英文单词，在适当位置插入软换行符
            return match.replace(/(.{8})/g, "$1​");
          })
      );
    }

    // 纯英文文本：改善单词换行
    if (!hasChineseChars && hasEnglishWords) {
      return (
        text
          // 在句号、感叹号、问号后添加换行提示
          .replace(/([.!?])\s+/g, "$1\n")
          // 在逗号后添加软换行机会
          .replace(/,\s+/g, ", ")
      );
    }

    // 纯中文或其他情况，直接返回
    return text;
  }

  showDoneButtons() {
    // 清理旧按钮
    this.clearAllButtons?.();

    const { width, height } = this.scale;
    const y = height * 0.86; // 不挡住其它元素
    const fontSize = this.isMobile ? "18px" : "20px";

    const text = this.playerData?.language === "zh" ? "完成" : "Done";
    const btn = this.add
      .text(width / 2, y, text, {
        fontSize,
        fontFamily: "'Arial', sans-serif",
        backgroundColor: "#475569",
        padding: this.isMobile ? { x: 22, y: 12 } : { x: 28, y: 14 },
        color: "#fff",
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.returnToMainScene());

    this.dynamicButtons.push(btn);
  }

  setupControls() {
    // 点击屏幕继续对话 - 移动端优化触摸区域
    const pointerHandler = (pointer) => {
      // 只在对话框区域内响应点击
      if (
        this.dialogBoxInfo &&
        pointer.x >= this.dialogBoxInfo.x &&
        pointer.x <= this.dialogBoxInfo.x + this.dialogBoxInfo.width &&
        pointer.y >= this.dialogBoxInfo.y &&
        pointer.y <= this.dialogBoxInfo.y + this.dialogBoxInfo.height &&
        !this.isWaitingForInput
      ) {
        this.handleContinue();
      }
    };

    this.input.on("pointerdown", pointerHandler);
    this.eventListeners.push({ event: "pointerdown", handler: pointerHandler });

    this._onSpaceKey = () => {
      if (!this.isWaitingForInput) {
        this.handleContinue();
      }
    };
    this.input.keyboard.on("keydown-SPACE", this._onSpaceKey);

    // 滚动控制
    this.scrollOffset = 0;

    // 🔸 修改：使用新的 handleScroll 方法
    const wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
      // 反向：向下滚动 => 查看更晚/更靠后的内容
      this.handleScroll(deltaY > 0 ? -1 : 1);
    };

    this.input.on("wheel", wheelHandler);
    this.eventListeners.push({ event: "wheel", handler: wheelHandler });

    // 🔸 修改：触摸滑动支持（移动端）- 优化区域检测
    if (this.isMobile) {
      let startY = 0;
      let isDragging = false;

      const pointerDownHandler = (pointer) => {
        // 🔸 只在对话框区域内启动滚动
        if (
          this.dialogBoxInfo &&
          pointer.x >= this.dialogBoxInfo.x &&
          pointer.x <= this.dialogBoxInfo.x + this.dialogBoxInfo.width &&
          pointer.y >= this.dialogBoxInfo.y &&
          pointer.y <= this.dialogBoxInfo.y + this.dialogBoxInfo.height
        ) {
          startY = pointer.y;
          isDragging = true;
        }
      };

      const pointerMoveHandler = (pointer) => {
        if (isDragging) {
          const deltaY = pointer.y - startY;
          if (Math.abs(deltaY) > 20) {
            this.handleScroll(deltaY > 0 ? 1 : -1);
            startY = pointer.y;
          }
        }
      };

      const pointerUpHandler = () => {
        isDragging = false;
      };

      this.input.on("pointerdown", pointerDownHandler);
      this.input.on("pointermove", pointerMoveHandler);
      this.input.on("pointerup", pointerUpHandler);

      this.eventListeners.push(
        { event: "pointerdown", handler: pointerDownHandler },
        { event: "pointermove", handler: pointerMoveHandler },
        { event: "pointerup", handler: pointerUpHandler }
      );
    }
  }

  // 在 setupControls() 方法后面添加这个新方法
  handleScroll(direction) {
    if (!this.conversationHistory.length) return;

    const lineHeight = this.isMobile ? 20 : 24;
    const visibleLines = Math.floor(this.dialogBoxInfo.height / lineHeight);

    // 计算总行数
    let totalLines = 0;
    this.conversationHistory.forEach((entry) => {
      const textWidth = this.dialogBoxInfo.width;
      const avgCharWidth = 8; // 估算字符宽度
      const charsPerLine = Math.floor(textWidth / avgCharWidth);
      const entryLines = Math.ceil(
        (entry.speaker + ": " + entry.message).length / charsPerLine
      );
      totalLines += entryLines + 1; // +1 for spacing
    });

    this.maxScrollOffset = Math.max(0, totalLines - visibleLines);

    this.scrollOffset += direction;
    this.scrollOffset = Phaser.Math.Clamp(
      this.scrollOffset,
      0,
      this.maxScrollOffset
    );

    this.updateConversationDisplay();
  }

  // 改进的Continue处理逻辑
  handleContinue() {
    if (this.isTyping) return;

    switch (this.dialogPhase) {
      case "initial":
        break;
      case "continuing":
        this.checkForSkipOption();
        break;
      case "meal_selection":
        break;
      case "completed":
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

  showSkipToMealOption() {
    showChoiceButtons(this, {
      continue: {
        text:
          this.playerData.language === "zh" ? "继续对话" : "Continue talking",
        onClick: () => {
          this.waitForUserInput();
        },
      },
      skipToMeal: {
        text:
          this.playerData.language === "zh"
            ? "开始记录食物"
            : "Start recording meal",
        onClick: () => {
          this.proceedToMealSelection();
        },
      },
    });
  }

  // 进入食物选择阶段
  proceedToMealSelection() {
    if (this.debugMode) {
      console.log("=== 进入食物选择阶段 ===");
      console.log("清理输入框和按钮");
    }

    // 清理输入框
    this.clearTextInput();
    this.clearAllButtons();
    this.dialogPhase = "meal_selection";

    this.choicePending = false;
    this.chatCycleTurns = 0;

    this.questionGroups = {};
    this.questionAnswers = {};

    // 延迟显示餐食选择，确保界面清理完成
    setTimeout(() => {
      this.showMealSelectionButtons();
    }, 200);
  }

  // 修改：显示餐食选择按钮 - 只显示可选择的餐食类型
  showMealSelectionButtons() {
    this.clearAllButtons();

    if (this.debugMode) {
      console.log("=== 显示餐食选择按钮 ===");
      console.log("可选餐食类型:", this.availableMealTypes);
    }

    // 检查是否有可选择的餐食类型
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

    const startY = height * 0.6; // 放在屏幕中下方
    const buttonSpacing = this.isMobile ? 70 : 90;
    const fontSize = this.isMobile ? "16px" : "20px";
    const padding = this.isMobile ? { x: 20, y: 12 } : { x: 30, y: 15 };

    // 显示提示文本
    const questionText = this.add.text(
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
    questionText.setOrigin(0.5);
    questionText.setDepth(20);

    // 餐食类型的中英文映射
    const mealTypeNames = {
      breakfast: this.playerData.language === "zh" ? "早餐" : "Breakfast",
      lunch: this.playerData.language === "zh" ? "午餐" : "Lunch",
      dinner: this.playerData.language === "zh" ? "晚餐" : "Dinner",
    };

    // 只显示可选择的餐食类型
    this.availableMealTypes.forEach((mealType, index) => {
      const buttonY = startY + index * buttonSpacing;
      const displayName = mealTypeNames[mealType] || mealType;

      const button = this.add.text(width / 2, buttonY, displayName, {
        fontSize: fontSize,
        fontFamily: "monospace",
        fill: "#e2e8f0",
        backgroundColor: "#4a5568",
        padding: padding,
      });

      this.dynamicButtons.push(button);

      button.setOrigin(0.5);
      button.setInteractive({ useHandCursor: true });
      button.setDepth(20);

      button.on("pointerdown", () => {
        if (this.debugMode) {
          console.log("选择餐食:", mealType);
        }
        this.selectMeal(mealType, displayName);
      });

      button.on("pointerover", () => {
        button.setTint(0x667eea);
      });

      button.on("pointerout", () => {
        button.clearTint();
      });

      this.mealButtons.push(button);
    });

    // 保存问题文本以便清理
    this.questionText = questionText;

    if (this.debugMode) {
      console.log("餐食选择按钮创建完成，按钮数量:", this.mealButtons.length);
    }
  }

  // 改进的开始对话逻辑 - 添加ConvAI失败的默认处理
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
      // ConvAI 失败：开启“分回合默认介绍”模式，播第一段，然后等待下一轮 this.primeIntroFallback();
      this.primeIntroFallback();
      const first = this.getNextIntroChunk();
      if (first) {
        await new Promise((res) => this.showSingleMessage("npc", first, res));
        this.dialogPhase = "continuing";
        this.updateStatus("");
        this.waitForUserInput(); // 下一回合再播下一段
      } else {
        this.proceedToMealSelection(); // 保底
      }
    }
  }

  // 获取下一条默认问题（会根据 needUnusualTimeQuestion 决定是否先问“时间异常”）
  getNextGeminiDefaultQuestion() {
    const meal = this.selectedMealType || "meal";

    // 可选的“时间异常”问题（只问一次）
    if (this.needUnusualTimeQuestion && this.geminiQuestionIndex === 0) {
      this.geminiQuestionIndex++;
      return this.playerData.language === "zh"
        ? "你为什么在这个时间点进餐？为什么不是更早或更晚？"
        : "Why did you eat at this time rather than earlier or later?";
    }

    // Q4/Q5/Q6
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

  // 当决定走“默认问答流”时，构造一个伪装成成功的响应对象
  buildGeminiDefaultResponse() {
    const q = this.getNextGeminiDefaultQuestion();
    if (!q) {
      // 没有更多默认问题了，返回“结束”信号（由外层结束并提交）
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

  // 新增：获取NPC默认介绍
  getDefaultNPCIntro() {
    const language = this.playerData.language;

    const npcIntros = {
      village_head: {
        en: `Three days ago, he left the village without a word.
The fire in his kitchen was still warm—but he was gone.
You know as well as I do... he was never the type to vanish without a reason. He barely ever left the village.
You were once his apprentice. If anyone can figure out what happened to him... it's you.
But this search—it's not just about turning over kitchen drawers.
Not long ago, he always carried a notebook whenever he met someone.
Maybe by following his method, you'll understand how he thinks.
I believe those records hold the key.`,
        zh: "三天前，他离开村子时一句话也没说。厨房里的火还温着——可他已经不见了。\n\n你和我一样清楚……他从来不是那种无缘无故消失的人。他几乎从不离开村子。\n\n你曾是他的学徒。如果有人能查明他发生了什么事……那就是你。\n\n但这次寻找——不是随便翻翻厨房的抽屉。\n\n不久前，他每次见人都带着一本笔记本。\n\n也许按照他的方式去追寻，你就能明白他的思维。\n\n我相信，那些记录里藏着关键。",
      },

      shop_owner: {
        en: `Hey, you’re back. Recently, your master kept going on about greenwood seeds. Funny thing is, he used to avoid them completely. The moment he brought it up, I figured—he’s probably cooking up one of his strange new ideas again.

Anyway, just got a new batch in. But he hasn’t shown up for the past few days. Folks in the village are talking. That day, he stared at the greenwood seeds for a long while, scribbling away in his notebook. I’ve got no idea what he was writing.

If you’re trying to understand him… maybe try doing things his way.`,
        zh: "嘿，你回来了。最近你师父一直在念叨青木籽。奇怪的是，他以前从来避开它们。一提到，我就觉得——他大概又在琢磨什么古怪的新点子了。\n\n正好我这儿新进了一批。不过这几天他都没出现，村里人议论纷纷。那天，他盯着青木籽看了很久，还在笔记本上写写画画。我完全不知道他在写什么。\n\n如果你想理解他……也许试着用他的方式吧。",
      },

      spice_woman: {
        en: `That bit of broth on your lip — you tasted your master’s greenwood seed soup, didn’t you? So, tell me… did you catch the flavor? Let me tell you, greenwood seeds alone won’t get you that taste. You need my special spice blend to bring it to life.

Your master used to say the right flavors came when he really paid attention — to people, their stories, what they ate, and why. He had a way of noticing the little things most folks miss.

There’s only so much flavor can tell you. But pay attention to what doesn’t taste right.
That’s usually where the story is.`,
        zh: "你嘴角还沾着汤呢——是不是尝过你师父的青木籽汤？告诉我……你品出那味道了吗？我跟你说，光靠青木籽可做不出那滋味。还需要我的特别香料混合，才能让它活起来。\n\n你师父常说，真正的味道来自用心——去倾听人、他们的故事，他们吃了什么，为什么吃。他总能注意到别人忽视的小细节。\n\n味道能告诉你的有限。但要留心那些“不对劲”的地方。\n\n故事，往往就藏在那里。",
      },

      restaurant_owner: {
        en: `I’m Han. I run this place now.

Those spices—you got them from her, didn’t you? She’s always full of stories.

You were Hua’s apprentice. I remember. He and I built this place together once. Big plans, but he cared more about notes and flavors than the business.

We clashed. He left. I stayed. Now it’s just me, keeping the doors open for my family.

Last time I saw him, he slipped a scrap of paper into that thick notebook. Looked like a recipe, but he caught me watching and shut the cover. Never thought he’d hide things from me. Maybe there’s something in that habit. If you’re trying to understand him, try writing things down too.`,
        zh: "我是韩，现在由我来经营这家店。\n\n那些香料——你是从她那里得到的吧？她总是喜欢讲故事。\n\n你是华的学徒吧？我记得。以前他和我一起建立过这家店。我们曾有过很大的计划，但他更在意笔记和味道，而不是生意。\n\n我们因此争执，他走了，我留下。如今只有我一个人，为了家人撑着店门。\n\n我最后一次见到他时，他把一张纸条塞进那本厚厚的笔记本，看上去像是一份食谱，但发现我在看时，他立刻合上了书。\n\n我从没想过他会瞒着我。也许这个习惯本身就藏着秘密。如果你想理解他，不妨也把事情记下来。",
      },

      fisherman: {
        en: `I’m Wei. The river has always been my place of calm.  
Your master often sat here with me until the lanterns burned low.  

He used to say cooking was like fishing—patience, timing, and knowing when to pull the line.  
But the last time I saw him, he wasn’t calm. His hands trembled, his eyes fixed on the water.  

Before he left, he slipped something into the current. I thought it was just a scrap of paper,  
but he watched it float away like it carried his whole heart.  

If you’re searching for answers, look for what drifts, what waits. Some truths don’t stay still—they travel, like the river itself.`,
        zh: "我是魏。河水一直是我心里的安宁之地。\n\n你师父常常和我坐在这里，直到灯火熄灭。\n\n他常说，做菜就像钓鱼——需要耐心、时机，还要懂得什么时候收线。\n\n可我最后一次见他时，他并不安宁。手在颤抖，眼睛紧盯着水面。\n\n离开前，他把什么东西投入了水流。我原以为只是张纸片，可他看着它漂走，就像那上面承载了他全部的心。\n\n如果你在寻找答案，去找那些漂流的、等待的东西吧。有些真相不会停留——它们像河水一样，流动着。",
      },

      old_friend: {
        en: `It’s strange seeing you here. Your master and I—we grew up like brothers.  
We fought, laughed, dreamed under the same roof.  

But as the years passed, he pulled away.  
He carried secrets heavier than iron, and he never let me close enough to share them.  

He once told me: *‘Some truths are like fire—too bright to show, too dangerous to leave unguarded.’*  
I didn’t understand then. Maybe I still don’t.  

But you—his apprentice—you carry pieces of his trust.  
If you really want to know what he hid, don’t just look for what he said.  
Listen for what he couldn’t bring himself to speak.`,
        zh: "真奇怪，会在这里见到你。你师父和我——我们是一起长大的，就像兄弟一样。\n\n我们打过架，也一起笑过、做过梦。\n\n可随着岁月，他渐渐疏远了我。他背负着沉重如铁的秘密，从不让我靠近。\n\n他曾对我说过：*“有些真相像火——太耀眼而无法示人，太危险而不能无人守护。”*\n\n当时我不懂，也许现在依旧不懂。\n\n但你——作为他的学徒——承载着他信任的一部分。\n\n如果你真的想知道他隐藏的东西，不要只看他说过的。\n\n要去聆听那些他无法说出口的话。",
      },

      secret_apprentice: {
        en: `You… you’re the one he always mentioned.  
I’m Mei. He took me in not long ago, said I reminded him of his younger days.  

He taught me more than recipes—he taught me to notice, to question.  
But he was never free of his worries. His eyes always wandered,  
like he was searching for something behind him.  

Once, late at night, he told me: *‘If I’m gone, everything you need is in the place I always look back to.’*  
I asked him what he meant. He only smiled and changed the subject.  

Do you know where that is?  
Because if anyone can follow the path he left, it’s you.`,
        zh: "你……你就是他常提到的那个人吧。\n\n我是梅。不久前他收留了我，说我让他想起了年轻时的自己。\n\n他教我的不只是食谱——而是要留心、要质疑。但他从未摆脱心里的忧虑。他的眼神总是飘忽，好像在寻找身后的什么东西。\n\n有一次深夜，他对我说过：*“如果我不在了，你需要的一切都在我总是回头看的地方。”*\n\n我问他是什么意思，他只是笑了笑，转移了话题。\n\n你知道那是哪里吗？\n\n因为如果有人能跟上他留下的路径，那就是你。",
      },
    };

    const intro = npcIntros[this.currentNPC];
    return intro ? intro[language] || intro.en : "Hello...";
  }

  // index 为“时间按钮”的编号（1~6）；需在时间按钮点击时调用
  markMealTimeChoice(index) {
    this.selectedTimeIndex = index;

    // 题述规则：
    // breakfast 异常: 按钮 1,3,4,5,6
    // lunch     异常: 按钮 1,2,4,5,6
    // dinner    异常: 按钮 1,2,3,4
    const m = this.selectedMealType;
    const abnormalMap = {
      breakfast: new Set([1, 3, 4, 5, 6]),
      lunch: new Set([1, 2, 4, 5, 6]),
      dinner: new Set([1, 2, 3, 4]),
    };
    this.needUnusualTimeQuestion = !!(
      abnormalMap[m] && abnormalMap[m].has(index)
    );
  }

  // 显示初始选择按钮
  showInitialChoices() {
    showChoiceButtons(this, {
      continue: {
        text: this.playerData.language === "zh" ? "闲聊" : "Chatting",
        onClick: () => {
          this.startContinuousDialog();
        },
      },
    });
  }

  // 开始连续对话模式
  startContinuousDialog() {
    if (this.debugMode) {
      console.log("=== 开始连续对话模式 ===");
    }

    this.dialogPhase = "continuing";
    this.dialogTurnCount = 0;
    this.canSkipToMeal = false;

    this.chatCycleTurns = 0;
    this.choicePending = false;

    this.waitForUserInput();
  }

  // 改进的等待用户输入逻辑
  waitForUserInput() {
    if (this.debugMode) {
      console.log("=== 等待用户输入 ===");
      console.log("当前对话阶段:", this.dialogPhase);
    }

    this.enableInputBox();

    // 设置用户提交回调函数
    this.onUserSubmit = async (userMessage) => {
      if (this.debugMode) {
        console.log("=== 用户提交消息 ===");
        console.log("消息内容:", userMessage);
        console.log("当前是否等待输入:", this.isWaitingForInput);
      }

      try {
        await this.handleUserInput(userMessage);
      } catch (error) {
        console.error("Error in user submit handler:", error);
        await this.handleError(error);
      }
    };

    if (this.debugMode) {
      console.log(
        "onUserSubmit 回调已设置:",
        this.onUserSubmit ? "存在" : "不存在"
      );
    }
  }

  async handleUserInput(input) {
    if (this.debugMode) {
      console.log("=== 处理用户输入开始 ===");
      console.log("输入内容:", input);
      console.log("当前对话阶段:", this.dialogPhase);
    }

    // 立即清理输入框，避免重复提交
    this.clearTextInput();

    // 根据对话阶段增加相应的轮数计数
    if (this.dialogPhase === "continuing") {
      this.dialogTurnCount++;
    }

    console.log("=== 对话调试信息 ===");
    console.log("当前对话阶段:", this.dialogPhase);
    console.log("ConvAI轮数:", this.dialogTurnCount);
    console.log("Gemini轮数:", this.geminiTurnCount || 0);
    console.log("用户输入:", input);

    // 添加到对话历史
    this.addToConversationHistory("player", input);
    this.dialogHistory.push({
      type: "user",
      content: input,
    });

    // 显示"正在思考..."状态
    this.updateStatus("正在思考...");

    try {
      let response;

      // 根据当前状态选择正确的 API
      switch (this.dialogPhase) {
        case "continuing":
          // 若处于“默认介绍分回合”模式，则不调 ConvAI，直接给下一段
          if (this.introMode?.active) {
            const chunk = this.getNextIntroChunk();
            response = chunk
              ? { success: true, message: chunk, meta: { introFallback: true } }
              : { success: false, error: "no-more-intro" };
          } else {
            if (this.debugMode) console.log("调用 ConvAI API");
            response = await this.callConvaiAPI(input);
          }
          break;
        case "meal_recording":
          if (this.debugMode) {
            console.log("调用 Gemini API (轮数: " + this.geminiTurnCount + ")");
          }
          response = await this.callGeminiAPI(input);
          break;
        default:
          throw new Error(`Unknown dialog phase: ${this.dialogPhase}`);
      }

      if (this.debugMode) {
        console.log("API响应:", response);
      }

      if (response && response.success) {
        console.log("NPC回复:", response.message);

        // 添加到对话历史
        this.dialogHistory.push({
          type: "assistant",
          content: response.message,
        });

        // 清除"正在思考..."状态
        this.updateStatus("");

        await this.processResponse(response);
      } else {
        // 清除"正在思考..."状态
        this.updateStatus("");
        await this.handleResponseError(response);
      }
    } catch (error) {
      console.error("Error in handleUserInput:", error);
      // 清除"正在思考..."状态
      this.updateStatus("");
      await this.handleError(error);
    }
  }

  async forceEndGeminiDialog() {
    console.log("强制结束 Gemini 对话");
    const endMessage =
      this.playerData.language === "zh"
        ? "谢谢你详细的分享！我已经记录下了你的餐食信息。"
        : "Thank you for sharing your meal with me! I have recorded your meal information.";

    this.showSingleMessage("npc", endMessage, () => {
      this.dialogPhase = "completed";
      this.submitMealOnce();
    });
  }

  showSubmissionProgress() {
    if (this.submissionProgress) return; // 避免重复创建

    const { width, height } = this.scale;

    // 创建半透明遮罩
    this.submissionOverlay = this.add.graphics();
    this.submissionOverlay.fillStyle(0x000000, 0.3);
    this.submissionOverlay.fillRect(0, 0, width, height);
    this.submissionOverlay.setDepth(199);

    // 创建进度指示器
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

    // 添加旋转动画
    this.tweens.add({
      targets: this.submissionProgress,
      angle: 360,
      duration: 2000,
      repeat: -1,
      ease: "Linear",
    });
  }

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

  // DialogScene.js
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
      const mealContent = this.extractMealContentFromHistory() || "";
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

      console.log("📊 餐食提交结果:", {
        success: result?.success,
        newDay: result?.newDay,
        nextDayUnlocked: result?.nextDayUnlocked,
        isFirstMealToday: result?.isFirstMealToday,
      });

      // 🔧 重要修复：统一处理状态刷新
      if (result?.success) {
        // 延迟通知主场景，确保数据同步完成
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

  // 🔧 新增：处理餐食完成的统一方法
  async handleMealCompletion(
    recordResult = { success: true, shouldGiveClue: false }
  ) {
    try {
      if (this.debugMode) {
        console.log("处理餐食完成结果:", recordResult);
      }

      if (!recordResult.success) {
        throw new Error(recordResult.error || "Failed to record meal");
      }

      // 🔑 关键修改：如果有线索，立即显示而不是等待消息显示完成
      if (recordResult.shouldGiveClue) {
        // 立即添加线索到本地和UI
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

        // 🔑 立即添加线索，不等待消息显示
        this.npcManager.addClue(
          this.currentNPC,
          clueText,
          this.npcManager.getCurrentDay(),
          stage
        );

        // 🔑 立即显示线索获得通知
        this.showClueObtainedNotification();

        // 显示NPC消息
        this.showSingleMessage("npc", clueText, async () => {
          this.dialogPhase = "completed";

          // 仅晚餐（stage=3）才标记 NPC 交互完成
          if (stage === 3) {
            await this.npcManager.completeNPCInteraction(this.currentNPC);
            this.npcManager.checkAndUpdateCurrentDay?.();
          }

          // 通知主场景刷新
          this.notifyMealRecorded();
          this.showDoneButtons();
        });

        return;
      }

      // 不给线索的普通结束
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

  // 增强结束检测
  async processResponse(response) {
    return new Promise((resolve) => {
      this.showSingleMessage("npc", response.message, () => {
        if (this.debugMode) {
          console.log("=== 响应处理完成 ===");
          console.log("当前阶段:", this.dialogPhase);
          console.log("Gemini轮数:", this.geminiTurnCount || 0);
          console.log(
            "检查结束消息:",
            this.detectThankYouMessage(response.message)
          );
        }

        if (this.dialogPhase === "continuing") {
          // ConvAI 对话逻辑保持不变
          this.chatCycleTurns = (this.chatCycleTurns || 0) + 1;

          if (this.checkForTriggerPhrase(response.message)) {
            console.log("检测到触发短语，直接进入食物选择");
            this.proceedToMealSelection();
          } else if (this.chatCycleTurns >= 3) {
            console.log("chatCycleTurns>=3，显示继续/跳过选择按钮");
            this.showContinueOrSkipChoice();
          } else {
            console.log("继续下一轮对话（轮数:", this.dialogTurnCount, "）");
            setTimeout(() => {
              this.waitForUserInput();
            }, 500);
          }
        } else if (this.dialogPhase === "meal_recording") {
          // ✅ 渲染完助手回复后再计数
          this.geminiTurnCount = (this.geminiTurnCount || 0) + 1;
          console.log(
            "[Gemini] 轮数+1 =>",
            this.geminiTurnCount,
            "/",
            this.maxGeminiTurns
          );

          const assistantEnds = this.detectThankYouMessage(response.message);
          const isQuestion = /\?\s*$/.test(response.message.trim()); // 结尾是问号 -> 不是结束
          const reachedCap = this.geminiTurnCount >= this.maxGeminiTurns;

          // 是否已有用户有效餐食文本
          const mealText = this.extractMealContentFromHistory();
          const hasMeaningfulMeal = !!(mealText && mealText.trim().length >= 3);

          if (
            !isQuestion &&
            (assistantEnds || (reachedCap && hasMeaningfulMeal))
          ) {
            console.log("Gemini 对话结束，准备提交餐食记录");
            this.dialogPhase = "completed";
            this.submitMealOnce();
            return resolve();
          }

          // 达上限但还没采到有效餐食 -> 给引导，再给一次输入机会
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

          // 正常继续
          setTimeout(() => this.waitForUserInput(), 200);
        }
      });
    });
  }

  // 新增：处理响应错误
  async handleResponseError(response) {
    const errorMessage = response?.error || "API调用失败";
    console.error("Response error:", errorMessage);
    // Convai 出错时，逐句播放默认 intro
    await this.playNPCIntroSequence();
    // 然后直接进入食物记录
    this.proceedToMealSelection();
    return;
    // 其他阶段：沿用统一错误处理 await this.handleError(new Error(errorMessage));
  }

  // 新增：通用错误处理
  async handleError(error) {
    console.error("Dialog error:", error);

    const errorMessage =
      this.playerData.language === "zh"
        ? "抱歉，出现了一些问题。让我们继续其他话题吧。"
        : "Sorry, something went wrong. Let's continue with other topics.";

    return new Promise((resolve) => {
      this.showSingleMessage("npc", errorMessage, () => {
        if (this.dialogPhase === "continuing") {
          this.proceedToMealSelection();
        } else {
          this.dialogPhase = "completed";
        }
        resolve();
      });
    });
  }

  // 显示继续对话或跳过的选择
  showContinueOrSkipChoice() {
    this.choicePending = true;
    this.disableInputBox();

    if (this.debugMode) {
      console.log("显示继续对话或跳过按钮");
    }
    showChoiceButtons(this, {
      continue: {
        text: this.playerData.language === "zh" ? "继续聊天" : "Keep chatting",
        onClick: () => {
          if (this.debugMode) {
            console.log("用户选择继续聊天");
          }
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
          if (this.debugMode) {
            console.log("用户选择记录食物");
          }
          this.clearAllButtons();
          this.updateStatus("");
          this.choicePending = false;
          this.proceedToMealSelection();
        },
      },
    });
  }

  // 不同npc的触发短语
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

  // 添加对话到历史记录并更新显示
  addToConversationHistory(speaker, message) {
    const npc = this.npcManager.getNPCById(this.currentNPC);
    const npcName = npc ? npc.name : "NPC";

    this.conversationHistory.push({
      speaker: speaker === "npc" ? npcName : "Player",
      message: message,
      timestamp: Date.now(),
    });

    this.updateConversationDisplay();
  }

  // 更新对话框中的所有对话内容
  updateConversationDisplay() {
    let displayText = "";

    // 计算对话框的可见行数
    const lineHeight = this.isMobile ? 20 : 24;
    const dialogBoxHeight = this.isMobile ? 150 : 200;
    const maxVisibleLines = Math.floor(dialogBoxHeight / lineHeight) - 1;

    // 将所有对话合并为一个字符串，并按行分割
    let allLines = [];
    this.conversationHistory.forEach((entry, index) => {
      if (index > 0) allLines.push(""); // 空行分隔

      const speakerLine = `${entry.speaker}:`;
      allLines.push(speakerLine);

      // 将长消息按宽度分割成多行
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
        } else {
          currentLine += word + " ";
        }
      });

      if (currentLine.trim()) {
        allLines.push(currentLine.trim());
      }
    });

    // 只显示最后的几行
    const total = allLines.length;
    const maxStart = Math.max(0, total - maxVisibleLines);
    const offset = Phaser.Math.Clamp(this.scrollOffset || 0, 0, maxStart);
    const start = Math.max(0, total - maxVisibleLines - offset);
    const end = start + maxVisibleLines;
    const visibleLines = allLines.slice(start, end);
    displayText = visibleLines.join("\n");

    if (this.dialogText) {
      this.dialogText.setText(displayText);
    }

    // 添加滚动指示器
    if (allLines.length > maxVisibleLines || (this.scrollOffset || 0) > 0) {
      this.showScrollIndicator();
    } else {
      this.hideScrollIndicator();
    }
  }

  // 添加滚动指示器显示方法
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

  // 添加隐藏滚动指示器方法
  hideScrollIndicator() {
    if (this.scrollIndicator) {
      this.scrollIndicator.setVisible(false);
    }
  }

  // 显示单条消息（用于打字效果）
  // 🔑 修改 showSingleMessage 方法，使用预处理
  showSingleMessage(speaker, message, callback) {
    if (!this.sys || this.sys.isDestroyed) return;

    const npc = this.npcManager.getNPCById(this.currentNPC);
    const npcName = npc ? npc.name : "NPC";
    const displayName = speaker === "npc" ? npcName : "Player";

    // 🔑 关键：预处理文本以改善换行
    const processedMessage = this.preprocessDialogText(message);
    const fullMessage = `${displayName}: ${processedMessage}`;

    this.currentText = fullMessage;

    this.isTyping = true;
    if (this.dialogText) {
      this.dialogText.setText("");
    }
    if (this.continueHint) {
      this.continueHint.setVisible(false);
    }

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
        let currentDisplayText = fullMessage.substring(0, currentChar);

        // 🔑 清理显示文本中的零宽字符
        currentDisplayText = currentDisplayText.replace(/​/g, "");

        try {
          if (this.dialogText) this.dialogText.setText(currentDisplayText);
        } catch (_) {}

        if (currentChar >= totalChars) {
          this.isTyping = false;
          if (this.continueHint) this.continueHint.setVisible(true);
          // 添加到对话历史时使用原始消息（不含预处理标记）
          this.addToConversationHistory(speaker, message);
          if (callback) callback();
        }
      },
    });

    // 追踪定时器以便清理
    this.timers.push(typewriterTimer);
  }

  // 🔑 可选：添加CSS样式优化（如果需要更精细控制）
  addCustomTextStyles() {
    // 如果需要更精细的控制，可以考虑使用DOM元素
    const style = document.createElement("style");
    style.textContent = `
    .dialog-text {
      word-break: break-word;
      word-wrap: break-word;
      hyphens: auto;
      line-height: 1.4;
      overflow-wrap: break-word;
    }
    
    .dialog-text-mixed {
      /* 混合语言文本的特殊处理 */
      word-spacing: 0.1em;
      letter-spacing: 0.02em;
    }
  `;
    document.head.appendChild(style);
  }

  // 修改：创建输入框 - 放在底部
  createTextInput() {
    if (this.debugMode) {
      console.log("=== 创建文本输入框 ===");
      console.log("当前输入框状态:", this.textInput ? "存在" : "不存在");
      console.log("当前对话阶段:", this.dialogPhase);
    }

    // 清理现有输入框
    this.clearTextInput();

    this.textInput = document.createElement("textarea");

    // 根据对话阶段设置不同的提示文字
    if (this.dialogPhase === "continuing") {
      this.textInput.placeholder =
        this.playerData.language === "zh"
          ? "输入你想说的话..."
          : "Type what you want to say...";
    } else {
      this.textInput.placeholder =
        this.playerData.language === "zh"
          ? "描述你的餐食..."
          : "Describe your meal...";
    }

    const inputWidth = this.isMobile ? "90vw" : "min(400px, 80vw)";
    const inputHeight = this.isMobile ? "80px" : "100px";
    const fontSize = this.isMobile ? "16px" : "16px"; // 确保iOS不缩放
    const bottomPosition = this.isMobile ? "20%" : "25%"; // 放在底部

    this.textInput.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: ${bottomPosition};
      transform: translateX(-50%);
      width: ${inputWidth};
      height: ${inputHeight};
      font-size: ${fontSize};
      padding: 12px;
      border: 2px solid #4a5568;
      border-radius: 8px;
      background: #2a2a2a;
      color: #e2e8f0;
      font-family: monospace;
      resize: none;
      z-index: 1000;
      box-sizing: border-box;
    `;

    document.body.appendChild(this.textInput);

    // 修复空格问题
    this.textInputKeyDownHandler = (e) => {
      e.stopPropagation();
    };
    this.textInput.addEventListener("keydown", this.textInputKeyDownHandler);

    this.sendButton = document.createElement("button");
    this.sendButton.textContent =
      this.playerData.language === "zh" ? "发送" : "Send";

    const buttonBottom = this.isMobile ? "8%" : "12%"; // 在输入框下方
    const buttonFontSize = this.isMobile ? "14px" : "16px";
    const buttonPadding = this.isMobile ? "10px 25px" : "12px 30px";

    this.sendButton.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: ${buttonBottom};
      transform: translateX(-50%);
      padding: ${buttonPadding};
      font-size: ${buttonFontSize};
      border: none;
      border-radius: 8px;
      background: #667eea;
      color: white;
      font-family: monospace;
      cursor: pointer;
      z-index: 1000;
      touch-action: manipulation;
      transition: none; /* 移除晃动效果 */
    `;

    document.body.appendChild(this.sendButton);

    // 修复发送按钮点击事件 - 移除晃动效果
    this.sendButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (this.debugMode) {
        console.log("=== 发送按钮被点击 ===");
        console.log(
          "输入框值:",
          this.textInput ? this.textInput.value : "输入框不存在"
        );
        console.log(
          "onUserSubmit 回调:",
          this.onUserSubmit ? "存在" : "不存在"
        );
      }

      const userInput = this.textInput ? this.textInput.value.trim() : "";
      if (userInput && this.onUserSubmit) {
        if (this.debugMode) {
          console.log("准备调用 onUserSubmit，输入:", userInput);
        }
        this.onUserSubmit(userInput);
        // 清空输入框前检查是否仍然存在
        if (this.textInput) {
          this.textInput.value = "";
        }
      } else {
        if (this.debugMode) {
          console.log("未发送：", userInput ? "没有回调函数" : "输入为空");
        }
      }
    };

    // 添加 Enter 键支持
    this.textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendButton.click();
      }
    });

    if (this.isMobile) {
      this.textInput.addEventListener("focus", () => {
        setTimeout(() => {
          this.textInput.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 300);
      });
    }

    setTimeout(() => {
      if (this.textInput) {
        this.textInput.focus();
      }
    }, 100);

    if (this.debugMode) {
      console.log("文本输入框创建完成");
    }
  }

  // 获取NPC的备用问候语
  getFallbackGreeting() {
    // 复用getDefaultNPCIntro方法
    return this.getDefaultNPCIntro();
  }

  enableInputBox() {
    if (this.debugMode) {
      console.log("=== 启用输入框 ===");
      console.log("当前状态:", this.isWaitingForInput);
      console.log("当前对话阶段:", this.dialogPhase);
    }

    // 强制重置状态
    this.isWaitingForInput = true;

    // 确保输入框被创建
    this.createTextInput();
  }

  disableInputBox() {
    if (this.debugMode) {
      console.log("=== 禁用输入框 ===");
    }

    this.isWaitingForInput = false;
    this.clearTextInput();
    // 清除回调函数
    this.onUserSubmit = null;
  }

  async callConvaiAPI(userMessage) {
    if (this.debugMode) {
      console.log("=== 调用 ConvAI API ===");
      console.log("用户消息:", userMessage);
      console.log("当前NPC:", this.currentNPC);
      console.log("会话ID:", this.convaiSessionId);
    }

    this.npcMap = new Map();
    this.npcMap.set("village_head", "37c1ea8e-4aec-11f0-a14e-42010a7be01f");
    this.npcMap.set("shop_owner", "425d25d4-73a6-11f0-8dad-42010a7be01f");
    this.npcMap.set("spice_woman", "a425409e-73a6-11f0-a309-42010a7be01f");
    this.npcMap.set("restaurant_owner", "6c4ed624-4b26-11f0-854d-42010a7be01f");
    this.npcMap.set("fisherman", "2e287d62-4b28-11f0-b155-42010a7be01f");
    this.npcMap.set("old_friend", "0443174e-73a7-11f0-b26c-42010a7be01f");
    this.npcMap.set(
      "secret_apprentice",
      "a9394c0e-4d88-11f0-b18a-42010a7be01f"
    );

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

  // 修改：Gemini API调用 - 添加默认问题逻辑
  async callGeminiAPI(userInput) {
    if (this.debugMode) {
      console.log("=== 调用 Gemini API ===");
      console.log("用户输入:", userInput);
      console.log("当前问题索引:", this.currentQuestionIndex);
      console.log("已问问题:", Array.from(this.askedQuestions));
    }

    // 检查是否已完成所有问题
    if (this.currentQuestionIndex >= this.geminiQuestionOrder.length) {
      return {
        success: true,
        message:
          this.playerData.language === "zh"
            ? "谢谢你详细的分享！我已经记录下了你的餐食信息。"
            : "Thank you for sharing your meal with me! I have recorded your meal information.",
        isComplete: true,
      };
    }

    // 如果使用默认模式
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
        // 新增：提供问题控制信息
        questionControl: {
          currentQuestionIndex: this.currentQuestionIndex,
          askedQuestions: Array.from(this.askedQuestions),
          maxQuestions: this.geminiQuestionOrder.length,
        },
      };

      const response = await fetch(`${API_URL}/gemini-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // 检查响应是否包含问题推进
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

  // 新增：获取Gemini默认响应
  getGeminiDefaultResponse(userInput) {
    const language = this.playerData.language;

    // 检查是否需要时间异常问题
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

    // 默认问题序列
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

    // 所有问题都问完了，根据是否是晚餐给出不同的结束语
    const isDinner = this.selectedMealType === "dinner";
    let finalMessage;

    if (isDinner) {
      // 晚餐：给出完整线索
      finalMessage =
        language === "zh"
          ? "干得好！继续这样做。一点一点地，你会开始理解——他当时在想什么，他在隐藏什么。\n\n不需要着急。这不是你可以强迫的事情——只需要一次吃一顿饭。\n\n他经常去格蕾丝的店买食材。他和华主厨回去的路很远。也许你会从她那里得到一些见解。"
          : "Good job! Keep doing this. Little by little, you'll start to understand—what he was thinking back then, and what he was hiding.\n\nNo need to rush. This isn't something you can force—just take it one meal at a time.\n\nHe often stopped by Grace's shop for ingredients. He and Chef Hua go way back. Maybe you will get some insights from her.";
    } else {
      // 非晚餐：给出模糊提示
      const version = this.vagueCount;
      this.vagueCount = this.vagueCount === 1 ? 2 : 1; // 在1和2之间切换

      finalMessage = this.getVagueResponse(this.currentNPC, version);
    }

    return {
      success: true,
      message: finalMessage,
    };
  }

  analyzeResponseAndUpdateProgress(response, userInput) {
    const lowerResponse = response.toLowerCase();

    // 检查是否是有效的用户回答（不是问候语或无关内容）
    if (this.isValidFoodResponse(userInput)) {
      // 根据当前应该问的问题来推进
      const currentQuestion =
        this.geminiQuestionOrder[this.currentQuestionIndex];

      if (!this.askedQuestions.has(currentQuestion)) {
        this.askedQuestions.add(currentQuestion);

        // 如果回答了当前问题，推进到下一个
        if (this.responseAnswersCurrentQuestion(userInput, currentQuestion)) {
          this.currentQuestionIndex++;
          this.questionAttempts = 0;
        }
      }
    }

    // 检查响应是否包含结束标志
    if (this.detectThankYouMessage(response)) {
      this.currentQuestionIndex = this.geminiQuestionOrder.length; // 强制结束
    }
  }

  // 新增：检查是否是有效的食物相关回答
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
    ); // 避免太短的无意义回答
  }

  // 新增：检查回答是否针对当前问题
  responseAnswersCurrentQuestion(input, questionType) {
    const lowerInput = input.toLowerCase();

    switch (questionType) {
      case "Q4": // 吃了什么
        return this.isValidFoodResponse(input);
      case "Q5": // 分量和感觉
        return (
          lowerInput.includes("分量") ||
          lowerInput.includes("感觉") ||
          lowerInput.includes("portion") ||
          lowerInput.includes("feel")
        );
      case "Q6": // 选择原因
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

  // 新增：检查是否应该结束对话
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

  // 修改选择餐食方法
  async selectMeal(mealType, displayName) {
    // 清空上一餐的提交状态，确保新餐次不会被跳过
    this.mealSubmitted = false;
    this.isSubmittingMeal = false;
    this.mealSaveInProgress = false;
    this.mealSaved = false;
    this.lastRecordResult = null;
    this._submittedSet = this._submittedSet || new Set();
    this.dialogHistory = [];

    if (this.debugMode) {
      console.log("=== 选择餐食 ===");
      console.log("选择的餐食:", mealType);
      console.log("可用餐食类型:", this.availableMealTypes);
    }

    // ✅ 允许重复记录同一餐别（如果玩家想要的话）
    if (!this.availableMealTypes.includes(mealType)) {
      const lang = this.playerData?.language;
      const warning =
        lang === "zh"
          ? `${displayName}今天已记录过，确定要重新记录吗？`
          : `${displayName} already recorded today. Record again?`;

      const userConfirmed = await this.showCustomConfirm(warning);
      if (!userConfirmed) {
        return; // 用户取消
      }
    }

    // 清理餐食选择按钮
    this.clearAllButtons();

    // 记录选择的餐食
    this.selectedMealType = mealType;
    this.addToConversationHistory("player", displayName);

    // 初始化答案存储
    this.mealAnswers = {
      mealType: mealType,
    };

    // 检查用餐时间是否异常
    this.needUnusualTimeQuestion = this.checkUnusualMealTime();

    // 直接显示所有固定问题
    this.showAllFixedQuestions();
  }

  // 添加自定义确认对话框方法
  showCustomConfirm(message) {
    return new Promise((resolve) => {
      const { width, height } = this.scale;

      // 创建遮罩
      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.7);
      overlay.fillRect(0, 0, width, height);
      overlay.setDepth(200);

      // 创建对话框
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

      // 添加文本
      const text = this.add.text(width / 2, dialogY + 50, message, {
        fontSize: this.isMobile ? "14px" : "16px",
        fontFamily: "Arial, sans-serif",
        fill: "#ffffff",
        align: "center",
        wordWrap: { width: dialogWidth - 40 },
      });
      text.setOrigin(0.5);
      text.setDepth(202);

      // 添加按钮
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

      // 按钮事件
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

  // 修复 showAllFixedQuestions 方法
  showAllFixedQuestions() {
    if (this.debugMode) {
      console.log("=== 显示所有固定问题 ===", this.mealAnswers);
    }

    this.mealAnswers = this.mealAnswers || {};

    // 关键初始化：避免 undefined 报错
    this.mealAnswers = this.mealAnswers || {};
    this.mealAnswers.mealType =
      this.mealAnswers.mealType || this.selectedMealType;
    this.questionAnswers = {};
    this.questionGroups = {};

    const { width, height } = this.scale; // 🔸 添加这行

    // 清理现有按钮
    this.clearAllButtons();

    // ✅ 新增：隐藏对话框和输入框
    if (this.dialogBg) {
      this.dialogBg.setVisible(false);
    }
    if (this.dialogText) {
      this.dialogText.setVisible(false);
    }
    if (this.continueHint) {
      this.continueHint.setVisible(false);
    }
    if (this.scrollIndicatorUp) {
      this.scrollIndicatorUp.setVisible(false);
    }
    if (this.scrollIndicatorDown) {
      this.scrollIndicatorDown.setVisible(false);
    }
    this.clearTextInput(); // 确保输入框被清理

    // 计算可用空间，考虑键盘状态
    const availableHeight = this.keyboardState.isOpen
      ? this.keyboardState.currentHeight
      : height;

    // 问题和选项数据 // 🔸 添加这行
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

    // 给每个 key 先占位，后续不会出现 undefined
    questions.forEach((q) => {
      if (!this.mealAnswers[q.key]) {
        this.mealAnswers[q.key] = { text: null, index: null };
      }
    });

    this.fixedQuestionButtons = [];

    // ✅ 修改：优化布局，确保所有内容都可见
    const topMargin = 50; // 减少顶部边距
    const bottomMargin = 100; // 为提交按钮留出空间
    const questionsHeight = availableHeight - topMargin - bottomMargin;

    let currentY = topMargin; // 🔸 添加这行
    const questionSpacing = Math.min(
      (questionsHeight / questions.length) * 0.85,
      140
    ); // 动态计算间距
    const optionSpacing = Math.min(questionSpacing / 6, 30); // 动态选项间距
    const fontSize = this.isMobile ? "11px" : "13px"; // 减小字体
    const titleFontSize = this.isMobile ? "13px" : "15px";

    questions.forEach((question, qIndex) => {
      const groupKey = question.key;
      this.questionGroups[groupKey] = [];

      // 问题标题
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

      currentY += 30; // 标题和选项间距

      // 选项
      question.options.forEach((option, oIndex) => {
        const button = this.add.text(width / 2, currentY, option, {
          fontSize: fontSize,
          fontFamily: "monospace",
          fill: "#e2e8f0",
          backgroundColor: "#4a5568",
          padding: { x: 12, y: 6 }, // 减小内边距
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

      currentY += questionSpacing - question.options.length * optionSpacing; // 问题间的额外间距
    });

    // 提交按钮 - 确保在可见区域内
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

  // 选择固定问题的答案
  selectFixedQuestionAnswer(questionKey, answer, answerIndex, questionIndex) {
    this.questionGroups = this.questionGroups || {};
    this.questionGroups[questionKey] = this.questionGroups[questionKey] || [];
    this.mealAnswers = this.mealAnswers || {};

    if (this.debugMode) {
      console.log("=== 选择固定问题答案 ===");
      console.log("问题:", questionKey, "答案:", answer);
    }

    // 存储答案
    this.questionAnswers[questionKey] = { text: answer, index: answerIndex };
    this.mealAnswers[questionKey] = { text: answer, index: answerIndex };

    // 添加到对话历史
    this.addToConversationHistory("player", answer);

    // 仅更新当前题组的按钮状态（修复互相"打架"）
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

    // 检查是否所有问题都已回答
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

  // 提交所有固定问题的答案
  async submitAllFixedAnswers() {
    if (this.debugMode) {
      console.log("=== 提交所有固定答案 ===");
      console.log("所有答案:", this.mealAnswers);
    }

    // 清理固定问题界面
    this.clearAllButtons();

    // ✅ 新增：恢复对话框和输入框的显示
    if (this.dialogBg) {
      this.dialogBg.setVisible(true);
    }
    if (this.dialogText) {
      this.dialogText.setVisible(true);
    }
    if (this.continueHint) {
      this.continueHint.setVisible(true);
    }

    // 开始 Gemini 对话
    this.startGeminiChat();
  }

  // 1. 修改结束消息检测方法
  detectThankYouMessage(text) {
    const lowerText = text.toLowerCase();
    console.log("检测结束消息:", lowerText);
    if (/\?\s*$/.test(lowerText)) return false;
    return (
      // Gemini 系统提示词中的准确结束语
      lowerText.includes("thanks for sharing your meal with me") ||
      lowerText.includes("thank you for sharing your meal with me") ||
      // 中文版本
      lowerText.includes("谢谢你分享你的餐食") ||
      lowerText.includes("谢谢你与我分享餐食") ||
      // 其他可能的结束模式
      lowerText.includes("good job! keep doing this") ||
      lowerText.includes("little by little, you'll start to understand") ||
      lowerText.includes("no need to rush") ||
      lowerText.includes("take it one meal at a time") ||
      // 添加更通用的结束检测
      (lowerText.includes("thanks") && lowerText.includes("meal")) ||
      (lowerText.includes("thank you") && lowerText.includes("sharing"))
    );
  }

  clearTextInput() {
    if (this.debugMode) {
      console.log("=== 清理文本输入框 ===");
      console.log("输入框存在:", this.textInput ? "是" : "否");
      console.log("发送按钮存在:", this.sendButton ? "是" : "否");
    }

    if (this.textInput) {
      if (this.textInputKeyDownHandler) {
        this.textInput.removeEventListener(
          "keydown",
          this.textInputKeyDownHandler
        );
        this.textInputKeyDownHandler = null;
      }
      if (this.textInput.parentNode) {
        this.textInput.parentNode.removeChild(this.textInput);
      }
      this.textInput = null;
    }

    if (this.sendButton) {
      this.sendButton.onclick = null;
      if (this.sendButton.parentNode) {
        this.sendButton.parentNode.removeChild(this.sendButton);
      }
      this.sendButton = null;
    }

    // 清除回调函数
    this.onUserSubmit = null;

    if (this.debugMode) {
      console.log("文本输入框清理完成");
    }
  }
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

    // 弹入动画
    this.tweens.add({
      targets: notification,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.5, to: 1.1 },
      scaleY: { from: 0.5, to: 1.1 },
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        // 缩回正常大小
        this.tweens.add({
          targets: notification,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: "Power2",
          onComplete: () => {
            // 延迟后淡出
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

  // 添加线索到NPC管理器时确保使用当前语言
  async handleMealCompletion(
    recordResult = { success: true, shouldGiveClue: false }
  ) {
    try {
      if (this.debugMode) {
        console.log("记录结果:", recordResult);
      }
      if (!recordResult.success) {
        throw new Error(recordResult.error || "Failed to record meal");
      }

      // 🔑 关键修改：如果有线索，立即显示而不是等待消息显示完成
      if (recordResult.shouldGiveClue) {
        // 立即添加线索到本地和UI
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

        // 🔑 立即添加线索，不等待消息显示
        this.npcManager.addClue(
          this.currentNPC,
          clueText,
          this.npcManager.getCurrentDay(),
          stage
        );

        // 🔑 立即显示线索获得通知
        this.showClueObtainedNotification();

        // 显示NPC消息
        this.showSingleMessage("npc", clueText, async () => {
          this.dialogPhase = "completed";

          // 仅晚餐（stage=3）才标记 NPC 交互完成
          if (stage === 3) {
            await this.npcManager.completeNPCInteraction(this.currentNPC);
            this.npcManager.checkAndUpdateCurrentDay?.();
          }

          // 通知主场景刷新
          this.notifyMealRecorded();
          this.showDoneButtons();
        });

        return;
      }

      // 不给线索的普通结束
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

  notifyMealRecorded() {
    // 只通知场景记录了餐食，不再添加线索
    if (this.mainScene.onMealRecorded) {
      this.mainScene.onMealRecorded();
    }
  }

  extractMealContentFromHistory() {
    // 提取用户在Gemini对话阶段的所有输入
    const mealPhaseHistory = this.dialogHistory.filter(
      (entry) =>
        entry.type === "user" &&
        // 过滤掉固定问题的答案和初始设置
        !this.isFixedQuestionAnswer(entry.content)
    );

    // 将用户的餐食描述合并
    const mealDescriptions = mealPhaseHistory.map((entry) => entry.content);
    return mealDescriptions.join(" ");
  }

  // 新增：判断是否是固定问题的答案
  isFixedQuestionAnswer(content) {
    const en = [
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
    ];
    const zh = [
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

    return [...en, ...zh].some((a) => content.includes(a));
  }

  // 标记NPC完成交互
  markNPCCompleted() {
    // 添加线索到UI管理器
    if (this.mainScene && this.mainScene.uiManager) {
      const npc = this.npcManager.getNPCById(this.currentNPC);
      const clueText = this.getClueForNPC(this.currentNPC);
      const clueShort = this.extractClueKeywords(clueText);

      this.mainScene.uiManager.addClue({
        npcName: npc ? npc.name : "Unknown NPC",
        clue: clueShort,
        day: this.npcManager.getCurrentDay(),
      });
    }

    // 通知场景记录了餐食
    if (this.mainScene.onMealRecorded) {
      this.mainScene.onMealRecorded();
    }
  }

  // 3. New method to check if this is first interaction with NPC
  checkIfFirstInteraction() {
    // This should check your game state/save data
    // For now, return true as placeholder - implement based on your save system
    if (this.npcManager && this.npcManager.hasInteractedWith) {
      return !this.npcManager.hasInteractedWith(this.currentNPC);
    }
    return true; // Default to first interaction
  }

  // 4. Get vague dialog from frontend (no backend call)
  getVagueDialogFromFrontend(npcId) {
    const language = this.playerData.language;

    const npcVagueResponses = {
      village_head: {
        zh: "你记录得很用心。不过，我觉得你师父更喜欢听晚餐的故事。也许你可以晚上再来和我聊聊？",
        en: "You're recording very thoughtfully. But I think your master preferred hearing dinner stories. Maybe you could come back in the evening to chat with me?",
      },
      shop_owner: {
        zh: "嗯，这个记录不错。不过你师父总是说，晚餐时的回忆最深刻。要不你今天晚餐后再来？",
        en: "Hmm, this record is good. But your master always said dinner memories are the deepest. Why don't you come back after dinner today?",
      },
      spice_woman: {
        zh: "香料的秘密，往往在夜幕降临时才会显现。晚餐时分，再来找我吧。",
        en: "The secrets of spices often reveal themselves when night falls. Come find me at dinner time.",
      },
      restaurant_owner: {
        zh: "作为厨师，我最看重的是晚餐时光。那时候的味觉最敏锐。今晚再来吧。",
        en: "As a chef, I value dinner time the most. That's when taste buds are sharpest. Come back tonight.",
      },
      fisherman: {
        zh: "渔人最懂得等待的艺术。耐心等到晚餐时分，我们再好好聊聊。",
        en: "Fishermen understand the art of waiting. Wait patiently until dinner time, then we'll have a good chat.",
      },
      old_friend: {
        zh: "老朋友之间的深谈，总是在晚餐时最有意义。今晚见？",
        en: "Deep conversations between old friends are always most meaningful at dinner. See you tonight?",
      },
      secret_apprentice: {
        zh: "师父说过，最重要的话要在一天结束时说。晚餐后，我会告诉你更多。",
        en: "Master said the most important words should be spoken at day's end. After dinner, I'll tell you more.",
      },
    };

    const responses = npcVagueResponses[npcId];
    if (!responses) {
      return language === "zh"
        ? "记录得不错。不过晚餐时分再来，我可能会有更多话要说。"
        : "Good record. But come back at dinner time, I might have more to say.";
    }

    return responses[language] || responses.en;
  }

  extractClueKeywords(fullClue) {
    // 简化版关键词提取
    //
    const sentences = fullClue.split(/[.。]/);
    return sentences[0] + "...";
  }

  // 获取线索的方法 - 确保根据当前语言返回正确的线索
  getClueForNPC(npcId) {
    const language = this.playerData.language;

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
        zh: "他说——'要不是那个人把它弄俗了'，他都不想再碰青木籽。你知道他说的是谁吗？\n\n我看得出来，他心里有很深的怨恨。那种表情...就像是被最信任的人背叛了一样。\n\n他提到了河边的那家餐厅。说那里有他要找的答案。去看看吧，也许华主厨知道些什么。",
        en: "He said—'If it weren't for that person making it vulgar', he wouldn't want to touch greenwood seeds again. Do you know who he was talking about?\n\nI could see deep resentment in his heart. That expression... like being betrayed by someone he trusted most.\n\nHe mentioned the restaurant by the river. Said there were answers he was looking for. Go take a look, maybe Chef Hua knows something.",
      },
      restaurant_owner: {
        zh: "有一锅粥，他始终没让我碰。说什么得亲自守着火慢慢熬着。'云头鲤'。\n\n他做的时候眼神很奇怪，既专注又痛苦。我问他这道菜有什么特别，他说：'这是我欠某人的。'\n\n后来他提到了河边的渔夫老刘。说只有他知道最好的云头鲤在哪里能找到。也许你该去问问他。",
        en: "There was one pot—congee with Yunhead Carp. He never let me touch it. Had to be slow cooked. Alone. By the river.\n\nHis expression was strange when he made it, both focused and pained. When I asked what was special about this dish, he said: 'This is what I owe someone.'\n\nLater he mentioned Old Liu, the fisherman by the river. Said only he knew where to find the best Yunhead Carp. Maybe you should go ask him.",
      },
      fisherman: {
        zh: "你师父……他那天，在那块老礁石边，煮了一锅鱼粥。一锅白，一锅清。没叫我尝，就说了句：'等潮涨再开。'\n\n我看他把什么东西放进了那锅清粥里，然后就一直盯着水面发呆。等我再看时，他已经把两锅粥都倒进了河里。\n\n他说他有个老朋友，住在村子里。也许那个人知道他在想什么。去找找看吧。",
        en: "Your master... that day, by the old rocks, he made two pots of fish congee. One milky, one clear. He didn't let me taste a drop. Just said: 'Open it when the tide comes in.'\n\nI saw him put something into that clear congee, then he just stared at the water surface in a daze. When I looked again, he had poured both pots into the river.\n\nHe said he had an old friend living in the village. Maybe that person knows what he was thinking. Go look for them.",
      },
      old_friend: {
        zh: "师父从小不喜欢我你了解的，自然什么都不会和我说。但是念念，他最近收了一个孩子叫念念。住在村尾的阁楼。\n\n那孩子很聪明，师父教了他很多东西。我觉得如果有人知道师父在想什么，那一定是念念。\n\n但是要小心，那孩子对陌生人很警惕。你需要证明你真的是师父的徒弟才行。",
        en: "Master never liked me since childhood, naturally he wouldn't tell me anything. But about NianNian, he recently took in a child called NianNian. Lives in the attic at the end of the village.\n\nThat child is very smart, Master taught him many things. I think if anyone knows what Master was thinking, it must be NianNian.\n\nBut be careful, that child is very wary of strangers. You need to prove you're really Master's apprentice.",
      },
      secret_apprentice: {
        zh: "他把最后一页藏在他'最常回头看的地方'。不是厨房，也不是餐馆。是他写下第一道菜的地方！在阁楼上那道木梁上。\n\n他说过，如果有一天他不在了，那一页纸会告诉你一切的真相。包括他为什么要离开，包括他一直在寻找的那个人。\n\n但是师父也说了，只有真正理解他的人才能找到那张纸。你准备好了吗？",
        en: "He hid the last page in the place he 'most often looked back at'. Not the kitchen, not the restaurant. The place where he wrote his first recipe! On the wooden beam in the attic.\n\nHe said if one day he wasn't there, that page would tell you the whole truth. Including why he had to leave, including the person he's been searching for.\n\nBut Master also said only someone who truly understands him can find that paper. Are you ready?",
      },
    };

    const clue = clues[npcId];
    if (!clue) {
      const defaultClue = {
        zh: "很抱歉，我没有关于这个人的更多信息。",
        en: "I'm sorry, I don't have more information about this person.",
      };
      return defaultClue[language] || defaultClue.en;
    }

    return clue[language] || clue.en;
  }

  getVagueResponse(npcId, version = 1) {
    const language = this.playerData.language;

    // NPC-specific vague responses
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
      // 可以为其他 NPC 添加更多响应
    };

    const npcResponses = npcVagueResponses[npcId];
    if (!npcResponses) {
      // 默认回复
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

  shutdown() {
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

  startGeminiChat() {
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
    this.maxGeminiTurns = MAX_TURNS_MEAL;
    this.useGeminiDefault = false; // 默认先尝试API
    this.geminiQuestionIndex = 0;

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
      const mealContent = this.extractMealContentFromHistory();

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
    const mealTime = this.mealAnswers.mealTime;
    const mealType = this.selectedMealType.toLowerCase();

    if (!mealTime || typeof mealTime.index !== "number") {
      return false;
    }

    const timeIndex = mealTime.index; // 0-5 对应 A-F 选项

    // 定义正常时间范围（按选项索引）
    const normalTimes = {
      breakfast: [1], // B. Morning (7:00—11:00 AM)
      lunch: [2, 3], // C. Midday (11:00 AM—2:00 PM), D. Afternoon (2:00—5:00 PM)
      dinner: [4, 5], // E. Evening (5:00—9:00 PM), F. Night (after 9:00 PM)
    };

    const normalTimeRange = normalTimes[mealType];

    if (!normalTimeRange) {
      return false;
    }

    // 如果用餐时间不在正常范围内，则需要询问原因
    return !normalTimeRange.includes(timeIndex);
  }
}
