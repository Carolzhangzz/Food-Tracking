// DialogScene.js - 调试和修复版本
import Phaser from "phaser";
import npc1bg from "../assets/npc/npc1bg.png";
import npc2bg from "../assets/npc/npc2bg.png";
import npc3bg from "../assets/npc/npc3bg.png";
import npc4bg from "../assets/npc/npc4bg.png";
import npc5bg from "../assets/npc/npc5bg.png";
import npc6bg from "../assets/npc/npc6bg.png";
import npc7bg from "../assets/npc/npc7bg.png";
import {
  createDialogBox,
  createReturnButton,
  showChoiceButtons,
} from "./DialogUI.js";
// import { updateProgress } from "./UIManager.js";
const API_URL = process.env.REACT_APP_API_URL;
const bgMap = {
  npc1bg,
  npc2bg,
  npc3bg,
  npc4bg,
  npc5bg,
  npc6bg,
  npc7bg
};

export default class DialogScene extends Phaser.Scene {
  constructor() {
    super({ key: "DialogScene" });
    this.currentNPC = null;
    this.npcManager = null;
    this.isTyping = false;
    this.currentDialogState = "waiting_for_api";
    this.mealType = null;
    this.mealRecorded = false;
    this.dialogHistory = [];
    this.currentText = "";
    this.isMobile = false;
    this.vagueCount = 1;
    this.conversationHistory = [];

    // 对话状态管理
    this.dialogPhase = "initial"; // initial, continuing, meal_selection, completed
    this.canSkipToMeal = false;
    this.dialogTurnCount = 0;
    this.maxDialogTurns = 5;
    this.fixedQuestionPhase = "meal_type";
    this.mealAnswers = {};
    this.currentQuestionIndex = 0;

    // 新增：资源清理追踪
    this.timers = [];
    this.eventListeners = [];

    // 添加调试标志
    this.debugMode = true;
    //添加动态按钮数组
    this.dynamicButtons = [];
  }

  init(data) {
    this.currentNPC = data.npcId;
    this.npcManager = data.npcManager;
    this.playerData = data.playerData;
    this.mainScene = data.mainScene;
    this.convaiSessionId = "-1";

    // 检测是否为移动端
    this.isMobile = this.scale.width < 768;

    if (this.debugMode) {
      console.log("=== DialogScene初始化 ===");
      console.log("当前NPC:", this.currentNPC);
      console.log("玩家数据:", this.playerData);
    }
  }

  preload() {
    const npc = this.npcManager.getNPCById(this.currentNPC);
    const imageName = {
      npc1bg: npc1bg,
    };
    if (npc?.backgroundKey) {
      const backgroundPath = imageName[npc.backgroundKey];
      console.log(`Attempting to load background: ${backgroundPath}`);
      this.load.image(npc.backgroundKey, backgroundPath);
    }

    this.load.on("complete", () => {
      console.log("Preload complete, proceeding with dialog");
    });

Object.entries(bgMap).forEach(([key, url]) => {
    this.load.image(key, url);
  });

  this.load.on("complete", () => {
    console.log("DialogScene preload 完成，所有背景已加载");
  });

  }

