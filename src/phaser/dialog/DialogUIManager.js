// src/phaser/dialog/DialogUIManager.js
// 对话UI管理器 - 使用HTML实现现代化半透明对话界面

export default class DialogUIManager {
  constructor(scene) {
    this.scene = scene;
    this.dialogContainer = null;
    this.messagesContainer = null;
    this.inputContainer = null;
    this.buttons = [];
    this.textarea = null;
    this.messageHistory = []; // 存储所有消息
  }

  // 创建现代化对话框UI
  createDialogBox() {
    const { width, height } = this.scene.scale;
    const isMobile = width < 768;

    console.log(`📐 创建现代化对话框 (${width}x${height})`);

    // 创建主容器（四周留边距）
    this.dialogContainer = document.createElement("div");
    this.dialogContainer.id = "dialog-container";
    const isSmallScreen = width < 600;
    // 🔧 针对手机横屏优化：减少边距，增加紧凑度
    const margin = isSmallScreen ? "4px" : (isMobile ? "10px" : "40px");
    this.dialogContainer.style.cssText = `
      position: fixed;
      left: ${margin};
      top: ${margin};
      right: ${margin};
      bottom: ${margin};
      width: auto;
      height: auto;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1.5px solid rgba(99, 102, 241, 0.4);
      border-radius: ${isSmallScreen ? "8px" : (isMobile ? "12px" : "24px")};
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 1000;
      animation: fadeIn 0.3s ease-out;
    `;

    // 创建标题栏
    const header = document.createElement("div");
    header.style.cssText = `
      padding: ${isMobile ? "8px 12px" : "24px 32px"};
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(129, 140, 248, 0.15) 100%);
      border-bottom: 1.5px solid rgba(99, 102, 241, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      height: ${isMobile ? "32px" : "auto"};
    `;

    const npcName = document.createElement("div");
    npcName.id = "dialog-npc-name";
    npcName.textContent = this.getNPCDisplayName();
    npcName.style.cssText = `
      font-size: ${isMobile ? "16px" : "32px"};
      font-weight: 700;
      color: #e0e7ff;
      text-shadow: 0 2px 10px rgba(99, 102, 241, 0.6);
    `;

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
      width: ${isMobile ? "24px" : "44px"};
      height: ${isMobile ? "24px" : "44px"};
      border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      font-size: ${isMobile ? "14px" : "24px"};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = "rgba(239, 68, 68, 0.3)";
      closeBtn.style.transform = "scale(1.1)";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = "rgba(239, 68, 68, 0.15)";
      closeBtn.style.transform = "scale(1)";
    };
    closeBtn.onclick = () => this.scene.returnToMainScene();

    header.appendChild(npcName);
    header.appendChild(closeBtn);

    // 创建消息滚动容器（全屏优化）
    this.messagesContainer = document.createElement("div");
    this.messagesContainer.id = "dialog-messages";
    this.messagesContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: ${isMobile ? "8px 12px" : "32px 40px"};
      display: flex;
      flex-direction: column;
      gap: ${isMobile ? "6px" : "20px"};
      scroll-behavior: smooth;
      min-height: 0;
    `;

    // 自定义滚动条样式
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes messageSlideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }

      #dialog-messages::-webkit-scrollbar {
        width: 12px;
      }

      #dialog-messages::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.5);
        border-radius: 6px;
      }

      #dialog-messages::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.6);
        border-radius: 6px;
        transition: background 0.2s;
      }

      #dialog-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(99, 102, 241, 0.8);
      }

      #dialog-input-area::-webkit-scrollbar {
        width: 8px;
      }

      #dialog-input-area::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.5);
        border-radius: 4px;
      }

      #dialog-input-area::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.5);
        border-radius: 4px;
      }

      #dialog-input-area::-webkit-scrollbar-thumb:hover {
        background: rgba(99, 102, 241, 0.7);
      }

      .dialog-button:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
      }

      .dialog-button:active {
        transform: translateY(0) scale(0.98);
      }

      .dialog-input:focus {
        outline: none;
        border-color: rgba(99, 102, 241, 0.8);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.3);
      }
    `;
    document.head.appendChild(style);

