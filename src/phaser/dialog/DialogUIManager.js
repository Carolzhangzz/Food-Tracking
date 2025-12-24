// src/phaser/dialog/DialogUIManager.js
// 对话UI管理器 - 处理对话框、按钮、输入框等UI元素

export default class DialogUIManager {
  constructor(scene) {
    this.scene = scene;
    this.dialogBox = null;
    this.dialogText = null;
    this.continueHint = null;
    this.statusText = null;
    this.returnButton = null;
    this.buttons = [];
    this.textarea = null;
  }

  // 创建对话框UI
  createDialogBox() {
    const { width, height } = this.scene.scale;
    const isMobile = width < 768;

    // 对话框尺寸
    const boxPadding = Math.min(width * 0.05, 40);
    const boxW = width - boxPadding * 2;
    const boxH = Math.min(height * 0.5, 400);
    const boxX = boxPadding;
    const boxY = (height - boxH) / 2;

    console.log(`📐 创建对话框: ${boxW}x${boxH} at (${boxX}, ${boxY})`);

    // 创建对话框背景
    this.dialogBox = this.scene.add.graphics();

    // 阴影
    this.dialogBox.fillStyle(0x000000, 0.4);
    this.dialogBox.fillRoundedRect(boxX + 6, boxY + 6, boxW, boxH, 16);

    // 主背景
    this.dialogBox.fillStyle(0x0f172a, 0.98);
    this.dialogBox.fillRoundedRect(boxX, boxY, boxW, boxH, 16);

    // 渐变边框
    this.dialogBox.lineStyle(4, 0x6366f1, 0.9);
    this.dialogBox.strokeRoundedRect(boxX, boxY, boxW, boxH, 16);

    // 内发光
    this.dialogBox.lineStyle(2, 0x818cf8, 0.6);
    this.dialogBox.strokeRoundedRect(boxX + 3, boxY + 3, boxW - 6, boxH - 6, 14);

    this.dialogBox.setDepth(10);
    this.dialogBox.setScrollFactor(0);

    // 文本区域
    const textPadding = 30;
    const textY = boxY + textPadding;
    const textW = boxW - textPadding * 2;
    const fontSize = Math.min(20, Math.max(16, width / 50));

    this.dialogText = this.scene.add
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
    this.continueHint = this.scene.add.text(hintX, hintY, "▼", {
      fontSize: `${fontSize + 4}px`,
      fontFamily: "monospace",
      fill: "#fbbf24",
      stroke: "#92400e",
      strokeThickness: 2,
    });
    this.continueHint.setOrigin(0.5).setVisible(false).setDepth(15).setScrollFactor(0);
    this.continueHint.setShadow(0, 2, "#000000", 4, false, true);

    // 动画
    this.scene.tweens.add({
      targets: this.continueHint,
      alpha: { from: 1, to: 0.4 },
      y: { from: hintY, to: hintY + 5 },
      duration: 800,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    return {
      x: boxX + textPadding,
      y: textY,
      width: textW,
      height: boxH - textPadding * 2 - 40,
    };
  }

  // 创建返回按钮
  createReturnButton() {
    const isMobile = this.scene.scale.width < 768;
    const lang = this.scene.playerData?.language || "zh";
    const returnText = lang === "zh" ? "← 返回地图" : "← Back to Map";

    const buttonX = isMobile ? 20 : 40;
    const buttonY = isMobile ? 20 : 40;
    const fontSize = isMobile ? "14px" : "18px";
    const padding = isMobile ? { x: 8, y: 6 } : { x: 12, y: 8 };

    this.returnButton = this.scene.add.text(buttonX, buttonY, returnText, {
      fontSize,
      fontFamily: "monospace",
      fill: "#667eea",
      backgroundColor: "#2a2a2a",
      padding,
    });

    this.returnButton
      .setDepth(100)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.returnToMainScene())
      .on("pointerover", () => this.returnButton.setTint(0x818cf8))
      .on("pointerout", () => this.returnButton.clearTint());
  }

  // 创建状态文本
  createStatusText() {
    const { width, height } = this.scene.scale;
    const isMobile = width < 768;
    const statusY = isMobile ? height - 30 : height - 40;

    this.statusText = this.scene.add.text(width / 2, statusY, "", {
      fontSize: isMobile ? "12px" : "14px",
      fontFamily: "monospace",
      fill: "#94a3b8",
      align: "center",
    });
    this.statusText.setOrigin(0.5);
    this.statusText.setDepth(50);
    this.statusText.setScrollFactor(0);
  }

  // 显示按钮选项
  showButtons(options, callback) {
    this.clearButtons();

    const { width, height } = this.scene.scale;
    const startY = height * 0.6;
    const buttonSpacing = 70;
    const fontSize = "18px";

    options.forEach((option, index) => {
      const buttonY = startY + index * buttonSpacing;
      
      const button = this.scene.add.text(width / 2, buttonY, option.text, {
        fontSize: fontSize,
        fontFamily: "monospace",
        fill: "#e2e8f0",
        backgroundColor: "#4a5568",
        padding: { x: 20, y: 12 },
      });

      button
        .setOrigin(0.5)
        .setDepth(25)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.clearButtons();
          callback(option.value);
        })
        .on("pointerover", () => {
          button.setTint(0x667eea);
          button.setScale(1.05);
        })
        .on("pointerout", () => {
          button.clearTint();
          button.setScale(1);
        });

      this.buttons.push(button);
    });
  }

  // 清除所有按钮
  clearButtons() {
    this.buttons.forEach(button => {
      if (button && button.destroy) {
        button.destroy();
      }
    });
    this.buttons = [];
  }

  // 更新对话文本
  updateDialogText(text) {
    if (this.dialogText) {
      this.dialogText.setText(text);
    }
  }

  // 显示/隐藏继续提示
  showContinueHint(visible) {
    if (this.continueHint) {
      this.continueHint.setVisible(visible);
    }
  }

  // 更新状态文本
  updateStatus(text) {
    if (this.statusText) {
      this.statusText.setText(text);
    }
  }

  // 销毁所有UI元素
  destroy() {
    if (this.dialogBox) this.dialogBox.destroy();
    if (this.dialogText) this.dialogText.destroy();
    if (this.continueHint) this.continueHint.destroy();
    if (this.statusText) this.statusText.destroy();
    if (this.returnButton) this.returnButton.destroy();
    this.clearButtons();
  }
}

