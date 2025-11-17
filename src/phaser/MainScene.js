// src/phaser/MainScene.js - 横屏(逆时针90°) 完整版
import Phaser from "phaser";
import mapJson from "../assets/tiled.json";
import tileset from "../assets/tiles.png";
import characters from "../assets/characters.png";
import Agent from "./Agent";
import DialogScene from "./DialogScene.js";
import NPCManager from "./NPCManager.js";
import UIManager from "./UIManager.js";
import { playBGM, stopBGM } from "../utils/audioManager";

const API_URL = process.env.REACT_APP_API_URL;
const CELL_W = 26;
const CELL_H = 36;
const UI_FONT = "'Arial', sans-serif";

// === 工具函数：雪碧图动画 ===
function _sheetInfo(scene, sheetKey) {
  const img = scene.textures.get(sheetKey).getSourceImage();
  const totalCols = Math.floor(img.width / CELL_W);
  const totalRows = Math.floor(img.height / CELL_H);
  return { totalCols, totalRows };
}

function getBottomLeftFrames(scene, sheetKey = "player") {
  const { totalCols, totalRows } = _sheetInfo(scene, sheetKey);
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
  const mk = (key, arr) => {
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: arr.map((f) => ({ key: sheetKey, frame: f })),
        frameRate: 8,
        repeat: -1,
      });
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
    this.map = null;
    this.npcManager = null;
    this.mapScale = 1;
  }

  preload() {
    this.load.image("tiles", "assets/tiles.png");
    this.load.tilemapTiledJSON("tiledMap", "assets/tiled_horizontal.json");
    this.load.spritesheet("characters", "assets/characters.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
  }

  // === 坐标转换（横屏模式不需要旋转）===
  getTilePosition(x, y) {
    return { x, y };
  }

  create() {
    console.log("🌄 Creating landscape map...");

    // === 1️⃣ 创建 Tilemap（横屏模式，无旋转）===
    this.map = this.make.tilemap({ key: "tiledMap" });
    const tileset = this.map.addTilesetImage("tiles", "tiles");
    this.layer = this.map.createLayer("layer", tileset, 0, 0);

    // 更新物理边界（使用原始宽高）
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    // === 2️⃣ 玩家初始化 ===
    const startPos = this.getTilePosition(3, 6);
    this.player = this.physics.add
      .sprite(
        startPos.x * this.map.tileWidth,
        startPos.y * this.map.tileHeight,
        "characters",
        0
      )
      .setOrigin(0.5, 0.5)
      .setDepth(10);

    this._charFrames = getBottomLeftFrames(this, "characters");
    registerPlayerAnims(this, "characters", "player");
    this.player.anims.play("player-walk-down");

    // 摄像机设置（无旋转）
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

    // === 3️⃣ 初始化系统 ===
    this.npcManager = new NPCManager(this);
    this.uiManager = new UIManager(this);
    this.setupAudio();

    // === 4️⃣ 横屏自适应 ===
    this.scale.on("resize", this.handleResize, this);
    this.handleResize();

    // === 5️⃣ 初始化控制 ===
    this.cursors = this.input.keyboard.createCursorKeys();

    // 设置摄像机视口（横屏模式，无旋转）
    this.cameras.main.setViewport(0, 0, window.innerWidth, window.innerHeight);
    this.cameras.main.setOrigin(0.5, 0.5);
    this.cameras.main.centerOn(
      this.map.widthInPixels / 2,
      this.map.heightInPixels / 2
    );
  }

  setupAudio() {
    try {
      playBGM();
    } catch (e) {
      console.warn("Audio system unavailable:", e);
    }
  }

  handleResize() {
    // 横屏模式：直接使用窗口的宽高
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.scale.resize(width, height);
    this.cameras.main.setViewport(0, 0, width, height);
  }

  update() {
    const speed = 120;
    if (!this.cursors) return;

    let vx = 0,
      vy = 0;
    if (this.cursors.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown) vx = speed;
    if (this.cursors.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown) vy = speed;

    this.player.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) > Math.abs(vy))
        this.player.anims.play(
          vx > 0 ? "player-walk-right" : "player-walk-left",
          true
        );
      else
        this.player.anims.play(
          vy > 0 ? "player-walk-down" : "player-walk-up",
          true
        );
    } else {
      this.player.anims.stop();
    }
  }

  setPlayerData(newPlayerData) {
    this.playerData = newPlayerData;
    this.uiManager?.updateProgress();
  }

  async onMealRecorded() {
    console.log("🍽️ 餐食记录完成，开始刷新状态");

    try {
      // 🔧 关键修复：使用 refreshAvailableNPCs 而不是 refreshNPCs
      await this.npcManager.refreshAvailableNPCs();

      // 更新UI进度显示
      this.uiManager?.updateProgress();

      // 检查当天完成情况
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
      // 即使出错也要更新基本状态
      this.uiManager?.updateProgress();
    }
  }

  showDayCompleteMessage() {
    const lang = this.playerData.language;
    const currentDay = this.npcManager?.getCurrentDay() || 1;

    const msg =
      currentDay >= 7
        ? lang === "zh"
          ? "🎉 恭喜完成所有7天的旅程！正在准备最终彩蛋..."
          : "🎉 Congratulations on completing all 7 days! Preparing final surprise..."
        : lang === "zh"
        ? `第${currentDay}天的记录完成！下次登录时可以与新的NPC对话`
        : `Day ${currentDay} record complete! You can talk to a new NPC next time you login`;
    this.showNotification(msg, 4000);
  }

  onClueReceived(clue) {
    this.uiManager?.addClue(clue);
  }

  onGameCompleted() {
    const lang = this.playerData.language;
    this.showNotification(
      lang === "zh"
        ? "🎊 游戏完成！正在生成你的专属彩蛋..."
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
      if (response.ok) this.dlog("Game session saved successfully");
    } catch (error) {
      this.elog("Error saving game session:", error);
    }
  }

  shutdown() {
    if (this.debugMode) {
      console.log("=== DialogScene 关闭清理 ===");
    }

    // 清理键盘监听器
    if (this.keyboardState.listeners) {
      this.keyboardState.listeners.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
      this.keyboardState.listeners = [];
    }
    // 🔸 添加键盘监听器清理
    if (this.keyboardState.listeners) {
      this.keyboardState.listeners.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
      this.keyboardState.listeners = [];
    }

    // 额外：移除 window/document/visualViewport 监听
    if (this.keyboardState?.listeners?.length) {
      this.keyboardState.listeners.forEach(({ target, event, handler }) => {
        try {
          target?.removeEventListener?.(event, handler);
        } catch (_) {}
      });
      this.keyboardState.listeners = [];
    }

    if (this.keyboardState.resizeTimer) {
      clearTimeout(this.keyboardState.resizeTimer);
      this.keyboardState.resizeTimer = null;
    }

    this.saveGameSession().catch(console.error);

    try {
      stopBGM();
    } catch (error) {
      this.elog("Error stopping BGM:", error);
    }
  }

  destroy() {
    // 清理键盘监听器
    if (this.keyboardState.listeners) {
      this.keyboardState.listeners.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
      this.keyboardState.listeners = [];
    }

    if (this.keyboardState.resizeTimer) {
      clearTimeout(this.keyboardState.resizeTimer);
      this.keyboardState.resizeTimer = null;
    }

    super.destroy();
  }

  async refreshNPCs(reason = "") {
    try {
      if (!this.npcManager) return;

      console.log(`🔄 [MainScene] 刷新NPCs (${reason})`);

      // 使用新的 refreshAvailableNPCs 方法
      await this.npcManager.refreshAvailableNPCs();

      console.log(`✅ [MainScene] NPCs刷新完成 (${reason})`);
    } catch (e) {
      console.error("[MainScene] Failed to refresh NPCs:", e);
    }
  }

  // 🔧 新增：强制刷新所有状态的方法
  async forceRefreshGameState() {
    console.log("🔄 强制刷新游戏状态");

    try {
      // 1. 重新加载NPC状态
      await this.npcManager.refreshAvailableNPCs();

      // 2. 更新UI
      this.uiManager?.updateProgress();

      // 3. 重新绑定交互区域（确保点击正常工作）
      this.npcManager?.rebindClickAreasForCurrentDay?.();

      // 4. 清理可能的浮动文本
      this.emergencyCleanupFloatingTexts();

      console.log("✅ 游戏状态强制刷新完成");
    } catch (error) {
      console.error("❌ 强制刷新游戏状态失败:", error);
    }
  }
}
