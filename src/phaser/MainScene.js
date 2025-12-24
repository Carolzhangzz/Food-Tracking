// src/phaser/MainScene.js - 使用 bigmap 的完整版本
import Phaser from "phaser";
import Agent from "./Agent";
import NPCManager from "./NPCManager.js";
import UIManager from "./UIManager.js";
import { playBGM, stopBGM } from "../utils/audioManager";

const API_URL = process.env.REACT_APP_API_URL;
const CELL_W = 32;
const CELL_H = 48;

// === 工具函数:雪碧图动画 ===
function _sheetInfo(scene, sheetKey) {
  try {
    const texture = scene.textures.get(sheetKey);
    if (!texture) {
      console.error(`❌ 纹理不存在: ${sheetKey}`);
      return { totalCols: 0, totalRows: 0 };
    }
    const img = texture.getSourceImage();
    const totalCols = Math.floor(img.width / CELL_W);
    const totalRows = Math.floor(img.height / CELL_H);
    return { totalCols, totalRows };
  } catch (error) {
    console.error("❌ _sheetInfo 错误:", error);
    return { totalCols: 0, totalRows: 0 };
  }
}

function getBottomLeftFrames(scene, sheetKey = "player") {
  const { totalCols, totalRows } = _sheetInfo(scene, sheetKey);
  
  if (totalCols === 0 || totalRows === 0) {
    console.error("❌ 无法获取帧信息");
    return null;
  }
  
  const blocksY = Math.floor(totalRows / 4);
  const blockCol = 0;
  const blockRow = blocksY - 1;
  const baseCol = blockCol * 3;
  const baseRow = blockRow * 4;
  
  const rowToFrames = (row) => [
    row * totalCols + (baseCol + 0),
    row * totalCols + (baseCol + 1),
    row * totalCols + (baseCol + 2),
  ];
  
  const down = rowToFrames(baseRow + 0);
  const left = rowToFrames(baseRow + 1);
  const right = rowToFrames(baseRow + 2);
  const up = rowToFrames(baseRow + 3);
  
  return {
    down,
    left,
    right,
    up,
    idle: { down: down[1], left: left[1], right: right[1], up: up[1] },
  };
}

