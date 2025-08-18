// src/phaser/MainScene.js - 修复键盘适配和重复方法问题
import Phaser from "phaser";
import mapJson from "../assets/tiled.json";
import tileset from "../assets/tiles.png";
import characters from "../assets/characters.png";
import Agent from "./Agent";
import DialogScene from "./DialogScene.js";
import NPCManager from "./NPCManager.js";
import UIManager from "./UIManager.js";
import { playBGM, stopBGM } from "../utils/audioManager";
import npc1 from "../assets/npc/npc1.png";
import npc2 from "../assets/npc/npc2.png";
import npc3 from "../assets/npc/npc3.png";
import npc4 from "../assets/npc/npc4.png";
import npc5 from "../assets/npc/npc5.png";
import npc6 from "../assets/npc/npc6.png";
import npc7 from "../assets/npc/npc7.png";

const API_URL = process.env.REACT_APP_API_URL;

// ===== 雪碧图单元尺寸 =====
const CELL_W = 26;
const CELL_H = 36;
const UI_FONT = "'Arial', sans-serif"; // 你也可以换成游戏里更清晰的字体

// 1. 在 MainScene.js 中添加更好的事件清理
export function improvedEndDialog() {
  // 清理所有可能的浮动文本
  this.children.list.forEach((child) => {
    if (child.type === "Text") {
      const text = child.text || "";
      if (
        text.includes("Breakfast") ||
        text.includes("Lunch") ||
        text.includes("Dinner") ||
        text.includes("早餐") ||
        text.includes("午餐") ||
        text.includes("晚餐")
      ) {
        child.destroy();
      }
    }
  });

  // 重新启用NPC交互
  this.time.delayedCall(200, () => {
    this.resetNPCInteractionStates();
  });
}

// 2. 添加防重复点击机制
export function addClickProtection(scene) {
  scene._lastClickTime = 0;
  scene._clickDelay = 500; // 500ms防抖

  scene.isClickAllowed = function () {
    const now = this.time.now;
    if (now - this._lastClickTime < this._clickDelay) {
      return false;
    }
    this._lastClickTime = now;
    return true;
  };
}

