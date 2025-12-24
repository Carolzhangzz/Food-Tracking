// src/phaser/UIManager.js - 修复版本
export default class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.clues = [];
    this.clueButton = null;
    this.cluePanel = null;
    this.dateDisplay = null;
    this.mealProgress = null;
  }

  init() {
    this.createClueButton();
    this.createDateDisplay();
    this.createMealProgress();
  }

  createClueButton() {
    const isMobile = this.scene.isMobile;
    const buttonSize = isMobile ? 50 : 60;
    const buttonX = isMobile ? this.scene.cameras.main.width - 70 : this.scene.cameras.main.width - 80;
    const buttonY = isMobile ? 70 : 80;

    // 创建背景圆圈
    const bg = this.scene.add.circle(buttonX, buttonY, buttonSize / 2, 0x667eea, 0.9);
    bg.setScrollFactor(0);
    bg.setDepth(100);

    // 创建图标文字
    this.clueButton = this.scene.add.text(buttonX, buttonY, "📖", {
      fontSize: isMobile ? "28px" : "32px",
    });
    this.clueButton.setOrigin(0.5);
    this.clueButton.setScrollFactor(0);
    this.clueButton.setDepth(101);
    this.clueButton.setInteractive({ useHandCursor: true });

    // 添加交互效果
    this.clueButton.on("pointerdown", () => this.toggleCluePanel());
    this.clueButton.on("pointerover", () => {
      bg.setFillStyle(0x818cf8, 1);
      bg.setScale(1.1);
    });
    this.clueButton.on("pointerout", () => {
      bg.setFillStyle(0x667eea, 0.9);
      bg.setScale(1);
    });

    // 保存背景引用以便后续销毁
    this.clueButtonBg = bg;

    console.log("✅ Clue button created at position:", buttonX, buttonY);
  }

  createDateDisplay() {
    const isMobile = this.scene.isMobile;
    const fontSize = isMobile ? "14px" : "16px";
    const padding = isMobile ? { x: 10, y: 6 } : { x: 12, y: 8 };

    // 计算当前是第几天
    const currentDay = this.scene.playerData.currentDay || 1;
    const dateText = this.scene.playerData.language === "zh" 
      ? `第 ${currentDay} 天` 
      : `Day ${currentDay}`;

    this.dateDisplay = this.scene.add.text(20, 20, dateText, {
      fontSize,
      fontFamily: "monospace",
      fill: "#e2e8f0",
      backgroundColor: "#2a2a2a",
      padding,
    });
    this.dateDisplay.setScrollFactor(0);
    this.dateDisplay.setDepth(100);
  }

  createMealProgress() {
    const isMobile = this.scene.isMobile;
    const fontSize = isMobile ? "12px" : "14px";
    const padding = isMobile ? { x: 8, y: 4 } : { x: 10, y: 6 };

    // 获取今日用餐进度
    const meals = this.scene.playerData.todayMeals || {
      breakfast: false,
      lunch: false,
      dinner: false
    };

    const mealIcons = {
      breakfast: meals.breakfast ? "🍳✓" : "🍳✗",
      lunch: meals.lunch ? "🍜✓" : "🍜✗",
      dinner: meals.dinner ? "🍖✓" : "🍖✗"
    };

    const progressText = `${mealIcons.breakfast} ${mealIcons.lunch} ${mealIcons.dinner}`;

    this.mealProgress = this.scene.add.text(20, 60, progressText, {
      fontSize,
      fontFamily: "monospace",
      fill: "#e2e8f0",
      backgroundColor: "#2a2a2a",
      padding,
    });
    this.mealProgress.setScrollFactor(0);
    this.mealProgress.setDepth(100);
  }

  updateMealProgress(meals) {
    if (!this.mealProgress) return;

    const mealIcons = {
      breakfast: meals.breakfast ? "🍳✓" : "🍳✗",
      lunch: meals.lunch ? "🍜✓" : "🍜✗",
      dinner: meals.dinner ? "🍖✓" : "🍖✗"
    };

    this.mealProgress.setText(`${mealIcons.breakfast} ${mealIcons.lunch} ${mealIcons.dinner}`);
  }

  updateDateDisplay(day) {
    if (!this.dateDisplay) return;

    const dateText = this.scene.playerData.language === "zh" 
      ? `第 ${day} 天` 
      : `Day ${day}`;
    
    this.dateDisplay.setText(dateText);
  }

  toggleCluePanel() {
    if (this.cluePanel) {
      this.hideCluePanel();
    } else {
      this.showCluePanel();
    }
  }

  showCluePanel() {
    const isMobile = this.scene.isMobile;
    const width = isMobile ? this.scene.cameras.main.width - 40 : 400;
    const height = isMobile ? this.scene.cameras.main.height - 100 : 500;
    const x = this.scene.cameras.main.centerX;
    const y = this.scene.cameras.main.centerY;

    // 创建背景面板
    const bg = this.scene.add.rectangle(x, y, width, height, 0x1a1a1a, 0.95);
    bg.setScrollFactor(0);
    bg.setDepth(200);
    bg.setStrokeStyle(2, 0x667eea);

    // 创建标题
    const title = this.scene.add.text(
      x,
      y - height / 2 + 30,
      this.scene.playerData.language === "zh" ? "线索本" : "Clue Book",
      {
        fontSize: isMobile ? "20px" : "24px",
        fontFamily: "monospace",
        fill: "#667eea",
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(201);

    // 创建关闭按钮
    const closeBtn = this.scene.add.text(
      x + width / 2 - 30,
      y - height / 2 + 30,
      "✕",
      {
        fontSize: "24px",
        fill: "#ef4444",
      }
    );
    closeBtn.setOrigin(0.5);
    closeBtn.setScrollFactor(0);
    closeBtn.setDepth(201);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.hideCluePanel());

    // 创建线索列表
    const clueListY = y - height / 2 + 80;
    const clueTexts = [];

    if (this.clues.length === 0) {
      const emptyText = this.scene.add.text(
        x,
        y,
        this.scene.playerData.language === "zh" 
          ? "还没有收集到任何线索..." 
          : "No clues collected yet...",
        {
          fontSize: isMobile ? "14px" : "16px",
          fontFamily: "monospace",
          fill: "#94a3b8",
          align: "center",
        }
      );
      emptyText.setOrigin(0.5);
      emptyText.setScrollFactor(0);
      emptyText.setDepth(201);
      clueTexts.push(emptyText);
    } else {
      this.clues.forEach((clue, index) => {
        const clueY = clueListY + index * 80;
        
        const clueText = this.scene.add.text(
          x - width / 2 + 20,
          clueY,
          `📌 ${clue.npcName}:\n${clue.clue}`,
          {
            fontSize: isMobile ? "12px" : "14px",
            fontFamily: "monospace",
            fill: "#e2e8f0",
            wordWrap: { width: width - 60 },
          }
        );
        clueText.setScrollFactor(0);
        clueText.setDepth(201);
        clueTexts.push(clueText);
      });
    }

    this.cluePanel = {
      bg,
      title,
      closeBtn,
      clueTexts,
    };
  }

  hideCluePanel() {
    if (!this.cluePanel) return;

    this.cluePanel.bg.destroy();
    this.cluePanel.title.destroy();
    this.cluePanel.closeBtn.destroy();
    this.cluePanel.clueTexts.forEach(text => text.destroy());

    this.cluePanel = null;
  }

  addClue(clueData) {
    // clueData: { npcId, npcName, clue }
    const exists = this.clues.find(c => c.npcId === clueData.npcId);
    if (!exists) {
      this.clues.push(clueData);
      console.log("✅ Clue added:", clueData);
    }
  }

  destroy() {
    if (this.clueButton) this.clueButton.destroy();
    if (this.clueButtonBg) this.clueButtonBg.destroy();
    if (this.dateDisplay) this.dateDisplay.destroy();
    if (this.mealProgress) this.mealProgress.destroy();
    this.hideCluePanel();
  }
}