// DialogScene.js - 移动端优化版本
import Phaser from "phaser";
import npc1bg from "../assets/npc/npc1bg.png";
import npc2bg from "../assets/npc/npc2bg.png";
import npc3bg from "../assets/npc/npc3bg.png";
import npc4bg from "../assets/npc/npc4bg.png";
import npc5bg from "../assets/npc/npc4bg.png";
import npc6bg from "../assets/npc/npc4bg.png";
import npc7bg from "../assets/npc/npc4bg.png";

const API_URL = process.env.REACT_APP_API_URL;
 
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
    this.isMobile = false; // 移动端检测
  }

  init(data) {
    this.currentNPC = data.npcId;
    this.npcManager = data.npcManager;
    this.playerData = data.playerData;
    this.mainScene = data.mainScene;
    this.convaiSessionId = "-1";

    // 检测是否为移动端
    this.isMobile = this.scale.width < 768;
    console.log(
      "Dialog scene initialized with NPC:",
      this.currentNPC,
      "Mobile:",
      this.isMobile
    );
  }

  preload() {
    // 获取当前NPC的配置（包含backgroundKey）
    const npc = this.npcManager.getNPCById(this.currentNPC);
    if (!npc || !npc.backgroundKey) {
      console.warn("No background key for NPC:", this.currentNPC);
      return;
    }
    // 动态导入当前NPC的背景图（根据实际路径调整）
    const backgroundPath = `../assets/npc/${npc.backgroundKey}.png`; // 假设背景图在src/assets/npc/目录下
    import(backgroundPath).then((module) => {
    // 加载背景图，key与backgroundKey一致（例如 "npc2bg"）
      this.load.image(npc.backgroundKey, module.default);
    }).catch((error) => {
      console.error(`Failed to load background for ${npc.backgroundKey}:`, error);
    });
    this.load.on("complete", () => {
      console.log("Background preload complete");
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

    // 创建对话框
    this.createDialogBox();

    // 返回按钮
    this.createReturnButton();

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

  createDialogBox() {
    const { width, height } = this.scale;

    // 移动端优化的对话框尺寸
    const boxHeight = this.isMobile ? height * 0.4 : height * 0.35;
    const boxY = this.isMobile ? height - boxHeight : height - boxHeight;
    const padding = this.isMobile ? 15 : 20;
    const borderRadius = this.isMobile ? 8 : 12;

    // 对话框背景
    this.dialogBg = this.add.graphics();
    this.dialogBg.fillStyle(0x1a1a2e, 0.55);
    this.dialogBg.fillRoundedRect(
      padding,
      boxY,
      width - padding * 2,
      boxHeight - 15,
      borderRadius
    );
    this.dialogBg.lineStyle(2, 0x4a5568);
    this.dialogBg.strokeRoundedRect(
      padding,
      boxY,
      width - padding * 2,
      boxHeight - 15,
      borderRadius
    );
    this.dialogBg.setDepth(5);

    // 移动端优化的文本样式
    const fontSize = this.isMobile ? "14px" : "16px";
    const textPadding = this.isMobile ? 25 : 40;
    const lineSpacing = this.isMobile ? 4 : 6;

    // 对话文本 - 移除有问题的遮罩，使用简单的边界检查
    this.dialogText = this.add.text(textPadding, boxY + 20, "", {
      fontSize: fontSize,
      fontFamily: "monospace",
      fill: "#e2e8f0",
      wordWrap: { width: width - textPadding * 2 },
      lineSpacing: lineSpacing,
    });
    this.dialogText.setDepth(10);

    // 继续提示 - 移动端优化位置
    const hintX = this.isMobile ? width - 40 : width - 60;
    const hintY = this.isMobile ? height - 40 : height - 50;

    this.continueHint = this.add.text(hintX, hintY, "▼", {
      fontSize: this.isMobile ? "14px" : "16px",
      fontFamily: "monospace",
      fill: "#ffd700",
    });
    this.continueHint.setOrigin(0.5);
    this.continueHint.setVisible(false);
    this.continueHint.setDepth(15);

    // 提示动画
    this.tweens.add({
      targets: this.continueHint,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // 存储对话框信息用于滚动
    this.dialogBoxInfo = {
      x: textPadding,
      y: boxY + 20,
      width: width - textPadding * 2,
      height: boxHeight - 40,
      maxHeight: boxHeight - 40,
    };
  }

  createReturnButton() {
    const returnText =
      this.playerData.language === "zh" ? "← 返回地图" : "← Back to Map";

    // 移动端优化的按钮样式
    const buttonX = this.isMobile ? 30 : 40;
    const buttonY = this.isMobile ? 30 : 40;
    const fontSize = this.isMobile ? "14px" : "18px";
    const padding = this.isMobile ? { x: 8, y: 6 } : { x: 12, y: 8 };

    this.returnButton = this.add.text(buttonX, buttonY, returnText, {
      fontSize: fontSize,
      fontFamily: "monospace",
      fill: "#667eea",
      backgroundColor: "#2a2a2a",
      padding: padding,
    });

    this.returnButton.setInteractive({ useHandCursor: true });
    this.returnButton.on("pointerdown", () => {
      this.returnToMainScene();
    });
    this.returnButton.on("pointerover", () => {
      this.returnButton.setTint(0x818cf8);
    });
    this.returnButton.on("pointerout", () => {
      this.returnButton.clearTint();
    });
  }

  setupControls() {
    // 点击屏幕继续对话 - 移动端优化触摸区域
    this.input.on("pointerdown", (pointer) => {
      const topAreaHeight = this.isMobile
        ? this.scale.height * 0.25
        : this.scale.height * 0.15;
      if (pointer.y > topAreaHeight && !this.isWaitingForInput) {
        this.handleContinue();
      }
    });

    // 键盘支持
    this.input.keyboard.on("keydown-SPACE", () => {
      if (!this.isWaitingForInput) {
        this.handleContinue();
      }
    });
  }

  // 简化的文本溢出检查，移除有问题的滚动功能
  checkTextOverflow() {
    // 暂时禁用自动滚动功能，避免布局问题
    // 如果文本太长，用户可以通过点击继续来查看更多内容
    return;
  }

  showScrollIndicator() {
    // 暂时禁用滚动指示器
    return;
  }

  // 添加对话到历史记录并更新显示
  addToConversationHistory(speaker, message) {
    const npc = this.npcManager.getNPCById(this.currentNPC);
    const npcName = npc ? npc.name : "NPC";

    // 添加到对话历史
    this.conversationHistory.push({
      speaker: speaker === "npc" ? npcName : "Player",
      message: message,
      timestamp: Date.now(),
    });

    // 更新对话显示
    this.updateConversationDisplay();
  }

  // 更新对话框中的所有对话内容
  updateConversationDisplay() {
    let displayText = "";

    // 显示最近的几条对话（避免文本过长）
    const maxMessages = this.isMobile ? 4 : 6;
    const recentHistory = this.conversationHistory.slice(-maxMessages);

    recentHistory.forEach((entry, index) => {
      if (index > 0) displayText += "\n\n";
      displayText += `${entry.speaker}: ${entry.message}`;
    });

    this.dialogText.setText(displayText);
  }

  // 显示单条消息（用于打字效果）
  showSingleMessage(speaker, message, callback) {
    const npc = this.npcManager.getNPCById(this.currentNPC);
    const npcName = npc ? npc.name : "NPC";
    const displayName = speaker === "npc" ? npcName : "Player";

    const fullMessage = `${displayName}: ${message}`;

    this.isTyping = true;
    this.dialogText.setText("");
    this.continueHint.setVisible(false);

    let currentChar = 0;
    const totalChars = fullMessage.length;
    const typeSpeed = this.isMobile ? 25 : 30;

    const typewriterTimer = this.time.addEvent({
      delay: typeSpeed,
      repeat: totalChars - 1,
      callback: () => {
        currentChar++;
        const currentDisplayText = fullMessage.substring(0, currentChar);
        this.dialogText.setText(currentDisplayText);

        if (currentChar >= totalChars) {
          this.isTyping = false;
          this.continueHint.setVisible(true);

          // 打字完成后添加到历史记录
          this.addToConversationHistory(speaker, message);

          if (callback) callback();
        }
      },
    });
  }

  createMealButtons() {
    const { width, height } = this.scale;
    const meals =
      this.playerData.language === "zh"
        ? ["早餐", "午餐", "晚餐"]
        : ["Breakfast", "Lunch", "Dinner"];

    this.mealButtons = [];

    // 移动端优化的按钮布局 - 修复按钮位置
    const startY = this.isMobile ? height * 0.15 : height * 0.3;
    const buttonSpacing = this.isMobile ? 50 : 60;
    const fontSize = this.isMobile ? "16px" : "20px";
    const padding = this.isMobile ? { x: 15, y: 8 } : { x: 20, y: 10 };

    meals.forEach((meal, index) => {
      const buttonY = startY + index * buttonSpacing;
      const button = this.add.text(width / 2, buttonY, meal, {
        fontSize: fontSize,
        fontFamily: "monospace",
        fill: "#e2e8f0",
        backgroundColor: "#4a5568",
        padding: padding,
      });

      button.setOrigin(0.5);
      button.setInteractive({ useHandCursor: true });
      button.setDepth(20); // 确保按钮在最上层

      button.on("pointerdown", () => {
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
  }

  createTextInput() {
    const { width, height } = this.scale;

    // 移动端优化的输入框样式
    this.textInput = document.createElement("textarea");
    this.textInput.placeholder =
      this.playerData.language === "zh"
        ? "描述你的餐食..."
        : "Describe your meal...";

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

    // 移动端优化的发送按钮
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

    this.sendButton.onclick = () => {
      const userInput = this.textInput.value.trim();
      if (userInput) {
        this.handleUserInput(userInput);
      }
    };

    // 移动端键盘优化
    if (this.isMobile) {
      this.textInput.addEventListener("focus", () => {
        // 移动端聚焦时稍微调整位置，避免被键盘遮挡
        setTimeout(() => {
          this.textInput.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 300);
      });
    }

    // 自动聚焦
    setTimeout(() => {
      this.textInput.focus();
    }, 100);
  }

  createCompletionButtons() {
    const { width, height } = this.scale;
    const options =
      this.playerData.language === "zh"
        ? ["是的", "还没有"]
        : ["Yes", "Not yet"];

    this.completionButtons = [];

    // 移动端优化的完成按钮布局 - 修复按钮位置
    const startY = this.isMobile ? height * 0.15 : height * 0.3;
    const buttonSpacing = this.isMobile ? 50 : 60;
    const fontSize = this.isMobile ? "16px" : "18px";
    const padding = this.isMobile ? { x: 18, y: 8 } : { x: 20, y: 10 };

    options.forEach((option, index) => {
      const buttonY = startY + index * buttonSpacing;
      const button = this.add.text(width / 2, buttonY, option, {
        fontSize: fontSize,
        fontFamily: "monospace",
        fill: "#e2e8f0",
        backgroundColor: "#4a5568",
        padding: padding,
      });

      button.setOrigin(0.5);
      button.setInteractive({ useHandCursor: true });
      button.setDepth(20); // 确保按钮在最上层

      button.on("pointerdown", () => {
        this.handleCompletionResponse(option);
      });

      button.on("pointerover", () => {
        button.setTint(0x667eea);
      });

      button.on("pointerout", () => {
        button.clearTint();
      });

      this.completionButtons.push(button);
    });
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

  async startConversation() {
    console.log("Starting conversation with ConvAI");
    this.updateStatus("正在开始对话...");

    const response = await this.callConvaiAPI("start");

    if (response.success) {
      this.convaiSessionId = response.sessionId;
      this.showSingleMessage("npc", response.message, () => {
        this.currentDialogState = "greeting";
        this.updateStatus("");
      });
    } else {
      const fallbackGreeting = this.getFallbackGreeting();
      this.showSingleMessage("npc", fallbackGreeting, () => {
        this.currentDialogState = "greeting";
        this.updateStatus("");
      });
    }
  }

  base64ToBlob(base64, mime) {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }

    const byteArray = new Uint8Array(byteArrays);
    return new Blob([byteArray], { type: mime });
  }

  async callConvaiAPI(userMessage) {
    this.npcMap = new Map();
    this.npcMap.set("village_head", "d38ecac8-5c6b-11f0-946c-42010a7be01f");
    this.npcMap.set("shop_owner", "abc123-shop-owner-id");
    this.npcMap.set("spice_woman", "abc456-spice-woman-id");

    const charID = this.npcMap.get(this.currentNPC);
    console.log(
      `Calling ConvAI API for NPC ${this.currentNPC} with ID: ${charID}`
    );

    try {
      const response = await fetch(`${API_URL}/convai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userText: userMessage,
          charID: charID,
          sessionID: this.convaiSessionId,
          voiceResponse: "True",
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // 如果有音频，进行播放
      if (data.audio) {
        const audioBlob = this.base64ToBlob(data.audio, "audio/wav");
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
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

  async callGroqAPI(userMessage) {
    console.log("Groq API call simulated:", userMessage);

    const language = this.playerData.language || "zh";
    const simulatedResponses = {
      zh: [
        "感谢你分享这么详细的餐食记录！这让我想起了一些关于你师父的回忆...",
        "你的描述很生动，我能感受到食物的美味。这提醒我想起你师父曾经说过的话...",
        "听你这样描述食物，我仿佛也能品尝到那份美味。你师父也是这样热爱美食的...",
      ],
      en: [
        "Thank you for sharing such detailed meal records! This reminds me of some memories about your master...",
        "Your description is very vivid, I can feel the deliciousness of the food. This reminds me of what your master once said...",
        "Hearing you describe food like this, I can almost taste that deliciousness. Your master also loved food like this...",
      ],
    };

    const responses = simulatedResponses[language] || simulatedResponses.zh;
    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      message: randomResponse,
    };
  }

  async handleContinue() {
    if (this.isTyping) {
      // 跳过打字效果，立即显示全部文本
      this.time.removeAllEvents();
      this.dialogText.setText(this.currentText);
      this.isTyping = false;
      this.continueHint.setVisible(true);
      return;
    }

    switch (this.currentDialogState) {
      case "greeting":
        await this.handleGreetingContinue();
        break;
      case "meal_selection":
        this.showMealSelection();
        break;
      case "food_journaling":
        this.showTextInput();
        break;
      case "completion_check":
        this.showCompletionCheck();
        break;
      case "clue_giving":
        await this.handleClueGiving();
        break;
      case "completed":
        this.returnToMainScene();
        break;
    }
  }

  async handleGreetingContinue() {
    const shouldAskMeal = this.detectMealQuestion();

    if (shouldAskMeal) {
      this.currentDialogState = "meal_selection";
      const question =
        this.playerData.language === "zh"
          ? "你想记录哪一餐的食物日记？"
          : "Which meal do you want to record?";
      this.showSingleMessage("npc", question);
    } else {
      this.currentDialogState = "meal_selection";
      const question =
        this.playerData.language === "zh"
          ? "你想记录哪一餐的食物日记？"
          : "Which meal do you want to record?";
      this.showSingleMessage("npc", question);
    }
  }

  detectMealQuestion() {
    const currentText = this.dialogText.text.toLowerCase();
    return (
      currentText.includes("meal") ||
      currentText.includes("food") ||
      currentText.includes("餐") ||
      currentText.includes("线索") ||
      currentText.includes("记录")
    );
  }

  showMealSelection() {
    this.currentDialogState = "waiting_meal_selection";
    this.createMealButtons();
  }

  async selectMeal(meal) {
    this.mealButtons.forEach((button) => button.destroy());
    this.mealButtons = [];

    // 添加玩家的选择到对话历史
    this.addToConversationHistory("player", meal);

    this.mealType = meal;
    this.currentDialogState = "food_journaling";

    this.updateStatus("开始食物记录对话...");

    const startMessage =
      this.playerData.language === "zh"
        ? `请详细描述你的${meal}：吃了什么？怎么做的？什么时候吃的？`
        : `Please describe your ${meal} in detail: what did you eat, how was it prepared, and when did you eat it?`;

    this.showSingleMessage("npc", startMessage);

    this.dialogHistory.push({
      type: "system",
      content: `User selected meal: ${meal}`,
    });
  }

  showTextInput() {
    this.isWaitingForInput = true;
    this.createTextInput();
  }

  async handleUserInput(input) {
    this.clearTextInput();
    this.isWaitingForInput = false;

    // 添加玩家输入到对话历史
    this.addToConversationHistory("player", input);

    this.dialogHistory.push({
      type: "user",
      content: input,
    });

    this.updateStatus("处理中...");

    try {
      const response = await this.callGroqAPI(input);

      if (response.success) {
        this.showSingleMessage("npc", response.message);
        this.dialogHistory.push({
          type: "assistant",
          content: response.message,
        });

        if (this.detectThankYouMessage(response.message)) {
          this.mealRecorded = true;
          this.currentDialogState = "completion_check";
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error("Error processing user input:", error);
      const thankYouMessage =
        this.playerData.language === "zh"
          ? "谢谢你与我分享这顿饭的记录。这让我想起了你师父..."
          : "Thanks for sharing your meal with me. It reminds me of your master...";

      this.showSingleMessage("npc", thankYouMessage);
      this.mealRecorded = true;
      this.currentDialogState = "completion_check";
    }
  }

  detectThankYouMessage(text) {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes("thanks for sharing") ||
      lowerText.includes("thank you for sharing") ||
      lowerText.includes("谢谢你分享") ||
      lowerText.includes("谢谢你与我分享")
    );
  }

  clearTextInput() {
    if (this.textInput && this.textInput.parentNode) {
      this.textInput.parentNode.removeChild(this.textInput);
      this.textInput = null;
    }
    if (this.sendButton && this.sendButton.parentNode) {
      this.sendButton.parentNode.removeChild(this.sendButton);
      this.sendButton = null;
    }
  }

  showCompletionCheck() {
    this.currentDialogState = "waiting_completion_response";

    const question =
      this.playerData.language === "zh"
        ? "这是你今天记录的最后一餐吗？"
        : "Is this the last meal you're recording today?";

    this.showSingleMessage("npc", question, () => {
      this.createCompletionButtons();
    });
  }

  handleCompletionResponse(response) {
    this.completionButtons.forEach((button) => button.destroy());
    this.completionButtons = [];

    // 添加玩家的选择到对话历史
    this.addToConversationHistory("player", response);

    const isLastMeal = response === "是的" || response === "Yes";

    if (isLastMeal) {
      this.currentDialogState = "clue_giving";
      const clue = this.getClueForNPC(this.currentNPC);
      this.showSingleMessage("npc", clue);
    } else {
      this.currentDialogState = "completed";
      const vagueResponse = this.getVagueResponse();
      this.showSingleMessage("npc", vagueResponse);
    }
  }

  async handleClueGiving() {
    const npc = this.npcManager.getNPCById(this.currentNPC);
    const clueText = this.getClueForNPC(this.currentNPC);
    const clueShort = this.extractClueKeywords(clueText);

    // 记录到 UIManager 的 clue log
    if (this.mainScene.uiManager) {
      this.mainScene.uiManager.addClue({
        npcName: npc.name,
        clue: clueShort,
        day: this.npcManager.getCurrentDay(),
      });
    }

    this.showSingleMessage("npc", clueText, () => {
      this.currentDialogState = "completed";
      // 标记NPC已完成互动
      if (this.npcManager.completeNPCInteraction) {
        this.npcManager.completeNPCInteraction(this.currentNPC);
      }
    });
  }

  extractClueKeywords(fullClue) {
    // 简化版关键词提取（可以接后端 NLP）
    const sentences = fullClue.split(/[.。]/);
    return sentences[0] + "...";
  }

  getClueForNPC(npcId) {
    const language = this.playerData.language;
    const clues = {
      village_head: {
        zh: "他那天用青木籽做了汤，味道绝妙。我冰箱里还有一些剩下的。去尝尝吧，但别只是吃——思考一下。里面有种特别的味道……我发誓是从香料婆婆店里来的。你该去拜访她。",
        en: "He made a soup with greenwood seeds that day. Tasted incredible. There's still some left in my fridge. Go ahead, give it a try. But don't just eat it—think about it. There's a certain flavor in there… I swear it came from Spice Granny's shop. You should pay her a visit.",
      },
      shop_owner: {
        zh: "他最常买那几样料，可那天——他却突然问起'青木籽'。他以前从来不碰那玩意儿。",
        en: "He always bought the same ingredients, but that day—he suddenly asked about 'greenwood seeds'. He never touched those before.",
      },
      spice_woman: {
        zh: "他说——'要不是那个人把它弄俗了'，他都不想再碰。你知道他说的是谁吗？",
        en: "He said—'If it weren't for that person making it vulgar', he wouldn't want to touch it again. Do you know who he was talking about?",
      },
      restaurant_owner: {
        zh: "有一锅粥，他始终没让我碰。说什么得亲自守着火慢慢熬着。'云头鲤'。",
        en: "There was one pot—congee with Yunhead Carp. He never let me touch it. Had to be slow cooked. Alone. By the river.",
      },
      fisherman: {
        zh: "你师傅……他那天，在那块老礁石边，煮了一锅鱼粥。一锅白，一锅清。没叫我尝，就说了句：'等潮涨再开。'",
        en: "Your master... that day, by the old rocks, he made two pots of fish congee. One milky, one clear. He didn't let me taste a drop. Just said: 'Open it when the tide comes in.'",
      },
      old_friend: {
        zh: "师傅从小不喜欢我你了解的，自然什么都不会和我说。但是念念，他最近收了一个孩子叫念念。住在村尾的阁楼。",
        en: "Master never liked me since childhood, naturally he wouldn't tell me anything. But about NianNian, he recently took in a child called NianNian. Lives in the attic at the end of the village.",
      },
      secret_apprentice: {
        zh: "他把最后一页藏在他'最常回头看的地方'。不是厨房，也不是餐馆。是他写下第一道菜的地方！在阁楼上那道木梁上。",
        en: "He hid the last page in the place he 'most often looked back at'. Not the kitchen, not the restaurant. The place where he wrote his first recipe! On the wooden beam in the attic.",
      },
    };

    const clue = clues[npcId];
    return clue ? clue[language] || clue.en : "No clue available for this NPC.";
  }

  getVagueResponse() {
    const language = this.playerData.language;
    const responses = {
      zh: [
        "能听到你如此详细的分享真是太好了。我会在这里等到你的下一顿饭，所以之后再来吧。也许到那时，这些片段会更有意义。",
        "我一直在努力回想他说的确切话语。让我们在你结束今天的用餐后再聊吧。也许味道会回来的。",
      ],
      en: [
        "It's nice hearing you share in such detail. I'll still be here till your next meal, so come back after that. Maybe then, the pieces will make more sense.",
        "I keep trying to remember exactly what he said. Let's talk again after you've wrapped up your eating for the day. Maybe the taste will come back to me.",
      ],
    };

    const responseArray = responses[language] || responses.en;
    return responseArray[Math.floor(Math.random() * responseArray.length)];
  }

  updateStatus(message) {
    if (this.statusText) {
      this.statusText.setText(message);
      // 5秒后清除状态
      this.time.delayedCall(5000, () => {
        if (this.statusText) {
          this.statusText.setText("");
        }
      });
    }
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
    this.clearTextInput();

    // 清理滚动指示器
    if (this.scrollIndicator) {
      this.scrollIndicator.destroy();
      this.scrollIndicator = null;
    }
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
}
