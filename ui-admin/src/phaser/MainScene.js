// MainScene.js
import Phaser from "phaser";
import mapJson from "../assets/tiled.json";
import tileset from "../assets/tiles.png";
import characters from "../assets/characters.png";
import npc from "../assets/npc1.png";
import Agent from "./Agent";
import DialogSystem from "./DialogSystem.js";
import NPCManager from "./NPCManager.js";
import UIManager from "./UIManager.js";
import { playBGM, stopBGM } from "../utils/audioManager";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.bgmPlayed = false;
    this.gameStarted = false;
  }

  init(data) {
    this.playerId = data.playerId;
    this.playerData = data.playerData;
    this.updatePlayerdata = data.updatePlayerdata;

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
    this.load.spritesheet("player", characters, { frameWidth: 26, frameHeight: 36 });
    this.load.image("npc", npc);
  }

  create() {
    this.setupMap();
    this.setupPlayer();
    this.setupGameSystems();
    this.setupCamera();
    this.setupAudio();
    this.showWelcomeMessage();
    this.handleResize(this.scale.gameSize);

    // Add scene switch button
    this.switchSceneButton = this.add.text(this.scale.width - 120, 20, 'Switch Scene', {
      fontSize: '16px',
      fill: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    })
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(1000)
      .on('pointerdown', () => {
        this.scene.start('DialogScene'); // Replace 'OtherScene' with your target scene key
      });

    // this.dialogSystem = new DialogSystem(this); // 👈 传入 this.scene
    // this.dialogSystem.createDialogUI();
    this.gameStarted = true;
  }

  // 使用统一的方式set up music
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

  showWelcomeMessage() {
    const lang = this.playerData.language;
    const currentDay = this.npcManager?.getCurrentDay() || 1;
    const message =
      lang === "zh"
        ? `欢迎回到村庄！\n今天是第${currentDay}天\n找到当天的NPC开始对话\n记录你的三餐来获取线索`
        : `Welcome back to the village!\nThis is Day ${currentDay}\nFind today's NPC to start conversation\nRecord your three meals to get clues`;
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
    const playerWorldX = this.playerLoc.x * this.fieldMapTileMap.tileWidth * this.mapScaleX;
    const playerWorldY = this.playerLoc.y * this.fieldMapTileMap.tileHeight * this.mapScaleY;

    this.playerSprite = this.add.sprite(playerWorldX, playerWorldY, "player");
    this.playerSprite.setScale(Math.min(this.mapScaleX, this.mapScaleY) * 1.5);
    this.playerSprite.setDepth(10);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    const config = {
      characters: [{
        id: "player",
        sprite: this.playerSprite,
        walkingAnimationMapping: 6,
        startPosition: this.playerLoc,
      }],
      collision: {
        blockedTiles: [4, 5, 6, 25, 26, 27, 28, 29, 30, 32, 33, 34, 42, 44, 60, 62],
      },
    };

    this.gridEngine.create(this.fieldMapTileMap, config);
    this.agent = new Agent(this.gridEngine, this.fieldMapTileMap, "player");
  }

  setupGameSystems() {
    this.dialogSystem = new DialogSystem(this);
    this.npcManager = new NPCManager(this, this.mapScale);
    this.uiManager = new UIManager(this);

    this.dialogSystem.setNPCManager(this.npcManager);
    this.npcManager.setDialogSystem(this.dialogSystem);
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
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.playerSprite, true);
    this.mapScale = scale;
  }

  update(time, delta) {
    if (this.npcManager) this.npcManager.checkInteractions();

    if (!this.dialogSystem?.isDialogActive()) {
      if (this.cursors?.left.isDown) this.agent.moveAndCheckCollision("left", this.fieldMapTileMap);
      else if (this.cursors?.right.isDown) this.agent.moveAndCheckCollision("right", this.fieldMapTileMap);
      else if (this.cursors?.up.isDown) this.agent.moveAndCheckCollision("up", this.fieldMapTileMap);
      else if (this.cursors?.down.isDown) this.agent.moveAndCheckCollision("down", this.fieldMapTileMap);
    }

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
