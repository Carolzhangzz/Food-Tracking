// DialogScene.js - 专门的对话场景
import Phaser from "phaser";

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
  }

  init(data) {
    this.currentNPC = data.npcId;
    this.npcManager = data.npcManager;
    this.playerData = data.playerData;
    this.mainScene = data.mainScene;
    this.convaiSessionId = "-1"; // 首次对话使用 -1，后续使用返回值
    this.charID ="37c1ea8e-4aec-11f0-a14e-42010a7be01f"; // 这是一个示例 ConvAI ID，你需要替换成实际 NPC 的 ConvAI ID
    // this.charID = this.getConvaiCharId(this.currentNPC); // 获取该 NPC 对应的 Convai ID

    console.log("Dialog scene initialized with NPC:", this.currentNPC);
  }

  create() {
    this.setupBackground();
    this.setupUI();
    this.setupNPCPortrait();
    this.setupControls();
    this.startConversation();

    // 先自动调用 ConvAI API 获取开场白 
    this.typeText("...", async () => {
    const intro = await this.callConvaiAPI("Hello");
    this.typeText(intro, () => {
        this.currentDialogState = "meal_prompt"; // 下一阶段
    });
    });
  }

  setupBackground() {
    const { width, height } = this.scale;

    const npc = this.npcManager.getNPCById(this.currentNPC);
    const bgKey = npc.backgroundKey || "default_bg";

    // 设置 NPC 专属背景图
    this.add.image(width / 2, height / 2, bgKey).setDisplaySize(width, height);

    // 创建深色背景
    const bgGraphics = this.add.graphics();
    bgGraphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f0f23, 0x0f0f23, 1);
    bgGraphics.fillRect(0, 0, width, height);

    // 添加装饰性背景元素
    const overlay = this.add.graphics();
    overlay.fillStyle(0x2a2a2a, 0.3);
    overlay.fillRect(0, height * 0.6, width, height * 0.4);
    overlay.lineStyle(2, 0x4a5568, 0.5);
    overlay.lineBetween(0, height * 0.6, width, height * 0.6);
  }

  isDialogActive() {
    return this.isActive;
  }

  setNPCManager(npcManager) {
    this.npcManager = npcManager;
  }

  setupNPCPortrait() {
    const { width, height } = this.scale;

    // 获取NPC信息
    const npc = this.npcManager.getNPCById(this.currentNPC);
    if (!npc) return;

    // NPC名称显示
    this.npcNameText = this.add.text(width / 2, 80, npc.name, {
      fontSize: "28px",
      fontFamily: "monospace",
      fill: "#ffd700",
      fontStyle: "bold",
    });
    this.npcNameText.setOrigin(0.5);

    // 添加NPC头像
    this.npcPortraitImage = this.add
      .image(100, 100, npc.portraitKey)
      .setScale(0.6);
    this.npcPortraitImage.setOrigin(0.5);

    // NPC头像占位符
    const portraitSize = Math.min(width * 0.2, 120);
    this.npcPortrait = this.add.graphics();
    this.npcPortrait.fillStyle(0x4a5568, 0.8);
    this.npcPortrait.fillCircle(width / 2, 200, portraitSize / 2);
    this.npcPortrait.lineStyle(3, 0xffd700);
    this.npcPortrait.strokeCircle(width / 2, 200, portraitSize / 2);

    // // 添加NPC图标
    // const npcIcon = this.add.text(width / 2, 200, "👤", {
    //   fontSize: "48px",
    // });
    // npcIcon.setOrigin(0.5);
  }

  setupUI() {
    const { width, height } = this.scale;

    // 创建对话框
    this.createDialogBox();

    // 返回按钮
    this.createReturnButton();

    // 状态指示器
    this.statusText = this.add.text(width / 2, height - 40, "", {
      fontSize: "14px",
      fontFamily: "monospace",
      fill: "#94a3b8",
      align: "center",
    });
    this.statusText.setOrigin(0.5);
  }

  createDialogBox() {
    const { width, height } = this.scale;
    const boxHeight = height * 0.35;
    const boxY = height - boxHeight;

    // 对话框背景
    this.dialogBg = this.add.graphics();
    this.dialogBg.fillStyle(0x1a1a2e, 0.95);
    this.dialogBg.fillRoundedRect(20, boxY, width - 40, boxHeight - 20, 12);
    this.dialogBg.lineStyle(3, 0x4a5568);
    this.dialogBg.strokeRoundedRect(20, boxY, width - 40, boxHeight - 20, 12);

    // 对话文本
    this.dialogText = this.add.text(40, boxY + 20, "", {
      fontSize: "16px",
      fontFamily: "monospace",
      fill: "#e2e8f0",
      wordWrap: { width: width - 80 },
      lineSpacing: 6,
    });

    // 继续提示
    this.continueHint = this.add.text(width - 60, height - 50, "▼", {
      fontSize: "16px",
      fontFamily: "monospace",
      fill: "#ffd700",
    });
    this.continueHint.setOrigin(0.5);
    this.continueHint.setVisible(false);

    // 提示动画
    this.tweens.add({
      targets: this.continueHint,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  createReturnButton() {
    const returnText =
      this.playerData.language === "zh" ? "← 返回地图" : "← Back to Map";

    this.returnButton = this.add.text(40, 40, returnText, {
      fontSize: "18px",
      fontFamily: "monospace",
      fill: "#667eea",
      backgroundColor: "#2a2a2a",
      padding: { x: 12, y: 8 },
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
    // 点击屏幕继续对话
    this.input.on("pointerdown", (pointer) => {
      // 避免点击按钮时触发
      if (pointer.y > this.scale.height * 0.15 && !this.isWaitingForInput) {
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

  async startConversation() {
    this.updateStatus("正在开始对话...");

    try {
      // 调用后端API开始对话
      const response = await this.callConvAIAPI("start_conversation", {
        npcId: this.currentNPC,
        playerId: this.mainScene.playerId,
        language: this.playerData.language,
      });

      if (response.success) {
        this.typeText(response.message);
        this.currentDialogState = "greeting";
      } else {
        throw new Error(response.error || "Failed to start conversation");
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      // 使用fallback开场白
      const fallbackGreeting = this.getFallbackGreeting();
      this.typeText(fallbackGreeting);
      this.currentDialogState = "greeting";
    }
  }

  getFallbackGreeting() {
    const npcGreetings = {
      village_head: {
        zh: "你总算回来了……你师傅，他出事了。我相信你能找出真相。",
        en: "You're finally back... Something happened to your master. I believe you can find the truth.",
      },
    };

    const greeting = npcGreetings[this.currentNPC];
    return greeting
      ? greeting[this.playerData.language] || greeting.en
      : "Hello...";
  }

  async callConvaiAPI(userText) {
    const url = `${API_URL}/convai-chat`; // 由 .env 配置
    const payload = {
      userText,
      charID: this.charID,
      sessionID: this.convaiSessionId,
      voiceResponse: "True",
    };

    const headers = {
      "CONVAI-API-KEY": "7beffec7113458a1ce339a0ee829fd4d", // 记得替换成你的密钥
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: new URLSearchParams(payload),
      });

      const data = await response.json();

      this.convaiSessionId = data.sessionID;
      const npcReply = data.text;
      // 可选保存语音
      // const audio = atob(data.audio); ...

      return npcReply;
    } catch (error) {
      console.error("Convai API failed:", error);
      return "Hmm... I’m having trouble remembering right now.";
    }
  }

  async callGroqAPI(userMessage) {
    try {
      const response = await fetch(`${API_URL}/groq-food-journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcId: this.currentNPC,
          playerId: this.mainScene.playerId,
          mealType: this.mealType,
          userMessage: userMessage,
          language: this.playerData.language,
          dialogHistory: this.dialogHistory,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error("Groq API Error:", error);
      return { success: false, error: error.message };
    }
  }

  typeText(text, callback) {
    this.isTyping = true;
    this.currentText = text;
    this.dialogText.setText("");
    this.continueHint.setVisible(false);

    let currentChar = 0;
    const totalChars = text.length;

    const typewriterTimer = this.time.addEvent({
      delay: 30,
      repeat: totalChars - 1,
      callback: () => {
        currentChar++;
        this.dialogText.setText(text.substring(0, currentChar));

        if (currentChar >= totalChars) {
          this.isTyping = false;
          this.continueHint.setVisible(true);
          if (callback) callback();
        }
      },
    });
  }

  async handleContinue() {
    if (this.isTyping) {
      // 跳过打字效果
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
    // 检测是否到了问餐食的时机
    const shouldAskMeal = this.detectMealQuestion();

    if (shouldAskMeal) {
      this.currentDialogState = "meal_selection";
      const question =
        this.playerData.language === "zh"
          ? "你想记录哪一餐的食物日记？"
          : "Which meal do you want to record?";
      this.typeText(question);
    } else {
      // 继续ConvAI对话
      try {
        const response = await this.callConvAIAPI("continue_conversation", {
          npcId: this.currentNPC,
          playerId: this.mainScene.playerId,
          language: this.playerData.language,
        });

        if (response.success) {
          this.typeText(response.message);
          if (response.shouldAskMeal) {
            this.currentDialogState = "meal_selection";
          }
        } else {
          // 直接进入餐食选择
          this.currentDialogState = "meal_selection";
          const question =
            this.playerData.language === "zh"
              ? "你想记录哪一餐的食物日记？"
              : "Which meal do you want to record?";
          this.typeText(question);
        }
      } catch (error) {
        console.error("Error continuing conversation:", error);
        // 直接进入餐食选择
        this.currentDialogState = "meal_selection";
        const question =
          this.playerData.language === "zh"
            ? "你想记录哪一餐的食物日记？"
            : "Which meal do you want to record?";
        this.typeText(question);
      }
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

  createMealButtons() {
    const { width, height } = this.scale;
    const meals =
      this.playerData.language === "zh"
        ? ["早餐", "午餐", "晚餐"]
        : ["Breakfast", "Lunch", "Dinner"];

    this.mealButtons = [];

    meals.forEach((meal, index) => {
      const buttonY = height * 0.4 + index * 60;
      const button = this.add.text(width / 2, buttonY, meal, {
        fontSize: "20px",
        fontFamily: "monospace",
        fill: "#e2e8f0",
        backgroundColor: "#4a5568",
        padding: { x: 20, y: 10 },
      });

      button.setOrigin(0.5);
      button.setInteractive({ useHandCursor: true });

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

  async selectMeal(meal) {
    // 清除按钮
    this.mealButtons.forEach((button) => button.destroy());
    this.mealButtons = [];

    this.mealType = meal;
    this.currentDialogState = "food_journaling";

    // 开始食物记录对话
    this.updateStatus("开始食物记录对话...");

    const startMessage =
      this.playerData.language === "zh"
        ? `请详细描述你的${meal}：吃了什么？怎么做的？什么时候吃的？`
        : `Please describe your ${meal} in detail: what did you eat, how was it prepared, and when did you eat it?`;

    this.typeText(startMessage);

    this.dialogHistory.push({
      type: "system",
      content: `User selected meal: ${meal}`,
    });
  }

  showTextInput() {
    this.isWaitingForInput = true;
    this.createTextInput();
  }

  createTextInput() {
    const { width, height } = this.scale;

    // 创建输入框
    this.textInput = document.createElement("textarea");
    this.textInput.placeholder =
      this.playerData.language === "zh"
        ? "描述你的餐食..."
        : "Describe your meal...";

    this.textInput.style.cssText = `
      position: fixed;
      left: 50%;
      top: 60%;
      transform: translate(-50%, -50%);
      width: min(400px, 80vw);
      height: 120px;
      font-size: 16px;
      padding: 15px;
      border: 2px solid #4a5568;
      border-radius: 8px;
      background: #2a2a2a;
      color: #e2e8f0;
      font-family: monospace;
      resize: none;
      z-index: 1000;
    `;

    document.body.appendChild(this.textInput);

    // 发送按钮
    this.sendButton = document.createElement("button");
    this.sendButton.textContent =
      this.playerData.language === "zh" ? "发送" : "Send";
    this.sendButton.style.cssText = `
      position: fixed;
      left: 50%;
      top: 70%;
      transform: translateX(-50%);
      padding: 12px 30px;
      font-size: 16px;
      border: none;
      border-radius: 8px;
      background: #667eea;
      color: white;
      font-family: monospace;
      cursor: pointer;
      z-index: 1000;
    `;

    document.body.appendChild(this.sendButton);

    this.sendButton.onclick = () => {
      const userInput = this.textInput.value.trim();
      if (userInput) {
        this.handleUserInput(userInput);
      }
    };

    // 自动聚焦
    setTimeout(() => {
      this.textInput.focus();
    }, 100);
  }

  async handleUserInput(input) {
    // 清除输入框
    this.clearTextInput();
    this.isWaitingForInput = false;

    // 记录对话历史
    this.dialogHistory.push({
      type: "user",
      content: input,
    });

    this.updateStatus("处理中...");

    try {
      const response = await this.callGroqAPI(input);

      if (response.success) {
        this.typeText(response.message);
        this.dialogHistory.push({
          type: "assistant",
          content: response.message,
        });

        // 检测是否收到感谢消息
        if (this.detectThankYouMessage(response.message)) {
          this.mealRecorded = true;
          this.currentDialogState = "completion_check";
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error("Error processing user input:", error);
      // 模拟完成对话
      const thankYouMessage =
        this.playerData.language === "zh"
          ? "谢谢你与我分享这顿饭的记录。这让我想起了你师父..."
          : "Thanks for sharing your meal with me. It reminds me of your master...";

      this.typeText(thankYouMessage);
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

    this.typeText(question, () => {
      this.createCompletionButtons();
    });
  }

  createCompletionButtons() {
    const { width, height } = this.scale;
    const options =
      this.playerData.language === "zh"
        ? ["是的", "还没有"]
        : ["Yes", "Not yet"];

    this.completionButtons = [];

    options.forEach((option, index) => {
      const buttonY = height * 0.5 + index * 60;
      const button = this.add.text(width / 2, buttonY, option, {
        fontSize: "18px",
        fontFamily: "monospace",
        fill: "#e2e8f0",
        backgroundColor: "#4a5568",
        padding: { x: 20, y: 10 },
      });

      button.setOrigin(0.5);
      button.setInteractive({ useHandCursor: true });

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

  handleCompletionResponse(response) {
    // 清除按钮
    this.completionButtons.forEach((button) => button.destroy());
    this.completionButtons = [];

    const isLastMeal = response === "是的" || response === "Yes";

    if (isLastMeal) {
      this.currentDialogState = "clue_giving";
      const clue = this.getClueForNPC(this.currentNPC);
      this.typeText(clue);
    } else {
      this.currentDialogState = "completed";
      const vagueResponse = this.getVagueResponse();
      this.typeText(vagueResponse);
    }
  }

  async handleClueGiving() {
    const npc = this.npcManager.getNPCById(this.currentNPC);
    const clueText = await this.getClueText(npc.id); // 从后端或本地生成线索
    const clueShort = this.extractClueKeywords(clueText);

    // 记录到 UIManager 的 clue log
    this.mainScene.uiManager.addClue({
      npcName: npc.name,
      clue: clueShort,
      day: this.npcManager.getCurrentDay(),
    });

    this.typeText(clueText, () => {
      this.currentDialogState = "completed";
    });
  }

  extractClueKeywords(fullClue) {
    // 简化版关键词提取（可以接后端 NLP）
    const sentences = fullClue.split(/[.。]/);
    return sentences[0] + "...";
  }

  async saveClueToBackend(clue) {
    try {
      await fetch(`${API_URL}/save-clue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: this.mainScene.playerId,
          npcId: this.currentNPC,
          clue: clue,
          day: this.npcManager.getCurrentDay(),
        }),
      });
    } catch (error) {
      console.error("Error saving clue:", error);
    }
  }

  extractKeywordsFromClue(clue) {
    // 提取线索关键词，缩短存储
    return clue.length > 150 ? clue.substring(0, 147) + "..." : clue;
  }

  getClueForNPC(npcId) {
    const language = this.playerData.language;
    const clues = {
      village_head: {
        zh: "他那天用青木籽做了汤，味道绝妙。我冰箱里还有一些剩下的。去尝尝吧，但别只是吃——思考一下。里面有种特别的味道……我发誓是从香料婆婆店里来的。你该去拜访她。",
        en: "He made a soup with greenwood seeds that day. Tasted incredible. There's still some left in my fridge. Go ahead, give it a try. But don't just eat it—think about it. There's a certain flavor in there… I swear it came from Spice Granny's shop. You should pay her a visit.",
      },
      // 可以添加其他NPC的线索
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

    // 返回主场景
    this.scene.stop();
    this.scene.resume("MainScene");
  }

  shutdown() {
    this.clearTextInput();
  }
}