// ===== 工具：按"左下角角色（3列×4行）"切帧，生成四向动画 =====
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
  dlog(...args) {
    if (!this.debugMode) return;
    const now = performance && performance.now ? performance.now() : Date.now();
    if (this._lastLogTime && now - this._lastLogTime < 250) return;
    this._lastLogTime = now;
    console.log(...args);
  }
  elog(...args) {
    console.error(...args);
  }
  constructor() {
    super({ key: "MainScene" });
    this.bgmPlayed = false;
    this.gameStarted = false;
    this.lastTapTime = 0;
    this.tapDelay = 300;

    // 键盘状态跟踪
    this.keyboardState = {
      isOpen: false,
      originalHeight: null,
      currentHeight: null,
      threshold: 150,
      resizeTimer: null,
      listeners: [],
    };
  }

  init(data) {
    const storedPlayerId = localStorage.getItem("village_player_id");
    this.playerId = data?.playerId || storedPlayerId;
    if (!this.playerId) {
      this.playerId =
        "player_" + Date.now() + "_" + Math.random().toString(36).slice(-6);
      localStorage.setItem("village_player_id", this.playerId);
    }

    this.playerData = data?.playerData || {};
    this.updatePlayerdata = data?.updatePlayerdata;

    try {
      this.playerLoc = {
        x: this.playerData?.playLoc?.[0] || 5,
        y: this.playerData?.playLoc?.[1] || 5,
      };
    } catch {
      this.playerLoc = { x: 5, y: 5 };
    }

    this.initKeyboardManager();
  }

  initKeyboardManager() {
    this.keyboardState.originalHeight = window.innerHeight;
    this.keyboardState.currentHeight = window.innerHeight;

    // 检测设备类型
    this.isMobile = this.scale.width < 768 || "ontouchstart" in window;
    this.isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.isAndroidDevice = /Android/.test(navigator.userAgent);
  }

  // 保留单一的设备检测方法
  isIOS() {
    return this.isIOSDevice;
  }

  isAndroid() {
    return this.isAndroidDevice;
  }

  preload() {
    this.load.on("progress", (p) =>
      this.dlog("Loading:", Math.round(p * 100) + "%")
    );

    this.load.image("tiles", tileset);
    this.load.tilemapTiledJSON("field-map", mapJson);

    this.load.spritesheet("player", characters, {
      frameWidth: CELL_W,
      frameHeight: CELL_H,
    });

    this.load.image("npc1", npc1);
    this.load.image("npc2", npc2);
    this.load.image("npc3", npc3);
    this.load.image("npc4", npc4);
    this.load.image("npc5", npc5);
    this.load.image("npc6", npc6);
    this.load.image("npc7", npc7);
  }

  // 新增：强制复位视口
  playCutSceneWithSkip(onFinish) {
    const { width, height } = this.scale;
    this.cutSceneGroup = this.add.container(0, 0);

    // ... 你的过场内容（图片/文本/动画）都 add 到 this.cutSceneGroup

    // 跳过按钮
    const skip = this.add
      .text(width - 60, 30, "Skip", {
        fontSize: "14px",
        fontFamily: UI_FONT,
        backgroundColor: "#00000088",
        padding: { x: 10, y: 6 },
        color: "#fff",
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    skip.on("pointerdown", () => {
      this.cutSceneGroup.destroy(true);
      onFinish?.();
    });

    this.cutSceneGroup.add(skip);

    // 播放完自动结束（例如 8 秒）
    this.time.delayedCall(8000, () => {
      if (this.cutSceneGroup && !this.cutSceneGroup.destroyed) {
        this.cutSceneGroup.destroy(true);
        onFinish?.();
      }
    });
  }

  forceViewportReset() {
    if (this.debugMode) {
      console.log("🔄 强制重置视口");
    }

    try {
      const { width, height } = this.scale;

      // 重置摄像机视口
      this.cameras.main.setViewport(0, 0, width, height);

      // 重置键盘状态
      if (this.keyboardState) {
        this.keyboardState.isOpen = false;
        this.keyboardState.currentHeight = height;
      }

      // 重新调整UI元素
      if (this.uiManager) {
        this.uiManager.handleKeyboardToggle(false);
      }

      // 确保游戏元素正确定位
      this.restoreGameElements();
    } catch (error) {
      console.error("视口重置失败:", error);
    }
  }

  // 修复: 添加缺失的 restoreNPCInteractions 方法
  restoreNPCInteractions() {
    if (this.debugMode) {
      console.log("🔄 恢复NPC交互状态");
    }

    if (!this.npcManager) {
      console.warn("NPCManager 不存在，无法恢复交互");
      return;
    }

    try {
      // 清理所有NPC的旧交互状态
      this.npcManager.npcs.forEach((npc) => {
        if (npc.clickArea) {
          npc.clickArea.removeAllListeners();
          npc.clickArea.destroy();
          npc.clickArea = null;
        }
      });

      // 强制更新NPC状态
      this.npcManager.updateNPCStates();

      // 延迟确保交互区域正确创建
      this.time.delayedCall(100, () => {
        this.npcManager.npcs.forEach((npc) => {
          const availableNPC = this.npcManager.availableNPCs.find(
            (a) => a.npcId === npc.id
          );

          if (
            availableNPC &&
            availableNPC.unlocked &&
            availableNPC.day === this.npcManager.playerStatus.currentDay
          ) {
            this.npcManager.addNPCClickArea(npc);
          }
        });
      });
    } catch (error) {
      console.error("恢复NPC交互失败:", error);
    }
  }

  create() {
    this.game.canvas.style.imageRendering = "pixelated"; // 浏览器端像素化渲染

    this.setupMap();
    this.setupPlayer();
    this.setupGameSystems();
    this.setupCamera();
    this.setupAudio();
    this.setupMobileControls();

    // 设置键盘处理
    this.setupKeyboardHandling();

    // 清理可能残留的文字
    this.time.delayedCall(100, () => {
      this.emergencyCleanupFloatingTexts();
    });

    this.time.delayedCall(500, () => {
      this.showWelcomeMessage();
    });

    this.handleResize(this.scale.gameSize);
    this.gameStarted = true;

    this.events.on("resume", () => {
      console.log("🔄 MainScene resumed from dialog");

      // 延迟执行，确保对话场景完全关闭
      this.time.delayedCall(100, () => {
        // 清理可能残留的浮动文本
        this.emergencyCleanupFloatingTexts();

        // 刷新NPC状态
        this.refreshNPCs("resume-from-dialog");

        // 🔑 关键：重新添加 NPC 点击区域和更新状态
        if (this.npcManager) {
          console.log("🔄 强制更新NPC交互状态");
          this.npcManager.updateNPCStates();

          // 确保所有可交互的NPC都有正确的点击区域
          this.restoreNPCInteractions();
        }
      });
    });

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.forceViewportReset();

      // 额外的状态恢复
      this.time.delayedCall(200, () => {
        if (this.npcManager) {
          this.restoreNPCInteractions();
        }
      });
    });
  }

  emergencyCleanupFloatingTexts() {
    this.children.list.forEach((child) => {
      if (child.type === "Text") {
        const text = child.text || "";
        if (
          text.includes("Breakfast") ||
          text.includes("Lunch") ||
          text.includes("Dinner") ||
          text.includes("早餐") ||
          text.includes("午餐") ||
          text.includes("晚餐") ||
          text.includes("Available") ||
          text.includes("可记录")
        ) {
          this.dlog("Cleaning up floating text:", text);
          child.destroy();
        }
      }
    });
  }

  setupAudio() {
    try {
      if (this.playerData?.music) playBGM();
      else stopBGM();
    } catch (e) {
      this.elog("Audio error:", e);
    }
  }

  setupMobileControls() {
    this.input.addPointer(2);
    this.input.on("pointerdown", (pointer) => this.handleMapTap(pointer));
    this.input.on("pointerup", (pointer) => this.handlePointerUp(pointer));
  }

  setupKeyboardHandling() {
    this.keyboardState.originalHeight = window.innerHeight;
    this.keyboardState.currentHeight = window.innerHeight;

    const handleViewportChange = this.debounce(() => {
      this.processViewportChange();
    }, 100);

    const listeners = [];

    // Visual Viewport API
    if (window.visualViewport) {
      const vvListener = () => handleViewportChange();
      window.visualViewport.addEventListener("resize", vvListener);
      window.visualViewport.addEventListener("scroll", vvListener);
      listeners.push(
        { target: window.visualViewport, event: "resize", handler: vvListener },
        { target: window.visualViewport, event: "scroll", handler: vvListener }
      );
    }

    // Window resize
    const windowListener = () => handleViewportChange();
    window.addEventListener("resize", windowListener);
    window.addEventListener("orientationchange", windowListener);
    listeners.push(
      { target: window, event: "resize", handler: windowListener },
      { target: window, event: "orientationchange", handler: windowListener }
    );

    // iOS特殊处理
    if (this.isIOS()) {
      const focusInHandler = () => {
        this.keyboardState.isOpen = true;
        setTimeout(() => this.processViewportChange(), 300);
      };
      const focusOutHandler = () => {
        this.keyboardState.isOpen = false;
        setTimeout(() => this.processViewportChange(), 300);
      };

      document.addEventListener("focusin", focusInHandler);
      document.addEventListener("focusout", focusOutHandler);
      listeners.push(
        { target: document, event: "focusin", handler: focusInHandler },
        { target: document, event: "focusout", handler: focusOutHandler }
      );
    }

    this.keyboardState.listeners = listeners;
  }

  processViewportChange() {
    const currentHeight = this.getCurrentViewportHeight();
    const heightDiff = this.keyboardState.originalHeight - currentHeight;
    const wasKeyboardOpen = this.keyboardState.isOpen;

    this.keyboardState.isOpen = heightDiff > this.keyboardState.threshold;
    this.keyboardState.currentHeight = currentHeight;

    if (wasKeyboardOpen !== this.keyboardState.isOpen) {
      this.dlog(
        "Keyboard state changed:",
        this.keyboardState.isOpen ? "OPEN" : "CLOSED"
      );
      this.adjustGameForKeyboard();
      this.uiManager?.handleKeyboardToggle(this.keyboardState.isOpen);
    }
  }

  getCurrentViewportHeight() {
    if (window.visualViewport) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  adjustGameForKeyboard() {
    const { width } = this.scale;
    const availableHeight = this.keyboardState.currentHeight;

    if (this.keyboardState.isOpen) {
      this.cameras.main.setViewport(0, 0, width, availableHeight);
      this._touchControlsDisabled = true;
      this.repositionGameElements();
    } else {
      this.cameras.main.setViewport(
        0,
        0,
        width,
        this.keyboardState.originalHeight
      );
      this._touchControlsDisabled = false;
      this.restoreGameElements();
    }
  }

  repositionGameElements() {
    // 调整特定游戏元素的位置
  }

  restoreGameElements() {
    // 恢复游戏元素到原始位置
  }

  debounce(func, wait) {
    return (...args) => {
      if (this.keyboardState.resizeTimer) {
        clearTimeout(this.keyboardState.resizeTimer);
      }
      this.keyboardState.resizeTimer = setTimeout(
        () => func.apply(this, args),
        wait
      );
    };
  }

  isDialogSceneActive() {
    try {
      return (
        this.scene.isActive("DialogScene") ||
        (this.dialogSystem &&
          typeof this.dialogSystem.isDialogActive === "function" &&
          this.dialogSystem.isDialogActive())
      );
    } catch (error) {
      console.warn("Error checking dialog state:", error);
      return false;
    }
  }

  handleMapTap(pointer) {
    if (this._touchControlsDisabled) return;

    const currentTime = this.time.now;
    if (currentTime - this.lastTapTime < this.tapDelay) return;
    this.lastTapTime = currentTime;

    if (this.isDialogSceneActive()) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(
      worldPoint.x / (this.fieldMapTileMap.tileWidth * this.mapScale)
    );
    const tileY = Math.floor(
      worldPoint.y / (this.fieldMapTileMap.tileHeight * this.mapScale)
    );

    this.movePlayerTo(tileX, tileY);

    if (this.gridEngine && this.gridEngine.getPosition("player")) {
      const playerPos = this.gridEngine.getPosition("player");
      const distanceToNPC =
        Math.abs(playerPos.x - tileX) + Math.abs(playerPos.y - tileY);
      if (distanceToNPC > 1) return;
    }

    const clickedNPC = this.checkNPCClick(tileX, tileY);
    if (clickedNPC) this.startDialogWithNPC(clickedNPC);
  }

  checkNPCClick(tileX, tileY) {
    if (!this.npcManager) return null;
    const visibleNPCs = Array.from(this.npcManager.npcs.values()).filter(
      (npc) => npc.isUnlocked
    );

    for (let npc of visibleNPCs) {
      try {
        const npcPos = this.gridEngine.getPosition(npc.id);
        const distance =
          Math.abs(npcPos.x - tileX) + Math.abs(npcPos.y - tileY);
        if (distance <= 1) return npc;
      } catch (error) {
        this.elog(`Error checking NPC ${npc.id}:`, error);
      }
    }
    return null;
  }

  startDialogWithNPC(npc) {
    this.dlog(`Starting dialog with NPC: ${npc.id}`);
    if (!this.npcManager.canInteractWithNPC(npc)) {
      this.npcManager.showInteractionBlockedMessage(npc);
      return;
    }
    this.showNPCClickFeedback(npc);
    this.time.delayedCall(200, () => this.npcManager.startDialogScene(npc.id));
  }

  showNPCClickFeedback(npc) {
    const npcSprite = npc.sprite;
    if (!npcSprite) return;

    const ripple = this.add.graphics();
    ripple.lineStyle(3, 0xffd700, 1);
    ripple.strokeCircle(0, 0, 10);
    ripple.setPosition(npcSprite.x, npcSprite.y - 20);
    ripple.setDepth(15);

    this.tweens.add({
      targets: ripple,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      ease: "Power2",
      onComplete: () => ripple.destroy(),
    });

    const dialogHint = this.add.text(
      npcSprite.x,
      npcSprite.y - 40,
      this.playerData.language === "zh" ? "对话中..." : "Talking...",
      {
        fontSize: "14px",
        fontFamily: "monospace",
        fill: "#ffd700",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      }
    );
    dialogHint.setOrigin(0.5);
    dialogHint.setDepth(16);

    this.tweens.add({
      targets: dialogHint,
      alpha: 0,
      y: dialogHint.y - 20,
      duration: 1000,
      onComplete: () => {
        if (dialogHint && dialogHint.destroy) {
          dialogHint.destroy();
        }
      },
    });
  }

  movePlayerTo(tileX, tileY) {
    if (!this.isValidTile(tileX, tileY)) {
      this.showInvalidMoveEffect(tileX, tileY);
      return;
    }
    try {
      this.gridEngine.moveTo("player", { x: tileX, y: tileY });
      this.showMoveTarget(tileX, tileY);
    } catch (error) {
      this.elog("Error moving player:", error);
      this.showInvalidMoveEffect(tileX, tileY);
    }
  }

  isValidTile(tileX, tileY) {
    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= this.fieldMapTileMap.width ||
      tileY >= this.fieldMapTileMap.height
    ) {
      return false;
    }

    let isBlocked = false;
    this.fieldMapTileMap.layers.forEach((layer) => {
      const tile = layer.tilemapLayer.getTileAt(tileX, tileY);
      if (tile && tile.properties.ge_collide) isBlocked = true;
    });

    return !isBlocked;
  }

  showMoveTarget(tileX, tileY) {
    const worldX = tileX * this.fieldMapTileMap.tileWidth * this.mapScale;
    const worldY = tileY * this.fieldMapTileMap.tileHeight * this.mapScale;

    const target = this.add.graphics();
    target.lineStyle(2, 0x00ff00, 0.8);
    target.strokeCircle(0, 0, 15);
    target.lineStyle(1, 0x00ff00, 0.6);
    target.strokeCircle(0, 0, 25);
    target.setPosition(worldX, worldY);
    target.setDepth(12);

    this.tweens.add({
      targets: target,
      scaleX: { from: 1.5, to: 0.8 },
      scaleY: { from: 1.5, to: 0.8 },
      alpha: { from: 0.8, to: 0.2 },
      duration: 800,
      ease: "Power2",
      yoyo: true,
      repeat: 2,
      onComplete: () => target.destroy(),
    });
  }

  showInvalidMoveEffect(tileX, tileY) {
    const worldX = tileX * this.fieldMapTileMap.tileWidth * this.mapScale;
    const worldY = tileY * this.fieldMapTileMap.tileHeight * this.mapScale;

    const invalidX = this.add.text(worldX, worldY, "✗", {
      fontSize: "24px",
      fill: "#ff4444",
      fontStyle: "bold",
    });
    invalidX.setOrigin(0.5);
    invalidX.setDepth(15);

    this.tweens.add({
      targets: invalidX,
      scaleX: { from: 1.5, to: 0 },
      scaleY: { from: 1.5, to: 0 },
      alpha: { from: 1, to: 0 },
      duration: 600,
      onComplete: () => invalidX.destroy(),
    });

    this.cameras.main.shake(100, 0.005);
  }

  handlePointerUp(_pointer) {}

  async showWelcomeMessage() {
    await this.waitForNPCManagerReady();

    const lang = this.playerData.language;
    const currentDay = this.npcManager?.getCurrentDay() || 1;
    const firstLoginDate = this.npcManager?.playerStatus?.firstLoginDate
      ? new Date(this.npcManager.playerStatus.firstLoginDate).toDateString()
      : new Date().toDateString();
    const isReturningPlayer = firstLoginDate !== new Date().toDateString();

    const message = isReturningPlayer
      ? lang === "zh"
        ? `欢迎回到村庄！\n今天是第${currentDay}天\n继续寻找师父的线索`
        : `Welcome back to the village!\nThis is Day ${currentDay}\nContinue searching for your master's clues`
      : lang === "zh"
      ? `欢迎来到神秘村庄！\n这是你的第1天\n点击发光的NPC开始对话\n记录你的餐食来获取线索`
      : `Welcome to the mysterious village!\nThis is your Day 1\nTap the glowing NPC to start conversation\nRecord your meals to get clues`;
    this.showNotification(message, 10000);
  }

  showNotification(message, duration = 3000) {
    if (this.uiManager) this.uiManager.showNotification(message, duration);
  }

  async waitForNPCManagerReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.npcManager && this.npcManager.playerStatus) resolve();
        else setTimeout(checkReady, 100);
      };
      checkReady();
    });
  }

  setupMap() {
    this.fieldMapTileMap = this.make.tilemap({ key: "field-map" });
    this.fieldMapTileMap.addTilesetImage("tiles", "tiles");
    const mainLayer = this.fieldMapTileMap.createLayer("layer", "tiles", 0, 0);

    const scaleX = this.scale.width / this.fieldMapTileMap.widthInPixels;
    const scaleY = this.scale.height / this.fieldMapTileMap.heightInPixels;
    mainLayer.setScale(scaleX, scaleY);
    mainLayer.setPosition(0, 0);

    this.mapScaleX = scaleX;
    this.mapScaleY = scaleY;
    this.mapScale = Math.min(scaleX, scaleY);
  }

  setupPlayer() {
    const playerWorldX =
      this.playerLoc.x * this.fieldMapTileMap.tileWidth * this.mapScaleX;
    const playerWorldY =
      this.playerLoc.y * this.fieldMapTileMap.tileHeight * this.mapScaleY;

    this.playerSprite = this.add.sprite(playerWorldX, playerWorldY, "player");

    this._charFrames = getBottomLeftFrames(this, "player");

    this.playerSprite.setFrame(this._charFrames.idle.down);
    this.playerSprite.setScale(
      Math.min(this.mapScaleX, this.mapScaleY) * 1.125
    ); // Was 1.5, now 1.125 (3/4)

    this.playerSprite.setDepth(10);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.interactKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    const config = {
      characters: [
        {
          id: "player",
          sprite: this.playerSprite,
          startPosition: this.playerLoc,
          walkingAnimationEnabled: false,
        },
      ],
      collision: {
        blockedTiles: [
          4, 5, 6, 25, 26, 27, 28, 29, 30, 32, 33, 34, 42, 44, 60, 62,
        ],
      },
    };

    this.gridEngine.create(this.fieldMapTileMap, config);
    this.agent = new Agent(this.gridEngine, this.fieldMapTileMap, "player");

    registerPlayerAnims(this, "player", "player");

    const playWalk = (dir) => {
      const map = {
        up: "player-walk-up",
        down: "player-walk-down",
        left: "player-walk-left",
        right: "player-walk-right",
      };
      const k = map[dir];
      if (k) this.playerSprite.anims.play(k, true);
    };
    const playIdle = (dir) => {
      const idle = this._charFrames.idle[dir] ?? this._charFrames.idle.down;
      this.playerSprite.anims.stop();
      this.playerSprite.setFrame(idle);
    };

    const onMoveStart = ({ direction }) => playWalk(direction);
    const onDirChange = ({ direction }) => playWalk(direction);
    const onMoveStop = ({ direction }) => playIdle(direction);

    const ms = this.gridEngine.movementStarted?.();
    const dc = this.gridEngine.directionChanged?.();
    const me = this.gridEngine.movementStopped?.();

    if (ms?.subscribe) ms.subscribe(onMoveStart);
    else this.gridEngine?.on?.("movementStarted", onMoveStart);

    if (dc?.subscribe) dc.subscribe(onDirChange);
    else this.gridEngine?.on?.("directionChanged", onDirChange);

    if (me?.subscribe) me.subscribe(onMoveStop);
    else this.gridEngine?.on?.("movementStopped", onMoveStop);
  }

  setupGameSystems() {
    let dialogScene = this.scene.get("DialogScene");
    if (!dialogScene) {
      this.scene.add("DialogScene", DialogScene, false);
      dialogScene = this.scene.get("DialogScene");
    }
    this.dialogSystem = dialogScene;

    this.npcManager = new NPCManager(this, this.mapScale);
    this.uiManager = new UIManager(this);

    if (this.dialogSystem) {
      try {
        this.npcManager.setDialogSystem(this.dialogSystem);
      } catch (error) {
        this.elog("Error setting up dialog system:", error);
      }
    }
  }

  setupCamera() {
    const mapWidth = this.fieldMapTileMap.widthInPixels * this.mapScaleX;
    const mapHeight = this.fieldMapTileMap.heightInPixels * this.mapScaleY;
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.playerSprite, true);
    this.cameras.main.setZoom(1);
  }

  handleResize(gameSize) {
    if (!gameSize) {
      gameSize = this.scale.gameSize;
    }

    const width = gameSize.width;
    const height = gameSize.height;

    if (this.debugMode) {
      console.log("🔄 处理窗口大小变化:", { width, height });
    }

    // 检查键盘状态
    if (
      this.keyboardState &&
      this.keyboardState.isOpen &&
      window.visualViewport
    ) {
      const vvHeight = window.visualViewport.height;
      this.cameras.main.setViewport(0, 0, width, vvHeight);
      return;
    }

    // 重新计算地图缩放
    const mapWidth = this.fieldMapTileMap.widthInPixels;
    const mapHeight = this.fieldMapTileMap.heightInPixels;
    const scale = Math.min(width / mapWidth, height / mapHeight);

    // 更新地图层
    const mainLayer = this.fieldMapTileMap.getLayer("layer");
    if (mainLayer?.tilemapLayer) {
      mainLayer.tilemapLayer.setScale(scale);
      mainLayer.tilemapLayer.setPosition(0, 0);
    }

    // 更新玩家位置和缩放
    if (this.playerSprite && this.gridEngine) {
      const pos = this.gridEngine.getPosition("player");
      if (pos) {
        const x = pos.x * this.fieldMapTileMap.tileWidth * scale;
        const y = pos.y * this.fieldMapTileMap.tileHeight * scale;
        this.playerSprite.setPosition(x, y);
        this.playerSprite.setScale(scale * 1.125); // 修正缩放比例
      }
    }

    // 更新NPC缩放
    if (this.npcManager) {
      this.npcManager.updateScale(scale * 0.5);
    }

    // 更新摄像机边界
    this.cameras.main.setBounds(0, 0, mapWidth * scale, mapHeight * scale);
    this.cameras.main.startFollow(this.playerSprite, true);

    // 保存新的缩放值
    this.mapScale = scale;
  }

  

  resetNPCInteractionStates() {
    if (!this.npcManager) return;

    // Clear any stuck interaction states
    this.npcManager.npcs.forEach((npc) => {
      if (npc.clickArea) {
        npc.clickArea.removeAllListeners();
        npc.clickArea.setInteractive({ useHandCursor: true });

        // Re-add click handler
        npc.clickArea.on("pointerdown", () => {
          this.dlog(`NPC ${npc.id} clicked after reset`);
          if (this.npcManager.canInteractWithNPC(npc)) {
            this.npcManager.startDialogScene(npc.id);
          } else {
            this.npcManager.showInteractionBlockedMessage(npc);
          }
        });
      }
    });
  }

  update(time, delta) {
    if (!this.isDialogSceneActive()) {
      if (this.cursors?.left?.isDown)
        this.agent.moveAndCheckCollision("left", this.fieldMapTileMap);
      else if (this.cursors?.right?.isDown)
        this.agent.moveAndCheckCollision("right", this.fieldMapTileMap);
      else if (this.cursors?.up?.isDown)
        this.agent.moveAndCheckCollision("up", this.fieldMapTileMap);
      else if (this.cursors?.down?.isDown)
        this.agent.moveAndCheckCollision("down", this.fieldMapTileMap);
    }

    const pos = this.gridEngine?.getPosition("player");
    if (pos && this.playerData) this.playerData.playLoc = [pos.x, pos.y];
  }

  setPlayerData(newPlayerData) {
    this.playerData = newPlayerData;
    this.uiManager?.updateProgress();
  }

  async onMealRecorded() {
    await this.refreshNPCs("meal-recorded");
    this.uiManager?.updateProgress();
    const progress = this.npcManager?.getDailyProgress();
    if (progress && progress.isComplete) this.showDayCompleteMessage();
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
      await this.npcManager.loadPlayerStatus();
      this.npcManager.updateNPCStates();
      this.dlog(
        "[MainScene] NPC/MealTypes refreshed",
        reason ? `(${reason})` : ""
      );
    } catch (e) {
      this.elog("[MainScene] Failed to refresh NPCs:", e);
    }
  }
}
