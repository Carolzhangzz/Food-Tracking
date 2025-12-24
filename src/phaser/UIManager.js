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
   // 🔧 线索本按钮已移至React Control.jsx组件
    // this.createClueButton(); // 不再需要
    this.createDateDisplay();
    this.createMealProgress();
    }

  createClueButton() {
    const isMobile = this.scene.isMobile;
    const buttonSize = isMobile ? 60 : 70;
    
    // 🔧 放在音乐按钮下方（左下角）
    const buttonX = 40;
    const buttonY = isMobile ? this.scene.cameras.main.height - 140 : this.scene.cameras.main.height - 150;

    console.log(`📖 创建线索本按钮在: (${buttonX}, ${buttonY})`);

    // 🔧 使用cluebook图片而不是emoji
    if (this.scene.textures.exists("cluebook")) {
      this.clueButton = this.scene.add.image(buttonX, buttonY, "cluebook");
      this.clueButton.setScale(buttonSize / this.clueButton.width);
      this.clueButton.setOrigin(0.5);
    } else {
      // 回退：使用emoji
      console.warn("⚠️ cluebook图片未找到，使用emoji");
      this.clueButton = this.scene.add.text(buttonX, buttonY, "📖", {
        fontSize: isMobile ? "32px" : "36px",
      });
      this.clueButton.setOrigin(0.5);
    }
    
    this.clueButton.setScrollFactor(0);
    this.clueButton.setDepth(10000);
    this.clueButton.setInteractive({ useHandCursor: true });

    // 添加交互效果
    this.clueButton.on("pointerdown", () => {
      console.log("📖 线索本按钮被点击");
      this.toggleCluePanel();
    });
    this.clueButton.on("pointerover", () => {
      this.clueButton.setScale((buttonSize / (this.clueButton.width || 50)) * 1.1);
      this.clueButton.setTint(0x818cf8);
    });
    this.clueButton.on("pointerout", () => {
      this.clueButton.setScale(buttonSize / (this.clueButton.width || 50));
      this.clueButton.clearTint();
    });

    // 创建线索数量badge
    this.clueCountBadge = this.scene.add.text(buttonX + 25, buttonY - 25, "0", {
      fontSize: isMobile ? "16px" : "18px",
      fontFamily: "Arial",
      fill: "#ffffff",
      backgroundColor: "#ef4444",
      padding: { x: 6, y: 4 },
    });
    this.clueCountBadge.setOrigin(0.5);
    this.clueCountBadge.setScrollFactor(0);
    this.clueCountBadge.setDepth(10001);
    this.clueCountBadge.setVisible(false);

    console.log("✅ 线索本按钮创建完成:", buttonX, buttonY);
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

  // 🔧 别名，供React组件调用
  showClueJournal() {
    this.showCluePanel();
        }

  showCluePanel() {
    const isMobile = this.scene.isMobile;
    const width = isMobile ? this.scene.cameras.main.width - 40 : 450;
    const height = isMobile ? this.scene.cameras.main.height - 100 : 550;
    const x = this.scene.cameras.main.centerX;
    const y = this.scene.cameras.main.centerY;
    const lang = this.scene.playerData?.language || "zh";

    // 创建背景面板
    const bg = this.scene.add.rectangle(x, y, width, height, 0x1a1a1a, 0.95);
    bg.setScrollFactor(0);
    bg.setDepth(200);
    bg.setStrokeStyle(3, 0x8b5cf6); // 紫色边框，与cluebook按钮一致

    // 创建标题
    const title = this.scene.add.text(
      x,
      y - height / 2 + 35,
      lang === "zh" ? "📖 线索本" : "📖 Clue Book",
      {
        fontSize: isMobile ? "22px" : "28px",
        fontFamily: "monospace",
        fill: "#a78bfa",
        fontStyle: "bold",
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(201);

    // 创建关闭按钮
    const closeBtn = this.scene.add.text(
      x + width / 2 - 35,
      y - height / 2 + 35,
      "✕",
      {
        fontSize: "28px",
        fill: "#ef4444",
      }
    );
    closeBtn.setOrigin(0.5);
    closeBtn.setScrollFactor(0);
    closeBtn.setDepth(201);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.hideCluePanel());

    // 创建线索列表
    const clueListY = y - height / 2 + 90;
    const clueTexts = [];

    if (this.clues.length === 0) {
      const emptyText = this.scene.add.text(
        x,
        y,
        lang === "zh"
          ? "还没有收集到任何线索...\n\n💡 和NPC对话完成记录餐食\n即可获得线索！" 
          : "No clues collected yet...\n\n💡 Talk to NPCs and record meals\nto collect clues!",
        {
          fontSize: isMobile ? "16px" : "18px",
          fontFamily: "monospace",
          fill: "#94a3b8",
          align: "center",
          lineSpacing: 8,
        }
      );
      emptyText.setOrigin(0.5);
      emptyText.setScrollFactor(0);
      emptyText.setDepth(201);
      clueTexts.push(emptyText);
    } else {
      // 🔧 区分vague和true线索
      const trueClues = this.clues.filter(c => c.clueType === 'true');
      const vagueClues = this.clues.filter(c => c.clueType === 'vague');
      
      let currentY = clueListY;
      
      // 显示重要线索（true）
      if (trueClues.length > 0) {
        const trueTitle = this.scene.add.text(
          x - width / 2 + 20,
          currentY,
          lang === "zh" ? "🔑 重要线索" : "🔑 Key Clues",
          {
            fontSize: isMobile ? "16px" : "18px",
            fill: "#fbbf24",
            fontStyle: "bold",
          }
        );
        trueTitle.setScrollFactor(0);
        trueTitle.setDepth(201);
        clueTexts.push(trueTitle);
        currentY += 35;
        
        trueClues.forEach((clue) => {
          // 移除**标记但保留内容
          const cleanClue = clue.clue.replace(/\*\*/g, '');
          const clueText = this.scene.add.text(
            x - width / 2 + 25,
            currentY,
            `📌 ${clue.npcName}:\n${cleanClue.substring(0, 150)}${cleanClue.length > 150 ? '...' : ''}`,
            {
              fontSize: isMobile ? "13px" : "15px",
            fontFamily: "monospace",
              fill: "#fef3c7",
              wordWrap: { width: width - 60 },
              lineSpacing: 4,
            }
          );
          clueText.setScrollFactor(0);
          clueText.setDepth(201);
          clueTexts.push(clueText);
          currentY += clueText.height + 15;
        });
  }

      // 显示模糊线索（vague）
      if (vagueClues.length > 0 && currentY < y + height / 2 - 60) {
        currentY += 10;
        const vagueTitle = this.scene.add.text(
          x - width / 2 + 20,
          currentY,
          lang === "zh" ? "💭 模糊记忆" : "💭 Vague Memories",
      {
            fontSize: isMobile ? "14px" : "16px",
            fill: "#94a3b8",
            fontStyle: "italic",
      }
    );
        vagueTitle.setScrollFactor(0);
        vagueTitle.setDepth(201);
        clueTexts.push(vagueTitle);
        currentY += 30;
        
        vagueClues.slice(0, 3).forEach((clue) => { // 只显示最近3条vague
          const clueText = this.scene.add.text(
            x - width / 2 + 25,
            currentY,
            `· ${clue.npcName}: ${clue.clue.substring(0, 80)}...`,
      {
              fontSize: isMobile ? "11px" : "13px",
        fontFamily: "monospace",
              fill: "#64748b",
              wordWrap: { width: width - 60 },
            }
          );
          clueText.setScrollFactor(0);
          clueText.setDepth(201);
          clueTexts.push(clueText);
          currentY += clueText.height + 10;
        });
      }
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

  addClue(clueData, showNotification = true) {
    // clueData: { npcId, npcName, clue }
    const exists = this.clues.find(c => c.npcId === clueData.npcId);
    if (!exists) {
      this.clues.push(clueData);
      this.updateClueCountBadge();
      console.log("✅ 线索已添加:", clueData);
      
      if (showNotification) {
        this.showNotification(`🎁 获得新线索！`);
      }
    }
  }
  
  showNotification(message) {
    const { width, height } = this.scene.cameras.main;
    const notif = this.scene.add.text(width / 2, height / 2 - 100, message, {
      fontSize: "24px",
      fontFamily: "Arial",
      fill: "#fbbf24",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: { x: 20, y: 12 },
    });
    notif.setOrigin(0.5);
    notif.setScrollFactor(0);
    notif.setDepth(20000);

    // 3秒后消失
    this.scene.time.delayedCall(3000, () => {
      notif.destroy();
    });
  }

  // 更新线索数量badge
  updateClueCountBadge() {
    if (this.clueCountBadge) {
      const count = this.clues.length;
      this.clueCountBadge.setText(count.toString());
      this.clueCountBadge.setVisible(count > 0);
    }
  }

  destroy() {
    if (this.clueButton) this.clueButton.destroy();
    if (this.clueCountBadge) this.clueCountBadge.destroy();
    if (this.dateDisplay) this.dateDisplay.destroy();
    if (this.mealProgress) this.mealProgress.destroy();
    this.hideCluePanel();
  }
}