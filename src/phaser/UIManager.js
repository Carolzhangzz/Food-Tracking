// UIManager.js - 完整修复版本：移除餐食名称文本，修复线索语言问题
import Phaser from "phaser";

export default class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.clues = [];
    this.notifications = [];
    this.progressBar = null;
    this.dayIndicator = null;
    this.mealProgressIndicators = []; // 简约的三餐进度指示器
    this.createProgressUI();
    this.createActionButtons();

    // 监听屏幕尺寸变化
    this.scene.scale.on("resize", () => {
      this.handleResize();
    });
  }

  handleResize() {
    this.repositionProgressUI();
    this.repositionActionButtons();
  }

  createProgressUI() {
    this.createDayProgressBar();
  }

  createActionButtons() {
    // 创建线索日志按钮 - 修复位置
    this.createClueButton();

    // 创建移动说明提示（移动端）
    this.createMoveHint();
  }

  createClueButton() {
    const { width, height } = this.scene.scale;

    // 修复：线索按钮位置调整，避免被遮挡
    const buttonSize = 40; // 稍微小一点
    const buttonX = width - buttonSize - 10; // 更靠近边缘
    const buttonY = 80; // 下移到三餐进度下方，避免被遮挡

    // 简约的圆形按钮
    this.clueButtonBg = this.scene.add.graphics();
    this.clueButtonBg.fillStyle(0x1f2937, 0.9); // 稍微加深透明度
    this.clueButtonBg.fillCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
    this.clueButtonBg.lineStyle(1, 0x6b7280);
    this.clueButtonBg.strokeCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
    this.clueButtonBg.setPosition(buttonX, buttonY);
    this.clueButtonBg.setScrollFactor(0);
    this.clueButtonBg.setDepth(100);

    // 简约图标
    this.clueButtonIcon = this.scene.add.text(
      buttonX + buttonSize / 2,
      buttonY + buttonSize / 2,
      '📝',
      {
        fontSize: '16px',
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

    this.clueButtonBg.on('pointerdown', () => {
      this.showClueJournal();
    });

    this.clueButtonBg.on('pointerover', () => {
      this.clueButtonBg.clear();
      this.clueButtonBg.fillStyle(0x374151, 0.9);
      this.clueButtonBg.fillCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
      this.clueButtonBg.lineStyle(1, 0x9ca3af);
      this.clueButtonBg.strokeCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
    });

    this.clueButtonBg.on('pointerout', () => {
      this.clueButtonBg.clear();
      this.clueButtonBg.fillStyle(0x1f2937, 0.9);
      this.clueButtonBg.fillCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
      this.clueButtonBg.lineStyle(1, 0x6b7280);
      this.clueButtonBg.strokeCircle(buttonSize / 2, buttonSize / 2, buttonSize / 2);
    });

    // 修复：数量徽章位置
    this.clueCountBadge = this.scene.add.text(
      buttonX + buttonSize - 6,
      buttonY + 2,
      '0',
      {
        fontSize: '10px',
        fontFamily: 'monospace',
        fill: '#ffffff',
        backgroundColor: '#ef4444',
        padding: { x: 3, y: 1 },
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

    // 更简洁的移动提示
    const hintText = language === "zh" ? "点击移动 | 点击NPC对话" : "Tap to move | Tap NPC to talk";

    this.moveHint = this.scene.add.text(
      width / 2,
      height - 25,
      hintText,
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        fill: '#9ca3af',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 8, y: 4 },
        align: 'center'
      }
    );
    this.moveHint.setOrigin(0.5);
    this.moveHint.setScrollFactor(0);
    this.moveHint.setDepth(100);
    this.moveHint.setAlpha(0.7);

    // 4秒后自动隐藏
    this.scene.time.delayedCall(4000, () => {
      if (this.moveHint) {
        this.scene.tweens.add({
          targets: this.moveHint,
          alpha: 0,
          duration: 800,
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

  // 简约的三餐进度显示
  createDayProgressBar() {
    const { width } = this.scene.scale;

    // 天数指示器 - 更简约
    this.dayIndicator = this.scene.add.text(width / 2, 25, "", {
      fontSize: "16px",
      fontFamily: "monospace",
      fill: "#f9fafb",
      fontStyle: "bold",
      backgroundColor: "#1f2937",
      padding: { x: 12, y: 6 },
    });
    this.dayIndicator.setOrigin(0.5);
    this.dayIndicator.setScrollFactor(0);
    this.dayIndicator.setDepth(100);

    // 简约的三餐进度指示器 - 移除餐食名称
    this.createSimpleMealProgress();
    this.updateProgressDisplay();
  }

  // 修复：三餐进度指示器 - 移除黑色餐食名称文本
  createSimpleMealProgress() {
    const { width } = this.scene.scale;

    // 简约的点状进度指示器
    const mealTypes = [
      {
        type: 'breakfast',
        icon: '🌅',
      },
      {
        type: 'lunch',
        icon: '☀️',
      },
      {
        type: 'dinner',
        icon: '🌙',
      }
    ];

    const startX = width / 2 - 40; // 调整起始位置
    const y = 55; // 在天数指示器下方
    const spacing = 40; // 间距

    this.mealProgressIndicators = [];

    mealTypes.forEach((meal, index) => {
      const x = startX + index * spacing;

      // 简约的小圆点
      const dot = this.scene.add.graphics();
      dot.fillStyle(0x4b5563, 0.8); // 未完成状态：灰色
      dot.fillCircle(0, 0, 10); // 稍微大一点的圆点
      dot.setPosition(x, y);
      dot.setScrollFactor(0);
      dot.setDepth(100);

      // 小图标
      const icon = this.scene.add.text(x, y, meal.icon, {
        fontSize: '14px', // 稍微大一点的图标
      });
      icon.setOrigin(0.5);
      icon.setScrollFactor(0);
      icon.setDepth(101);
      icon.setAlpha(0.6); // 未完成时半透明

      this.mealProgressIndicators.push({
        type: meal.type,
        dot: dot,
        icon: icon,
        completed: false
      });
    });
  }

  repositionProgressUI() {
    const { width } = this.scene.scale;

    if (this.dayIndicator) {
      this.dayIndicator.setPosition(width / 2, 25);
    }

    // 重新定位三餐进度指示器
    if (this.mealProgressIndicators.length > 0) {
      const startX = width / 2 - 40; // 保持与创建时一致
      const spacing = 40;

      this.mealProgressIndicators.forEach((indicator, index) => {
        const x = startX + index * spacing;
        if (indicator.dot) indicator.dot.setPosition(x, 55);
        if (indicator.icon) indicator.icon.setPosition(x, 55);
      });
    }
  }

  repositionActionButtons() {
    const { width } = this.scene.scale;
    const buttonSize = 40; // 更新后的按钮大小

    // 修复：线索按钮位置
    const buttonX = width - buttonSize - 10;
    const buttonY = 80; // 下移位置

    if (this.clueButtonBg) {
      this.clueButtonBg.setPosition(buttonX, buttonY);
    }
    if (this.clueButtonIcon) {
      this.clueButtonIcon.setPosition(buttonX + buttonSize / 2, buttonY + buttonSize / 2);
    }
    if (this.clueCountBadge) {
      this.clueCountBadge.setPosition(buttonX + buttonSize - 6, buttonY + 2);
    }
  }

  // 更新进度显示 - 简约版
  updateProgressDisplay() {
    if (!this.scene.npcManager) return;

    const progress = this.scene.npcManager.getDailyProgress();
    const language = this.scene.playerData.language;

    // 更新天数指示器
    const dayText = language === "zh" ? `第${progress.currentDay}天` : `Day ${progress.currentDay}`;
    if (this.dayIndicator) {
      this.dayIndicator.setText(dayText);
    }

    // 获取当天已记录的餐食类型
    const currentDayMeals = this.scene.npcManager.mealRecords
      .filter(meal => meal.day === progress.currentDay)
      .map(meal => meal.mealType);

    // 更新简约的三餐进度指示器
    this.mealProgressIndicators.forEach(indicator => {
      const isCompleted = currentDayMeals.includes(indicator.type);

      if (isCompleted !== indicator.completed) {
        indicator.completed = isCompleted;

        if (isCompleted) {
          // 标记为完成 - 简约动画
          indicator.dot.clear();
          indicator.dot.fillStyle(0x10b981, 1); // 绿色
          indicator.dot.fillCircle(0, 0, 10);

          indicator.icon.setAlpha(1); // 完全不透明

          // 简单的放大动画
          this.scene.tweens.add({
            targets: [indicator.dot, indicator.icon],
            scaleX: { from: 1, to: 1.2 },
            scaleY: { from: 1, to: 1.2 },
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut'
          });
        } else {
          // 重置为未完成状态
          indicator.dot.clear();
          indicator.dot.fillStyle(0x4b5563, 0.8);
          indicator.dot.fillCircle(0, 0, 10);

          indicator.icon.setAlpha(0.6);
        }
      }
    });

    // 当天完成所有三餐的简约庆祝
    if (progress.isComplete && currentDayMeals.length === 3) {
      this.showSimpleDayComplete();
    }
  }

  showSimpleDayComplete() {
    const { width, height } = this.scene.scale;
    const language = this.scene.playerData.language;

    // 简约的完成提示
    const completeText = this.scene.add.text(
      width / 2,
      height / 2 - 30,
      language === "zh" ? "今日完成！" : "Day Complete!",
      {
        fontSize: "20px",
        fontFamily: "monospace",
        fill: "#10b981",
        fontStyle: "bold",
      }
    );
    completeText.setOrigin(0.5);
    completeText.setScrollFactor(0);
    completeText.setDepth(150);
    completeText.setAlpha(0);

    // 简单的动画
    this.scene.tweens.add({
      targets: completeText,
      alpha: { from: 0, to: 1 },
      y: completeText.y - 15,
      duration: 600,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: completeText,
          alpha: 0,
          duration: 800,
          delay: 1200,
          onComplete: () => {
            completeText.destroy();
          },
        });
      },
    });

    // 为进度点添加简单的闪烁效果
    this.mealProgressIndicators.forEach(indicator => {
      if (indicator.completed) {
        this.scene.tweens.add({
          targets: [indicator.dot, indicator.icon],
          alpha: { from: 1, to: 0.5 },
          duration: 300,
          yoyo: true,
          repeat: 2
        });
      }
    });
  }

  addClue(clue) {
    this.clues.push(clue);
    this.updateClueCountBadge();

    this.showNotification(
      this.scene.playerData.language === "zh" ? "新线索！" : "New clue!"
    );
  }

  updateClueCountBadge() {
    if (this.clueCountBadge) {
      const count = this.clues.length;
      this.clueCountBadge.setText(count.toString());
      this.clueCountBadge.setVisible(count > 0);

      if (count > 0) {
        this.scene.tweens.add({
          targets: this.clueCountBadge,
          scale: { from: 1.2, to: 1 },
          duration: 250,
          ease: 'Back.easeOut'
        });
      }
    }
  }

  getAllClues() {
    return this.clues;
  }

  showNotification(message, duration = 2500) {
    const { width } = this.scene.scale;

    const notification = this.scene.add.text(width / 2, 120, message, { // 调整位置避免遮挡三餐进度
      fontSize: "14px",
      fontFamily: "monospace",
      fill: "#fbbf24",
      backgroundColor: "#1f2937",
      padding: { x: 12, y: 6 },
      align: "center",
    });
    notification.setOrigin(0.5);
    notification.setScrollFactor(0);
    notification.setDepth(150);

    this.notifications.push(notification);
    this.updateNotificationPositions();

    // 简单的淡出
    this.scene.tweens.add({
      targets: notification,
      alpha: { from: 1, to: 0 },
      y: notification.y - 20,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
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
      notification.y = 120 + index * 35; // 调整起始位置
    });
  }

  // 修复：显示线索日志 - 根据当前语言翻译线索
  showClueJournal() {
    const { width, height } = this.scene.scale;

    if (this.clueJournalElements) {
      return;
    }

    this.clueJournalElements = [];

    // 半透明背景
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, width, height);
    overlay.setScrollFactor(0);
    overlay.setDepth(199);
    overlay.setInteractive();
    this.clueJournalElements.push(overlay);

    // 简约的线索本背景
    const journalWidth = Math.min(width * 0.92, 400);
    const journalHeight = Math.min(height * 0.85, 550);
    const journalX = (width - journalWidth) / 2;
    const journalY = (height - journalHeight) / 2;

    const journalBg = this.scene.add.graphics();
    journalBg.fillStyle(0x1f2937, 0.98);
    journalBg.fillRoundedRect(journalX, journalY, journalWidth, journalHeight, 8);
    journalBg.lineStyle(1, 0x374151);
    journalBg.strokeRoundedRect(journalX, journalY, journalWidth, journalHeight, 8);
    journalBg.setScrollFactor(0);
    journalBg.setDepth(200);
    this.clueJournalElements.push(journalBg);

    // 简约标题
    const title = this.scene.add.text(
      width / 2,
      journalY + 30,
      this.scene.playerData.language === "zh" ? "线索记录" : "Clue Journal",
      {
        fontSize: "18px",
        fontFamily: "monospace",
        fill: "#f9fafb",
        fontStyle: "bold",
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(200);
    this.clueJournalElements.push(title);

    // 当前进度
    const progress = this.scene.npcManager ? this.scene.npcManager.getDailyProgress() : { currentDay: 1 };
    const currentDayMeals = this.scene.npcManager ?
      this.scene.npcManager.mealRecords.filter(meal => meal.day === progress.currentDay).length : 0;

    const progressText = this.scene.add.text(
      width / 2,
      journalY + 55,
      this.scene.playerData.language === "zh"
        ? `第${progress.currentDay}天 (${currentDayMeals}/3)`
        : `Day ${progress.currentDay} (${currentDayMeals}/3)`,
      {
        fontSize: "12px",
        fontFamily: "monospace",
        fill: "#9ca3af",
      }
    );
    progressText.setOrigin(0.5);
    progressText.setScrollFactor(0);
    progressText.setDepth(200);
    this.clueJournalElements.push(progressText);

    // 线索列表
    const contentY = journalY + 80;

    if (this.clues.length === 0) {
      const noCluesText = this.scene.add.text(
        width / 2,
        journalY + journalHeight / 2,
        this.scene.playerData.language === "zh"
          ? "暂无线索\n记录晚餐获得线索"
          : "No clues yet\nRecord dinner to get clues",
        {
          fontSize: "14px",
          fontFamily: "monospace",
          fill: "#6b7280",
          align: "center",
          lineSpacing: 6,
        }
      );
      noCluesText.setOrigin(0.5);
      noCluesText.setScrollFactor(0);
      noCluesText.setDepth(200);
      this.clueJournalElements.push(noCluesText);
    } else {
      // 显示线索 - 手机优化版本，根据当前语言翻译线索
      let yOffset = contentY;
      const maxHeight = journalHeight - 140;

      this.clues.slice(0, 6).forEach((clue, index) => {
        if (yOffset > journalY + maxHeight) return;

        // 简约的天数标签
        const dayLabel = this.scene.add.text(
          journalX + 15,
          yOffset,
          this.scene.playerData.language === "zh" ? `第${clue.day}天` : `Day ${clue.day}`,
          {
            fontSize: "11px",
            fontFamily: "monospace",
            fill: "#fbbf24",
            backgroundColor: "#374151",
            padding: { x: 6, y: 2 },
          }
        );
        dayLabel.setScrollFactor(0);
        dayLabel.setDepth(200);
        this.clueJournalElements.push(dayLabel);
        yOffset += 20;

        // NPC名称 - 更紧凑
        const npcName = this.scene.add.text(journalX + 15, yOffset, `${clue.npcName}:`, {
          fontSize: "12px",
          fontFamily: "monospace",
          fill: "#f9fafb",
          fontStyle: "bold",
        });
        npcName.setScrollFactor(0);
        npcName.setDepth(200);
        this.clueJournalElements.push(npcName);
        yOffset += 18;

        // 修复：线索内容 - 根据当前语言获取对应的线索文本
        const translatedClue = this.getTranslatedClue(clue);
        const shortClue = this.getShortClue(translatedClue);
        const clueText = this.scene.add.text(journalX + 25, yOffset, shortClue, {
          fontSize: "11px",
          fontFamily: "monospace",
          fill: "#d1d5db",
          wordWrap: { width: journalWidth - 50 }, // 确保有足够的换行空间
          lineSpacing: 3, // 增加行间距
        });
        clueText.setScrollFactor(0);
        clueText.setDepth(200);
        clueText.setInteractive({ useHandCursor: true });

        // 点击查看完整线索
        clueText.on('pointerdown', () => {
          this.showFullClue({...clue, clue: translatedClue});
        });

        clueText.on('pointerover', () => {
          clueText.setTint(0x60a5fa);
        });

        clueText.on('pointerout', () => {
          clueText.clearTint();
        });

        this.clueJournalElements.push(clueText);
        yOffset += clueText.height + 15;

        // 简约分隔线
        if (index < this.clues.length - 1 && index < 5) {
          const separator = this.scene.add.graphics();
          separator.lineStyle(1, 0x374151, 0.5);
          separator.lineBetween(journalX + 15, yOffset, journalX + journalWidth - 15, yOffset);
          separator.setScrollFactor(0);
          separator.setDepth(200);
          this.clueJournalElements.push(separator);
          yOffset += 10;
        }
      });

      // 如果线索超过6条，显示省略提示
      if (this.clues.length > 6) {
        const moreText = this.scene.add.text(
          width / 2,
          journalY + journalHeight - 80,
          this.scene.playerData.language === "zh"
            ? `还有${this.clues.length - 6}条线索...`
            : `${this.clues.length - 6} more clues...`,
          {
            fontSize: "10px",
            fontFamily: "monospace",
            fill: "#6b7280",
            align: "center",
          }
        );
        moreText.setOrigin(0.5);
        moreText.setScrollFactor(0);
        moreText.setDepth(200);
        this.clueJournalElements.push(moreText);
      }
    }

    // 简约关闭按钮
    const closeButton = this.scene.add.text(
      journalX + journalWidth - 25,
      journalY + 15,
      "✕",
      {
        fontSize: "16px",
        fontFamily: "monospace",
        fill: "#9ca3af",
        fontStyle: "bold",
      }
    );
    closeButton.setOrigin(0.5);
    closeButton.setScrollFactor(0);
    closeButton.setDepth(200);
    closeButton.setInteractive({ useHandCursor: true });
    this.clueJournalElements.push(closeButton);

    closeButton.on("pointerdown", () => {
      this.closeClueJournal();
    });
    closeButton.on("pointerover", () => {
      closeButton.setTint(0xef4444);
    });
    closeButton.on("pointerout", () => {
      closeButton.clearTint();
    });

    // 点击背景关闭
    overlay.on("pointerdown", () => {
      this.closeClueJournal();
    });
  }

  // 新增：根据当前语言获取翻译后的线索
  getTranslatedClue(clue) {
    if (!this.scene.npcManager) return clue.clue;

    // 使用NPCManager的方法获取当前语言的线索
    return this.scene.npcManager.getNPCClue(clue.npcId);
  }

  // 修复：获取线索的简短版本 - 改善换行处理
  getShortClue(fullClue) {
    // 首先按句号分割
    const sentences = fullClue.split(/[.。]/);
    let result = sentences[0];

    // 如果第一句话太长，按长度截断
    if (result.length > 50) {
      result = result.substring(0, 50) + '...';
    } else if (sentences.length > 1) {
      result += '...';
    }

    return result;
  }

  // 修复：显示完整线索 - 改善文字换行和显示
  showFullClue(clue) {
    const { width, height } = this.scene.scale;

    // 全屏遮罩
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setScrollFactor(0);
    overlay.setDepth(250);
    overlay.setInteractive();

    // 手机优化的详情框
    const detailWidth = width * 0.9;
    const detailHeight = height * 0.75;
    const detailX = (width - detailWidth) / 2;
    const detailY = (height - detailHeight) / 2;

    const detailBg = this.scene.add.graphics();
    detailBg.fillStyle(0x1f2937, 1);
    detailBg.fillRoundedRect(detailX, detailY, detailWidth, detailHeight, 8);
    detailBg.lineStyle(1, 0x374151);
    detailBg.strokeRoundedRect(detailX, detailY, detailWidth, detailHeight, 8);
    detailBg.setScrollFactor(0);
    detailBg.setDepth(251);

    // 简约标题
    const title = this.scene.add.text(
      width / 2,
      detailY + 30,
      `${clue.npcName} - ${this.scene.playerData.language === 'zh' ? '第' + clue.day + '天' : 'Day ' + clue.day}`,
      {
        fontSize: '16px',
        fontFamily: 'monospace',
        fill: '#f9fafb',
        fontStyle: 'bold',
        align: 'center'
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(252);

    // 修复：完整线索内容 - 改善换行和行间距
    const fullClueText = this.scene.add.text(
      detailX + 20,
      detailY + 60,
      clue.clue,
      {
        fontSize: '13px', // 稍微大一点便于阅读
        fontFamily: 'monospace',
        fill: '#d1d5db',
        wordWrap: { width: detailWidth - 40, useAdvancedWrap: true }, // 启用高级换行
        lineSpacing: 6, // 增加行间距
        align: 'left' // 左对齐，更好的阅读体验
      }
    );
    fullClueText.setScrollFactor(0);
    fullClueText.setDepth(252);

    // 如果文字内容超出容器高度，添加滚动提示
    const contentHeight = fullClueText.height;
    const maxContentHeight = detailHeight - 160; // 减去标题和按钮的空间

    if (contentHeight > maxContentHeight) {
      // 添加滚动提示
      const scrollHint = this.scene.add.text(
        width / 2,
        detailY + detailHeight - 70,
        this.scene.playerData.language === 'zh' ? '内容较长，可滑动查看' : 'Content is long, swipe to scroll',
        {
          fontSize: '10px',
          fontFamily: 'monospace',
          fill: '#6b7280',
          align: 'center'
        }
      );
      scrollHint.setOrigin(0.5);
      scrollHint.setScrollFactor(0);
      scrollHint.setDepth(252);

      // 可以在这里添加滚动功能，暂时先显示提示
    }

    // 简约关闭按钮
    const closeBtn = this.scene.add.text(
      width / 2,
      detailY + detailHeight - 40,
      this.scene.playerData.language === 'zh' ? '关闭' : 'Close',
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        fill: '#60a5fa',
        backgroundColor: '#374151',
        padding: { x: 12, y: 6 }
      }
    );
    closeBtn.setOrigin(0.5);
    closeBtn.setScrollFactor(0);
    closeBtn.setDepth(252);
    closeBtn.setInteractive({ useHandCursor: true });

    const cleanup = () => {
      overlay.destroy();
      detailBg.destroy();
      title.destroy();
      fullClueText.destroy();
      closeBtn.destroy();
    };

    closeBtn.on('pointerdown', cleanup);
    overlay.on('pointerdown', cleanup);

    closeBtn.on('pointerover', () => closeBtn.setTint(0x93c5fd));
    closeBtn.on('pointerout', () => closeBtn.clearTint());
  }

  closeClueJournal() {
    if (this.clueJournalElements) {
      this.clueJournalElements.forEach((element) => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.clueJournalElements = null;
    }
  }

  // 最终彩蛋显示 - 手机优化版
  // 在 UIManager.js 里，替换原来的 showFinalEgg(content)
showFinalEgg(egg) {
  const { width, height } = this.scene.scale;
  const lang = this.scene.playerData.language;

  // 容器：方便关闭时统一销毁
  this._eggContainer?.destroy(true);
  const container = this._eggContainer = this.scene.add.container(0,0);
  const DEPTH = 300;

  // 全屏背景
  const overlay = this.scene.add.graphics();
  overlay.fillStyle(0x000000, 0.9);
  overlay.fillRect(0, 0, width, height);
  overlay.setScrollFactor(0);
  overlay.setDepth(DEPTH);
  container.add(overlay);

  // 面板
  const eggWidth = Math.floor(width * 0.94);
  const eggHeight = Math.floor(height * 0.9);
  const eggX = Math.floor((width - eggWidth) / 2);
  const eggY = Math.floor((height - eggHeight) / 2);

  const panel = this.scene.add.graphics();
  panel.fillStyle(0x1f2937, 1);
  panel.fillRoundedRect(eggX, eggY, eggWidth, eggHeight, 12);
  panel.lineStyle(2, 0xfbbf24);
  panel.strokeRoundedRect(eggX, eggY, eggWidth, eggHeight, 12);
  panel.setDepth(DEPTH+1);
  container.add(panel);

  // 标题
  const title = this.scene.add.text(
    width / 2,
    eggY + 36,
    lang === "zh" ? "🎉 恭喜完成旅程！" : "🎉 Journey Complete!",
    { fontSize: "20px", fontFamily: "monospace", fill: "#fbbf24", fontStyle: "bold", align:"center" }
  ).setOrigin(0.5);
  title.setDepth(DEPTH+2);
  container.add(title);

  // 可滚动区域（简化：用多段 text 堆叠；高度不够就提示可滚动）
  let cursorY = eggY + 72;
  const leftX = eggX + 20;
  const wrapW = eggWidth - 40;

  // 小工具：加一个区块（标题 + 文本），返回新的 cursorY
  const addSection = (sectionTitle, bodyText) => {
    const st = this.scene.add.text(leftX, cursorY, sectionTitle, {
      fontSize: "14px", fontFamily: "monospace", fill: "#eab308", fontStyle:"bold", wordWrap:{ width: wrapW, useAdvancedWrap:true }
    });
    st.setDepth(DEPTH+2);
    container.add(st);
    cursorY += st.height + 6;

    const body = this.scene.add.text(leftX, cursorY, bodyText, {
      fontSize: "13px", fontFamily: "monospace", fill: "#d1d5db",
      wordWrap:{ width: wrapW, useAdvancedWrap:true }, lineSpacing: 6, align:"left"
    });
    body.setDepth(DEPTH+2);
    container.add(body);
    cursorY += body.height + 16;
  };

  // 1) 信件
  addSection(lang==="zh" ? "师父的信：" : "Master's letter:", egg.letter || "");

  // 2) 7天总结
  const sumLabel = lang==="zh" ? "你的 7 天餐食总结：" : "Your 7-day meal summary:";
  const sumText = (egg.summary || [])
    .map(s => {
      const dayStr = lang==="zh" ? `第${s.day}天` : `Day ${s.day}`;
      const meal = s.mealType || "";
      const ings = (s.ingredients || []).join(", ");
      return `${dayStr} - ${s.npcName || ""} / ${meal} / ${ings}`;
    })
    .join("\n");
  addSection(sumLabel, sumText || (lang==="zh" ? "暂无数据" : "No data"));

  // 3) 健康分析
  const healthLabel = lang==="zh" ? "饮食分析：" : "Health analysis:";
  const posTitle = lang==="zh" ? "优势" : "Positives";
  const impTitle = lang==="zh" ? "改进建议" : "Improvements";
  const healthText =
    `${posTitle}:\n- ${(egg.health?.positives || []).join("\n- ")}\n\n` +
    `${impTitle}:\n- ${(egg.health?.improvements || []).join("\n- ")}`;
  addSection(healthLabel, healthText);

  // 4) 个性化食谱
  const r = egg.recipe || {};
  const recipeLabel = lang==="zh" ? "你的专属食谱：" : "Your personalized recipe:";
  const recipeText =
    `${r.title || ""}  (${lang==="zh"?"份量":"servings"}: ${r.servings ?? 1})\n\n` +
    `${lang==="zh"?"配料":"Ingredients"}:\n- ${(r.ingredients||[]).map(i=>`${i.name} ${i.amount||""}`).join("\n- ")}\n\n` +
    `${lang==="zh"?"步骤":"Steps"}:\n- ${(r.steps||[]).join("\n- ")}\n\n` +
    `${lang==="zh"?"小贴士":"Tip"}: ${r.tip||""}`;
  addSection(recipeLabel, recipeText);

  // 超出高度就加提示
  if (cursorY > eggY + eggHeight - 90) {
    const hint = this.scene.add.text(
      width / 2, eggY + eggHeight - 70,
      lang==="zh" ? "内容较长，可上下滑动页面查看" : "Long content. Scroll to view.",
      { fontSize:"10px", fontFamily:"monospace", fill:"#6b7280" }
    ).setOrigin(0.5);
    hint.setDepth(DEPTH+2);
    container.add(hint);
  }

  // 关闭按钮
  const closeBtn = this.scene.add.text(
    width / 2,
    eggY + eggHeight - 36,
    lang==="zh" ? "关闭" : "Close",
    { fontSize:"16px", fontFamily:"monospace", fill:"#60a5fa", fontStyle:"bold",
      backgroundColor:"#374151", padding:{ x:15, y:8 } }
  ).setOrigin(0.5);
  closeBtn.setDepth(DEPTH+2);
  closeBtn.setInteractive({ useHandCursor:true });
  closeBtn.on("pointerdown", () => this.closeFinalEgg());
  closeBtn.on("pointerover", () => closeBtn.setTint(0x93c5fd));
  closeBtn.on("pointerout", () => closeBtn.clearTint());
  container.add(closeBtn);

  // 渐显动画
  container.setAlpha(0);
  this.scene.tweens.add({
    targets: container,
    alpha: { from: 0, to: 1 },
    duration: 500,
    ease: "Power2",
  });
}

closeFinalEgg() {
  this._eggContainer?.destroy(true);
  this._eggContainer = null;
}


  // 更新方法供外部调用
  updateProgress() {
    this.updateProgressDisplay();
  }

  // 清理资源
  destroy() {
    this.notifications.forEach((notification) => {
      if (notification && notification.destroy) {
        notification.destroy();
      }
    });
    this.notifications = [];
    this.clues = [];

    this.mealProgressIndicators.forEach(indicator => {
      if (indicator.dot && indicator.dot.destroy) indicator.dot.destroy();
      if (indicator.icon && indicator.icon.destroy) indicator.icon.destroy();
    });
    this.mealProgressIndicators = [];

    if (this.dayIndicator) this.dayIndicator.destroy();
    if (this.clueButtonBg) this.clueButtonBg.destroy();
    if (this.clueButtonIcon) this.clueButtonIcon.destroy();
    if (this.clueCountBadge) this.clueCountBadge.destroy();
    if (this.moveHint) this.moveHint.destroy();
  }
}