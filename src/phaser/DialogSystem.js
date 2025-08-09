// DialogSystem.js - 修复后的移动端对话系统
import Phaser from "phaser";

export default class DialogSystem {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.currentNPC = null;
        this.isTyping = false;
        this.buttons = [];
        this.inputBox = null;
        this.sendBtn = null;
        this.questionIndex = 0;
        this.currentMeal = null;
        this.mealResponses = {};

        // UI元素
        this.dialogBox = null;
        this.speakerName = null;
        this.textObject = null;
        this.continueHint = null;
        this.hint = null;
        this.typewriterTween = null;
        this.curText = "";
        this.isMealDialog = false; // 新增：标记是否为餐食相关对话
        this.currentMealType = null; // 新增：记录当前是早餐/午餐/晚餐
        this.eventListeners = new Map();

        // 监听窗口大小变化
        this.resizeHandler = () => this.handleResize();
        window.addEventListener("resize", this.resizeHandler);
        window.addEventListener("orientationchange", this.resizeHandler);
    }

    // 新增：注册事件监听的方法
on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
        this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
}

// 新增：触发事件的方法
emit(eventName, ...args) {
    const callbacks = this.eventListeners.get(eventName);
    if (callbacks) {
        callbacks.forEach(callback => callback.apply(this, args));
    }
}


    handleResize() {
        if (this.isActive) {
            // 重新创建UI以适应新的屏幕尺寸
            this.recreateUI();
        }
    }

    recreateUI() {
        // 保存当前状态
        const currentText = this.textObject ? this.textObject.text : "";
        const isHintVisible = this.continueHint ? this.continueHint.visible : false;

        // 清除旧UI
        this.destroyUIElements();

        // 重新创建UI
        this.createDialogUI();

        // 恢复状态
        if (currentText) {
            this.textObject.setText(currentText);
        }
        if (this.continueHint) {
            this.continueHint.setVisible(isHintVisible);
        }
    }

    setNPCManager(npcManager) {
        this.npcManager = npcManager;
    }

    isDialogActive() {
        return this.isActive;
    }

    startDialog(npcId, options = {}) {
        if (this.isActive) {
            console.log("Dialog already active, ignoring new request");
            return;
        }

        console.log("Starting dialog with NPC:", npcId);

        this.currentNPC = npcId;
        this.isActive = true;
        this.questionIndex = 0;
        this.mealResponses = {};

        this.isMealDialog = options.isMealDialog || false;
        this.currentMealType = options.mealType || null;

        try {
            this.createDialogUI();

            // 开始对话
            this.scene.time.delayedCall(500, () => {
                this.nextLine();
            });

            console.log("Dialog UI created successfully");
        } catch (error) {
            console.error("Error starting dialog:", error);
            this.endDialog(); // 清理状态
        }
    }

    createDialogUI() {
        console.log("Creating dialog UI...");

        const {width, height} = this.scene.scale;

        // 检测设备类型和方向
        const isMobile = width < 768 || "ontouchstart" in window;
        const isLandscape = width > height;
        const isSmallScreen = height < 600;

        // 自适应计算对话框尺寸
        let boxHeight, boxY, safeAreaBottom;

        if (isSmallScreen || (isMobile && isLandscape)) {
            // 小屏幕或横屏移动设备
            boxHeight = Math.min(height * 0.4, 180);
            safeAreaBottom = 20;
        } else if (isMobile) {
            // 竖屏移动设备
            boxHeight = Math.min(height * 0.35, 220);
            safeAreaBottom = Math.max(height * 0.05, 30);
        } else {
            // 桌面设备
            boxHeight = Math.min(height * 0.3, 200);
            safeAreaBottom = 50;
        }

        // 计算边距和宽度
        const margin = Math.min(width * 0.02, 20);
        const boxWidth = width - margin * 2;
        boxY = height - boxHeight - safeAreaBottom;

        // 确保对话框不会太靠上
        boxY = Math.max(boxY, height * 0.4);

        console.log(`Dialog box dimensions: ${boxWidth}x${boxHeight} at ${margin},${boxY}`);

        try {
            // 创建对话框背景
            this.dialogBox = this.scene.add.graphics();
            this.dialogBox.fillStyle(0x1a1a2e, 0.95);
            this.dialogBox.fillRoundedRect(margin, boxY, boxWidth, boxHeight, 8);
            this.dialogBox.lineStyle(2, 0x4a5568);
            this.dialogBox.strokeRoundedRect(margin, boxY, boxWidth, boxHeight, 8);
            this.dialogBox.setScrollFactor(0);
            this.dialogBox.setDepth(50);

            // 说话人名字
            const npc = this.npcManager.getNPCById(this.currentNPC);
            if (!npc) {
                throw new Error(`NPC not found: ${this.currentNPC}`);
            }

            const nameSize = this.calculateFontSize(width, height, "name");
            this.speakerName = this.scene.add.text(margin + 15, boxY + 10, npc.name, {
                fontSize: `${nameSize}px`,
                fontFamily: "monospace",
                fill: "#ffd700",
                fontStyle: "bold",
            });
            this.speakerName.setScrollFactor(0);
            this.speakerName.setDepth(51);

            // 主要文本
            const textSize = this.calculateFontSize(width, height, "text");
            const textPadding = Math.max(width * 0.02, 15);
            const textY = boxY + 35 + (isSmallScreen ? -5 : 0);

            this.textObject = this.scene.add.text(margin + textPadding, textY, "", {
                fontSize: `${textSize}px`,
                fontFamily: "monospace",
                fill: "#e2e8f0",
                wordWrap: {width: boxWidth - textPadding * 2},
                lineSpacing: isSmallScreen ? 2 : 4,
            });
            this.textObject.setScrollFactor(0);
            this.textObject.setDepth(51);

            // 继续提示符
            const hintSize = this.calculateFontSize(width, height, "hint");
            this.continueHint = this.scene.add.text(
                margin + boxWidth - 25,
                boxY + boxHeight - 20,
                "▼",
                {
                    fontSize: `${hintSize}px`,
                    fontFamily: "monospace",
                    fill: "#ffd700",
                }
            );
            this.continueHint.setScrollFactor(0);
            this.continueHint.setDepth(51);
            this.continueHint.setVisible(false);

            // 提示符动画
            this.scene.tweens.add({
                targets: this.continueHint,
                alpha: {from: 1, to: 0.3},
                duration: 1000,
                yoyo: true,
                repeat: -1,
            });

            // 底部提示文字
            const instructionSize = this.calculateFontSize(width, height, "instruction");
            const instructionY = boxY - 10;
            this.hint = this.scene.add.text(
                width / 2,
                instructionY,
                this.scene.playerData.language === "zh"
                    ? "点击继续对话"
                    : "Tap to continue",
                {
                    fontSize: `${instructionSize}px`,
                    fontFamily: "monospace",
                    fill: "#718096",
                    align: "center",
                }
            );
            this.hint.setOrigin(0.5, 1);
            this.hint.setScrollFactor(0);
            this.hint.setDepth(51);

            // 设置对话框点击区域
            this.dialogBounds = new Phaser.Geom.Rectangle(margin, boxY, boxWidth, boxHeight);

            // 监听点击事件
            this.scene.input.on("pointerdown", this.handlePointerDown, this);

            console.log("Dialog UI created successfully");

        } catch (error) {
            console.error("Error creating dialog UI:", error);
            this.destroyUIElements();
            throw error;
        }
    }

    calculateFontSize(width, height, type) {
        const baseSize = Math.min(width, height);
        const isMobile = width < 768;

        switch (type) {
            case "name":
                return Math.max(Math.min(baseSize * 0.04, 20), 14);
            case "text":
                return Math.max(Math.min(baseSize * 0.035, 18), 12);
            case "hint":
                return Math.max(Math.min(baseSize * 0.03, 16), 12);
            case "instruction":
                return Math.max(Math.min(baseSize * 0.025, 14), 10);
            case "button":
                return Math.max(Math.min(baseSize * 0.03, 16), 12);
            default:
                return 14;
        }
    }

    handlePointerDown(pointer) {
        // 检查是否点击了对话框区域
        if (this.dialogBox && this.isActive && this.dialogBounds) {
            if (this.dialogBounds.contains(pointer.x, pointer.y)) {
                console.log("Dialog area clicked");
                this.nextLine();
            }
        }
    }

    async nextLine() {
        if (!this.isActive) {
            console.log("Dialog not active, ignoring nextLine");
            return;
        }

        console.log("Processing next line...");

        if (this.isTyping) {
            this.skipTyping();
            return;
        }

        // 收集用户输入
        const userInput = this.inputBox ? this.inputBox.value.trim() : "";
        this.destroyInputElements();

        // 如果有输入，保存到响应中
        if (userInput && this.questionIndex > 0) {
            this.mealResponses[`q${this.questionIndex}`] = userInput;
        }

        try {
            // 处理NPC对话
            const result = await this.npcManager.handleNPCDialog(this.currentNPC, userInput);
            console.log("Dialog result:", result);

            if (result.next) {
                this.typeText(result.response, () => {
                    if (result.buttons && result.buttons.length > 0) {
                        this.createButtonOptions(result.buttons);
                    } else if (result.requireInput) {
                        this.createTextInput();
                    } else {
                        // 自动继续到下一个问题
                        this.scene.time.delayedCall(1000, () => {
                            this.nextLine();
                        });
                    }
                });
            } else {
                // 对话结束
                this.typeText(result.response, () => {
                    this.scene.time.delayedCall(2000, () => {
                        this.endDialog();
                    });
                });
            }
        } catch (error) {
            console.error("Error in nextLine:", error);
            // 显示错误信息并结束对话
            this.typeText(
                this.scene.playerData.language === "zh"
                    ? "对话出现错误，请重试。"
                    : "Dialog error occurred, please try again.",
                () => {
                    this.scene.time.delayedCall(2000, () => {
                        this.endDialog();
                    });
                }
            );
        }
    }

    typeText(text, callback) {
        console.log("Typing text:", text.substring(0, 50) + "...");

        this.isTyping = true;
        if (!this.textObject) {
            console.error("Text object not found!");
            if (callback) callback();
            return;
        }

        this.textObject.setText("");
        this.continueHint.setVisible(false);
        this.curText = text;

        let currentChar = 0;
        const totalChars = text.length;

        this.typewriterTween = this.scene.tweens.add({
            targets: {value: 0},
            value: totalChars,
            duration: totalChars * 30,
            ease: "none",
            onUpdate: (tween) => {
                const progress = Math.floor(tween.getValue());
                if (progress > currentChar) {
                    currentChar = progress;
                    this.textObject.setText(text.substring(0, currentChar));
                }
            },
            onComplete: () => {
                this.isTyping = false;
                this.continueHint.setVisible(true);
                if (callback) callback();
            },
        });
    }

    skipTyping() {
        if (this.isTyping && this.typewriterTween) {
            this.typewriterTween.stop();
            this.textObject.setText(this.curText);
            this.isTyping = false;
            this.continueHint.setVisible(true);
        }
    }

    createTextInput() {
        console.log("Creating text input...");

        const {width, height} = this.scene.scale;
        const isMobile = width < 768;

        // 计算输入框位置
        const dialogBounds = this.dialogBounds;
        const dialogTop = dialogBounds ? dialogBounds.y : height * 0.6;

        // 响应式输入框尺寸
        const inputWidth = Math.min(width * 0.9, 500);
        const inputHeight = isMobile ? 80 : 100;
        const fontSize = Math.max(this.calculateFontSize(width, height, "text"), 16); // 防止iOS缩放

        // 确保输入框在对话框上方
        const inputBottom = dialogTop - 20;
        const inputTop = inputBottom - inputHeight - 40;

        // 创建半透明背景遮罩
        const inputBg = document.createElement("div");
        inputBg.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999;
    `;
        document.body.appendChild(inputBg);

        // 创建多行文本框
        this.inputBox = document.createElement("textarea");
        this.inputBox.placeholder =
            this.scene.playerData.language === "zh"
                ? "请详细描述你的食物记录..."
                : "Please describe your food record in detail...";
        this.inputBox.style.cssText = `
      position: fixed;
      left: 50%;
      top: ${Math.max(inputTop, 50)}px;
      transform: translateX(-50%);
      z-index: 1001;
      width: ${inputWidth}px;
      height: ${inputHeight}px;
      font-size: ${fontSize}px;
      padding: 10px;
      border: 2px solid #4a5568;
      border-radius: 8px;
      background: #2a2a2a;
      color: #e2e8f0;
      font-family: monospace;
      outline: none;
      resize: none;
      box-sizing: border-box;
    `;
        document.body.appendChild(this.inputBox);

        // 创建发送按钮
        this.sendBtn = document.createElement("button");
        this.sendBtn.innerText =
            this.scene.playerData.language === "zh" ? "发送" : "Send";
        this.sendBtn.style.cssText = `
      position: fixed;
      left: 50%;
      top: ${Math.max(inputTop + inputHeight + 10, 160)}px;
      transform: translateX(-50%);
      z-index: 1001;
      padding: 12px 30px;
      font-size: ${fontSize}px;
      border: none;
      border-radius: 8px;
      background: #667eea;
      color: #ffffff;
      cursor: pointer;
      font-family: monospace;
      font-weight: bold;
      touch-action: manipulation;
    `;
        document.body.appendChild(this.sendBtn);

        // 存储背景元素以便清理
        this.inputBg = inputBg;

        // 事件监听
        this.sendBtn.onclick = () => {
            console.log("Send button clicked");
            this.scene.input.on("pointerdown", this.handlePointerDown, this);
            this.nextLine();
        };

        // 移动端优化：点击背景不关闭键盘（避免意外关闭）
        inputBg.onclick = (e) => {
            if (e.target === inputBg) {
                // 什么都不做，保持输入框焦点
            }
        };

        // 暂时禁用场景输入
        this.scene.input.off("pointerdown", this.handlePointerDown, this);

        // 延迟聚焦，避免立即弹出键盘
        setTimeout(() => {
            if (this.inputBox && document.body.contains(this.inputBox)) {
                this.inputBox.focus();
            }
        }, 300);
    }

    createButtonOptions(buttons) {
        console.log("Creating button options:", buttons);

        const {width, height} = this.scene.scale;
        const isMobile = width < 768;

        // 获取对话框位置
        const dialogBounds = this.dialogBounds;
        const dialogTop = dialogBounds ? dialogBounds.y : height * 0.6;

        // 响应式按钮布局
        const buttonHeight = Math.max(height * 0.06, 40);
        const fontSize = this.calculateFontSize(width, height, "button");

        // 计算按钮布局
        let buttonWidth, buttonLayout;

        if (isMobile || width < 600) {
            // 移动端：垂直布局
            buttonWidth = Math.min(width * 0.8, 300);
            buttonLayout = "vertical";
        } else {
            // 桌面端：水平布局
            buttonWidth = Math.min(width * 0.25, 180);
            buttonLayout = "horizontal";
        }

        // 暂时禁用场景输入
        this.scene.input.off("pointerdown", this.handlePointerDown, this);
        this.buttons = [];

        if (buttonLayout === "vertical") {
            // 垂直布局
            const startY = dialogTop - buttons.length * (buttonHeight + 10) - 20;

            buttons.forEach((buttonText, index) => {
                const buttonY = Math.max(startY + index * (buttonHeight + 10), 100);
                this.createButton(
                    buttonText,
                    width / 2 - buttonWidth / 2,
                    buttonY,
                    buttonWidth,
                    buttonHeight,
                    fontSize
                );
            });
        } else {
            // 水平布局
            const totalWidth = buttons.length * buttonWidth + (buttons.length - 1) * 15;
            const startX = (width - totalWidth) / 2;
            const buttonY = Math.max(dialogTop - buttonHeight - 20, 120);

            buttons.forEach((buttonText, index) => {
                const buttonX = startX + index * (buttonWidth + 15);
                this.createButton(buttonText, buttonX, buttonY, buttonWidth, buttonHeight, fontSize);
            });
        }
    }

    createButton(text, x, y, width, height, fontSize) {
        const buttonBg = this.scene.add.graphics();
        buttonBg.fillStyle(0x4a5568, 0.9);
        buttonBg.fillRoundedRect(0, 0, width, height, 8);
        buttonBg.lineStyle(2, 0x718096);
        buttonBg.strokeRoundedRect(0, 0, width, height, 8);

        const buttonTextObj = this.scene.add.text(width / 2, height / 2, text, {
            fontSize: `${fontSize}px`,
            fontFamily: "monospace",
            fill: "#e2e8f0",
            align: "center",
            wordWrap: {width: width - 20},
        });
        buttonTextObj.setOrigin(0.5);

        const button = this.scene.add.container(x, y, [buttonBg, buttonTextObj]);
        button.setSize(width, height);
        button.setInteractive({useHandCursor: true});
        button.setScrollFactor(0);
        button.setDepth(60);

        // 按钮交互效果
        button.on("pointerover", () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x667eea, 0.9);
            buttonBg.fillRoundedRect(0, 0, width, height, 8);
            buttonBg.lineStyle(2, 0xffd700);
            buttonBg.strokeRoundedRect(0, 0, width, height, 8);
            button.setScale(1.05);
        });

        button.on("pointerout", () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x4a5568, 0.9);
            buttonBg.fillRoundedRect(0, 0, width, height, 8);
            buttonBg.lineStyle(2, 0x718096);
            buttonBg.strokeRoundedRect(0, 0, width, height, 8);
            button.setScale(1);
        });

        button.on("pointerdown", () => {
            console.log("Button clicked:", text);
            this.inputBox = {value: text};
            this.cleanupButtons();
            this.scene.input.on("pointerdown", this.handlePointerDown, this);
            this.nextLine();
        });

        this.buttons.push(button);
    }

    cleanupButtons() {
        this.buttons.forEach((btn) => {
            if (btn && btn.destroy) {
                btn.destroy();
            }
        });
        this.buttons = [];
    }

    destroyInputElements() {
        if (this.inputBox && this.inputBox.parentNode) {
            this.inputBox.parentNode.removeChild(this.inputBox);
            this.inputBox = null;
        }
        if (this.sendBtn && this.sendBtn.parentNode) {
            this.sendBtn.parentNode.removeChild(this.sendBtn);
            this.sendBtn = null;
        }
        if (this.inputBg && this.inputBg.parentNode) {
            this.inputBg.parentNode.removeChild(this.inputBg);
            this.inputBg = null;
        }
    }

    destroyUIElements() {
        if (this.dialogBox) {
            this.dialogBox.destroy();
            this.dialogBox = null;
        }
        if (this.speakerName) {
            this.speakerName.destroy();
            this.speakerName = null;
        }
        if (this.textObject) {
            this.textObject.destroy();
            this.textObject = null;
        }
        if (this.continueHint) {
            this.continueHint.destroy();
            this.continueHint = null;
        }
        if (this.hint) {
            this.hint.destroy();
            this.hint = null;
        }
        if (this.typewriterTween) {
            this.typewriterTween.stop();
            this.typewriterTween = null;
        }
    }

    async endDialog() {
        console.log("Ending dialog...");

        this.cleanupButtons();
        this.destroyInputElements();
        this.destroyUIElements();

        // 重置状态
        this.isActive = false;
        this.currentNPC = null;
        this.questionIndex = 0;
        this.mealResponses = {};
        this.isMealDialog = false; // 重置标记
        this.currentMealType = null;

        // 移除事件监听
        this.scene.input.off("pointerdown", this.handlePointerDown, this);

        // 更新玩家数据
        if (this.scene.gridEngine) {
            try {
                const playerPos = this.scene.gridEngine.getPosition("player");
                if (playerPos && this.scene.updatePlayerdata) {
                    this.scene.updatePlayerdata({
                        playLoc: [playerPos.x, playerPos.y],
                    });
                }
            } catch (error) {
                console.warn("Error updating player position:", error);
            }
        }

        console.log("Dialog ended successfully");
        this.emit("dialogEnded", this.getDialogResult());
    }

    getDialogResult() {
    return {
        isMealDialog: this.isMealDialog,
        currentMealType: this.currentMealType,
        currentNPC: this.currentNPC,
        mealResponses: this.mealResponses
    };
}

    // 清理资源
    destroy() {
        console.log("Destroying DialogSystem...");

        window.removeEventListener("resize", this.resizeHandler);
        window.removeEventListener("orientationchange", this.resizeHandler);
        this.endDialog();
    }
}