// DialogSystem.js - 响应式对话系统
export default class DialogSystem {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.currentNPC = null;
        this.isTyping = false;
        this.buttons = [];
        this.inputBox = null;
        this.sendBtn = null;
        
        // UI元素
        this.dialogBox = null;
        this.speakerName = null;
        this.textObject = null;
        this.continueHint = null;
        this.hint = null;
        this.typewriterTween = null;
        this.curText = "";
    }

    setNPCManager(npcManager) {
        this.npcManager = npcManager;
    }

    isDialogActive() {
        return this.isActive;
    }

    startDialog(npcId) {
        if (this.isActive) return;
        
        this.currentNPC = npcId;
        this.isActive = true;
        this.createDialogUI();
        
        // 开始对话
        this.scene.time.delayedCall(500, () => {
            this.nextLine();
        });
    }

    createDialogUI() {
        const { width, height } = this.scene.scale;
        
        // 响应式计算对话框尺寸
        const boxHeight = Math.min(Math.max(height * 0.25, 120), 200);
        const boxY = height - boxHeight - 10;
        const margin = Math.min(width * 0.05, 30);
        const boxWidth = width - (margin * 2);

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
        const nameSize = Math.min(Math.max(width * 0.025, 12), 18);
        this.speakerName = this.scene.add.text(margin + 20, boxY + 15, npc.name, {
            fontSize: `${nameSize}px`,
            fontFamily: 'monospace',
            fill: '#ffd700',
            fontStyle: 'bold'
        });
        this.speakerName.setScrollFactor(0);
        this.speakerName.setDepth(50);

        // 主要文本
        const textSize = Math.min(Math.max(width * 0.02, 14), 20);
        this.textObject = this.scene.add.text(margin + 20, boxY + 45, "", {
            fontSize: `${textSize}px`,
            fontFamily: 'monospace',
            fill: '#e2e8f0',
            wordWrap: { width: boxWidth - 80 },
            lineSpacing: 4
        });
        this.textObject.setScrollFactor(0);
        this.textObject.setDepth(50);

        // 继续提示符
        const hintSize = Math.min(Math.max(width * 0.018, 12), 16);
        this.continueHint = this.scene.add.text(width - 50, boxY + boxHeight - 25, "▼", {
            fontSize: `${hintSize}px`,
            fontFamily: 'monospace',
            fill: '#ffd700'
        });
        this.continueHint.setScrollFactor(0);
        this.continueHint.setDepth(50);

        // 提示符动画
        this.scene.tweens.add({
            targets: this.continueHint,
            alpha: { from: 1, to: 0.3 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // 底部提示文字
        const instructionSize = Math.min(Math.max(width * 0.015, 10), 14);
        this.hint = this.scene.add.text(width / 2, height - 20,
            "Press SPACE or Click to continue", {
            fontSize: `${instructionSize}px`,
            fontFamily: 'monospace',
            fill: '#718096',
            align: 'center'
        });
        this.hint.setOrigin(0.5);
        this.hint.setScrollFactor(0);
        this.hint.setDepth(50);

        // 监听输入
        this.scene.input.keyboard.on("keydown-SPACE", this.nextLine, this);
        this.scene.input.on("pointerdown", this.nextLine, this);
    }

    async nextLine() {
        if (!this.isActive) return;
        
        if (this.isTyping) {
            this.skipTyping();
            return;
        }
        
        // 收集用户输入
        const userInput = this.inputBox ? this.inputBox.value.trim() : "";
        this.destroyInputElements();
        
        // 处理NPC对话
        const result = await this.npcManager.handleNPCDialog(this.currentNPC, userInput);

        if (result.next) {
            this.typeText(result.response, () => {
                if (result.buttons && result.buttons.length > 0) {
                    this.createButtonOptions(result.buttons);
                } else {
                    this.createTextInput();
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
    }

    typeText(text, callback) {
        this.isTyping = true;
        if (!this.textObject) return;
        
        this.textObject.setText('');
        this.continueHint.setVisible(false);
        this.curText = text;
        
        let currentChar = 0;
        const totalChars = text.length;
        
        this.typewriterTween = this.scene.tweens.add({
            targets: { value: 0 },
            value: totalChars,
            duration: totalChars * 35,
            ease: 'none',
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
            }
        });
    }

    skipTyping() {
        if (this.isTyping && this.typewriterTween) {
            this.typewriterTween.stop();
            this.textObject.setText(this.curText);
            this.typewriterTween.complete();
        }
    }

    createTextInput() {
        const { width, height } = this.scene.scale;
        
        // 响应式输入框尺寸
        const inputWidth = Math.min(Math.max(width * 0.6, 200), 400);
        const inputHeight = Math.max(height * 0.05, 35);
        const fontSize = Math.min(Math.max(width * 0.02, 12), 16);
        
        this.inputBox = document.createElement("input");
        this.inputBox.type = "text";
        this.inputBox.placeholder = this.scene.playerData.language === 'zh' ? 
            "请输入内容..." : "Type your response...";
        this.inputBox.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: ${Math.max(height * 0.12, 80)}px;
            transform: translateX(-50%);
            z-index: 1000;
            width: ${inputWidth}px;
            height: ${inputHeight}px;
            font-size: ${fontSize}px;
            padding: ${Math.max(height * 0.01, 5)}px ${Math.max(width * 0.02, 10)}px;
            border: 2px solid #4a5568;
            border-radius: 8px;
            background: #2a2a2a;
            color: #e2e8f0;
            outline: none;
            transition: all 0.3s ease;
            box-sizing: border-box;
        `;
        document.body.appendChild(this.inputBox);

        this.sendBtn = document.createElement("button");
        this.sendBtn.innerText = this.scene.playerData.language === 'zh' ? "发送" : "Send";
        this.sendBtn.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: ${Math.max(height * 0.06, 35)}px;
            transform: translateX(-50%);
            z-index: 1000;
            padding: ${Math.max(height * 0.01, 8)}px ${Math.max(width * 0.03, 20)}px;
            font-size: ${fontSize}px;
            border: none;
            border-radius: 8px;
            background: #4a5568;
            color: #e2e8f0;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: monospace;
        `;
        document.body.appendChild(this.sendBtn);

        // 添加hover效果
        this.inputBox.addEventListener('focus', () => {
            this.inputBox.style.borderColor = '#667eea';
            this.inputBox.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.3)';
        });
        
        this.inputBox.addEventListener('blur', () => {
            this.inputBox.style.borderColor = '#4a5568';
            this.inputBox.style.boxShadow = 'none';
        });

        this.sendBtn.addEventListener('mouseenter', () => {
            this.sendBtn.style.background = '#667eea';
            this.sendBtn.style.transform = 'translateX(-50%) translateY(-2px)';
        });
        
        this.sendBtn.addEventListener('mouseleave', () => {
            this.sendBtn.style.background = '#4a5568';
            this.sendBtn.style.transform = 'translateX(-50%) translateY(0)';
        });

        // 事件监听
        this.sendBtn.onclick = () => {
            this.scene.input.keyboard.on("keydown-SPACE", this.nextLine, this);
            this.scene.input.on("pointerdown", this.nextLine, this);
            this.nextLine();
        };

        this.inputBox.onkeydown = (e) => {
            e.stopPropagation();
            if (e.key === "Enter") this.sendBtn.onclick();
        };

        // 暂时禁用场景输入
        this.scene.input.keyboard.off("keydown-SPACE", this.nextLine, this);
        this.scene.input.off("pointerdown", this.nextLine, this);
        
        this.inputBox.focus();
    }

    createButtonOptions(buttons) {
        const { width, height } = this.scene.scale;
        
        // 响应式按钮布局
        const buttonY = height - Math.max(height * 0.15, 100);
        const buttonWidth = Math.min(Math.max(width * 0.25, 120), 180);
        const buttonHeight = Math.max(height * 0.05, 35);
        const fontSize = Math.min(Math.max(width * 0.018, 12), 16);
        
        // 计算按钮间距和起始位置
        const totalButtonsWidth = buttons.length * buttonWidth;
        const spacing = Math.min((width - totalButtonsWidth) / (buttons.length + 1), 20);
        const startX = (width - totalButtonsWidth - (spacing * (buttons.length - 1))) / 2;

        // 暂时禁用场景输入
        this.scene.input.keyboard.off("keydown-SPACE", this.nextLine, this);
        this.scene.input.off("pointerdown", this.nextLine, this);
        this.buttons = [];

        buttons.forEach((buttonText, index) => {
            const buttonX = startX + (index * (buttonWidth + spacing));
            
            const buttonBg = this.scene.add.graphics();
            buttonBg.fillStyle(0x4a5568, 0.9);
            buttonBg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 8);
            buttonBg.lineStyle(2, 0x718096);
            buttonBg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 8);

            const buttonTextObj = this.scene.add.text(buttonWidth/2, buttonHeight/2, buttonText, {
                fontSize: `${fontSize}px`,
                fontFamily: 'monospace',
                fill: '#e2e8f0',
                align: 'center',
                wordWrap: { width: buttonWidth - 20 }
            });
            buttonTextObj.setOrigin(0.5);

            const button = this.scene.add.container(buttonX, buttonY, [buttonBg, buttonTextObj]);
            button.setSize(buttonWidth, buttonHeight);
            button.setInteractive({ useHandCursor: true });
            button.setScrollFactor(0);
            button.setDepth(60);

            // 按钮交互效果
            button.on('pointerover', () => {
                buttonBg.clear();
                buttonBg.fillStyle(0x667eea, 0.9);
                buttonBg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 8);
                buttonBg.lineStyle(2, 0xffd700);
                buttonBg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 8);
                button.setScale(1.05);
            });

            button.on('pointerout', () => {
                buttonBg.clear();
                buttonBg.fillStyle(0x4a5568, 0.9);
                buttonBg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 8);
                buttonBg.lineStyle(2, 0x718096);
                buttonBg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 8);
                button.setScale(1);
            });

            button.on('pointerdown', () => {
                this.inputBox = { value: buttonText };
                this.cleanupButtons();
                this.scene.input.keyboard.on("keydown-SPACE", this.nextLine, this);
                this.scene.input.on("pointerdown", this.nextLine, this);
                this.nextLine();
            });

            this.buttons.push(button);
        });
    }

    cleanupButtons() {
        this.buttons.forEach(btn => {
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
    }

    endDialog() {
        this.cleanupButtons();
        this.destroyInputElements();
        
        // 销毁UI元素
        if (this.dialogBox) this.dialogBox.destroy();
        if (this.speakerName) this.speakerName.destroy();
        if (this.textObject) this.textObject.destroy();
        if (this.continueHint) this.continueHint.destroy();
        if (this.hint) this.hint.destroy();
        
        // 重置状态
        this.isActive = false;
        this.currentNPC = null;

        // 移除事件监听
        this.scene.input.keyboard.off("keydown-SPACE", this.nextLine, this);
        this.scene.input.off("pointerdown", this.nextLine, this);

        // 更新玩家数据
        if (this.scene.gridEngine) {
            try {
                const playerPos = this.scene.gridEngine.getPosition("player");
                if (playerPos) {
                    this.scene.updatePlayerdata({
                        playLoc: [playerPos.x, playerPos.y]
                    });
                }
            } catch (error) {
                console.warn("Error updating player position:", error);
            }
        }
    }
}