    // 创建输入区域容器（全屏优化 + 可滚动）
    this.inputContainer = document.createElement("div");
    this.inputContainer.id = "dialog-input-area";
    this.inputContainer.style.cssText = `
      padding: ${isMobile ? "10px 14px" : "24px 40px"};
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%);
      border-top: 2px solid rgba(99, 102, 241, 0.3);
      max-height: ${isMobile ? "40%" : "40%"};
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      align-items: flex-start;
      gap: ${isMobile ? "10px" : "16px"};
      flex-shrink: 0;
      -webkit-overflow-scrolling: touch;
    `;

    // 组装UI
    this.dialogContainer.appendChild(header);
    this.dialogContainer.appendChild(this.messagesContainer);
    this.dialogContainer.appendChild(this.inputContainer);
    document.body.appendChild(this.dialogContainer);

    console.log("✅ 现代化对话框创建完成");
  }

  // 添加消息到对话历史
  // 🔧 options可以是对象{allowHtml: true}或者字符串（兼容旧代码）
  addMessage(speaker, text, displayNameOverride = null, allowHtml = false) {
    if (!this.messagesContainer) return;

    // 🔧 兼容旧的调用方式：addMessage("NPC", text, {allowHtml: true})
    if (typeof displayNameOverride === 'object' && displayNameOverride !== null) {
      allowHtml = displayNameOverride.allowHtml || false;
      displayNameOverride = null;
    }

    const { width } = this.scene.scale;
    const isMobile = width < 768;

    const messageDiv = document.createElement("div");
    const isNPC = speaker === "NPC";
    const isSystem = speaker === "System";

    // 获取NPC的实际名字
    const npcDisplayName = displayNameOverride || this.getNPCDisplayName();

    this.messageHistory.push({ speaker, text, timestamp: Date.now() });

    if (isSystem) {
      // 系统消息（居中，小字）
      messageDiv.style.cssText = `
        text-align: center;
        font-size: ${isMobile ? "17px" : "18px"};
        color: rgba(148, 163, 184, 0.9);
        font-style: italic;
        padding: 10px 20px;
        animation: messageSlideIn 0.3s ease-out;
      `;
      // 🔧 系统消息也支持HTML（用于高亮提示）
      if (allowHtml) {
        messageDiv.innerHTML = text;
      } else {
        messageDiv.textContent = text;
      }
    } else {
      // NPC或玩家消息
      messageDiv.style.cssText = `
        display: flex;
        justify-content: ${isNPC ? "flex-start" : "flex-end"};
        animation: messageSlideIn 0.3s ease-out;
      `;

      const bubble = document.createElement("div");
      const isSmallScreen = width < 600; // 🔧 特别小的屏幕（如手机横屏）
      bubble.style.cssText = `
        max-width: ${isSmallScreen ? "85%" : (isMobile ? "80%" : "80%")};
        padding: ${isSmallScreen ? "6px 10px" : (isMobile ? "10px 14px" : "16px 24px")};
        border-radius: ${isNPC ? "12px 12px 12px 4px" : "12px 12px 4px 12px"};
        background: ${
          isNPC
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(129, 140, 248, 0.2) 100%)"
            : "linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(74, 222, 128, 0.2) 100%)"
        };
        border: 1px solid ${
          isNPC ? "rgba(99, 102, 241, 0.4)" : "rgba(34, 197, 94, 0.4)"
        };
        box-shadow: ${
          isNPC
            ? "0 4px 12px rgba(99, 102, 241, 0.15)"
            : "0 4px 12px rgba(34, 197, 94, 0.15)"
        };
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      `;

      const speakerLabel = document.createElement("div");
      // 🔧 优先使用覆盖的名字
      if (displayNameOverride) {
        speakerLabel.textContent = displayNameOverride;
      } else {
        speakerLabel.textContent = isNPC ? npcDisplayName : (this.scene.playerData?.language === "zh" ? "你" : "You");
      }
      speakerLabel.style.cssText = `
        font-size: ${isMobile ? "15px" : "16px"};
        color: ${isNPC ? "rgba(165, 180, 252, 0.9)" : "rgba(134, 239, 172, 0.9)"};
        font-weight: 700;
        margin-bottom: ${isMobile ? "4px" : "8px"};
        letter-spacing: 0.5px;
      `;

      const textContent = document.createElement("div");
      // 🔧 支持HTML内容（用于高亮关键词）
      if (allowHtml) {
        textContent.innerHTML = text;
      } else {
        textContent.textContent = text;
      }
      // 🔧 使用已声明的 isSmallScreen 变量
      textContent.style.cssText = `
        font-size: ${isSmallScreen ? "13px" : (isMobile ? "15px" : "22px")};
        color: #f1f5f9;
        line-height: ${isMobile ? "1.4" : "1.5"};
        word-wrap: break-word;
        word-break: break-word;
      `;

      bubble.appendChild(speakerLabel);
      bubble.appendChild(textContent);
      messageDiv.appendChild(bubble);
    }

    this.messagesContainer.appendChild(messageDiv);

    // 自动滚动到底部
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 50);
  }

  // 更新对话文本（兼容旧接口）
  updateDialogText(text) {
    this.addMessage("NPC", text);
  }

  // 显示打字效果
  showTypingIndicator() {
    if (!this.messagesContainer) return;

    const { width } = this.scene.scale;
    const isMobile = width < 768;

    const typingDiv = document.createElement("div");
    typingDiv.id = "typing-indicator";
    typingDiv.style.cssText = `
      display: flex;
      justify-content: flex-start;
      animation: messageSlideIn 0.3s ease-out;
    `;

    const bubble = document.createElement("div");
    bubble.style.cssText = `
      padding: ${isMobile ? "6px 12px" : "14px 24px"};
      border-radius: 20px 20px 20px 4px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(129, 140, 248, 0.1) 100%);
      border: 1px solid rgba(99, 102, 241, 0.25);
      display: flex;
      gap: ${isMobile ? "4px" : "6px"};
      align-items: center;
    `;

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div");
      dot.style.cssText = `
        width: ${isMobile ? "6px" : "8px"};
        height: ${isMobile ? "6px" : "8px"};
        border-radius: 50%;
        background: rgba(165, 180, 252, 0.8);
        animation: pulse 1.4s ease-in-out infinite;
        animation-delay: ${i * 0.2}s;
      `;
      bubble.appendChild(dot);
    }

    typingDiv.appendChild(bubble);
    this.messagesContainer.appendChild(typingDiv);

    // 滚动到底部
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 50);
  }

  // 移除打字指示器
  hideTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
      indicator.remove();
    }
  }

  // 显示按钮选项
  showButtons(options, callback) {
    this.clearButtons();
    if (!this.inputContainer) return;

    const { width } = this.scene.scale;
    const isMobile = width < 768;

    // 清空输入区域
    this.inputContainer.innerHTML = "";

    // 创建按钮容器（可滚动）
    const isSmallScreen = width < 600;
    const buttonsWrapper = document.createElement("div");
    buttonsWrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${isSmallScreen ? "6px" : (isMobile ? "8px" : "14px")};
      width: 100%;
      max-width: ${isMobile ? "100%" : "1200px"};
      margin: 0 auto;
      max-height: ${isSmallScreen ? "120px" : "auto"};
      overflow-y: auto;
    `;

    options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "dialog-button";
      button.textContent = option.text;
      button.style.cssText = `
        width: 100%;
        padding: ${isSmallScreen ? "8px 12px" : (isMobile ? "12px 16px" : "20px 28px")};
        font-size: ${isSmallScreen ? "13px" : (isMobile ? "15px" : "22px")};
        font-weight: 600;
        color: #ffffff;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.7) 0%, rgba(129, 140, 248, 0.6) 100%);
        border: 1.5px solid rgba(99, 102, 241, 0.5);
        border-radius: ${isSmallScreen ? "8px" : "14px"};
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        white-space: normal;
        text-align: left;
        line-height: 1.2;
      `;

      button.onclick = () => {
        // 🔧 不在这里添加消息！由DialogSceneRefactored.onQuestionAnswered统一添加
        // 避免消息重复显示2次
        
        // 如果是"其他"选项，显示输入框
        if (option.isOther) {
          this.showInputBox(callback);
        } else {
          callback(option.value || option.text);
        }
      };

      buttonsWrapper.appendChild(button);
      this.buttons.push(button);
    });

    this.inputContainer.appendChild(buttonsWrapper);
  }

  // 显示输入框
  showInputBox(callback) {
    if (!this.inputContainer) return;

    const { width } = this.scene.scale;
    const isMobile = width < 768;

    this.inputContainer.innerHTML = "";

    const inputWrapper = document.createElement("div");
    inputWrapper.style.cssText = `
      display: flex;
      gap: ${isMobile ? "12px" : "16px"};
      width: 100%;
      max-width: ${isMobile ? "100%" : "1200px"};
      margin: 0 auto;
      align-items: center;
    `;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "dialog-input";
    input.placeholder = this.scene.playerData?.language === "zh" ? "输入您的回答..." : "Type your answer...";
    input.style.cssText = `
      flex: 1;
      padding: ${isMobile ? "12px 16px" : "20px 24px"};
      font-size: ${isMobile ? "16px" : "22px"};
      color: #f1f5f9;
      background: rgba(15, 23, 42, 0.7);
      border: 1.5px solid rgba(99, 102, 241, 0.4);
      border-radius: ${isMobile ? "10px" : "14px"};
      transition: all 0.3s;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;

    const submitBtn = document.createElement("button");
    submitBtn.textContent = this.scene.playerData?.language === "zh" ? "发送" : "Send";
    submitBtn.style.cssText = `
      padding: ${isMobile ? "12px 20px" : "20px 40px"};
      font-size: ${isMobile ? "16px" : "22px"};
      font-weight: 700;
      color: #ffffff;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(74, 222, 128, 0.7) 100%);
      border: 1.5px solid rgba(34, 197, 94, 0.6);
      border-radius: ${isMobile ? "10px" : "14px"};
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      white-space: nowrap;
      flex-shrink: 0;
    `;

    submitBtn.onmouseover = () => {
      submitBtn.style.transform = "translateY(-2px)";
      submitBtn.style.boxShadow = "0 8px 20px rgba(34, 197, 94, 0.4)";
    };
    submitBtn.onmouseout = () => {
      submitBtn.style.transform = "translateY(0)";
      submitBtn.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3)";
    };

    const handleSubmit = () => {
      const value = input.value.trim();
      if (value) {
        // 🔧 不在这里添加消息，由调用方（DialogSceneRefactored）统一添加
        this.inputContainer.innerHTML = "";
        callback(value);
      }
    };

    submitBtn.onclick = handleSubmit;
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    });

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(submitBtn);
    this.inputContainer.appendChild(inputWrapper);

    input.focus();
    this.textarea = input;
  }

  // 更新状态文本
  updateStatus(text) {
    this.addMessage("System", text);
  }

  // 清除按钮
  clearButtons() {
    this.buttons = [];
    if (this.inputContainer) {
      this.inputContainer.innerHTML = "";
    }
  }

  // 清理UI
  cleanup() {
    if (this.dialogContainer) {
      this.dialogContainer.remove();
      this.dialogContainer = null;
    }
    this.messagesContainer = null;
    this.inputContainer = null;
    this.buttons = [];
    this.textarea = null;
    this.messageHistory = [];
  }

  // 显示"继续"提示
  showContinueHint(show = true) {
    // 在新UI中，我们用打字指示器代替
    if (show) {
      this.showTypingIndicator();
    } else {
      this.hideTypingIndicator();
    }
  }

  // 隐藏"继续"提示
  hideContinueHint() {
    this.hideTypingIndicator();
  }

  // 创建返回按钮（在标题栏已有关闭按钮）
  createReturnButton() {
    // 已在标题栏实现，无需额外创建
  }

  // 获取对话历史
  getMessageHistory() {
    return this.messageHistory;
  }

  // 🔧 动态更新 NPC 名字显示 (用于切换语言)
  updateNPCName(name) {
    const nameElem = document.getElementById("dialog-npc-name");
    if (nameElem) {
      nameElem.textContent = name;
    }
  }

  // 获取NPC的显示名称
  getNPCDisplayName() {
    const lang = this.scene.playerData?.language || "zh";
    const npcData = this.scene.npcData;
    
    if (npcData && npcData.name) {
      // 如果name是对象，根据语言选择
      if (typeof npcData.name === "object") {
        return npcData.name[lang] || npcData.name.zh || npcData.name.en || "NPC";
      }
      // 如果name是字符串，直接使用
      return npcData.name;
    }
    
    // 如果没有npcData，尝试从NPC ID获取名字
    const npcId = this.scene.currentNPC;
    const npcNames = {
      npc1: { zh: "村长", en: "Village Chief" },
      npc2: { zh: "农夫", en: "Farmer" },
      npc3: { zh: "商人", en: "Merchant" },
      npc4: { zh: "铁匠", en: "Blacksmith" },
      npc5: { zh: "猎人", en: "Hunter" },
      npc6: { zh: "渔夫", en: "Fisherman" },
      npc7: { zh: "厨师", en: "Chef" },
    };
    
    if (npcId && npcNames[npcId]) {
      return npcNames[npcId][lang] || npcNames[npcId].en || "NPC";
    }
    
    return "NPC";
  }

  // ============ 开场白展示功能 ============

  /**
   * 显示开场白模式的UI
   * 将对话框切换为剧场模式，适合展示开场白
   */
  showIntroMode() {
    const { width } = this.scene.scale;
    const isMobile = width < 768;

    console.log("🎬 [IntroMode] 进入开场白模式");

    // 清空输入容器和消息容器
    if (this.inputContainer) {
      this.inputContainer.innerHTML = "";
    }
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = "";
    }

    // 创建开场白专用容器
    this.introContainer = document.createElement("div");
    this.introContainer.id = "intro-container";
    this.introContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: ${isMobile ? "20px" : "40px"};
      position: relative;
    `;

    // NPC头像（特写）
    const npcAvatar = document.createElement("div");
    npcAvatar.id = "intro-npc-avatar";
    npcAvatar.style.cssText = `
      width: ${isMobile ? "80px" : "120px"};
      height: ${isMobile ? "80px" : "120px"};
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
      border: 3px solid rgba(99, 102, 241, 0.6);
      margin-bottom: ${isMobile ? "20px" : "30px"};
      animation: avatarPulse 3s ease-in-out infinite;
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
    `;

    // 对话文本容器
    const textContainer = document.createElement("div");
    textContainer.id = "intro-text-container";
    textContainer.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: ${isMobile ? "100%" : "800px"};
      margin-bottom: ${isMobile ? "20px" : "40px"};
    `;

    // 对话文本
    const dialogText = document.createElement("div");
    dialogText.id = "intro-dialog-text";
    dialogText.style.cssText = `
      font-size: ${isMobile ? "18px" : "28px"};
      line-height: 1.8;
      color: #e0e7ff;
      text-align: center;
      text-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
      white-space: pre-wrap;
      padding: ${isMobile ? "15px" : "30px"};
      background: rgba(15, 23, 42, 0.5);
      border-radius: ${isMobile ? "12px" : "20px"};
      border: 1px solid rgba(99, 102, 241, 0.3);
      min-height: ${isMobile ? "150px" : "200px"};
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    textContainer.appendChild(dialogText);

    // 进度指示器
    const progressIndicator = document.createElement("div");
    progressIndicator.id = "intro-progress";
    progressIndicator.style.cssText = `
      display: flex;
      gap: 12px;
      margin-bottom: ${isMobile ? "15px" : "20px"};
    `;

    // 继续提示
    const continueHint = document.createElement("div");
    continueHint.id = "intro-continue-hint";
    continueHint.innerHTML = this.scene.playerData?.language === "zh" 
      ? "点击屏幕继续 ▼" 
      : "Tap to continue ▼";
    continueHint.style.cssText = `
      font-size: ${isMobile ? "14px" : "18px"};
      color: rgba(99, 102, 241, 0.8);
      animation: bounce 2s ease-in-out infinite;
      cursor: pointer;
    `;

    this.introContainer.appendChild(npcAvatar);
    this.introContainer.appendChild(textContainer);
    this.introContainer.appendChild(progressIndicator);
    this.introContainer.appendChild(continueHint);

    // 插入到消息容器位置
    if (this.messagesContainer) {
      this.messagesContainer.style.display = "none";
      this.messagesContainer.parentNode.insertBefore(this.introContainer, this.messagesContainer);
    }

    // 添加CSS动画
    this.addIntroAnimations();
  }

  /**
   * 显示单个开场白段落
   * @param {string} text - 要显示的文本
   * @param {number} currentSegment - 当前段落索引（从1开始）
   * @param {number} totalSegments - 总段落数
   * @param {Object} options - 配置选项
   */
  async showIntroSegment(text, currentSegment, totalSegments, options = {}) {
    const {
      typing = true,
      pauseAfter = 1000
    } = options;

    console.log(`🎬 [IntroSegment] 显示段落 ${currentSegment}/${totalSegments}`);

    // 更新进度指示器
    const progressContainer = document.getElementById("intro-progress");
    if (progressContainer) {
      progressContainer.innerHTML = "";
      for (let i = 1; i <= totalSegments; i++) {
        const dot = document.createElement("div");
        dot.style.cssText = `
          width: ${i === currentSegment ? "12px" : "8px"};
          height: ${i === currentSegment ? "12px" : "8px"};
          border-radius: 50%;
          background: ${i === currentSegment 
            ? "rgba(99, 102, 241, 1)" 
            : i < currentSegment 
              ? "rgba(99, 102, 241, 0.5)" 
              : "rgba(99, 102, 241, 0.2)"};
          transition: all 0.3s ease;
        `;
        progressContainer.appendChild(dot);
      }
    }

    // 显示文本
    const textElem = document.getElementById("intro-dialog-text");
    if (textElem) {
      if (typing) {
        await this.typewriterEffect(text, textElem);
      } else {
        textElem.textContent = text;
      }

      // 暂停
      if (pauseAfter > 0) {
        await this.sleep(pauseAfter);
      }
    }
  }

  /**
   * 打字机效果
   * @param {string} text - 要显示的文本
   * @param {HTMLElement} element - 目标DOM元素
   */
  async typewriterEffect(text, element = null) {
    const targetElem = element || document.getElementById("intro-dialog-text");
    if (!targetElem) return;

    targetElem.textContent = "";
    
    const speed = 50; // 每个字符50ms
    const pauseOnPunctuation = {
      "。": 400,
      ".": 400,
      "！": 300,
      "!": 300,
      "？": 300,
      "?": 300,
      "…": 600,
      "\n": 200,
      "，": 150,
      ",": 150
    };

    for (let i = 0; i < text.length; i++) {
      targetElem.textContent += text[i];
      
      const char = text[i];
      const pause = pauseOnPunctuation[char] || speed;
      
      await this.sleep(pause);
    }
  }

  /**
   * 等待玩家点击继续
   * @returns {Promise} 当玩家点击后resolve
   */
  waitForContinue() {
    return new Promise((resolve) => {
      const continueHint = document.getElementById("intro-continue-hint");
      const introContainer = document.getElementById("intro-container");
      
      const clickHandler = () => {
        // 移除事件监听器
        if (continueHint) continueHint.removeEventListener("click", clickHandler);
        if (introContainer) introContainer.removeEventListener("click", clickHandler);
        
        console.log("👆 [IntroMode] 玩家点击继续");
        resolve();
      };

      // 点击继续提示或整个开场白容器都可以继续
      if (continueHint) {
        continueHint.addEventListener("click", clickHandler);
      }
      if (introContainer) {
        introContainer.addEventListener("click", clickHandler);
      }
    });
  }

  /**
   * 退出开场白模式
   */
  exitIntroMode() {
    console.log("🎬 [IntroMode] 退出开场白模式");

    // 移除开场白容器
    if (this.introContainer) {
      this.introContainer.remove();
      this.introContainer = null;
    }

    // 恢复消息容器
    if (this.messagesContainer) {
      this.messagesContainer.style.display = "flex";
    }
  }

  /**
   * 显示开场白跳过提示（非首次见面）
   * @param {string} npcId - NPC ID
   * @returns {Promise<boolean>} true表示跳过，false表示重看
   */
  showIntroSkipPrompt(npcId) {
    return new Promise((resolve) => {
      const lang = this.scene.playerData?.language || "zh";
      
      const promptText = lang === "zh" 
        ? "是否重新观看开场白？" 
        : "Watch the intro again?";
      
      const skipText = lang === "zh" ? "跳过" : "Skip";
      const watchText = lang === "zh" ? "重看" : "Watch";

      // 显示简短对话
      this.addMessage("NPC", promptText);

      // 显示按钮
      this.clearButtons();
      
      const buttonContainer = document.createElement("div");
      buttonContainer.style.cssText = `
        display: flex;
        gap: 15px;
        padding: 20px;
        justify-content: center;
      `;

      const createButton = (text, isSkip) => {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.style.cssText = `
          padding: 15px 30px;
          font-size: 18px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          ${isSkip 
            ? "background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #fca5a5;" 
            : "background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.5); color: #c7d2fe;"}
        `;
        btn.onclick = () => {
          buttonContainer.remove();
          resolve(isSkip);
        };
        return btn;
      };

      buttonContainer.appendChild(createButton(watchText, false));
      buttonContainer.appendChild(createButton(skipText, true));

      this.inputContainer.appendChild(buttonContainer);
    });
  }

  /**
   * 添加开场白相关的CSS动画
   */
  addIntroAnimations() {
    // 检查是否已添加
    if (document.getElementById("intro-animations-style")) return;

    const style = document.createElement("style");
    style.id = "intro-animations-style";
    style.textContent = `
      @keyframes avatarPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
