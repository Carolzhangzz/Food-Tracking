// src/phaser/UIManager.js - 修复重复方法和键盘适配
import Phaser from "phaser";
import { guessStageFromText } from "../utils/guessStageFromText";

export default class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.clues = this.clues || [];
    this.notifications = [];
    this.progressBar = null;
    this.dayIndicator = null;
    this.mealProgressIndicators = [];
    this.clueJournalElements = null;

    // 键盘状态跟踪
    this.isKeyboardOpen = false;
    this.originalPositions = new Map();

    this.createProgressUI();
    this.createActionButtons();

    this.clues = this.clues || [];
    this.cluesById = this.cluesById || new Map();

    // 响应式
    this.scene.scale.on("resize", () => this.handleResize());
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width < height) {
      // 竖屏时提示玩家旋转设备
      this.add
        .text(width / 2, height / 2, "请横屏体验游戏", {
          fontSize: "20px",
          color: "#ffffff",
          backgroundColor: "#00000088",
          padding: { x: 15, y: 8 },
        })
        .setOrigin(0.5)
        .setDepth(999);
    } else {
      // 横屏下重新布局地图和摄像机
      this.cameras.main.setViewport(0, 0, width, height);
      if (this.map && this.cameras.main) {
        this.cameras.main.centerOn(this.playerLoc.x, this.playerLoc.y);
      }
    }
  }

  // 键盘状态处理
  handleKeyboardToggle(isOpen) {
    this.isKeyboardOpen = isOpen;
    if (isOpen) {
      this.adjustUIForKeyboard();
    } else {
      this.restoreUIFromKeyboard();
    }

    // 重新定位通知以避免与对话元素冲突
    this.updateNotificationPositions();
  }

  adjustUIForKeyboard() {
    const { width } = this.scene.scale;

    // 保存原始位置
    if (!this.originalPositions.has("dayIndicator") && this.dayIndicator) {
      this.originalPositions.set("dayIndicator", {
        x: this.dayIndicator.x,
        y: this.dayIndicator.y,
      });
    }

    // 调整顶部进度UI到更安全的位置
    if (this.dayIndicator) {
      this.dayIndicator.setPosition(width / 2, 15);
    }

    // 调整三餐进度指示器
    if (this.mealProgressIndicators.length > 0) {
      const startX = width / 2 - 40;
      const spacing = 40;
      const safeY = 40;

      this.mealProgressIndicators.forEach((ind, i) => {
        if (!this.originalPositions.has(`meal_${i}`)) {
          this.originalPositions.set(`meal_${i}`, {
            x: ind.dot.x,
            y: ind.dot.y,
          });
        }

        const x = startX + i * spacing;
        ind.dot?.setPosition(x, safeY);
        ind.icon?.setPosition(x, safeY);
      });
    }

    // 调整帮助徽章位置
    if (this._mealHelpBadge) {
      if (!this.originalPositions.has("helpBadge")) {
        this.originalPositions.set("helpBadge", {
          x: this._mealHelpBadge.x,
          y: this._mealHelpBadge.y,
        });
      }
      this._mealHelpBadge.setPosition(width / 2 + 70, 40);
    }

    // 调整线索按钮位置
    if (this.clueButtonBg && this.clueButtonIcon) {
      const buttonSize = 40;
      const buttonX = width - buttonSize - 10;
      const buttonY = 60;

      if (!this.originalPositions.has("clueButton")) {
        this.originalPositions.set("clueButton", {
          x: this.clueButtonBg.x,
          y: this.clueButtonBg.y,
        });
      }

      this.clueButtonBg.setPosition(buttonX, buttonY);
      this.clueButtonIcon.setPosition(
        buttonX + buttonSize / 2,
        buttonY + buttonSize / 2
      );

      if (this.clueCountBadge) {
        this.clueCountBadge.setPosition(buttonX + buttonSize - 6, buttonY + 2);
      }
    }

    // 隐藏移动提示
    if (this.moveHint) {
      this.moveHint.setVisible(false);
    }

    // 调整通知位置
    this.repositionNotificationsForKeyboard();
  }

  restoreUIFromKeyboard() {
    // 恢复天数指示器
    if (this.dayIndicator && this.originalPositions.has("dayIndicator")) {
      const pos = this.originalPositions.get("dayIndicator");
      this.dayIndicator.setPosition(pos.x, pos.y);
    }

    // 恢复三餐进度指示器
    this.mealProgressIndicators.forEach((ind, i) => {
      if (this.originalPositions.has(`meal_${i}`)) {
        const pos = this.originalPositions.get(`meal_${i}`);
        ind.dot?.setPosition(pos.x, pos.y);
        ind.icon?.setPosition(pos.x, pos.y);
      }
    });

    // 恢复帮助徽章
    if (this._mealHelpBadge && this.originalPositions.has("helpBadge")) {
      const pos = this.originalPositions.get("helpBadge");
      this._mealHelpBadge.setPosition(pos.x, pos.y);
    }

    // 恢复线索按钮
    if (this.clueButtonBg && this.originalPositions.has("clueButton")) {
      const pos = this.originalPositions.get("clueButton");
      const buttonSize = 40;

      this.clueButtonBg.setPosition(pos.x, pos.y);
      this.clueButtonIcon.setPosition(
        pos.x + buttonSize / 2,
        pos.y + buttonSize / 2
      );

      if (this.clueCountBadge) {
        this.clueCountBadge.setPosition(pos.x + buttonSize - 6, pos.y + 2);
      }
    }

    // 恢复移动提示
    if (this.moveHint) {
      this.moveHint.setVisible(true);
    }

    // 恢复通知位置
    this.updateNotificationPositions();

    // 清理原始位置缓存
    this.originalPositions.clear();
  }

  repositionNotificationsForKeyboard() {
    const startY = this.isKeyboardOpen ? 80 : 120;
    this.notifications.forEach((n, i) => {
      if (n && n.setPosition) {
        n.y = startY + i * 35;
      }
    });
  }

  // ===================== 顶部进度 UI =====================
  createProgressUI() {
    this.createDayProgressBar();
  }

  createDayProgressBar() {
    const { width } = this.scene.scale;

    // 天数
    this.dayIndicator = this.scene.add.text(width / 2, 25, "", {
      fontSize: "16px",
      fontFamily: "monospace",
      fill: "#f9fafb",
      fontStyle: "bold",
      backgroundColor: "#1f2937",
      padding: { x: 12, y: 6 },
    });
    this.dayIndicator.setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.createSimpleMealProgress();
    this.createMealHelpBadge();
    this.maybeShowFirstDayHint();
    this.updateProgressDisplay();
  }

  createSimpleMealProgress() {
    const { width } = this.scene.scale;
    const mealTypes = [
      { type: "breakfast", icon: "🌅" },
      { type: "lunch", icon: "☀️" },
      { type: "dinner", icon: "🌙" },
    ];

    const startX = width / 2 - 40;
    const y = 55;
    const spacing = 40;

    this.mealProgressIndicators = [];

    mealTypes.forEach((meal, i) => {
      const x = startX + i * spacing;

      const dot = this.scene.add.graphics();
      dot.fillStyle(0x4b5563, 0.8).fillCircle(0, 0, 10);
      dot.setPosition(x, y).setScrollFactor(0).setDepth(100);

      const icon = this.scene.add.text(x, y, meal.icon, { fontSize: "14px" });
      icon.setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0.6);

      const tip = () => {
        const lang = this.scene.playerData.language;
        const map = {
          breakfast: lang === "zh" ? "早饭进度" : "Breakfast progress",
          lunch: lang === "zh" ? "午饭进度" : "Lunch progress",
          dinner: lang === "zh" ? "晚饭进度" : "Dinner progress",
        };
        this.showNotification("提示", "轻点 NPC 开始对话…", { duration: 6000 });
      };
      icon.setInteractive({ useHandCursor: true }).on("pointerdown", tip);
      dot
        .setInteractive(
          new Phaser.Geom.Circle(0, 0, 10),
          Phaser.Geom.Circle.Contains
        )
        .on("pointerdown", tip);

      this.mealProgressIndicators.push({
        type: meal.type,
        dot,
        icon,
        completed: false,
      });
    });
  }

  createActionButtons() {
    this.createClueButton();
    this.createMoveHint();
  }

  createClueButton() {
    const { width } = this.scene.scale;
    const buttonSize = 40;
    const buttonX = width - buttonSize - 10;
    const buttonY = 80;

    this.clueButtonBg = this.scene.add.graphics();
    this.clueButtonBg.fillStyle(0x1f2937, 0.9);
    this.clueButtonBg.fillCircle(
      buttonSize / 2,
      buttonSize / 2,
      buttonSize / 2
    );
    this.clueButtonBg.lineStyle(1, 0x6b7280);
    this.clueButtonBg.strokeCircle(
      buttonSize / 2,
      buttonSize / 2,
      buttonSize / 2
    );
    this.clueButtonBg
      .setPosition(buttonX, buttonY)
      .setScrollFactor(0)
      .setDepth(100);

    this.clueButtonIcon = this.scene.add.text(
      buttonX + buttonSize / 2,
      buttonY + buttonSize / 2,
      "📋",
      {
        fontSize: "16px",
      }
    );
    this.clueButtonIcon.setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.clueButtonBg.setInteractive(
      new Phaser.Geom.Circle(buttonSize / 2, buttonSize / 2, buttonSize / 2),
      Phaser.Geom.Circle.Contains
    );
    this.clueButtonBg.on("pointerdown", () => this.showClueJournal());
    this.clueButtonBg.on("pointerover", () => {
      this.clueButtonBg.clear();
      this.clueButtonBg.fillStyle(0x374151, 0.9);
      this.clueButtonBg.fillCircle(
        buttonSize / 2,
        buttonSize / 2,
        buttonSize / 2
      );
      this.clueButtonBg.lineStyle(1, 0x9ca3af);
      this.clueButtonBg.strokeCircle(
        buttonSize / 2,
        buttonSize / 2,
        buttonSize / 2
      );
    });
    this.clueButtonBg.on("pointerout", () => {
      this.clueButtonBg.clear();
      this.clueButtonBg.fillStyle(0x1f2937, 0.9);
      this.clueButtonBg.fillCircle(
        buttonSize / 2,
        buttonSize / 2,
        buttonSize / 2
      );
      this.clueButtonBg.lineStyle(1, 0x6b7280);
      this.clueButtonBg.strokeCircle(
        buttonSize / 2,
        buttonSize / 2,
        buttonSize / 2
      );
    });

    this.clueCountBadge = this.scene.add.text(
      buttonX + buttonSize - 6,
      buttonY + 2,
      "0",
      {
        fontSize: "10px",
        fontFamily: "monospace",
        fill: "#ffffff",
        backgroundColor: "#ef4444",
        padding: { x: 3, y: 1 },
      }
    );
    this.clueCountBadge
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);
  }

  createMoveHint() {
    const { width, height } = this.scene.scale;
    const language = this.scene.playerData.language;
    const hintText =
      language === "zh"
        ? "点击移动 | 点击NPC对话"
        : "Tap to move | Tap NPC to talk";

    this.moveHint = this.scene.add.text(width / 2, height - 25, hintText, {
      fontSize: "12px",
      fontFamily: "monospace",
      fill: "#9ca3af",
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: { x: 8, y: 4 },
      align: "center",
    });
    this.moveHint.setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0.7);

    this.scene.time.delayedCall(4000, () => {
      if (this.moveHint) {
        this.scene.tweens.add({
          targets: this.moveHint,
          alpha: 0,
          duration: 800,
          onComplete: () => {
            this.moveHint?.destroy();
            this.moveHint = null;
          },
        });
      }
    });
  }

  createMealHelpBadge() {
    const { width } = this.scene.scale;
    const badge = this.scene.add.text(width / 2 + 70, 55, "?", {
      fontSize: "10px",
      fontFamily: "monospace",
      fill: "#111827",
      backgroundColor: "#93c5fd",
      padding: { x: 5, y: 2 },
    });
    badge.setOrigin(0.5).setScrollFactor(0).setDepth(102).setAlpha(0.9);
    badge.setInteractive({ useHandCursor: true });

    const showHelp = () => {
      const lang = this.scene.playerData.language;
      const text =
        lang === "zh"
          ? "上面的三个点表示今日早/中/晚餐记录进度。"
          : "The three dots show your breakfast/lunch/dinner progress today.";
      this.showNotification(text, 6000);
    };

    badge.on("pointerdown", showHelp);
    this._mealHelpBadge = badge;
  }

  maybeShowFirstDayHint() {
    try {
      const dayKey = `mealHint_${new Date().toDateString()}`;
      if (localStorage.getItem(dayKey)) return;

      const { width } = this.scene.scale;
      const lang = this.scene.playerData.language;
      const hint = this.scene.add.text(
        width / 2,
        75,
        lang === "zh"
          ? "3 个点 = 早/中/晚餐进度"
          : "3 dots = breakfast/lunch/dinner",
        {
          fontSize: "11px",
          fontFamily: "monospace",
          fill: "#d1d5db",
          backgroundColor: "rgba(0,0,0,0.4)",
          padding: { x: 6, y: 3 },
        }
      );
      hint.setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0);

      this.scene.tweens.add({
        targets: hint,
        alpha: { from: 0, to: 1 },
        duration: 200,
        onComplete: () => {
          this.scene.time.delayedCall(3000, () => {
            this.scene.tweens.add({
              targets: hint,
              alpha: 0,
              duration: 300,
              onComplete: () => hint.destroy(),
            });
          });
        },
      });

      localStorage.setItem(dayKey, "1");
    } catch {
      // 忽略本地存储异常
    }
  }

  repositionProgressUI() {
    const { width } = this.scene.scale;

    this.dayIndicator?.setPosition(width / 2, 25);

    if (this.mealProgressIndicators.length > 0) {
      const startX = width / 2 - 40;
      const spacing = 40;
      this.mealProgressIndicators.forEach((ind, i) => {
        const x = startX + i * spacing;
        ind.dot?.setPosition(x, 55);
        ind.icon?.setPosition(x, 55);
      });
    }

    this._mealHelpBadge?.setPosition(width / 2 + 70, 55);
  }

  repositionActionButtons() {
    const { width } = this.scene.scale;
    const buttonSize = 40;
    const buttonX = width - buttonSize - 10;
    const buttonY = 80;

    this.clueButtonBg?.setPosition(buttonX, buttonY);
    this.clueButtonIcon?.setPosition(
      buttonX + buttonSize / 2,
      buttonY + buttonSize / 2
    );
    this.clueCountBadge?.setPosition(buttonX + buttonSize - 6, buttonY + 2);
  }

  updateProgressDisplay() {
    if (!this.scene.npcManager) return;

    const progress = this.scene.npcManager.getDailyProgress();
    const language = this.scene.playerData.language;
    const dayText =
      language === "zh"
        ? `第${progress.currentDay}天`
        : `Day ${progress.currentDay}`;
    this.dayIndicator?.setText(dayText);

    const currentDayMeals = this.scene.npcManager.mealRecords
      .filter((m) => m.day === progress.currentDay)
      .map((m) => m.mealType);

    this.mealProgressIndicators.forEach((ind) => {
      const done = currentDayMeals.includes(ind.type);
      if (done !== ind.completed) {
        ind.completed = done;
        if (done) {
          ind.dot.clear().fillStyle(0x10b981, 1).fillCircle(0, 0, 10);
          ind.icon.setAlpha(1);
          this.scene.tweens.add({
            targets: [ind.dot, ind.icon],
            scaleX: { from: 1, to: 1.2 },
            scaleY: { from: 1, to: 1.2 },
            duration: 200,
            yoyo: true,
            ease: "Back.easeOut",
          });
        } else {
          ind.dot.clear().fillStyle(0x4b5563, 0.8).fillCircle(0, 0, 10);
          ind.icon.setAlpha(0.6);
        }
      }
    });

    if (progress.isComplete && currentDayMeals.length === 3)
      this.showSimpleDayComplete();
  }

  showSimpleDayComplete() {
    const { width, height } = this.scene.scale;
    const lang = this.scene.playerData.language;

    const t = this.scene.add.text(
      width / 2,
      height / 2 - 30,
      lang === "zh" ? "今日完成！" : "Day Complete!",
      {
        fontSize: "20px",
        fontFamily: "monospace",
        fill: "#10b981",
        fontStyle: "bold",
      }
    );
    t.setOrigin(0.5).setScrollFactor(0).setDepth(150).setAlpha(0);

    this.scene.tweens.add({
      targets: t,
      alpha: { from: 0, to: 1 },
      y: t.y - 15,
      duration: 600,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: t,
          alpha: 0,
          duration: 800,
          delay: 1200,
          onComplete: () => t.destroy(),
        });
      },
    });

    this.mealProgressIndicators.forEach((ind) => {
      if (ind.completed) {
        this.scene.tweens.add({
          targets: [ind.dot, ind.icon],
          alpha: { from: 1, to: 0.5 },
          duration: 300,
          yoyo: true,
          repeat: 2,
        });
      }
    });
  }

  // ===================== 线索逻辑 =====================
  addClue(clue) {
    if (!clue) return;

    let stageNum =
      clue.stage === 1 || clue.stage === 2 || clue.stage === 3
        ? clue.stage
        : undefined;
    if (stageNum == null) {
      const guessed = guessStageFromText(clue.npcId, clue.clue);
      if (guessed) stageNum = guessed;
    }

    const id =
      clue.id ||
      `${clue.npcId || "unknown"}_${Number.isFinite(clue.day) ? clue.day : 0}${
        stageNum ? "_" + stageNum : ""
      }`;

    if (this.cluesById.has(id)) return;

    const normalized = {
      id,
      npcId: clue.npcId,
      npcName: clue.npcName || "NPC",
      clue: clue.clue || "…",
      day: Number.isFinite(clue.day) ? clue.day : 0,
      stage: stageNum,
      receivedAt: clue.receivedAt ? new Date(clue.receivedAt) : new Date(),
    };

    this.clues.push(normalized);
    this.cluesById.set(id, normalized);

    this.clues.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      const sa = a.stage ?? 99,
        sb = b.stage ?? 99;
      if (sa !== sb) return sa - sb;
      return a.receivedAt - b.receivedAt;
    });

    this.updateClueCountBadge?.();
    this.showNotification(
      this.scene.playerData.language === "zh" ? "新线索！" : "New clue!"
    );
  }

  setClues(list = []) {
    this.clues = [];
    this.cluesById = new Map();

    list.forEach((c) => {
      const stage =
        c.stage === 1 || c.stage === 2 || c.stage === 3
          ? c.stage
          : guessStageFromText(c.npcId, c.clue);
      const id =
        c.id ||
        `${c.npcId || "unknown"}_${Number(c.day) || 0}${
          stage ? "_" + stage : ""
        }`;
      if (this.cluesById.has(id)) return;

      const normalized = {
        id,
        npcId: c.npcId,
        npcName: c.npcName || "NPC",
        clue: c.clue || "…",
        day: Number.isFinite(c.day) ? c.day : 0,
        stage,
        receivedAt: c.receivedAt ? new Date(c.receivedAt) : new Date(),
      };
      this.clues.push(normalized);
      this.cluesById.set(id, normalized);
    });

    this.clues.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      const sa = a.stage ?? 99,
        sb = b.stage ?? 99;
      if (sa !== sb) return sa - sb;
      return a.receivedAt - b.receivedAt;
    });

    this.updateClueCountBadge?.();
  }

  updateClueCountBadge() {
    if (!this.clueCountBadge) return;
    const count = this.clues.length;
    this.clueCountBadge.setText(String(count)).setVisible(count > 0);
    if (count > 0) {
      this.scene.tweens.add({
        targets: this.clueCountBadge,
        scale: { from: 1.2, to: 1 },
        duration: 250,
        ease: "Back.easeOut",
      });
    }
  }

  getAllClues() {
    return this.clues;
  }

  // ===================== 通知 & 线索本 =====================
  showNotification(message, duration = 2500) {
    const { width, height } = this.scene.scale;

    // 调整通知位置，避免与顶部对话框冲突
    const startY = this.isKeyboardOpen ? 80 : Math.min(200, height * 0.25); // 提高起始位置

    const t = this.scene.add.text(width / 2, startY, message, {
      fontSize: this.scene.isMobile ? "12px" : "14px", // 移动端使用更小字体
      fontFamily: "monospace",
      fill: "#fbbf24",
      backgroundColor: "#1f2937",
      padding: { x: 12, y: 6 },
      align: "center",
      wordWrap: { width: width * 0.8, useAdvancedWrap: true }, // 添加自动换行
    });
    t.setOrigin(0.5).setScrollFactor(0).setDepth(150);

    this.notifications.push(t);
    this.updateNotificationPositions();

    this.scene.tweens.add({
      targets: t,
      alpha: { from: 1, to: 0 },
      y: t.y - 20,
      duration: duration,
      ease: "Power2",
      onComplete: () => {
        const i = this.notifications.indexOf(t);
        if (i > -1) this.notifications.splice(i, 1);
        t.destroy();
        this.updateNotificationPositions();
      },
    });
  }

  updateNotificationPositions() {
    const startY = this.isKeyboardOpen ? 80 : 200; // 调整起始位置以避免对话框冲突
    this.notifications.forEach((n, i) => {
      if (n && n.setPosition) {
        n.y = startY + i * 35;
      }
    });
  }

  showClueJournal() {
    const { width, height } = this.scene.scale;
    if (this.clueJournalElements) return;
    this.clueJournalElements = [];

    const availableHeight =
      this.isKeyboardOpen && window.visualViewport
        ? window.visualViewport.height
        : height;

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.75).fillRect(0, 0, width, availableHeight);
    overlay.setScrollFactor(0).setDepth(199).setInteractive();
    this.clueJournalElements.push(overlay);

    const journalWidth = Math.min(width * 0.92, 400);
    const journalHeight = Math.min(availableHeight * 0.85, 550);
    const x = (width - journalWidth) / 2;
    const y = (availableHeight - journalHeight) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1f2937, 0.98).fillRoundedRect(
      x,
      y,
      journalWidth,
      journalHeight,
      8
    );
    bg.lineStyle(1, 0x374151).strokeRoundedRect(
      x,
      y,
      journalWidth,
      journalHeight,
      8
    );
    bg.setScrollFactor(0).setDepth(200);
    this.clueJournalElements.push(bg);

    const title = this.scene.add.text(
      width / 2,
      y + 30,
      this.scene.playerData.language === "zh" ? "线索记录" : "Clue Journal",
      {
        fontSize: "18px",
        fontFamily: "monospace",
        fill: "#f9fafb",
        fontStyle: "bold",
      }
    );
    title.setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.clueJournalElements.push(title);

    const progress = this.scene.npcManager
      ? this.scene.npcManager.getDailyProgress()
      : { currentDay: 1 };
    const currentDayMeals = this.scene.npcManager
      ? this.scene.npcManager.mealRecords.filter(
          (m) => m.day === progress.currentDay
        ).length
      : 0;

    const progressText = this.scene.add.text(
      width / 2,
      y + 55,
      this.scene.playerData.language === "zh"
        ? `第${progress.currentDay}天 (${currentDayMeals}/3)`
        : `Day ${progress.currentDay} (${currentDayMeals}/3)`,
      { fontSize: "12px", fontFamily: "monospace", fill: "#9ca3af" }
    );
    progressText.setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.clueJournalElements.push(progressText);

    const contentY = y + 80;

    if (this.clues.length === 0) {
      const noClues = this.scene.add.text(
        width / 2,
        y + journalHeight / 2,
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
      noClues.setOrigin(0.5).setScrollFactor(0).setDepth(200);
      this.clueJournalElements.push(noClues);
    } else {
      let offY = contentY;
      const maxH = journalHeight - 140;
      this.clues.slice(0, 6).forEach((clue, idx) => {
        if (offY > y + maxH) return;

        const dayLabel = this.scene.add.text(
          x + 15,
          offY,
          this.scene.playerData.language === "zh"
            ? `第${clue.day}天`
            : `Day ${clue.day}`,
          {
            fontSize: "11px",
            fontFamily: "monospace",
            fill: "#fbbf24",
            backgroundColor: "#374151",
            padding: { x: 6, y: 2 },
          }
        );
        dayLabel.setScrollFactor(0).setDepth(200);
        this.clueJournalElements.push(dayLabel);
        offY += 20;

        const npcName = this.scene.add.text(x + 15, offY, `${clue.npcName}:`, {
          fontSize: "12px",
          fontFamily: "monospace",
          fill: "#f9fafb",
          fontStyle: "bold",
        });
        npcName.setScrollFactor(0).setDepth(200);
        this.clueJournalElements.push(npcName);
        offY += 18;

        const translatedClue = this.getTranslatedClue(clue);
        const shortClue = this.getShortClue(translatedClue);
        const clueText = this.scene.add.text(x + 25, offY, shortClue, {
          fontSize: "11px",
          fontFamily: "monospace",
          fill: "#d1d5db",
          wordWrap: { width: journalWidth - 50 },
          lineSpacing: 3,
        });
        clueText
          .setScrollFactor(0)
          .setDepth(200)
          .setInteractive({ useHandCursor: true });
        clueText.on("pointerdown", () =>
          this.showFullClue({ ...clue, clue: translatedClue })
        );
        clueText.on("pointerover", () => clueText.setTint(0x60a5fa));
        clueText.on("pointerout", () => clueText.clearTint());
        this.clueJournalElements.push(clueText);
        offY += clueText.height + 15;

        if (idx < this.clues.length - 1 && idx < 5) {
          const sep = this.scene.add.graphics();
          sep
            .lineStyle(1, 0x374151, 0.5)
            .lineBetween(x + 15, offY, x + journalWidth - 15, offY);
          sep.setScrollFactor(0).setDepth(200);
          this.clueJournalElements.push(sep);
          offY += 10;
        }
      });

      if (this.clues.length > 6) {
        const more = this.scene.add.text(
          width / 2,
          y + journalHeight - 80,
          this.clues.length -
            6 +
            (this.scene.playerData.language === "zh"
              ? " 条更多线索..."
              : " more clues..."),
          {
            fontSize: "10px",
            fontFamily: "monospace",
            fill: "#6b7280",
            align: "center",
          }
        );
        more.setOrigin(0.5).setScrollFactor(0).setDepth(200);
        this.clueJournalElements.push(more);
      }
    }
    const close = this.scene.add.text(x + journalWidth - 25, y + 15, "✕", {
      fontSize: "16px",
      fontFamily: "monospace",
      fill: "#9ca3af",
      fontStyle: "bold",
    });
    close
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.closeClueJournal());
    close.on("pointerover", () => close.setTint(0xef4444));
    close.on("pointerout", () => close.clearTint());
    this.clueJournalElements.push(close);

    overlay.on("pointerdown", () => this.closeClueJournal());
  }

  getTranslatedClue(clue) {
    return clue.clue;
  }

  getShortClue(fullClue) {
    const sentences = fullClue.split(/[.。]/);
    let s = sentences[0];
    if (s.length > 50) s = s.slice(0, 50) + "...";
    else if (sentences.length > 1) s += "...";
    return s;
  }

  showFullClue(clue) {
    const { width, height } = this.scene.scale;

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.85).fillRect(0, 0, width, height);
    overlay.setScrollFactor(0).setDepth(250).setInteractive();

    const w = width * 0.9;
    const h = height * 0.75;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1f2937, 1).fillRoundedRect(x, y, w, h, 8);
    bg.lineStyle(1, 0x374151).strokeRoundedRect(x, y, w, h, 8);
    bg.setScrollFactor(0).setDepth(251);

    const title = this.scene.add.text(
      width / 2,
      y + 30,
      `${clue.npcName} - ${
        this.scene.playerData.language === "zh"
          ? "第" + clue.day + "天"
          : "Day " + clue.day
      }`,
      {
        fontSize: "16px",
        fontFamily: "monospace",
        fill: "#f9fafb",
        fontStyle: "bold",
        align: "center",
      }
    );
    title.setOrigin(0.5).setScrollFactor(0).setDepth(252);

    const content = this.scene.add.text(x + 20, y + 60, clue.clue, {
      fontSize: "13px",
      fontFamily: "monospace",
      fill: "#d1d5db",
      wordWrap: { width: w - 40, useAdvancedWrap: true },
      lineSpacing: 6,
      align: "left",
    });
    content.setScrollFactor(0).setDepth(252);

    const close = this.scene.add.text(
      width / 2,
      y + h - 40,
      this.scene.playerData.language === "zh" ? "关闭" : "Close",
      {
        fontSize: "14px",
        fontFamily: "monospace",
        fill: "#60a5fa",
        backgroundColor: "#374151",
        padding: { x: 12, y: 6 },
      }
    );
    close
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(252)
      .setInteractive({ useHandCursor: true });

    const cleanup = () => {
      overlay.destroy();
      bg.destroy();
      title.destroy();
      content.destroy();
      close.destroy();
    };
    close.on("pointerdown", cleanup);
    overlay.on("pointerdown", cleanup);
    close.on("pointerover", () => close.setTint(0x93c5fd));
    close.on("pointerout", () => close.clearTint());
  }

  closeClueJournal() {
    if (!this.clueJournalElements) return;
    this.clueJournalElements.forEach((el) => el?.destroy && el.destroy());
    this.clueJournalElements = null;
  }

  // ===================== 彩蛋视图 =====================
  showFinalEgg(egg) {
    this.showNotification(
      this.scene.playerData.language === "zh"
        ? "彩蛋已生成（UI 略）"
        : "Final egg (UI omitted)"
    );
  }

  closeFinalEgg() {}

  // ===================== 其他 =====================
  updateProgress() {
    this.updateProgressDisplay();
  }

  destroy() {
    this.notifications.forEach((n) => n?.destroy && n.destroy());
    this.notifications = [];
    this.clues = [];

    this.mealProgressIndicators.forEach((i) => {
      i.dot?.destroy && i.dot.destroy();
      i.icon?.destroy && i.icon.destroy();
    });
    this.mealProgressIndicators = [];

    this.dayIndicator?.destroy();
    this.clueButtonBg?.destroy();
    this.clueButtonIcon?.destroy();
    this.clueCountBadge?.destroy();
    this.moveHint?.destroy();
    this._mealHelpBadge?.destroy();
  }
}
