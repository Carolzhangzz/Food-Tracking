// src/phaser/UIManager.js - 核心 UI 管理器
export default class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.clues = [];
    this.clueButton = null;
    this.clueCountBadge = null;
    this.cluePanel = null;
    this.dateDisplay = null;
    this.mealProgress = null;
    console.log("🛠️ UIManager: 实例已创建");
  }

  init() {
    console.log("🛠️ UIManager: 初始化 UI 元素...");
    // 🔧 线索本按钮已移至 React Control.jsx，Phaser 侧主要负责线索数据的同步和通知
    this.createDateDisplay();
    this.createMealProgress();
    
    // 初始同步一次线索数量
    this.updateClueCountBadge();
  }

  // 🔧 从 API 加载所有线索
  async loadCluesFromAPI() {
    const playerId = this.scene.playerId;
    if (!playerId) {
      console.warn("⚠️ UIManager: loadCluesFromAPI 失败 - 未找到 playerId");
      return;
    }

    try {
      console.log(`📥 UIManager: 正在从后端加载线索数据 (PlayerID: ${playerId})...`);
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/clues/${playerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.clues)) {
        // 映射后端字段到前端格式
        this.clues = data.clues.map(c => ({
          npcId: c.npcId,
          npcName: c.npcName || c.npcId,
          clue: c.clueText || c.clue,
          clueType: c.clueType || 'true',
          timestamp: new Date(c.receivedAt).getTime()
        }));
        
        console.log(`✅ UIManager: 成功加载了 ${this.clues.length} 条线索`);
        this.updateClueCountBadge();
      }
    } catch (error) {
      console.error("❌ UIManager: 加载线索过程中出错:", error);
    }
  }

  // 🔧 供 React 或其他场景调用的接口
  showClueJournal() {
    console.log("📖 UIManager: 打开线索本面板");
    this.showCluePanel();
  }

  addClue(clueData, showNotification = true) {
    // 检查是否重复
    const exists = this.clues.find(c => c.npcId === clueData.npcId && c.clue === (clueData.clue || clueData.clueText));
    if (!exists) {
      this.clues.push({
        npcId: clueData.npcId,
        npcName: clueData.npcName || clueData.npcId,
        clue: clueData.clue || clueData.clueText,
        clueType: clueData.clueType || 'vague',
        timestamp: Date.now()
      });
      
      console.log("✅ UIManager: 已添加新线索:", clueData);
      this.updateClueCountBadge();
      
      if (showNotification) {
        this.showNotification(`🎁 获得新线索！`);
      }
    }
  }

  updateClueCountBadge() {
    const count = this.clues.length;
    console.log(`📊 UIManager: 更新线索数量标识 -> ${count}`);
    // 同步到全局状态或触发事件
    if (this.scene.events) {
      this.scene.events.emit('clue-count-updated', count);
    }
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
    bg.setStrokeStyle(3, 0x8b5cf6);

    // 标题
    const title = this.scene.add.text(x, y - height / 2 + 35, lang === "zh" ? "📖 线索本" : "📖 Clue Book", {
      fontSize: isMobile ? "22px" : "28px",
      fontFamily: "monospace",
      fill: "#a78bfa",
        fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // 关闭按钮
    const closeBtn = this.scene.add.text(x + width / 2 - 35, y - height / 2 + 35, "✕", {
      fontSize: "28px",
      fill: "#ef4444",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });
    
    closeBtn.on("pointerdown", () => this.hideCluePanel());

    // 内容渲染
    const clueTexts = [];
    if (this.clues.length === 0) {
      const empty = this.scene.add.text(x, y, lang === "zh" ? "暂无收集线索..." : "No clues yet...", {
        fontSize: "16px",
        fill: "#64748b",
        align: "center"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
      clueTexts.push(empty);
    } else {
      let currentY = y - height / 2 + 90;
      this.clues.forEach(clue => {
        const text = this.scene.add.text(x - width / 2 + 25, currentY, `📌 ${clue.npcName}:\n${clue.clue}`, {
          fontSize: "14px",
          fill: clue.clueType === 'true' ? "#fbbf24" : "#e2e8f0",
          wordWrap: { width: width - 50 }
        }).setScrollFactor(0).setDepth(201);
        clueTexts.push(text);
        currentY += text.height + 20;
      });
    }

    this.cluePanel = { bg, title, closeBtn, clueTexts };
  }

  hideCluePanel() {
    if (!this.cluePanel) return;
    this.cluePanel.bg.destroy();
    this.cluePanel.title.destroy();
    this.cluePanel.closeBtn.destroy();
    this.cluePanel.clueTexts.forEach(t => t.destroy());
    this.cluePanel = null;
  }

  showNotification(message) {
    const txt = this.scene.add.text(this.scene.cameras.main.centerX, 100, message, {
      fontSize: "20px",
      fill: "#fbbf24",
      backgroundColor: "#000000aa",
      padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    this.scene.time.delayedCall(3000, () => txt.destroy());
  }

  createDateDisplay() {
    // 逻辑已移至 React，此处仅保留空壳或基础提示
    // 如果之后要在Phaser里保留，可以加在这里
  }

  createMealProgress() {
    // 逻辑已移至 React，此处仅保留空壳
  }

  destroy() {
    this.hideCluePanel();
  }
}
