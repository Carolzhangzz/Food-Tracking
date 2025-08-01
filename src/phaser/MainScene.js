// MainScene.js - 手机触控优化版
import Phaser from "phaser";
import mapJson from "../assets/tiled.json";
import tileset from "../assets/tiles.png";
import characters from "../assets/characters.png";
import Agent from "./Agent";
import DialogScene from "./DialogScene.js";
import {NPCManager} from "./NPCManager.js";
import UIManager from "./UIManager.js";
import { playBGM, stopBGM } from "../utils/audioManager";
import npc1 from "../assets/npc/npc1.png";
import npc2 from "../assets/npc/npc2.png";
import npc3 from "../assets/npc/npc3.png";
import npc4 from "../assets/npc/npc4.png";
import npc5 from "../assets/npc/npc5.png";
import npc6 from "../assets/npc/npc6.png";
import npc7 from "../assets/npc/npc7.png";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.bgmPlayed = false;
    this.gameStarted = false;
    this.lastTapTime = 0;
    this.tapDelay = 300; // 防止重复点击
  }

  init(data) {
    this.playerId = data.playerId;
    this.playerData = data.playerData;
    this.updatePlayerdata = data.updatePlayerdata;
    this.playerContext = data.playerContext;

    try {
      this.playerLoc = {
        x: data.playerData?.playLoc[0] || 5,
        y: data.playerData?.playLoc[1] || 5,
      };
    } catch {
      this.playerLoc = { x: 5, y: 5 };
    }
  }

  preload() {
    this.load.on("progress", (progress) => {
      console.log("Loading:", Math.round(progress * 100) + "%");
    });

    this.load.image("tiles", tileset);
    this.load.tilemapTiledJSON("field-map", mapJson);
    this.load.spritesheet("player", characters, {
      frameWidth: 26,
      frameHeight: 36,
    });
    // load npc
    this.load.image("npc1", npc1);
    this.load.image("npc2", npc2);
    this.load.image("npc3", npc3);
    this.load.image("npc4", npc4);
    this.load.image("npc5", npc5);
    this.load.image("npc6", npc6);
    this.load.image("npc7", npc7);
  }

  create() {
    this.setupMap();
    this.setupPlayer();
    this.setupGameSystems();
    this.setupCamera();
    this.setupAudio();
    this.setupMobileControls(); // 新增手机控制
    this.showWelcomeMessage();
    this.handleResize(this.scale.gameSize);
    this.gameStarted = true;
    this.npcManager = new NPCManager(
      this,
      0.5,
      this.playerContext // 传递上下文实例
    );
  }

  setupAudio() {
    try {
      if (this.playerData?.music) {
        playBGM();
      } else {
        stopBGM();
      }
    } catch (e) {
      console.error("Audio error:", e);
    }
  }

  setupMobileControls() {
    // 设置移动端触控支持
    this.input.addPointer(2); // 支持多点触控

    // 监听地图点击事件（移动玩家）
    this.input.on("pointerdown", (pointer) => {
      this.handleMapTap(pointer);
    });

    // 长按检测（可选功能）
    this.input.on("pointerup", (pointer) => {
      this.handlePointerUp(pointer);
    });
  }

  // 统一的对话状态检查方法
  isDialogSceneActive() {
    try {
      return this.scene.isActive("DialogScene") ||
             (this.dialogSystem && 
              typeof this.dialogSystem.isDialogActive === 'function' && 
              this.dialogSystem.isDialogActive());
    } catch (error) {
      console.warn("Error checking dialog state:", error);
      return false;
    }
  }

  handleMapTap(pointer) {
    const currentTime = this.time.now;

    // 防止短时间内重复点击
    if (currentTime - this.lastTapTime < this.tapDelay) {
      return;
    }
    this.lastTapTime = currentTime;

    // 如果对话正在进行，不允许移动
    if (this.isDialogSceneActive()) {
      return;
    }

    // 将点击位置从屏幕坐标转换为地图格子坐标
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(
      worldPoint.x / (this.fieldMapTileMap.tileWidth * this.mapScale)
    );
    const tileY = Math.floor(
      worldPoint.y / (this.fieldMapTileMap.tileHeight * this.mapScale)
    );

    // console.log(`Tap at tile: ${tileX}, ${tileY}`);

    // 玩家尝试移动到点击的位置
    this.movePlayerTo(tileX, tileY);

    // 检查玩家是否靠近NPC（曼哈顿距离 <= 1）
    if (this.gridEngine && this.gridEngine.getPosition("player")) {
      const playerPos = this.gridEngine.getPosition("player");
      const distanceToNPC =
        Math.abs(playerPos.x - tileX) + Math.abs(playerPos.y - tileY);

      if (distanceToNPC > 1) {
        // console.log(`Player too far from NPC: ${distanceToNPC}`);
        // 不用显示无效移动效果，因为玩家只是点击了一个远离NPC的地方
        // this.showInvalidMoveEffect(tileX, tileY);
        return;
      }
    }

    // 如果点击的是NPC，则触发对话
    const clickedNPC = this.checkNPCClick(tileX, tileY);
    if (clickedNPC) {
      this.startDialogWithNPC(clickedNPC);
      return;
    }
  }

  checkNPCClick(tileX, tileY) {
    if (!this.npcManager) return null;

    // 检查所有可见的NPC
    const visibleNPCs = Array.from(this.npcManager.npcs.values()).filter(
      (npc) => npc.isUnlocked
    );

    for (let npc of visibleNPCs) {
      try {
        const npcPos = this.gridEngine.getPosition(npc.id);
        const distance =
          Math.abs(npcPos.x - tileX) + Math.abs(npcPos.y - tileY);

        console.log(
          `NPC ${npc.id} at ${npcPos.x},${npcPos.y}, distance: ${distance}`
        );

        // 如果点击的是NPC位置或者相邻位置
        if (distance <= 1) {
          return npc;
        }
      } catch (error) {
        console.error(`Error checking NPC ${npc.id}:`, error);
      }
    }

    return null;
  }

  startDialogWithNPC(npc) {
    console.log(`Starting dialog with NPC: ${npc.id}`);

    // 检查是否可以与NPC交互
    if (!this.npcManager.canInteractWithNPC(npc)) {
      this.npcManager.showInteractionBlockedMessage(npc);
      return;
    }

    // 显示点击反馈
    this.showNPCClickFeedback(npc);

    // 延迟启动对话场景
    this.time.delayedCall(200, () => {
      this.npcManager.startDialogScene(npc.id);
    });
  }

  showNPCClickFeedback(npc) {
    // 在NPC上方显示点击效果
    const npcSprite = npc.sprite;
    if (!npcSprite) return;

    // 创建点击波纹效果
    const ripple = this.add.graphics();
    ripple.lineStyle(3, 0xffd700, 1);
    ripple.strokeCircle(0, 0, 10);
    ripple.setPosition(npcSprite.x, npcSprite.y - 20);
    ripple.setDepth(15);

    // 波纹动画
    this.tweens.add({
      targets: ripple,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      ease: "Power2",
      onComplete: () => {
        ripple.destroy();
      },
    });

    // 显示"对话中"提示
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

    // 提示文字淡出
    this.tweens.add({
      targets: dialogHint,
      alpha: 0,
      y: dialogHint.y - 20,
      duration: 1000,
      onComplete: () => {
        dialogHint.destroy();
      },
    });
  }

  movePlayerTo(tileX, tileY) {
    // 检查目标位置是否有效
    if (!this.isValidTile(tileX, tileY)) {
      console.log(`Invalid tile: ${tileX}, ${tileY}`);
      this.showInvalidMoveEffect(tileX, tileY);
      return;
    }

    // console.log(`Moving player to: ${tileX}, ${tileY}`);

    try {
      // 使用GridEngine的moveTo功能
      this.gridEngine.moveTo("player", { x: tileX, y: tileY });

      // 显示移动目标指示器
      this.showMoveTarget(tileX, tileY);
    } catch (error) {
      console.error("Error moving player:", error);
      this.showInvalidMoveEffect(tileX, tileY);
    }
  }

  isValidTile(tileX, tileY) {
    // 检查是否在地图范围内
    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= this.fieldMapTileMap.width ||
      tileY >= this.fieldMapTileMap.height
    ) {
      return false;
    }

    // 检查是否为可行走的瓦片
    let isBlocked = false;
    this.fieldMapTileMap.layers.forEach((layer) => {
      const tile = layer.tilemapLayer.getTileAt(tileX, tileY);
      if (tile && tile.properties.ge_collide) {
        isBlocked = true;
      }
    });

    return !isBlocked;
  }

  showMoveTarget(tileX, tileY) {
    const worldX = tileX * this.fieldMapTileMap.tileWidth * this.mapScale;
    const worldY = tileY * this.fieldMapTileMap.tileHeight * this.mapScale;

    // 创建移动目标指示器
    const target = this.add.graphics();
    target.lineStyle(2, 0x00ff00, 0.8);
    target.strokeCircle(0, 0, 15);
    target.lineStyle(1, 0x00ff00, 0.6);
    target.strokeCircle(0, 0, 25);
    target.setPosition(worldX, worldY);
    target.setDepth(12);

    // 目标指示器动画
    this.tweens.add({
      targets: target,
      scaleX: { from: 1.5, to: 0.8 },
      scaleY: { from: 1.5, to: 0.8 },
      alpha: { from: 0.8, to: 0.2 },
      duration: 800,
      ease: "Power2",
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        target.destroy();
      },
    });
  }

  showInvalidMoveEffect(tileX, tileY) {
    const worldX = tileX * this.fieldMapTileMap.tileWidth * this.mapScale;
    const worldY = tileY * this.fieldMapTileMap.tileHeight * this.mapScale;

    // 显示"X"表示不能移动
    const invalidX = this.add.text(worldX, worldY, "✗", {
      fontSize: "24px",
      fill: "#ff4444",
      fontStyle: "bold",
    });
    invalidX.setOrigin(0.5);
    invalidX.setDepth(15);

    // 无效移动效果
    this.tweens.add({
      targets: invalidX,
      scaleX: { from: 1.5, to: 0 },
      scaleY: { from: 1.5, to: 0 },
      alpha: { from: 1, to: 0 },
      duration: 600,
      onComplete: () => {
        invalidX.destroy();
      },
    });

    // 震动效果（可选）
    this.cameras.main.shake(100, 0.005);
  }

  handlePointerUp(pointer) {
    // 处理长按或其他手势（如果需要的话）
    // 目前暂时不使用
  }

  showWelcomeMessage() {
    const lang = this.playerData.language;
    const currentDay = this.npcManager?.getCurrentDay() || 1;
    const message =
      lang === "zh"
        ? `欢迎回到村庄！\n今天是第${currentDay}天\n点击当天的NPC开始对话\n记录你的三餐来获取线索`
        : `Welcome back to the village!\nThis is Day ${currentDay}\nTap today's NPC to start conversation\nRecord your three meals to get clues`;
    this.showNotification(message, 5000);
  }

  showNotification(message, duration = 3000) {
    if (this.uiManager) this.uiManager.showNotification(message, duration);
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
    this.playerSprite.setScale(Math.min(this.mapScaleX, this.mapScaleY) * 1.5);
    this.playerSprite.setDepth(10);

    // 保留键盘控制作为备用（PC端）
    this.cursors = this.input.keyboard.createCursorKeys();
    this.interactKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    const config = {
      characters: [
        {
          id: "player",
          sprite: this.playerSprite,
          walkingAnimationMapping: 6,
          startPosition: this.playerLoc,
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
  }

  setupGameSystems() {
    // 检查是否已经存在DialogScene
    let dialogScene = this.scene.get("DialogScene");

    if (!dialogScene) {
      // 如果不存在，则添加新的DialogScene
      this.scene.add("DialogScene", DialogScene, false);
      dialogScene = this.scene.get("DialogScene");
    }

    this.dialogSystem = dialogScene;
    this.uiManager = new UIManager(this);

    // 安全地设置NPC管理器
    if (this.dialogSystem) {
      // 尝试调用setNPCManager方法
      try {
        // this.dialogSystem.setNPCManager(this.npcManager);
        this.npcManager.setDialogSystem(this.dialogSystem);
      } catch (error) {
        console.error("Error setting up dialog system:", error);
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
    const width = gameSize.width;
    const height = gameSize.height;
    const mapWidth = this.fieldMapTileMap.widthInPixels;
    const mapHeight = this.fieldMapTileMap.heightInPixels;
    const scale = Math.min(width / mapWidth, height / mapHeight);

    const mainLayer = this.fieldMapTileMap.getLayer("layer");
    if (mainLayer?.tilemapLayer) {
      mainLayer.tilemapLayer.setScale(scale);
      mainLayer.tilemapLayer.setPosition(0, 0);
    }

    if (this.playerSprite && this.gridEngine) {
      const pos = this.gridEngine.getPosition("player");
      if (pos) {
        const x = pos.x * this.fieldMapTileMap.tileWidth * scale;
        const y = pos.y * this.fieldMapTileMap.tileHeight * scale;
        this.playerSprite.setPosition(x, y);
        this.playerSprite.setScale(scale * 1.5);
      }
    }

    this.npcManager?.updateScale(scale * 0.5);
    this.cameras.main.setBounds(0, 0, mapWidth * scale, mapHeight * scale);
    this.cameras.main.startFollow(this.playerSprite, true);
    this.mapScale = scale;
  }

  update(time, delta) {
    // 保留键盘控制（PC端备用）
    if (!this.isDialogSceneActive()) {
      if (this.cursors?.left.isDown)
        this.agent.moveAndCheckCollision("left", this.fieldMapTileMap);
      else if (this.cursors?.right.isDown)
        this.agent.moveAndCheckCollision("right", this.fieldMapTileMap);
      else if (this.cursors?.up.isDown)
        this.agent.moveAndCheckCollision("up", this.fieldMapTileMap);
      else if (this.cursors?.down.isDown)
        this.agent.moveAndCheckCollision("down", this.fieldMapTileMap);
    }

    // 更新玩家位置数据
    const pos = this.gridEngine?.getPosition("player");
    if (pos && this.playerData) {
      this.playerData.playLoc = [pos.x, pos.y];
    }
  }

  setPlayerData(newPlayerData) {
    this.playerData = newPlayerData;
    this.uiManager?.updateProgress();
  }

  onMealRecorded() {
    this.uiManager?.updateProgress();
    if (this.npcManager.getDailyProgress().isComplete) {
      this.showDayCompleteMessage();
    }
  }

  showDayCompleteMessage() {
    const lang = this.playerData.language;
    const currentDay = this.npcManager.getCurrentDay();
    const msg =
      currentDay >= 7
        ? lang === "zh"
          ? "🎉 恭喜完成所有7天的旅程！"
          : "🎉 Congratulations on completing all 7 days!"
        : lang === "zh"
        ? `第${currentDay}天完成！明天可以与新的NPC对话`
        : `Day ${currentDay} complete! You can talk to a new NPC tomorrow`;

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

    this.time.delayedCall(3000, () => {
      this.npcManager?.triggerFinalEgg();
    });
  }

  getGameState() {
    return {
      currentDay: this.npcManager?.getCurrentDay(),
      progress: this.npcManager?.getDailyProgress(),
      clues: this.uiManager?.getAllClues() || [],
      isGameStarted: this.gameStarted,
    };
  }

  shutdown() {
    stopBGM();
  }
}