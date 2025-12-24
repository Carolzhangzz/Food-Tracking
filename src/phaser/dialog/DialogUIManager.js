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
    const margin = isMobile ? "20px" : "40px";
    this.dialogContainer.style.cssText = `
      position: fixed;
      left: ${margin};
      top: ${margin};
      right: ${margin};
      bottom: ${margin};
      width: auto;
      height: auto;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.92) 100%);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 2px solid rgba(99, 102, 241, 0.4);
      border-radius: ${isMobile ? "20px" : "24px"};
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset,
        0 0 60px rgba(99, 102, 241, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 1000;
      animation: fadeIn 0.3s ease-out;
    `;

    // 创建标题栏
    const header = document.createElement("div");
    header.style.cssText = `
      padding: ${isMobile ? "20px" : "24px"} ${isMobile ? "24px" : "32px"};
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(129, 140, 248, 0.15) 100%);
      border-bottom: 2px solid rgba(99, 102, 241, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    `;

    const npcName = document.createElement("div");
    npcName.id = "dialog-npc-name";
    npcName.textContent = this.scene.npcData?.name || "NPC";
    npcName.style.cssText = `
      font-size: ${isMobile ? "28px" : "32px"};
      font-weight: 700;
      color: #e0e7ff;
      text-shadow: 0 2px 10px rgba(99, 102, 241, 0.6);
      letter-spacing: 0.5px;
    `;

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
      width: ${isMobile ? "40px" : "44px"};
      height: ${isMobile ? "40px" : "44px"};
      border-radius: 50%;
      border: 2px solid rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      font-size: ${isMobile ? "22px" : "24px"};
      cursor: pointer;
      transition: all 0.2s;
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
      padding: ${isMobile ? "20px 24px" : "32px 40px"};
      display: flex;
      flex-direction: column;
      gap: ${isMobile ? "16px" : "20px"};
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

    // 创建输入区域容器（全屏优化）
    this.inputContainer = document.createElement("div");
    this.inputContainer.id = "dialog-input-area";
    this.inputContainer.style.cssText = `
      padding: ${isMobile ? "20px 24px" : "24px 40px"};
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%);
      border-top: 2px solid rgba(99, 102, 241, 0.3);
      min-height: ${isMobile ? "100px" : "120px"};
      display: flex;
      align-items: center;
      gap: ${isMobile ? "12px" : "16px"};
      flex-shrink: 0;
    `;

    // 组装UI
    this.dialogContainer.appendChild(header);
    this.dialogContainer.appendChild(this.messagesContainer);
    this.dialogContainer.appendChild(this.inputContainer);
    document.body.appendChild(this.dialogContainer);

    console.log("✅ 现代化对话框创建完成");
  }

  // 添加消息到对话历史
  addMessage(speaker, text, options = {}) {
    if (!this.messagesContainer) return;

    const { width } = this.scene.scale;
    const isMobile = width < 768;

    const messageDiv = document.createElement("div");
    const isNPC = speaker === "NPC";
    const isSystem = speaker === "System";

    // 获取NPC的实际名字
    const npcDisplayName = this.getNPCDisplayName();

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
      messageDiv.textContent = text;
    } else {
      // NPC或玩家消息
      messageDiv.style.cssText = `
        display: flex;
        justify-content: ${isNPC ? "flex-start" : "flex-end"};
        animation: messageSlideIn 0.3s ease-out;
      `;

      const bubble = document.createElement("div");
      bubble.style.cssText = `
        max-width: ${isMobile ? "90%" : "80%"};
        padding: ${isMobile ? "14px 18px" : "16px 24px"};
        border-radius: ${isNPC ? "24px 24px 24px 6px" : "24px 24px 6px 24px"};
        background: ${
          isNPC
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(129, 140, 248, 0.2) 100%)"
            : "linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(74, 222, 128, 0.2) 100%)"
        };
        border: 2px solid ${
          isNPC ? "rgba(99, 102, 241, 0.4)" : "rgba(34, 197, 94, 0.4)"
        };
        box-shadow: ${
          isNPC
            ? "0 6px 16px rgba(99, 102, 241, 0.2)"
            : "0 6px 16px rgba(34, 197, 94, 0.2)"
        };
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      `;

      const speakerLabel = document.createElement("div");
      speakerLabel.textContent = isNPC ? npcDisplayName : (this.scene.playerData?.language === "zh" ? "你" : "You");
      speakerLabel.style.cssText = `
        font-size: ${isMobile ? "15px" : "16px"};
        color: ${isNPC ? "rgba(165, 180, 252, 0.9)" : "rgba(134, 239, 172, 0.9)"};
        font-weight: 600;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      `;

      const textContent = document.createElement("div");
      textContent.textContent = text;
      textContent.style.cssText = `
        font-size: ${isMobile ? "20px" : "22px"};
        color: #f1f5f9;
        line-height: 1.7;
        word-wrap: break-word;
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
      padding: ${isMobile ? "12px 20px" : "14px 24px"};
      border-radius: 20px 20px 20px 4px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(129, 140, 248, 0.1) 100%);
      border: 1px solid rgba(99, 102, 241, 0.25);
      display: flex;
      gap: 6px;
      align-items: center;
    `;

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div");
      dot.style.cssText = `
        width: 8px;
        height: 8px;
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

    // 创建按钮容器（全屏优化）
    const buttonsWrapper = document.createElement("div");
    buttonsWrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${isMobile ? "12px" : "14px"};
      width: 100%;
      max-width: ${isMobile ? "100%" : "1200px"};
      margin: 0 auto;
    `;

    options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "dialog-button";
      button.textContent = option.text;
      button.style.cssText = `
        width: 100%;
        padding: ${isMobile ? "18px 24px" : "20px 28px"};
        font-size: ${isMobile ? "20px" : "22px"};
        font-weight: 600;
        color: #ffffff;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.7) 0%, rgba(129, 140, 248, 0.6) 100%);
        border: 2px solid rgba(99, 102, 241, 0.5);
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      `;

      button.onclick = () => {
        // 添加玩家选择到历史
        this.addMessage("Player", option.text);
        
        // 如果是"其他"选项，显示输入框
        if (option.isOther) {
          this.showInputBox(callback);
        } else {
          callback(option.value);
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
      padding: ${isMobile ? "18px 20px" : "20px 24px"};
      font-size: ${isMobile ? "20px" : "22px"};
      color: #f1f5f9;
      background: rgba(15, 23, 42, 0.7);
      border: 2px solid rgba(99, 102, 241, 0.4);
      border-radius: 14px;
      transition: all 0.3s;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;

    const submitBtn = document.createElement("button");
    submitBtn.textContent = this.scene.playerData?.language === "zh" ? "发送" : "Send";
    submitBtn.style.cssText = `
      padding: ${isMobile ? "18px 32px" : "20px 40px"};
      font-size: ${isMobile ? "20px" : "22px"};
      font-weight: 700;
      color: #ffffff;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(74, 222, 128, 0.7) 100%);
      border: 2px solid rgba(34, 197, 94, 0.6);
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4);
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
        this.addMessage("Player", value);
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
}