function registerPlayerAnims(scene, sheetKey = "player", keyPrefix = "player") {
  const frames = getBottomLeftFrames(scene, sheetKey);
  
  if (!frames) {
    console.error("❌ 无法注册动画:帧数据为空");
    return null;
  }
  
  const mk = (key, arr) => {
    if (!scene.anims.exists(key)) {
      try {
        scene.anims.create({
          key,
          frames: arr.map((f) => ({ key: sheetKey, frame: f })),
          frameRate: 8,
          repeat: -1,
        });
        console.log(`✅ 动画创建成功: ${key}`);
      } catch (error) {
        console.error(`❌ 动画创建失败: ${key}`, error);
      }
    }
  };
  
  mk(`${keyPrefix}-walk-down`, frames.down);
  mk(`${keyPrefix}-walk-left`, frames.left);
  mk(`${keyPrefix}-walk-right`, frames.right);
  mk(`${keyPrefix}-walk-up`, frames.up);
  
  return frames;
}

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.player = null;
    this.playerData = null;
    this.playerId = null;
    this.npcManager = null;
    this.uiManager = null;
    this.mapScale = 1;
    this.fullyInitialized = false;
    this.isMobile = window.innerWidth < 768; // 🔧 定义isMobile
    this.keyboardState = {
      listeners: [],
      resizeTimer: null
    };
  }

  preload() {
    console.log("📦 MainScene preload started");
    
    // 添加加载错误处理
    this.load.on('loaderror', (file) => {
      console.error('❌ 加载失败:', file.key, file.url);
      console.error('   检查文件是否存在:', file.src);
    });
    
    this.load.on('filecomplete', (key) => {
      console.log('✅ 加载完成:', key);
    });
    
    // 🎯 使用横向地图图片（手机游戏适配）
    this.load.image("bigmap", "/assets/map_horizontal.JPG");

    // 🔧 加载Player用的单张图片 - boynew和girlnew（不是雪碧图，就是正面图）
    this.load.image("player_boy", "/assets/npc/boynew.png");
    this.load.image("player_girl", "/assets/npc/girlnew.png");

    // 🔧 加载7个NPC单独图片
    for (let i = 1; i <= 7; i++) {
      this.load.image(`npc${i}`, `/assets/npc/npc${i}.png`);
    }

    // 🔧 加载线索本图标
    this.load.image("cluebook", "/assets/elements/cluebook.png");

    console.log("📦 加载boy/girl角色 + 7个NPC图片 + 线索本图标");
    
    console.log("📦 MainScene preload completed");
  }

  async create() {
    console.log("🌄 Creating map with bigmap image...");

    // 🔧 接收 GameScreen 传来的数据
    const sceneData = this.scene.settings.data || {};
    this.playerId = sceneData.playerId;
    this.playerData = sceneData.playerData;
    this.updatePlayerdata = sceneData.updatePlayerdata; // 🔧 存储更新函数

    console.log("📊 Scene data:", { 
      playerId: this.playerId, 
      hasPlayerData: !!this.playerData,
      language: this.playerData?.language,
      gender: this.playerData?.gender,
      hasUpdateFn: !!this.updatePlayerdata
    });

    // 验证资源加载
    const gender = this.playerData?.gender || 'boy';
    const playerImageKey = gender === 'girl' ? 'player_girl' : 'player_boy';

    if (!this.textures.exists(playerImageKey)) {
      console.error(`❌ ${playerImageKey} 图片未加载,使用备用方案`);
      this.createFallbackPlayer();
      this.fullyInitialized = true;
      return;
    }

    if (!this.textures.exists("bigmap")) {
      console.error("❌ bigmap 未加载");
      this.fullyInitialized = true;
      return;
    }

    try {
      // === 1️⃣ 使用大地图图片 ===
      const mapImage = this.add.image(0, 0, "bigmap").setOrigin(0, 0);
      const mapW = mapImage.width;
      const mapH = mapImage.height;

      console.log(`📐 地图尺寸: ${mapW} x ${mapH}`);

      // 设置物理世界边界
      this.physics.world.setBounds(0, 0, mapW, mapH);

      // === 2️⃣ 加载玩家 ===
      // 🔧 根据性别选择角色图片（单张，不是雪碧图）
      const gender = this.playerData?.gender || 'boy'; // 默认男生
      const playerImageKey = gender === 'girl' ? 'player_girl' : 'player_boy';

      console.log(`👤 玩家性别: ${gender}, 使用图片: ${playerImageKey}`);

      // 🔧 横向地图：玩家起始位置在左下角区域
      const startX = mapW * 0.15;  // 地图左侧15%位置
      const startY = mapH * 0.7;   // 地图下方70%位置
      
      this.player = this.physics.add
        .sprite(startX, startY, playerImageKey)  // 🔧 使用单张图片，不需要frame参数
        .setOrigin(0.5)
        .setDepth(10)
        .setCollideWorldBounds(true)
        .setScale(0.12);  // 🔧 单张图片较大，缩小到0.12倍

      // 初始化点击移动变量
      this.isMovingToTarget = false;
      this.targetX = null;
      this.targetY = null;

      console.log(`🎮 玩家位置: (${startX}, ${startY}), 静态图片（无动画）`);

      // === 3️⃣ 摄像机设置（手机游戏：横向铺满屏幕）===
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // 🔧 计算缩放：横向铺满，让地图宽度完全填充屏幕宽度
      const zoomX = screenW / mapW;
      const zoomY = screenH / mapH;
      const zoom = Math.max(zoomX, zoomY); // 使用较大的缩放值，确保铺满屏幕

      this.cameras.main.setZoom(zoom);
      this.cameras.main.setBounds(0, 0, mapW, mapH);
      
      // 🎯 居中地图（不跟随玩家）
      this.cameras.main.centerOn(mapW / 2, mapH / 2);

      console.log(`📷 摄像机设置: zoom=${zoom.toFixed(2)}, 横向铺满屏幕`, {
        地图尺寸: `${mapW}x${mapH}`,
        屏幕尺寸: `${screenW}x${screenH}`,
        zoomX: zoomX.toFixed(2),
        zoomY: zoomY.toFixed(2)
      });

      // 🎯 添加点击移动功能
      this.input.on('pointerdown', (pointer) => {
        // 将屏幕坐标转换为世界坐标
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        
        // 🔧 调试模式：显示点击坐标，方便配置NPC位置
        console.log(`🖱️ 点击位置: x: ${Math.round(worldX)}, y: ${Math.round(worldY)}`);
        console.log(`   复制这个坐标: { x: ${Math.round(worldX)}, y: ${Math.round(worldY)} }`);
        
        // 移动玩家到点击位置
        this.targetX = worldX;
        this.targetY = worldY;
        this.isMovingToTarget = true;
      });

      // === 4️⃣ 初始化系统 ===
      console.log("🔧 初始化 NPCManager 和 UIManager...");
      
      this.npcManager = new NPCManager(this);
      this.uiManager = new UIManager(this);

      // 🔧 等待NPCManager初始化完成后再初始化UI
      console.log("⏳ 等待 NPCManager 初始化...");
      await this.npcManager.init();

      // 🔧 初始化 UI 元素（线索按钮、日期显示、餐食进度）
      console.log("📋 初始化 UI 元素...");
      this.uiManager.init();

      // 🔧 初始加载线索数据
      console.log("📋 初始加载线索...");
      this.uiManager.loadCluesFromAPI().catch(err => {
        console.error("❌ 初始加载线索失败:", err);
      });

      this.setupAudio();

      // === 5️⃣ Resize 事件 ===
      this.scale.on("resize", this.handleResize, this);
      this.handleResize();


      this.cursors = this.input.keyboard.createCursorKeys();

      // 标记为完全初始化
      this.fullyInitialized = true;
      console.log("✅ MainScene 完全初始化完成");
      console.log("📊 场景信息:", {
        地图尺寸: `${mapW} x ${mapH}`,
        玩家位置: `${startX}, ${startY}`,
        NPCs数量: this.npcManager?.npcSprites?.length || 0,
      });
      
    } catch (error) {
      console.error("❌ MainScene create 错误:", error);
      this.fullyInitialized = true; // 即使出错也标记为完成,避免卡住
    }
  }

  setupAudio() {
    try {
      playBGM();
    } catch (e) {
      console.warn("Audio system unavailable:", e);
    }
  }

  handleResize() {
    // 🔧 修复：不要调用 this.scale.resize()，这会触发无限递归
    // Phaser 的 Scale Manager 会自动处理窗口大小变化
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    console.log(`📐 窗口大小变化: ${width} x ${height}`);
    
    // 更新摄像机视口
    this.cameras.main.setViewport(0, 0, width, height);

    // 🎯 手机游戏：重新计算缩放，横向铺满屏幕
    if (this.physics && this.physics.world && this.physics.world.bounds.width > 0) {
      const mapW = this.physics.world.bounds.width;
      const mapH = this.physics.world.bounds.height;

      const zoomX = width / mapW;
      const zoomY = height / mapH;
      const zoom = Math.max(zoomX, zoomY); // 使用较大值，确保横向铺满

      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(mapW / 2, mapH / 2);

      console.log(`📷 更新缩放: ${zoom.toFixed(2)}，横向铺满屏幕`);
    }
  }

  update() {
    if (!this.player) return;

    const speed = 200;
    const stopDistance = 10; // 到达目标的距离阈值

    // 🎯 处理点击移动
    if (this.isMovingToTarget && this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.player.x;
      const dy = this.targetY - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < stopDistance) {
        // 到达目标，停止移动
        this.player.setVelocity(0, 0);
        this.isMovingToTarget = false;
        this.targetX = null;
        this.targetY = null;
        if (this.player.anims) {
          this.player.anims.stop();
        }
      } else {
        // 计算归一化的方向向量
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        this.player.setVelocity(vx, vy);

        // 🔧 单张图片Player，无动画，只移动
      }
      return;
    }

    // 🎮 键盘控制（保留作为备用，主要用点击）
    if (!this.cursors) return;

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown) vx = speed;
    if (this.cursors.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown) vy = speed;

    this.player.setVelocity(vx, vy);

    // 🔧 单张图片Player，无动画
  }

  setPlayerData(newPlayerData) {
    this.playerData = newPlayerData;
    this.uiManager?.updateProgress();
  }

  async onMealRecorded() {
    console.log("🍽️ 餐食记录完成,开始刷新状态");

    try {
      await this.npcManager.refreshAvailableNPCs();
      this.uiManager?.updateProgress();

      const progress = this.npcManager?.getDailyProgress();
      if (progress && progress.isComplete) {
        this.showDayCompleteMessage();
      }

      console.log("✅ 餐食记录后状态刷新完成", {
        当前天: this.npcManager?.getCurrentDay(),
        可用NPCs: this.npcManager?.availableNPCs?.length,
      });
    } catch (error) {
      console.error("❌ 刷新NPC状态失败:", error);
      this.uiManager?.updateProgress();
    }
  }

  showDayCompleteMessage() {
    const lang = this.playerData?.language || "zh";
    const currentDay = this.npcManager?.getCurrentDay() || 1;

    const msg =
      currentDay >= 7
        ? lang === "zh"
          ? "🎉 恭喜完成所有7天的旅程!正在准备最终彩蛋..."
          : "🎉 Congratulations on completing all 7 days! Preparing final surprise..."
        : lang === "zh"
        ? `第${currentDay}天的记录完成!下次登录时可以与新的NPC对话`
        : `Day ${currentDay} record complete! You can talk to a new NPC next time you login`;
    this.showNotification(msg, 4000);
  }

  showNotification(message, duration = 2500) {
    console.log("📢 通知:", message);
    this.uiManager?.showNotification(message, duration);
  }

  onClueReceived(clue) {
    this.uiManager?.addClue(clue);
  }

  onGameCompleted() {
    const lang = this.playerData?.language || "zh";
    this.showNotification(
      lang === "zh"
        ? "🎊 游戏完成!正在生成你的专属彩蛋..."
        : "🎊 Game Complete! Generating your personalized ending...",
      3000
    );
  }

  getGameState() {
    const progress = this.npcManager?.getDailyProgress() || { currentDay: 1 };
    return {
      playerId: this.playerId,
      currentDay: progress.currentDay,
      progress,
      clues: this.uiManager?.getAllClues() || [],
      isGameStarted: this.gameStarted,
      playerStatus: this.npcManager?.playerStatus || null,
      totalMealsRecorded: this.npcManager?.mealRecords?.length || 0,
    };
  }

  async saveGameSession() {
    if (!this.npcManager?.playerStatus) return;
    try {
      const response = await fetch(`${API_URL}/save-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: this.playerId,
          dayAtEnd: this.npcManager.getCurrentDay(),
          sessionEnd: new Date().toISOString(),
        }),
      });
      if (response.ok) {
        console.log("✅ Game session saved successfully");
      }
    } catch (error) {
      console.error("❌ Error saving game session:", error);
    }
  }

  emergencyCleanupFloatingTexts() {
    console.log("🧹 清理浮动文本");
  }

  shutdown() {
    console.log("🛑 MainScene shutdown");

    if (this.keyboardState?.listeners) {
      this.keyboardState.listeners.forEach(({ target, event, handler }) => {
        try {
          target?.removeEventListener?.(event, handler);
        } catch (e) {
          console.warn("清理监听器失败:", e);
        }
      });
      this.keyboardState.listeners = [];
    }

    if (this.keyboardState?.resizeTimer) {
      clearTimeout(this.keyboardState.resizeTimer);
      this.keyboardState.resizeTimer = null;
    }

    this.saveGameSession().catch(console.error);

    try {
      stopBGM();
    } catch (error) {
      console.error("Error stopping BGM:", error);
    }
  }

  destroy() {
    console.log("💥 MainScene destroy");
    
    if (this.keyboardState?.listeners) {
      this.keyboardState.listeners.forEach(({ target, event, handler }) => {
        try {
          target.removeEventListener(event, handler);
        } catch (e) { }
      });
      this.keyboardState.listeners = [];
    }

    if (this.keyboardState?.resizeTimer) {
      clearTimeout(this.keyboardState.resizeTimer);
      this.keyboardState.resizeTimer = null;
    }

    super.destroy();
  }

  async refreshNPCs(reason = "") {
    try {
      if (!this.npcManager) return;
      console.log(`🔄 [MainScene] 刷新NPCs (${reason})`);
      await this.npcManager.refreshAvailableNPCs();
      console.log(`✅ [MainScene] NPCs刷新完成 (${reason})`);
    } catch (e) {
      console.error("[MainScene] Failed to refresh NPCs:", e);
    }
  }

  async forceRefreshGameState() {
    console.log("🔄 强制刷新游戏状态");
    try {
      await this.npcManager?.refreshAvailableNPCs();
      this.uiManager?.updateProgress();
      this.npcManager?.rebindClickAreasForCurrentDay?.();
      this.emergencyCleanupFloatingTexts();
      console.log("✅ 游戏状态强制刷新完成");
    } catch (error) {
      console.error("❌ 强制刷新游戏状态失败:", error);
    }
  }

  createFallbackPlayer() {
    console.log("🎨 创建备用玩家");
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const graphics = this.add.graphics();
    graphics.fillStyle(0x0066ff, 1);
    graphics.fillRect(-16, -24, 32, 48);
    graphics.generateTexture('fallback-player', 32, 48);
    graphics.destroy();
    
    this.player = this.physics.add
      .sprite(width / 2, height / 2, 'fallback-player')
      .setOrigin(0.5)
      .setDepth(10);
    
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player);
    
    this.cursors = this.input.keyboard.createCursorKeys();
    
    const text = this.add.text(width / 2, 50, '⚠️ 资源加载失败,使用备用模式', {
      fontSize: '20px',
      fill: '#ffffff',
      backgroundColor: '#ff0000',
      padding: { x: 10, y: 5 }
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    
    console.log("✅ 备用玩家创建完成");
  }

  forceViewportReset() {
    console.log("🔄 强制重置视口");
    try {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.scale.resize(width, height);
      this.cameras.main.setViewport(0, 0, width, height);
    } catch (error) {
      console.error("❌ 视口重置失败:", error);
    }
  }

  restoreNPCInteractions() {
    console.log("🔄 恢复NPC交互");
    try {
      this.npcManager?.updateNPCStates?.();
    } catch (error) {
      console.error("❌ 恢复NPC交互失败:", error);
    }
  }
}