  create() {
    this.setupBackground();
    this.setupUI();
    this.setupControls();
    this.startConversation();
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

    createDialogBox(this);
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

  setupControls() {
    // 点击屏幕继续对话 - 移动端优化触摸区域
    const pointerHandler = (pointer) => {
      const topAreaHeight = this.isMobile
        ? this.scale.height * 0.25
        : this.scale.height * 0.15;
      if (pointer.y > topAreaHeight && !this.isWaitingForInput) {
        this.handleContinue();
      }
    };

    this.input.on("pointerdown", pointerHandler);
    this.eventListeners.push({ event: "pointerdown", handler: pointerHandler });

    // 键盘支持
    const keyHandler = () => {
      if (!this.isWaitingForInput) {
        this.handleContinue();
      }
    };

    this.input.keyboard.on("keydown-SPACE", keyHandler);
    this.eventListeners.push({ event: "keydown-SPACE", handler: keyHandler });

    // 滚动控制
    this.scrollOffset = 0;

    // 鼠标滚轮支持
    const wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
      if (this.conversationHistory.length > 0) {
        this.scrollOffset += deltaY > 0 ? 1 : -1;
        this.scrollOffset = Phaser.Math.Clamp(
          this.scrollOffset,
          0,
          Math.max(0, this.conversationHistory.length - 4)
        );
        this.updateConversationDisplay();
      }
    };

    this.input.on("wheel", wheelHandler);
    this.eventListeners.push({ event: "wheel", handler: wheelHandler });

    // 触摸滑动支持（移动端）
    if (this.isMobile) {
      let startY = 0;
      let isDragging = false;

      const pointerDownHandler = (pointer) => {
        startY = pointer.y;
        isDragging = true;
      };

      const pointerMoveHandler = (pointer) => {
        if (isDragging && this.conversationHistory.length > 0) {
          const deltaY = pointer.y - startY;
          if (Math.abs(deltaY) > 20) {
            this.scrollOffset += deltaY > 0 ? -1 : 1;
            this.scrollOffset = Phaser.Math.Clamp(
              this.scrollOffset,
              0,
              Math.max(0, this.conversationHistory.length - 4)
            );
            this.updateConversationDisplay();
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

  // 改进的Continue处理逻辑
  handleContinue() {
    if (this.isTyping) return;

    switch (this.dialogPhase) {
      case "initial":
        // 初始状态，不做任何处理
        break;
      case "continuing":
        // 继续对话状态，检查是否需要显示跳过选项
        this.checkForSkipOption();
        break;
      case "meal_selection":
        // 已经在食物选择阶段，不需要继续
        break;
      case "completed":
        // 对话已完成
        break;
    }
  }

  // 检查是否显示跳过到食物选择的选项
  checkForSkipOption() {
    if (this.dialogTurnCount >= 3 || this.canSkipToMeal) {
      this.showSkipToMealOption();
    }
  }

  // 显示跳过到食物选择的选项
  showSkipToMealOption() {
    showChoiceButtons(this, {
      continue: {
        text:
          this.playerData.language === "zh" ? "继续对话" : "Continue talking",
        onClick: () => {
          // hideChoiceButtons();
          this.waitForUserInput();
        },
      },
      skipToMeal: {
        text:
          this.playerData.language === "zh"
            ? "开始记录食物"
            : "Start recording meal",
        onClick: () => {
          // hideChoiceButtons();
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

    // 延迟显示餐食选择，确保界面清理完成
    setTimeout(() => {
      this.showMealSelectionButtons();
    }, 200);
  }

  // 显示餐食选择按钮
  showMealSelectionButtons() {
    // 额外彻底清理所有残留按钮
    this.children.list.forEach((child) => {
      if (child.type === Phaser.GameObjects.Text && child.input?.enabled) {
        child.destroy();
      }
    });

    if (this.debugMode) {
      console.log("=== 显示餐食选择按钮 ===");
    }

    const { width, height } = this.scale;
    const meals = ["Breakfast", "Lunch", "Dinner"];

    this.mealButtons = [];

    const startY = this.isMobile ? height * 0.3 : height * 0.35;
    const buttonSpacing = this.isMobile ? 60 : 80;
    const fontSize = this.isMobile ? "16px" : "20px";
    const padding = this.isMobile ? { x: 20, y: 12 } : { x: 30, y: 15 };

    // 显示提示文本
    const questionText = this.add.text(
      width / 2,
      startY - 80,
      "Which meal do you want to record?",
      {
        fontSize: this.isMobile ? "16px" : "18px",
        fontFamily: "monospace",
        fill: "#e2e8f0",
        align: "center",
      }
    );
    questionText.setOrigin(0.5);
    questionText.setDepth(20);

    meals.forEach((meal, index) => {
      const buttonY = startY + index * buttonSpacing;
      const button = this.add.text(width / 2, buttonY, meal, {
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
          console.log("选择餐食:", meal);
        }
        this.selectMeal(meal);
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

  // 改进的开始对话逻辑
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
      console.error("Error starting conversation:", error);
      const fallbackGreeting = this.getFallbackGreeting();
      this.showSingleMessage("npc", fallbackGreeting, () => {
        this.dialogPhase = "initial";
        this.updateStatus("");
        this.showInitialChoices();
      });
    }
  }

  //  showChoiceButtons(scene, options) {
  //   const { width, height } = scene.scale;
  //   const isMobile = scene.isMobile;
  //   const fontSize = isMobile ? "14px" : "18px";
  //   const startY = isMobile ? height * 0.3 : height * 0.4;
  //   const spacing = isMobile ? 60 : 70;

  //   scene.choiceButtons = [];

  //   Object.keys(options).forEach((key, index) => {
  //     const opt = options[key];
  //     const y = startY + index * spacing;

  //     const btn = scene.add.text(width / 2, y, opt.text, {
  //       fontSize,
  //       fontFamily: "monospace",
  //       fill: "#e2e8f0",
  //       backgroundColor: "#4a5568",
  //       padding: { x: 16, y: 10 },
  //       align: "center",
  //     });
  //     // 把创建的按钮放入数组
  //     scene.dynamicButtons.push(btn);

  //     btn.setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(30);
  //     btn.on("pointerdown", opt.onClick);
  //     btn.on("pointerover", () => btn.setTint(0x667eea));
  //     btn.on("pointerout", () => btn.clearTint());

  //     scene.choiceButtons.push(btn);
  //   });
  // }

  // 显示初始选择按钮
  showInitialChoices() {
    showChoiceButtons(this, {
      continue: {
        text: this.playerData.language === "zh" ? "闲聊" : "Chatting",
        onClick: () => {
          // hideChoiceButtons();
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
    this.dialogTurnCount = 0; // 重置对话轮数
    this.canSkipToMeal = false; // 重置跳过标志
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

  // 用户输入处理
  async handleUserInput(input) {
    if (this.debugMode) {
      console.log("=== 处理用户输入开始 ===");
      console.log("输入内容:", input);
      console.log("当前对话阶段:", this.dialogPhase);
    }

    // 立即清理输入框，避免重复提交，但不要立即设置 isWaitingForInput = false
    this.clearTextInput();

    this.dialogTurnCount++;

    console.log("=== 对话调试信息 ===");
    console.log("当前对话阶段:", this.dialogPhase);
    console.log("对话轮数:", this.dialogTurnCount);
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
          if (this.debugMode) {
            console.log("调用 ConvAI API");
          }
          response = await this.callConvaiAPI(input);
          break;
        case "meal_recording":
          if (this.debugMode) {
            console.log("调用 Groq API");
          }
          response = await this.callGroqAPI(input);
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

  // 新增：处理成功响应
  async processResponse(response) {
    return new Promise((resolve) => {
      this.showSingleMessage("npc", response.message, () => {
        if (this.debugMode) {
          console.log("=== 响应处理完成 ===");
          console.log("当前阶段:", this.dialogPhase);
          console.log(
            "检查结束消息:",
            this.detectThankYouMessage(response.message)
          );
        }

        if (this.dialogPhase === "continuing") {
          // 检查是否有触发短语（优先级最高）
          if (this.checkForTriggerPhrase(response.message)) {
            console.log("检测到触发短语，直接进入食物选择");
            this.proceedToMealSelection();
          }
          // 第4次对话后自动跳转
          else if (this.dialogTurnCount >= 4) {
            console.log("对话轮数>=4，自动进入食物选择");
            this.proceedToMealSelection();
          }
          // 第2次对话后显示选择按钮
          else if (this.dialogTurnCount >= 2) {
            console.log("对话轮数>=2，显示继续/跳过选择按钮");
            this.showContinueOrSkipChoice();
          }
          // 第1次对话后继续等待输入
          else {
            console.log("继续下一轮对话（轮数:", this.dialogTurnCount, "）");
            setTimeout(() => {
              this.waitForUserInput();
            }, 500);
          }
        } else if (this.dialogPhase === "meal_recording") {
          // Check if this is the end of Groq conversation
          if (this.detectThankYouMessage(response.message)) {
            console.log("检测到Groq对话结束消息，准备获取线索/模糊回复");
            this.mealRecorded = true;
            this.currentDialogState = "completion_check";
            this.dialogPhase = "completed";
            // 处理餐食完成逻辑
            this.handleMealCompletion();
          } else {
            console.log("继续Groq食物记录对话");
            setTimeout(() => {
              this.waitForUserInput();
            }, 500);
          }
        }
        resolve();
      });
    });
  }

  // 新增：处理响应错误
  async handleResponseError(response) {
    const errorMessage = response?.error || "API调用失败";
    console.error("Response error:", errorMessage);

    if (this.dialogPhase === "continuing") {
      const fallbackMessage =
        this.playerData.language === "zh"
          ? "让我们开始记录你的食物吧。"
          : "Let's start recording your meal.";

      return new Promise((resolve) => {
        this.showSingleMessage("npc", fallbackMessage, () => {
          this.proceedToMealSelection();
          resolve();
        });
      });
    } else {
      await this.handleError(new Error(errorMessage));
    }
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
    //使用creatd button的方法来创建这两个按钮
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
          // hideChoiceButtons();
          this.updateStatus("");
          // 继续聊天，等待下一轮输入
          this.waitForUserInput();
        },
      },
      record: {
        text: this.playerData.language === "zh" ? "记录食物" : "Record meal",
        onClick: () => {
          if (this.debugMode) {
            console.log("用户选择记录食物");
          }
          // hideChoiceButtons();
          this.updateStatus("");
          // 跳转到食物选择
          this.proceedToMealSelection();
        },
      },
    });
  }

  // 检查触发短语
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
    const visibleLines = allLines.slice(-maxVisibleLines);
    displayText = visibleLines.join("\n");

    if (this.dialogText) {
      this.dialogText.setText(displayText);
    }

    // 添加滚动指示器
    if (allLines.length > maxVisibleLines) {
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
  showSingleMessage(speaker, message, callback) {
    const npc = this.npcManager.getNPCById(this.currentNPC);
    const npcName = npc ? npc.name : "NPC";
    const displayName = speaker === "npc" ? npcName : "Player";

    const fullMessage = `${displayName}: ${message}`;
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
        currentChar++;
        const currentDisplayText = fullMessage.substring(0, currentChar);
        if (this.dialogText) {
          this.dialogText.setText(currentDisplayText);
        }

        if (currentChar >= totalChars) {
          this.isTyping = false;
          if (this.continueHint) {
            this.continueHint.setVisible(true);
          }

          // 打字完成后添加到历史记录
          this.addToConversationHistory(speaker, message);

          if (callback) callback();
        }
      },
    });

    // 追踪定时器以便清理
    this.timers.push(typewriterTimer);
  }

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
    const inputHeight = this.isMobile ? "100px" : "120px";
    const fontSize = this.isMobile ? "14px" : "16px";
    const topPosition = this.isMobile ? "40%" : "60%";

    this.textInput.style.cssText = `
      position: fixed;
      left: 50%;
      top: ${topPosition};
      transform: translate(-50%, -50%);
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

    const buttonTop = this.isMobile ? "55%" : "70%";
    const buttonFontSize = this.isMobile ? "14px" : "16px";
    const buttonPadding = this.isMobile ? "10px 25px" : "12px 30px";

    this.sendButton.style.cssText = `
      position: fixed;
      left: 50%;
      top: ${buttonTop};
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
    `;

    document.body.appendChild(this.sendButton);

    // 修复发送按钮点击事件
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
    const npcGreetings = {
      village_head: {
        zh: "你总算回来了……你师傅，他出事了。我相信你能找出真相。",
        en: `Three days ago, he left the village without a word.
The fire in his kitchen was still warm—but he was gone.
You know as well as I do... he was never the type to vanish without a reason. He barely ever left the village.
You were once his apprentice. If anyone can figure out what happened to him... it's you.
But this search—it's not just about turning over kitchen drawers.
Not long ago, he always carried a notebook whenever he met someone.
Maybe by following his method, you'll understand how he thinks.
I believe those records hold the key.`,
      },
    };

    const greeting = npcGreetings[this.currentNPC];
    return greeting
      ? greeting[this.playerData.language] || greeting.en
      : "Hello...";
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

    // if (this.debugMode) {
    //   console.log("输入框已启用，等待输入状态:", this.isWaitingForInput);
    //   console.log("输入框是否存在:", this.textInput ? "是" : "否");
    //   console.log("发送按钮是否存在:", this.sendButton ? "是" : "否");
    // }
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
        this.npcMap.set("village_head", "d38ecac8-5c6b-11f0-946c-42010a7be01f");
        this.npcMap.set("shop_owner", "abc123-shop-owner-id");
        this.npcMap.set("spice_woman", "abc456-spice-woman-id");
        this.npcMap.set("restaurant_owner", "abc456-restaurant-owner-id");
        this.npcMap.set("fisherman", "abc456-fisherman-id");
        this.npcMap.set("old_friend", "abc456-old-friend-id");
        this.npcMap.set("secret_apprentice", "abc456-secret-apprentice-id");


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

  // 调用Groq API处理用户输入
  async callGroqAPI(userInput) {
    if (this.debugMode) {
      console.log("=== 调用 Groq API ===");
      console.log("用户输入:", userInput);
      console.log("当前NPC:", this.currentNPC);
      console.log("餐食类型:", this.selectedMealType);
    }

    try {
      const requestBody = {
        userInput: userInput,
        npcId: this.currentNPC,
        mealType: this.selectedMealType,
        mealAnswers: this.mealAnswers,
        dialogHistory: this.dialogHistory,
      };

      if (this.debugMode) {
        console.log("Groq 请求体:", requestBody);
      }

      const response = await fetch(`${API_URL}/groq-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (this.debugMode) {
        console.log("Groq 响应数据:", data);
      }

      if (data.success) {
        return {
          success: true,
          message: data.message,
        };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error calling Groq API:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async selectMeal(meal) {
    if (this.debugMode) {
      console.log("=== 选择餐食 ===");
      console.log("选择的餐食:", meal);
    }

    // 清理餐食选择按钮
    this.clearAllButtons();

    // 记录选择的餐食
    this.selectedMealType = meal.toLowerCase();
    this.addToConversationHistory("player", meal);

    // 初始化答案存储
    this.mealAnswers = {
      mealType: meal,
    };

    // 直接显示所有固定问题
    this.showAllFixedQuestions();
  }

  // 显示所有固定问题（一次性显示）
  showAllFixedQuestions() {
    if (this.debugMode) {
      console.log("=== 显示所有固定问题 ===");
    }

    const { width, height } = this.scale;

    // 清理现有按钮
    this.clearAllButtons();

    // 问题和选项数据
    const questions = [
      {
        title: "1. How is your meal obtained?",
        options: [
          "A. Home-cooked meals",
          "B. Eat out at restaurants",
          "C. Takeout or delivery",
          "D. Ready-to-eat meals",
        ],
        key: "obtainMethod",
      },
      {
        title: "2. What time did you have this meal?",
        options: [
          "A. Early morning (before 7:00 AM)",
          "B. Morning (7:00–11:00 AM)",
          "C. Midday (11:00 AM–2:00 PM)",
          "D. Afternoon (2:00–5:00 PM)",
          "E. Evening (5:00–9:00 PM)",
          "F. Night (after 9:00 PM)",
        ],
        key: "mealTime",
      },
      {
        title: "3. How long did you eat?",
        options: [
          "A. Less than 10 minutes",
          "B. 10–30 minutes",
          "C. 30–60 minutes",
          "D. More than 60 minutes",
        ],
        key: "duration",
      },
    ];

    this.fixedQuestionButtons = [];
    this.questionAnswers = {}; // 存储每个问题的答案

    let currentY = this.isMobile ? height * 0.1 : height * 0.15;
    const questionSpacing = this.isMobile ? 120 : 150;
    const optionSpacing = this.isMobile ? 25 : 30;
    const fontSize = this.isMobile ? "11px" : "13px";
    const titleFontSize = this.isMobile ? "13px" : "15px";

    questions.forEach((question, qIndex) => {
      // 显示问题标题
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

      currentY += 35;

      // 显示选项按钮
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

        button.on("pointerover", () => {
          button.setTint(0x667eea);
        });

        button.on("pointerout", () => {
          button.clearTint();
        });

        this.fixedQuestionButtons.push(button);
        currentY += optionSpacing;
      });

      currentY += questionSpacing - question.options.length * optionSpacing;
    });

    // 添加提交按钮（初始隐藏）
    this.submitButton = this.add.text(
      width / 2,
      currentY + 30,
      "Submit All Answers",
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
    this.submitButton.on("pointerdown", () => {
      this.submitAllFixedAnswers();
    });

    this.submitButton.on("pointerover", () => {
      this.submitButton.setTint(0x059669);
    });

    this.submitButton.on("pointerout", () => {
      this.submitButton.clearTint();
    });

    this.fixedQuestionButtons.push(this.submitButton);
  }

  // 选择固定问题的答案
  selectFixedQuestionAnswer(questionKey, answer, answerIndex, questionIndex) {
    if (this.debugMode) {
      console.log("=== 选择固定问题答案 ===");
      console.log("问题:", questionKey, "答案:", answer);
    }

    // 存储答案
    this.questionAnswers[questionKey] = { text: answer, index: answerIndex };
    this.mealAnswers[questionKey] = { text: answer, index: answerIndex };

    // 添加到对话历史
    this.addToConversationHistory("player", answer);

    // 更新按钮状态 - 高亮选中的按钮，取消同组其他按钮的高亮
    this.fixedQuestionButtons.forEach((button, index) => {
      if (button.setText) {
        // 确保是按钮而不是标题
        button.clearTint();
        button.setAlpha(0.7);
      }
    });

    // 高亮当前选中的按钮
    const clickedButton = this.fixedQuestionButtons.find(
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

    // 开始 Groq 对话
    this.startGroqChat();
  }

  detectThankYouMessage(text) {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes("thanks for sharing") ||
      lowerText.includes("thank you for sharing") ||
      lowerText.includes("谢谢你分享") ||
      lowerText.includes("谢谢你与我分享") ||
      lowerText.includes("good job! keep doing this") ||
      lowerText.includes("little by little, you'll start to understand") ||
      lowerText.includes("no need to rush") ||
      lowerText.includes("take it one meal at a time") ||
      // Add more ending patterns based on your Groq prompts
      lowerText.includes("he often stopped by grace's shop") ||
      lowerText.includes("maybe you will get some insights from her")
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

  // 处理食物记录完成
  async handleMealCompletion() {
    try {
      if (this.debugMode) {
        console.log("=== 处理食物记录完成 ===");
        console.log("餐食类型:", this.selectedMealType);
        console.log("是否为晚餐:", this.selectedMealType === "dinner");
      }

      // 根据餐食类型决定获取线索还是模糊回复
      if (this.selectedMealType === "dinner") {
        console.log("晚餐记录完成，获取明确线索");
        const clue = this.getClueForNPC(this.currentNPC);
        this.showSingleMessage("npc", clue, () => {
          this.dialogPhase = "completed";
          // 标记NPC完成交互
          this.markNPCCompleted();
        });
      } else {
        console.log("非晚餐记录完成，获取模糊回复");

        // 检查是否是第一次与此NPC交互
        const isFirstInteraction = this.checkIfFirstInteraction();
        const vagueVersion = isFirstInteraction ? 1 : 2;

        const vague = this.getVagueDialogFromFrontend(
          this.currentNPC,
          vagueVersion
        );
        this.showSingleMessage("npc", vague, () => {
          this.dialogPhase = "completed";
        });
      }
    } catch (error) {
      console.error("处理食物记录完成时出错:", error);
      this.showSingleMessage("npc", "今天我记性不好，不如明天再聊吧。", () => {
        this.dialogPhase = "completed";
        // updateProgress();
      });
    }
  }

  // 标记NPC完成交互
  markNPCCompleted() {
    if (this.npcManager && this.npcManager.completeNPCInteraction) {
      this.npcManager.completeNPCInteraction(this.currentNPC);
    }

    // 添加线索到UI管理器
    if (this.mainScene && this.mainScene.uiManager) {
      const npc = this.npcManager.getNPCById(this.currentNPC);
      const clueText = this.getClueForNPC(this.currentNPC);
      const clueShort = this.extractClueKeywords(clueText);

      this.mainScene.uiManager.addClue({
        npcName: npc ? npc.name : "Unknown NPC",
        clue: clueShort,
        day: this.npcManager.getCurrentDay
          ? this.npcManager.getCurrentDay()
          : 1,
      });
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
  getVagueDialogFromFrontend(npcId, version = 1) {
    return this.getVagueResponse(npcId, version);
  }

  extractClueKeywords(fullClue) {
    // 简化版关键词提取
    const sentences = fullClue.split(/[.。]/);
    return sentences[0] + "...";
  }

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
        zh: "你师傅……他那天，在那块老礁石边，煮了一锅鱼粥。一锅白，一锅清。没叫我尝，就说了句：'等潮涨再开。'\n\n我看他把什么东西放进了那锅清粥里，然后就一直盯着水面发呆。等我再看时，他已经把两锅粥都倒进了河里。\n\n他说他有个老朋友，住在村子里。也许那个人知道他在想什么。去找找看吧。",
        en: "Your master... that day, by the old rocks, he made two pots of fish congee. One milky, one clear. He didn't let me taste a drop. Just said: 'Open it when the tide comes in.'\n\nI saw him put something into that clear congee, then he just stared at the water surface in a daze. When I looked again, he had poured both pots into the river.\n\nHe said he had an old friend living in the village. Maybe that person knows what he was thinking. Go look for them.",
      },
      old_friend: {
        zh: "师傅从小不喜欢我你了解的，自然什么都不会和我说。但是念念，他最近收了一个孩子叫念念。住在村尾的阁楼。\n\n那孩子很聪明，师傅教了他很多东西。我觉得如果有人知道师傅在想什么，那一定是念念。\n\n但是要小心，那孩子对陌生人很警惕。你需要证明你真的是师傅的徒弟才行。",
        en: "Master never liked me since childhood, naturally he wouldn't tell me anything. But about NianNian, he recently took in a child called NianNian. Lives in the attic at the end of the village.\n\nThat child is very smart, Master taught him many things. I think if anyone knows what Master was thinking, it must be NianNian.\n\nBut be careful, that child is very wary of strangers. You need to prove you're really Master's apprentice.",
      },
      secret_apprentice: {
        zh: "他把最后一页藏在他'最常回头看的地方'。不是厨房，也不是餐馆。是他写下第一道菜的地方！在阁楼上那道木梁上。\n\n他说过，如果有一天他不在了，那一页纸会告诉你一切的真相。包括他为什么要离开，包括他一直在寻找的那个人。\n\n但是师傅也说了，只有真正理解他的人才能找到那张纸。你准备好了吗？",
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
          1: "你师傅常有个地方，他总去的...\n嗯，那又是哪里来着？\n啊，我记性不如从前了。\n\n哦！现在该我准备下顿饭的时候了。过几个小时再回来吧。兴许到时候什么会想起来的。",
          2: "我记得他总是去拜访一个女人...\n嗯，她又是谁来着？\n再给我点时间——等你吃完今天最后一顿饭后我们再聊吧。",
        },
        en: {
          1: "Your master used to have a place he visited all the time...\nHmm, where was it again?\nAh, my memory's not what it used to be.\n\nOh! It's time for me to prep for my next meal. Come back in a few hours. Maybe something will come back to me.",
          2: "I remember he always visited a woman...\nHmm, who was she again?\nGive me a bit more time — let's talk again after you've finished your last meal of the day.",
        },
      },
      shop_owner: {
      zh: {
        1: "他买东西时总念叨一个名字... 叫什么来着？等你下次吃饭后来问我吧。",
        2: "那天他买完东西说要去河边... 具体做什么来着？记不清了..."
      },
      en: {
        1: "He mumbled a name when buying supplies... What was it? Come back after your next meal.",
        2: "He said he was going to the river after shopping... What for? Can't recall..."
      }
    },spice_woman: {
      zh: {
        1: "他买东西时总念叨一个名字... 叫什么来着？等你下次吃饭后来问我吧。",
        2: "那天他买完东西说要去河边... 具体做什么来着？记不清了..."
      },
      en: {
        1: "He mumbled a name when buying supplies... What was it? Come back after your next meal.",
        2: "He said he was going to the river after shopping... What for? Can't recall..."
      }
    },restaurant_owner: {
      zh: {
        1: "他买东西时总念叨一个名字... 叫什么来着？等你下次吃饭后来问我吧。",
        2: "那天他买完东西说要去河边... 具体做什么来着？记不清了..."
      },
      en: {
        1: "He mumbled a name when buying supplies... What was it? Come back after your next meal.",
        2: "He said he was going to the river after shopping... What for? Can't recall..."
      }
    },fisherman: {
      zh: {
        1: "他买东西时总念叨一个名字... 叫什么来着？等你下次吃饭后来问我吧。",
        2: "那天他买完东西说要去河边... 具体做什么来着？记不清了..."
      },
      en: {
        1: "He mumbled a name when buying supplies... What was it? Come back after your next meal.",
        2: "He said he was going to the river after shopping... What for? Can't recall..."
      }
    },old_friend: {
      zh: {
        1: "他买东西时总念叨一个名字... 叫什么来着？等你下次吃饭后来问我吧。",
        2: "那天他买完东西说要去河边... 具体做什么来着？记不清了..."
      },
      en: {
        1: "He mumbled a name when buying supplies... What was it? Come back after your next meal.",
        2: "He said he was going to the river after shopping... What for? Can't recall..."
      }
    },secret_apprentice: {
      zh: {
        1: "他买东西时总念叨一个名字... 叫什么来着？等你下次吃饭后来问我吧。",
        2: "那天他买完东西说要去河边... 具体做什么来着？记不清了..."
      },
      en: {
        1: "He mumbled a name when buying supplies... What was it? Come back after your next meal.",
        2: "He said he was going to the river after shopping... What for? Can't recall..."
      }
    },
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
    // 清理输入框
    this.clearTextInput();

    // 清理滚动指示器
    if (this.scrollIndicator) {
      this.scrollIndicator.destroy();
      this.scrollIndicator = null;
    }

    // 返回主场景
    this.scene.stop();
    this.scene.resume("MainScene");
  }

  shutdown() {
    if (this.debugMode) {
      console.log("=== DialogScene 关闭清理 ===");
    }

    // 清理所有定时器
    this.timers.forEach((timer) => {
      if (timer && !timer.hasDispatched) {
        timer.destroy();
      }
    });
    this.timers = [];

    // 清理事件监听器
    this.eventListeners.forEach(({ event, handler }) => {
      if (this.input && this.input.removeListener) {
        this.input.removeListener(event, handler);
      }
    });
    this.eventListeners = [];

    // 清理输入框
    this.clearTextInput();

    // 清理滚动指示器
    if (this.scrollIndicator) {
      this.scrollIndicator.destroy();
      this.scrollIndicator = null;
    }

    // 清理所有按钮
    this.clearAllButtons();

    // 重置回调函数
    this.onUserSubmit = null;
  }

  // 添加窗口大小变化监听，动态调整布局
  resize(gameSize, baseSize, displaySize, resolution) {
    const { width, height } = this.scale;
    this.isMobile = width < 768;

    // 重新调整UI元素位置
    if (this.dialogBg) {
      this.setupUI();
    }
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

  // 删除不需要的方法
  // createFixedQuestionButtons 方法已删除，现在使用 showAllFixedQuestions

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

  // 开始 Groq 自由问答
  startGroqChat() {
    if (this.debugMode) {
      console.log("=== 开始 Groq 对话 ===");
      console.log("餐食类型:", this.selectedMealType);
      console.log("固定答案:", this.mealAnswers);
    }

    this.clearAllButtons();
    this.dialogPhase = "meal_recording";

    // 检查用餐时间是否异常
    const needTimeQuestion = this.checkUnusualMealTime();

    let startMessage;

    if (needTimeQuestion) {
      // 如果用餐时间异常，先询问时间原因
      startMessage =
        this.playerData.language === "zh"
          ? "我注意到你在一个不寻常的时间用餐。为什么你选择在这个时间而不是更早或更晚用餐呢？"
          : "I notice you had your meal at an unusual time. Why did you eat at this time rather than earlier or later?";

      // 设置标记，表示下一步需要询问详细描述
      this.needDetailedDescription = true;
    } else {
      // 正常时间用餐，直接询问详细描述
      startMessage =
        this.playerData.language === "zh"
          ? `谢谢你的回答。接下来我可以问问你有什么其他特别的感受吗？`
          : `Thank you for your answers. Now please describe your ${this.selectedMealType} in detail: what did you eat, how did it taste, and how did it make you feel?`;

      this.needDetailedDescription = false;
    }

    this.showSingleMessage("npc", startMessage, () => {
      this.waitForUserInput();
    });
  }

  // 新增：检查用餐时间是否异常
  checkUnusualMealTime() {
    const mealTime = this.mealAnswers.mealTime;
    const mealType = this.selectedMealType.toLowerCase();

    if (!mealTime || !mealTime.index) {
      return false;
    }

    const timeIndex = mealTime.index; // 0-5 对应 A-F 选项

    // 定义正常时间范围（按选项索引）
    const normalTimes = {
      breakfast: [1], // B. Morning (7:00–11:00 AM)
      lunch: [2, 3], // C. Midday (11:00 AM–2:00 PM), D. Afternoon (2:00–5:00 PM)
      dinner: [4, 5], // E. Evening (5:00–9:00 PM), F. Night (after 9:00 PM)
    };

    const normalTimeRange = normalTimes[mealType];

    if (!normalTimeRange) {
      return false;
    }

    // 如果用餐时间不在正常范围内，则需要询问原因
    return !normalTimeRange.includes(timeIndex);
  }
}
