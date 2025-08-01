// UIManager.js - 移动端点击移动版本
import Phaser from "phaser";

export default class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.clues = [];
    this.notifications = [];
    this.progressBar = null;
    this.dayIndicator = null;
    this.createProgressUI();
    this.createActionButtons(); // 创建功能按钮
    
    // 监听屏幕尺寸变化
    this.scene.scale.on("resize", () => {
      this.handleResize();
    });
  }

  handleResize() {
    // 重新定位UI元素
    this.repositionProgressUI();
    this.repositionActionButtons();
  }

  createProgressUI() {
    const { width } = this.scene.scale;
    this.createDayProgressBar();
  }

  createActionButtons() {
    const { width, height } = this.scene.scale;
    
    // // 创建线索日志按钮
    // this.createClueButton();
    
    // 创建移动说明提示（可选）
    this.createMoveHint();
  }

  createClueButton() {
    const { width, height } = this.scene.scale;
    const buttonSize = Math.min(width * 0.12, 60);
    
    // 线索按钮位置（右上角）
    const buttonX = width - buttonSize - 20;
    const buttonY = 80; // 在进度条下方

    // 创建线索按钮背景
    this.clueButtonBg = this.scene.add.graphics();
    this.clueButtonBg.fillStyle(0x4a5568, 0.9);
    this.clueButtonBg.fillCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
    this.clueButtonBg.lineStyle(2, 0xffd700);
    this.clueButtonBg.strokeCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
    this.clueButtonBg.setPosition(buttonX, buttonY);
    this.clueButtonBg.setScrollFactor(0);
    this.clueButtonBg.setDepth(100);

    // 线索按钮图标
    this.clueButtonIcon = this.scene.add.text(
      buttonX + buttonSize / 2,
      buttonY + buttonSize / 2,
      '📋',
      {
        fontSize: Math.min(buttonSize * 0.5, 24) + 'px',
      }
    );
    this.clueButtonIcon.setOrigin(0.5);
    this.clueButtonIcon.setScrollFactor(0);
    this.clueButtonIcon.setDepth(101);

    // 设置按钮交互
    this.clueButtonBg.setInteractive(
      new Phaser.Geom.Circle(buttonSize / 2, buttonSize / 2, buttonSize / 2),
      Phaser.Geom.Circle.Contains
    );

    // 按钮事件
    this.clueButtonBg.on('pointerdown', () => {
      this.showClueJournal();
    });

    this.clueButtonBg.on('pointerover', () => {
      this.clueButtonBg.clear();
      this.clueButtonBg.fillStyle(0x667eea, 0.9);
      this.clueButtonBg.fillCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
      this.clueButtonBg.lineStyle(2, 0xffd700);
      this.clueButtonBg.strokeCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
      
      // 显示提示文字
      this.showButtonTooltip('线索日志', buttonX, buttonY - 10);
    });

    this.clueButtonBg.on('pointerout', () => {
      this.clueButtonBg.clear();
      this.clueButtonBg.fillStyle(0x4a5568, 0.9);
      this.clueButtonBg.fillCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
      this.clueButtonBg.lineStyle(2, 0xffd700);
      this.clueButtonBg.strokeCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
      
      this.hideButtonTooltip();
    });

    // 线索数量指示器
    this.clueCountBadge = this.scene.add.text(
      buttonX + buttonSize - 5,
      buttonY + 5,
      '0',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        fill: '#ffffff',
        backgroundColor: '#ef4444',
        padding: { x: 4, y: 2 },
      }
    );
    this.clueCountBadge.setOrigin(0.5);
    this.clueCountBadge.setScrollFactor(0);
    this.clueCountBadge.setDepth(102);
    this.clueCountBadge.setVisible(false);
  }

  createMoveHint() {
    const { width, height } = this.scene.scale;
    const language = this.scene.playerData.language;
    
    // 移动提示文字（底部中央）
    const hintText = language === "zh" ? "点击地面移动 | 点击NPC对话" : "Tap ground to move | Tap NPC to talk";
    
    this.moveHint = this.scene.add.text(
      width / 2,
      height - 30,
      hintText,
      {
        fontSize: 'clamp(12px, 3vw, 16px)',
        fontFamily: 'monospace',
        fill: '#94a3b8',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 12, y: 6 },
        align: 'center'
      }
    );
    this.moveHint.setOrigin(0.5);
    this.moveHint.setScrollFactor(0);
    this.moveHint.setDepth(100);
    this.moveHint.setAlpha(0.8);

    // 5秒后自动隐藏提示
    this.scene.time.delayedCall(5000, () => {
      if (this.moveHint) {
        this.scene.tweens.add({
          targets: this.moveHint,
          alpha: 0,
          duration: 1000,
          onComplete: () => {
            if (this.moveHint) {
              this.moveHint.destroy();
              this.moveHint = null;
            }
          }
        });
      }
    });
  }

  showButtonTooltip(text, x, y) {
    this.hideButtonTooltip(); // 清除旧的提示

    this.buttonTooltip = this.scene.add.text(
      x,
      y,
      text,
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        fill: '#ffd700',
        backgroundColor: '#1a1a2e',
        padding: { x: 8, y: 4 },
      }
    );
    this.buttonTooltip.setOrigin(0.5, 1);
    this.buttonTooltip.setScrollFactor(0);
    this.buttonTooltip.setDepth(110);
  }

  hideButtonTooltip() {
    if (this.buttonTooltip) {
      this.buttonTooltip.destroy();
      this.buttonTooltip = null;
    }
  }

  createDayProgressBar() {
    const { width } = this.scene.scale;

    // 天数指示器
    this.dayIndicator = this.scene.add.text(width / 2, 30, "", {
      fontSize: "18px",
      fontFamily: "monospace",
      fill: "#ffd700",
      fontStyle: "bold",
      backgroundColor: "#1a1a2e",
      padding: { x: 15, y: 8 },
    });
    this.dayIndicator.setOrigin(0.5);
    this.dayIndicator.setScrollFactor(0);
    this.dayIndicator.setDepth(100);

    // 餐次进度条
    const progressBarWidth = Math.min(width * 0.6, 300);
    const progressBarHeight = 8;
    const progressX = (width - progressBarWidth) / 2;
    const progressY = 55;

    // 进度条背景
    this.progressBarBg = this.scene.add.graphics();
    this.progressBarBg.fillStyle(0x2a2a2a, 0.8);
    this.progressBarBg.fillRoundedRect(
      progressX,
      progressY,
      progressBarWidth,
      progressBarHeight,
      4
    );
    this.progressBarBg.setScrollFactor(0);
    this.progressBarBg.setDepth(100);

    // 进度条前景
    this.progressBar = this.scene.add.graphics();
    this.progressBar.setScrollFactor(0);
    this.progressBar.setDepth(101);

    // 进度标签
    this.progressLabel = this.scene.add.text(
      width / 2,
      progressY + progressBarHeight + 15,
      "",
      {
        fontSize: "12px",
        fontFamily: "monospace",
        fill: "#e2e8f0",
        align: "center",
      }
    );
    this.progressLabel.setOrigin(0.5);
    this.progressLabel.setScrollFactor(0);
    this.progressLabel.setDepth(100);
    this.updateProgressDisplay();
  }

  repositionProgressUI() {
    const { width } = this.scene.scale;
    
    if (this.dayIndicator) {
      this.dayIndicator.setPosition(width / 2, 30);
    }
    
    if (this.progressLabel) {
      this.progressLabel.setPosition(width / 2, 78);
    }
    
    // 重新绘制进度条
    const progressBarWidth = Math.min(width * 0.6, 300);
    const progressX = (width - progressBarWidth) / 2;
    
    if (this.progressBarBg) {
      this.progressBarBg.clear();
      this.progressBarBg.fillStyle(0x2a2a2a, 0.8);
      this.progressBarBg.fillRoundedRect(progressX, 55, progressBarWidth, 8, 4);
    }
    
    this.updateProgressDisplay();
  }

  repositionActionButtons() {
    const { width, height } = this.scene.scale;
    const buttonSize = Math.min(width * 0.12, 60);
    
    // 重新定位线索按钮
    const buttonX = width - buttonSize - 20;
    const buttonY = 80;
    
    if (this.clueButtonBg) {
      this.clueButtonBg.setPosition(buttonX, buttonY);
    }
    if (this.clueButtonIcon) {
      this.clueButtonIcon.setPosition(buttonX + buttonSize / 2, buttonY + buttonSize / 2);
    }
    if (this.clueCountBadge) {
      this.clueCountBadge.setPosition(buttonX + buttonSize - 5, buttonY + 5);
    }
  }

  updateProgressDisplay() {
    if (!this.scene.npcManager) return;

    const progress = this.scene.npcManager.getDailyProgress();
    const language = this.scene.playerData.language;

    // 更新天数指示器
    const dayText =
      language === "zh"
        ? `第 ${progress.currentDay} 天`
        : `Day ${progress.currentDay}`;
    if (this.dayIndicator) {
      this.dayIndicator.setText(dayText);
    }

    // 更新进度条
    const { width } = this.scene.scale;
    const progressBarWidth = Math.min(width * 0.6, 300);
    const progressX = (width - progressBarWidth) / 2;
    const progressY = 55;
    const progressBarHeight = 8;

    const progressPercent = progress.mealsRecorded / progress.totalMealsRequired;
    const fillWidth = progressBarWidth * progressPercent;

    if (this.progressBar) {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x667eea, 0.9);
      this.progressBar.fillRoundedRect(progressX, progressY, fillWidth, progressBarHeight, 4);
    }

    // 更新进度标签
    const progressText =
      language === "zh"
        ? `餐次进度: ${progress.mealsRecorded}/${progress.totalMealsRequired}`
        : `Meals: ${progress.mealsRecorded}/${progress.totalMealsRequired}`;
    if (this.progressLabel) {
      this.progressLabel.setText(progressText);
    }

    // 如果当天完成，显示完成动画
    if (progress.isComplete && progress.mealsRecorded === progress.totalMealsRequired) {
      this.showDayCompleteAnimation();
    }
  }

  showDayCompleteAnimation() {
    const { width, height } = this.scene.scale;
    const language = this.scene.playerData.language;

    // 创建完成提示
    const completeText = this.scene.add.text(
      width / 2,
      height / 2,
      language === "zh" ? "今日任务完成！" : "Daily Task Complete!",
      {
        fontSize: "24px",
        fontFamily: "monospace",
        fill: "#ffd700",
        fontStyle: "bold",
        backgroundColor: "#1a1a2e",
        padding: { x: 20, y: 15 },
      }
    );
    completeText.setOrigin(0.5);
    completeText.setScrollFactor(0);
    completeText.setDepth(150);
    completeText.setAlpha(0);

    // 动画效果
    this.scene.tweens.add({
      targets: completeText,
      alpha: 1,
      scale: { from: 0.8, to: 1.2 },
      duration: 800,
      ease: "Back.easeOut",
      yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: completeText,
          alpha: 0,
          duration: 1000,
          delay: 1000,
          onComplete: () => {
            completeText.destroy();
          },
        });
      },
    });
  }

  addClue(clue) {
    this.clues.push(clue);
    
    // 更新线索计数徽章
    this.updateClueCountBadge();
    
    this.showNotification(
      this.scene.playerData.language === "zh" ? "新线索已添加！" : "New clue added!"
    );
  }

  updateClueCountBadge() {
    if (this.clueCountBadge) {
      const count = this.clues.length;
      this.clueCountBadge.setText(count.toString());
      this.clueCountBadge.setVisible(count > 0);
      
      if (count > 0) {
        // 添加数字增加的动画效果
        this.scene.tweens.add({
          targets: this.clueCountBadge,
          scale: { from: 1.3, to: 1 },
          duration: 300,
          ease: 'Back.easeOut'
        });
      }
    }
  }

  getAllClues() {
    return this.clues;
  }

  showNotification(message, duration = 3000) {
    const { width } = this.scene.scale;

    const notification = this.scene.add.text(width / 2, 120, message, {
      fontSize: "16px",
      fontFamily: "monospace",
      fill: "#ffd700",
      backgroundColor: "#1a1a2e",
      padding: { x: 20, y: 10 },
      align: "center",
    });
    notification.setOrigin(0.5);
    notification.setScrollFactor(0);
    notification.setDepth(150);

    // 添加到通知列表
    this.notifications.push(notification);

    // 如果有多个通知，调整位置
    this.updateNotificationPositions();

    // 淡出动画
    this.scene.tweens.add({
      targets: notification,
      alpha: { from: 1, to: 0 },
      duration: duration,
      onComplete: () => {
        // 从列表中移除
        const index = this.notifications.indexOf(notification);
        if (index > -1) {
          this.notifications.splice(index, 1);
        }
        notification.destroy();
        this.updateNotificationPositions();
      },
    });
  }

  updateNotificationPositions() {
    this.notifications.forEach((notification, index) => {
      notification.y = 120 + index * 60;
    });
  }

  showClueJournal() {
    const { width, height } = this.scene.scale;

    // 检查是否已经有线索本打开
    if (this.clueJournalElements) {
      return;
    }

    // 创建元素容器
    this.clueJournalElements = [];

    // 创建背景遮罩
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setScrollFactor(0);
    overlay.setDepth(199);
    overlay.setInteractive();
    this.clueJournalElements.push(overlay);

    // 创建线索本背景
    const journalWidth = Math.min(width * 0.9, 600);
    const journalHeight = Math.min(height * 0.8, 500);
    const journalX = (width - journalWidth) / 2;
    const journalY = (height - journalHeight) / 2;

    const journalBg = this.scene.add.graphics();
    journalBg.fillStyle(0x1a1a2e, 0.98);
    journalBg.fillRoundedRect(journalX, journalY, journalWidth, journalHeight, 12);
    journalBg.lineStyle(3, 0x4a5568);
    journalBg.strokeRoundedRect(journalX, journalY, journalWidth, journalHeight, 12);
    journalBg.setScrollFactor(0);
    journalBg.setDepth(200);
    this.clueJournalElements.push(journalBg);

    // 标题
    const title = this.scene.add.text(
      width / 2,
      journalY + 40,
      this.scene.playerData.language === "zh" ? "🍳 线索记录本" : "🍳 Clue Journal",
      {
        fontSize: Math.min(width * 0.04, 28) + "px",
        fontFamily: "monospace",
        fill: "#ffd700",
        fontStyle: "bold",
        align: "center",
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(200);
    this.clueJournalElements.push(title);

    // 当前进度显示
    const progress = this.scene.npcManager ? this.scene.npcManager.getDailyProgress() : { currentDay: 1 };
    const progressText = this.scene.add.text(
      width / 2,
      journalY + 75,
      this.scene.playerData.language === "zh"
        ? `当前进度: 第${progress.currentDay}天`
        : `Current Progress: Day ${progress.currentDay}`,
      {
        fontSize: Math.min(width * 0.025, 16) + "px",
        fontFamily: "monospace",
        fill: "#94a3b8",
        align: "center",
      }
    );
    progressText.setOrigin(0.5);
    progressText.setScrollFactor(0);
    progressText.setDepth(200);
    this.clueJournalElements.push(progressText);

    // 线索列表容器
    const contentY = journalY + 110;
    const contentHeight = journalHeight - 160;

    if (this.clues.length === 0) {
      const noCluesText = this.scene.add.text(
        width / 2,
        journalY + journalHeight / 2,
        this.scene.playerData.language === "zh"
          ? "暂无线索\n点击NPC开始对话来收集线索！"
          : "No clues yet\nTap NPCs to start conversations and collect clues!",
        {
          fontSize: Math.min(width * 0.03, 18) + "px",
          fontFamily: "monospace",
          fill: "#718096",
          align: "center",
          lineSpacing: 8,
        }
      );
      noCluesText.setOrigin(0.5);
      noCluesText.setScrollFactor(0);
      noCluesText.setDepth(200);
      this.clueJournalElements.push(noCluesText);
    } else {
      // 显示线索
      let yOffset = contentY;
      this.clues.forEach((clue, index) => {
        // 天数标签
        const dayLabel = this.scene.add.text(
          journalX + 20,
          yOffset,
          this.scene.playerData.language === "zh" ? `第${clue.day}天` : `Day ${clue.day}`,
          {
            fontSize: Math.min(width * 0.02, 14) + "px",
            fontFamily: "monospace",
            fill: "#fbbf24",
            fontStyle: "bold",
            backgroundColor: "#374151",
            padding: { x: 8, y: 4 },
          }
        );
        dayLabel.setScrollFactor(0);
        dayLabel.setDepth(200);
        this.clueJournalElements.push(dayLabel);
        yOffset += 25;

        // NPC名称
        const npcName = this.scene.add.text(journalX + 20, yOffset, `${clue.npcName}:`, {
          fontSize: Math.min(width * 0.025, 16) + "px",
          fontFamily: "monospace",
          fill: "#ffd700",
          fontStyle: "bold",
        });
        npcName.setScrollFactor(0);
        npcName.setDepth(200);
        this.clueJournalElements.push(npcName);
        yOffset += 25;

        // 线索内容
        const clueText = this.scene.add.text(journalX + 40, yOffset, clue.clue, {
          fontSize: Math.min(width * 0.022, 14) + "px",
          fontFamily: "monospace",
          fill: "#e2e8f0",
          wordWrap: { width: journalWidth - 80 },
          lineSpacing: 4,
        });
        clueText.setScrollFactor(0);
        clueText.setDepth(200);
        this.clueJournalElements.push(clueText);
        yOffset += clueText.height + 20;

        // 分隔线
        if (index < this.clues.length - 1) {
          const separator = this.scene.add.graphics();
          separator.lineStyle(1, 0x4a5568, 0.5);
          separator.lineBetween(journalX + 20, yOffset, journalX + journalWidth - 20, yOffset);
          separator.setScrollFactor(0);
          separator.setDepth(200);
          this.clueJournalElements.push(separator);
          yOffset += 15;
        }
      });
    }

    // 关闭按钮
    const closeButton = this.scene.add.text(journalX + journalWidth - 40, journalY + 20, "✕", {
      fontSize: Math.min(width * 0.035, 24) + "px",
      fontFamily: "monospace",
      fill: "#ef4444",
      fontStyle: "bold",
    });
    closeButton.setOrigin(0.5);
    closeButton.setScrollFactor(0);
    closeButton.setDepth(200);
    closeButton.setInteractive({ useHandCursor: true });
    this.clueJournalElements.push(closeButton);

    closeButton.on("pointerdown", () => {
      this.closeClueJournal();
    });
    closeButton.on("pointerover", () => {
      closeButton.setScale(1.2);
      closeButton.setTint(0xff6b6b);
    });
    closeButton.on("pointerout", () => {
      closeButton.setScale(1);
      closeButton.clearTint();
    });

    // 点击背景关闭
    overlay.on("pointerdown", () => {
      this.closeClueJournal();
    });
  }

  closeClueJournal() {
    // 销毁所有journal相关元素
    if (this.clueJournalElements) {
      this.clueJournalElements.forEach((element) => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.clueJournalElements = null;
    }
  }

  // 最后的食谱
  showFinalEgg(content) {
    const { width, height } = this.scene.scale;

    // 创建全屏背景
    const eggOverlay = this.scene.add.graphics();
    eggOverlay.fillStyle(0x000000, 0.9);
    eggOverlay.fillRect(0, 0, width, height);
    eggOverlay.setScrollFactor(0);
    eggOverlay.setDepth(300);

    // 创建彩蛋容器
    const eggWidth = Math.min(width * 0.95, 700);
    const eggHeight = Math.min(height * 0.85, 600);
    const eggX = (width - eggWidth) / 2;
    const eggY = (height - eggHeight) / 2;

    const eggBg = this.scene.add.graphics();
    eggBg.fillStyle(0x1a1a2e, 1);
    eggBg.fillRoundedRect(eggX, eggY, eggWidth, eggHeight, 15);
    eggBg.lineStyle(4, 0xffd700);
    eggBg.strokeRoundedRect(eggX, eggY, eggWidth, eggHeight, 15);
    eggBg.setScrollFactor(0);
    eggBg.setDepth(301);

    // 添加装饰边框
    const decorBg = this.scene.add.graphics();
    decorBg.lineStyle(2, 0x667eea);
    decorBg.strokeRoundedRect(eggX + 10, eggY + 10, eggWidth - 20, eggHeight - 20, 10);
    decorBg.setScrollFactor(0);
    decorBg.setDepth(301);

    // 标题
    const title = this.scene.add.text(
      width / 2,
      eggY + 50,
      this.scene.playerData.language === "zh"
        ? "🎉 恭喜完成7天旅程！"
        : "🎉 Congratulations on Completing the 7-Day Journey!",
      {
        fontSize: Math.min(width * 0.04, 28) + "px",
        fontFamily: "monospace",
        fill: "#ffd700",
        fontStyle: "bold",
        align: "center",
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(302);

    // 副标题
    const subtitle = this.scene.add.text(
      width / 2,
      eggY + 90,
      this.scene.playerData.language === "zh"
        ? "师父为你准备的特别礼物："
        : "A special gift from your master:",
      {
        fontSize: Math.min(width * 0.025, 18) + "px",
        fontFamily: "monospace",
        fill: "#94a3b8",
        align: "center",
      }
    );
    subtitle.setOrigin(0.5);
    subtitle.setScrollFactor(0);
    subtitle.setDepth(302);

    // 彩蛋内容
    const eggContent = this.scene.add.text(width / 2, eggY + 140, content, {
      fontSize: Math.min(width * 0.022, 16) + "px",
      fontFamily: "monospace",
      fill: "#e2e8f0",
      align: "center",
      wordWrap: { width: eggWidth - 60 },
      lineSpacing: 8,
    });
    eggContent.setOrigin(0.5, 0);
    eggContent.setScrollFactor(0);
    eggContent.setDepth(302);

    // 关闭按钮
    const closeBtn = this.scene.add.text(
      width / 2,
      eggY + eggHeight - 60,
      this.scene.playerData.language === "zh" ? "关闭" : "Close",
      {
        fontSize: Math.min(width * 0.03, 20) + "px",
        fontFamily: "monospace",
        fill: "#667eea",
        fontStyle: "bold",
        backgroundColor: "#374151",
        padding: { x: 20, y: 10 },
      }
    );
    closeBtn.setOrigin(0.5);
    closeBtn.setScrollFactor(0);
    closeBtn.setDepth(302);
    closeBtn.setInteractive({ useHandCursor: true });
    
    closeBtn.on("pointerdown", () => {
      this.closeFinalEgg();
    });
    closeBtn.on("pointerover", () => {
      closeBtn.setTint(0x818cf8);
    });
    closeBtn.on("pointerout", () => {
      closeBtn.clearTint();
    });

    // 闪烁动画
    this.scene.tweens.add({
      targets: [eggBg, decorBg],
      alpha: { from: 1, to: 0.8 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });
  }

  closeFinalEgg() {
    // 销毁所有彩蛋相关元素
    this.scene.children.list.forEach((child) => {
      if (child.depth >= 300 && child.depth <= 302) {
        child.destroy();
      }
    });
  }

  // 更新方法供外部调用
  updateProgress() {
    this.updateProgressDisplay();
  }

  // 清理资源
  destroy() {
    this.hideButtonTooltip();
    this.notifications.forEach((notification) => {
      if (notification && notification.destroy) {
        notification.destroy();
      }
    });
    this.notifications = [];
    this.clues = [];

    if (this.progressBar) this.progressBar.destroy();
    if (this.progressBarBg) this.progressBarBg.destroy();
    if (this.dayIndicator) this.dayIndicator.destroy();
    if (this.progressLabel) this.progressLabel.destroy();
    if (this.clueButtonBg) this.clueButtonBg.destroy();
    if (this.clueButtonIcon) this.clueButtonIcon.destroy();
    if (this.clueCountBadge) this.clueCountBadge.destroy();
    if (this.moveHint) this.moveHint.destroy();
  }
}