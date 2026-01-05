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
    
    // 🔧 优先从 API 加载（实现跨设备同步）
    this.loadCluesFromAPI();
    
    // 初始同步一次线索数量
    this.updateClueCountBadge();
  }

  // 🔧 从 API 加载所有线索
  async loadCluesFromAPI() {
    const playerId = this.scene.playerId;
    if (!playerId) return;

    try {
      console.log(`📥 UIManager: 正在从数据库拉取线索 (PlayerID: ${playerId})...`);
      
      let API_URL = this.scene.API_URL || process.env.REACT_APP_API_URL || window.location.origin + "/api";
      if (API_URL.includes('localhost:3000')) API_URL = API_URL.replace('3000', '5000');
      
      const fetchURL = API_URL.endsWith('/api') ? `${API_URL}/clues/${playerId}` : `${API_URL}/api/clues/${playerId}`;
      const response = await fetch(fetchURL);
      
      if (!response.ok) throw new Error(`HTTP 错误: ${response.status}`);

      const data = await response.json();
      if (data.success && Array.isArray(data.clues)) {
        // 1. 映射后端字段
        const syncedClues = data.clues.map(c => ({
          npcId: c.npcId,
          npcName: c.npcName || c.npcId,
          clue: c.clueText || c.clue,
          clueType: c.clueType || 'true',
          timestamp: new Date(c.receivedAt).getTime()
        }));
        
        // 2. 更新内存
        this.clues = syncedClues;
        
        // 3. ⚠️ 关键：同步回 localStorage，防止被旧手机的空数据覆盖
        const key = `clues_${playerId}`;
        localStorage.setItem(key, JSON.stringify(this.clues));
        
        console.log(`✅ UIManager: 已同步 ${this.clues.length} 条线索到设备存储`);
        this.updateClueCountBadge();
      }
    } catch (error) {
      console.error("❌ UIManager: 同步线索失败:", error);
    }
  }

  // 🔧 语言切换支持
  updateLanguage() {
    const lang = this.scene.playerData?.language || "zh";
    console.log(`🌐 [UIManager] 正在同步语言: ${lang}`);
    
    // 如果之后有在 Phaser 侧显示的文字（如进度条标题），可以在这里更新
    // 目前大部分 UI 已移至 React
  }

  // 供以后扩展使用
  updateProgress() {
    // 占位符，防止 MainScene 报错
  }

  // 🔧 供 React 或其他场景调用的接口
  async showClueJournal() {
    console.log("📖 UIManager: 打开线索本面板");
    
    // 🔧 如果已经打开，先关闭，防止重复创建
    if (this.cluePanel) {
      console.log("⚠️ UIManager: 线索本已打开，先关闭旧面板");
      this.hideCluePanel();
    }
    
    // 🔧 关键：打开前强制同步一次 API，而不是依赖本地存储
    await this.loadCluesFromAPI();
    
    // 显示面板
    this.showCluePanel();
  }

  addClue(clueData, showNotification = true) {
    // 检查是否重复
    const exists = this.clues.find(c => c.npcId === clueData.npcId && c.clue === (clueData.clue || clueData.clueText));
    if (!exists) {
      const newClue = {
        npcId: clueData.npcId,
        npcName: clueData.npcName || clueData.npcId,
        clue: clueData.clue || clueData.clueText,
        clueType: clueData.clueType || 'vague',
        day: clueData.day || 1,
        mealType: clueData.mealType || 'unknown',
        timestamp: Date.now()
      };
      
      this.clues.push(newClue);
      
      // 🔧 保存到 localStorage（持久化）
      this.saveClueToLocalStorage(newClue);
      
      console.log("✅ UIManager: 已添加新线索:", newClue);
      this.updateClueCountBadge();
      
      if (showNotification) {
        this.showNotification(`🎁 获得新线索！`);
      }
    }
  }
  
  // 🔧 保存线索到 localStorage
  saveClueToLocalStorage(clue) {
    const playerId = this.scene.playerData?.playerId || 'default';
    const key = `clues_${playerId}`;
    
    try {
      // 读取现有线索
      const existingClues = JSON.parse(localStorage.getItem(key) || '[]');
      
      // 检查是否重复
      const isDuplicate = existingClues.some(c => 
        c.npcId === clue.npcId && 
        c.clue === clue.clue &&
        c.clueType === clue.clueType
      );
      
      if (!isDuplicate) {
        existingClues.push(clue);
        localStorage.setItem(key, JSON.stringify(existingClues));
        console.log("💾 线索已保存到 localStorage:", clue);
      }
    } catch (error) {
      console.error("❌ 保存线索到 localStorage 失败:", error);
    }
  }
  
  // 🔧 从 localStorage 加载线索
  loadCluesFromLocalStorage() {
    const playerId = this.scene.playerData?.playerId || 'default';
    const key = `clues_${playerId}`;
    
    try {
      const storedClues = JSON.parse(localStorage.getItem(key) || '[]');
      this.clues = storedClues;
      console.log(`📚 从 localStorage 加载了 ${this.clues.length} 条线索`);
    this.updateClueCountBadge();
    } catch (error) {
      console.error("❌ 从 localStorage 加载线索失败:", error);
    this.clues = [];
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
    // 🔧 防止重复创建：如果已经存在面板，先销毁
    if (this.cluePanel) {
      console.log("⚠️ UIManager: 检测到已存在的线索面板，先销毁");
      this.hideCluePanel();
    }
    
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
    bg.setInteractive(); // 🔧 使背景可交互，防止点击穿透

    // 标题
    const title = this.scene.add.text(x, y - height / 2 + 35, lang === "zh" ? "📖 线索本" : "📖 Clue Book", {
      fontSize: isMobile ? "24px" : "28px",
      fontFamily: "Arial, sans-serif",
      fill: "#a78bfa",
      fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // 关闭按钮
    const closeBtn = this.scene.add.text(x + width / 2 - 35, y - height / 2 + 35, "✕", {
      fontSize: isMobile ? "32px" : "28px",
      fill: "#ef4444",
      fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });
    
    // 🔧 确保关闭按钮只绑定一次事件
    closeBtn.removeAllListeners();
    closeBtn.on("pointerdown", () => {
      console.log("🔘 UIManager: 点击关闭按钮");
      this.hideCluePanel();
    });
    
    // 🔧 背景点击也可以关闭（可选）
    bg.on("pointerdown", (pointer) => {
      // 只有点击背景空白处才关闭，不要点击内容区域就关闭
      const clickX = pointer.x;
      const clickY = pointer.y;
      
      const isOutside = clickX < x - width / 2 + 20 || clickX > x + width / 2 - 20 ||
                        clickY < y - height / 2 + 70 || clickY > y + height / 2 - 20;
      
      // 暂时禁用背景点击关闭
      if (isOutside) {
        console.log("🖱️ 点击了外部区域");
      }
    });

    // 内容渲染
    const clueTexts = [];
    const itemFontSize = isMobile ? "20px" : "14px";
    const itemSpacing = isMobile ? 35 : 20;

    if (this.clues.length === 0) {
      const empty = this.scene.add.text(x, y, lang === "zh" ? "暂无收集线索..." : "No clues yet...", {
        fontSize: isMobile ? "24px" : "16px",
        fontFamily: "Arial, sans-serif",
        fill: "#94a3b8",
        align: "center"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
      clueTexts.push(empty);
    } else {
      // 🔧 增加滚动容器逻辑
      const contentTop = y - height / 2 + 100;
      const contentHeight = height - 150;
      const contentX = x - width / 2 + 25;
      
      // 创建一个容器来存放所有线索，位置设为内容区域左上角
      const cluesContainer = this.scene.add.container(contentX, contentTop);
      clueTexts.push(cluesContainer); // 方便销毁

      let currentY = 0;
      this.clues.forEach((clue, index) => {
        const text = this.scene.add.text(0, currentY, `📌 ${clue.npcName}:\n${clue.clue}`, {
          fontSize: itemFontSize,
          fontFamily: "Arial, sans-serif",
          fontWeight: isMobile ? "bold" : "normal",
          fill: clue.clueType === 'true' ? "#fbbf24" : "#ffffff",
          wordWrap: { width: width - 50 },
          lineSpacing: isMobile ? 10 : 6
        }).setOrigin(0).setDepth(201); // 🔧 设置足够深度
        
        cluesContainer.add(text);
        currentY += text.height + itemSpacing;
      });

      cluesContainer.setScrollFactor(0);
      cluesContainer.setDepth(205); // 🔧 确保容器深度高于背景面板和关闭按钮

      // 🔧 创建遮罩，只显示中间区域（使用世界坐标）
      const maskShape = this.scene.add.graphics()
        .fillStyle(0xffffff)
        .fillRect(x - width / 2, contentTop, width, contentHeight)
        .setScrollFactor(0)
        .setVisible(false); // 🔧 关键：遮罩绘图本身必须不可见，否则会遮挡内容
      const mask = maskShape.createGeometryMask();
      cluesContainer.setMask(mask);
      clueTexts.push(maskShape); // 方便销毁

      // 🔧 添加滚动交互 (滚轮和拖拽)
      const maxScroll = Math.max(0, currentY - contentHeight);
      let targetY = contentTop;

      const updateScroll = (delta) => {
        // 🔧 使用原生 Math 替代 Phaser.Math.Clamp 避免报错
        targetY = Math.max(contentTop - maxScroll, Math.min(contentTop, targetY + delta));
        cluesContainer.y = targetY;
      };

      // 滚轮支持
      this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (this.cluePanel) updateScroll(-deltaY);
      });

      // 手机滑动支持
      let isDragging = false;
      let startY = 0;
      bg.on('pointerdown', (pointer) => { isDragging = true; startY = pointer.y; });
      this.scene.input.on('pointermove', (pointer) => {
        if (isDragging && this.cluePanel) {
          const deltaY = pointer.y - startY;
          startY = pointer.y;
          updateScroll(deltaY);
        }
      });
      this.scene.input.on('pointerup', () => { isDragging = false; });
    }

    this.cluePanel = { bg, title, closeBtn, clueTexts };
    console.log("✅ UIManager: 线索面板创建完成");
  }

  hideCluePanel() {
    if (!this.cluePanel) {
      console.log("⚠️ UIManager: 线索面板不存在，无需关闭");
      return;
    }
    
    console.log("🔒 UIManager: 关闭线索面板");
    
    // 🔧 安全销毁所有元素
    try {
      if (this.cluePanel.bg && this.cluePanel.bg.destroy) {
        this.cluePanel.bg.destroy();
      }
      if (this.cluePanel.title && this.cluePanel.title.destroy) {
        this.cluePanel.title.destroy();
      }
      if (this.cluePanel.closeBtn && this.cluePanel.closeBtn.destroy) {
        this.cluePanel.closeBtn.destroy();
      }
      if (this.cluePanel.clueTexts && Array.isArray(this.cluePanel.clueTexts)) {
        this.cluePanel.clueTexts.forEach(t => {
          if (t && t.destroy) {
            t.destroy();
          }
        });
      }
    } catch (error) {
      console.error("❌ UIManager: 销毁线索面板元素时出错:", error);
    }
    
    this.cluePanel = null;
    console.log("✅ UIManager: 线索面板已关闭");
  }

  showNotification(message) {
    const isMobile = this.scene.isMobile;
    const centerX = this.scene.scale.width / 2; // 🔧 使用当前 canvas 宽度的一半，更准确
    
    const txt = this.scene.add.text(centerX, isMobile ? 60 : 80, message, {
      fontSize: isMobile ? "24px" : "22px",
      fontFamily: "Arial, sans-serif",
      fill: "#fbbf24",
      backgroundColor: "#000000cc",
      padding: { x: 20, y: 12 },
      stroke: "#000000",
      strokeThickness: 2,
      align: "center",
      wordWrap: { width: this.scene.scale.width - 40 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    this.scene.time.delayedCall(3000, () => {
      if (txt && txt.destroy) txt.destroy();
    });
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
