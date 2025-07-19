// MainScene.js - 更新后的主场景，集成7天进度系统
import Phaser from "phaser";
import mapJson from "../assets/tiled.json"
import tileset from "../assets/tiles.png"
import characters from "../assets/characters.png"
import npc from "../assets/npc1.png"
import Agent from "./Agent";
import bgmMp3 from "../assets/bgm.mp3";
import DialogSystem from "./DialogSystem.js";
import NPCManager from "./NPCManager.js";
import UIManager from "./UIManager.js";

export default class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainScene" });
        this.bgmPlayed = false;
        this.audioLoaded = false;
        this.gameStarted = false;
        console.log("MainScene constructor called");
    }

    init(data) {
        console.log("MainScene init() called with data:", data);
        this.playerId = data.playerId;
        this.playerData = data.playerData;
        this.updatePlayerdata = data.updatePlayerdata;
        
        // 初始化玩家位置
        try {
            this.playerLoc = { 
                x: data.playerData?.playLoc[0] || 5, 
                y: data.playerData?.playLoc[1] || 5 
            };
        } catch (error) {
            console.warn("Error setting player location:", error);
            this.playerLoc = { x: 5, y: 5 };
        }

        console.log("MainScene initialized with player at:", this.playerLoc);
    }

    preload() {
        console.log("MainScene preload() started");
        
        // 添加加载监听器
        this.load.on('progress', (progress) => {
            console.log('Loading progress:', Math.round(progress * 100) + '%');
        });

        this.load.on('complete', () => {
            console.log('All assets loaded successfully');
            this.audioLoaded = this.sound.get('bgm') !== null;
            console.log('Audio loaded:', this.audioLoaded);
        });

        this.load.on('loaderror', (file) => {
            console.error('Failed to load file:', file.src, file.key);
        });

        // 预加载所有资源
        try {
            if (bgmMp3) {
                this.load.audio('bgm', bgmMp3);
                console.log("Audio file scheduled for loading:", bgmMp3);
            } else {
                console.warn("BGM file not found, audio will be disabled");
            }
            
            this.load.image("tiles", tileset);
            this.load.tilemapTiledJSON("field-map", mapJson);
            this.load.spritesheet("player", characters, {
                frameWidth: 26,
                frameHeight: 36,
            });
            this.load.image("npc", npc);
        } catch (error) {
            console.error("Error in preload:", error);
        }

        // 音频加载事件
        this.load.on('filecomplete-audio-bgm', () => {
            console.log('BGM audio loaded successfully');
            this.audioLoaded = true;
        });

        this.load.on('loaderror-audio-bgm', () => {
            console.warn('BGM audio failed to load, music will be disabled');
            this.audioLoaded = false;
        });
    }

    create() {
        console.log("MainScene create() started");

        try {
            // 1. 创建地图系统
            this.setupMap();
            
            // 2. 创建玩家
            this.setupPlayer();
            
            // 3. 初始化游戏系统
            this.setupGameSystems();
            
            // 4. 设置相机和控制
            this.setupCamera();
            
            // 5. 设置音乐
            this.setupAudio();

            // 6. 显示开场提示
            this.showWelcomeMessage();

            this.gameStarted = true;
            console.log("MainScene create() completed successfully");
        } catch (error) {
            console.error("Error in MainScene create():", error);
            this.add.text(100, 100, "Error loading game. Check console.", {
                fontSize: '20px',
                fill: '#ff0000'
            });
        }
    }

    setupMap() {
        console.log("Setting up map...");
        try {
            this.fieldMapTileMap = this.make.tilemap({ key: "field-map" });
            console.log("Tilemap created:", this.fieldMapTileMap);
            
            this.fieldMapTileMap.addTilesetImage("tiles", "tiles");
            console.log("Tileset added");
            
            const mainLayer = this.fieldMapTileMap.createLayer('layer', 'tiles', 0, 0);
            console.log("Main layer created:", mainLayer);
            
            if (!mainLayer) {
                throw new Error("Failed to create main layer");
            }
            
            const gameWidth = this.scale.width;
            const gameHeight = this.scale.height;
            const mapWidth = this.fieldMapTileMap.widthInPixels;
            const mapHeight = this.fieldMapTileMap.heightInPixels;
            
            console.log(`Screen: ${gameWidth}x${gameHeight}, Map: ${mapWidth}x${mapHeight}`);
            
            const scaleX = gameWidth / mapWidth;
            const scaleY = gameHeight / mapHeight;
            
            mainLayer.setScale(scaleX, scaleY);
            
            this.mapScaleX = scaleX;
            this.mapScaleY = scaleY;
            this.mapScale = Math.min(scaleX, scaleY);
            
            console.log(`Map scaled to X:${scaleX}, Y:${scaleY}`);
            mainLayer.setPosition(0, 0);
            
        } catch (error) {
            console.error("Error setting up map:", error);
            this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x228B22);
            this.add.text(100, 50, "Map loading failed - using backup", {
                fontSize: '16px',
                fill: '#ffffff'
            });
            this.mapScale = 1;
            this.mapScaleX = 1;
            this.mapScaleY = 1;
        }
    }

    setupPlayer() {
        console.log("Setting up player...");
        try {
            const playerWorldX = this.playerLoc.x * this.fieldMapTileMap.tileWidth * this.mapScaleX;
            const playerWorldY = this.playerLoc.y * this.fieldMapTileMap.tileHeight * this.mapScaleY;
            
            this.playerSprite = this.add.sprite(playerWorldX, playerWorldY, "player");
            console.log("Player sprite created at:", playerWorldX, playerWorldY);
            
            const playerScale = Math.min(this.mapScaleX, this.mapScaleY) * 1.5;
            this.playerSprite.setScale(playerScale);
            this.playerSprite.setDepth(10);
            
            this.cursors = this.input.keyboard.createCursorKeys();
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            
            if (!this.gridEngine) {
                console.error("GridEngine not available!");
                return;
            }

            const gridEngineConfig = {
                characters: [{
                    id: "player",
                    sprite: this.playerSprite,
                    walkingAnimationMapping: 6,
                    startPosition: this.playerLoc,
                }],
            };

            if (this.fieldMapTileMap) {
                gridEngineConfig.collision = {
                    blockedTiles: [4, 5, 6, 25, 26, 27, 28, 29, 30, 32, 33, 34, 42, 44, 60, 62]
                };
                this.gridEngine.create(this.fieldMapTileMap, gridEngineConfig);
            } else {
                console.warn("No tilemap available, GridEngine not initialized");
            }
            
            this.agent = new Agent(this.gridEngine, this.fieldMapTileMap, "player");
            console.log("Player setup completed");
        } catch (error) {
            console.error("Error setting up player:", error);
        }
    }

    setupGameSystems() {
        console.log("Setting up game systems...");
        try {
            // 初始化各个系统
            this.dialogSystem = new DialogSystem(this);
            this.npcManager = new NPCManager(this, this.mapScale || 1);
            this.uiManager = new UIManager(this);
            
            // 设置系统间的连接
            this.dialogSystem.setNPCManager(this.npcManager);
            this.npcManager.setDialogSystem(this.dialogSystem);
            
            console.log("Game systems setup completed");
        } catch (error) {
            console.error("Error setting up game systems:", error);
        }
    }

    setupCamera() {
        console.log("Setting up camera...");
        try {
            if (this.fieldMapTileMap && this.mapScaleX && this.mapScaleY) {
                const scaledMapWidth = this.fieldMapTileMap.widthInPixels * this.mapScaleX;
                const scaledMapHeight = this.fieldMapTileMap.heightInPixels * this.mapScaleY;
                
                this.cameras.main.setBounds(0, 0, scaledMapWidth, scaledMapHeight);
                
                if (this.playerSprite) {
                    this.cameras.main.startFollow(this.playerSprite, true);
                    this.cameras.main.setFollowOffset(0, 0);
                }
            }
            
            this.cameras.main.setZoom(1);
            this.scale.on('resize', this.handleResize, this);
            
            console.log("Camera setup completed");
        } catch (error) {
            console.error("Error setting up camera:", error);
        }
    }

    setupAudio() {
        console.log("Setting up audio...");
        try {
            if (this.audioLoaded && this.playerData && this.playerData.music && !this.bgmPlayed) {
                console.log("Attempting to play background music...");
                try {
                    this.sound.play("bgm", { loop: true, volume: 0.4 });
                    this.bgmPlayed = true;
                    console.log("Background music started successfully");
                } catch (audioError) {
                    console.error("Error playing background music:", audioError);
                    this.audioLoaded = false;
                }
            } else {
                console.log("Audio setup skipped:", {
                    audioLoaded: this.audioLoaded,
                    musicEnabled: this.playerData?.music,
                    alreadyPlaying: this.bgmPlayed
                });
            }
        } catch (error) {
            console.error("Error setting up audio:", error);
        }
    }

    showWelcomeMessage() {
        const language = this.playerData.language;
        const currentDay = this.npcManager ? this.npcManager.getCurrentDay() : 1;
        
        let welcomeMessage;
        if (language === 'zh') {
            welcomeMessage = `欢迎回到村庄！\n今天是第${currentDay}天\n找到当天的NPC开始对话\n记录你的三餐来获取线索`;
        } else {
            welcomeMessage = `Welcome back to the village!\nThis is Day ${currentDay}\nFind today's NPC to start conversation\nRecord your three meals to get clues`;
        }

        this.showNotification(welcomeMessage, 5000);
    }

    showNotification(message, duration = 3000) {
        if (this.uiManager) {
            this.uiManager.showNotification(message, duration);
        }
    }

    handleResize(gameSize) {
        console.log("Handling resize:", gameSize);
        try {
            const width = gameSize.width;
            const height = gameSize.height;
            
            if (this.fieldMapTileMap) {
                const mapWidth = this.fieldMapTileMap.widthInPixels;
                const mapHeight = this.fieldMapTileMap.heightInPixels;
                
                const newScaleX = width / mapWidth;
                const newScaleY = height / mapHeight;
                const mapScale = Math.min(newScaleX, newScaleY);
                
                const mainLayer = this.fieldMapTileMap.getLayer('layer');
                if (mainLayer && mainLayer.tilemapLayer) {
                    mainLayer.tilemapLayer.setScale(newScaleX, newScaleY);
                }
                
                if (this.playerSprite && this.gridEngine) {
                    const playerPos = this.gridEngine.getPosition("player");
                    if (playerPos) {
                        const playerWorldX = playerPos.x * this.fieldMapTileMap.tileWidth * newScaleX;
                        const playerWorldY = playerPos.y * this.fieldMapTileMap.tileHeight * newScaleY;
                        
                        this.playerSprite.setPosition(playerWorldX, playerWorldY);
                        
                        const playerScale = Math.min(newScaleX, newScaleY) * 1.5;
                        this.playerSprite.setScale(playerScale);
                    }
                }
                
                if (this.npcManager) {

                    this.npcManager.updateScale(mapScale * 0.0003);
                    // this.npcManager.updateScale(Math.min(newScaleX, newScaleY));
                }
                
                this.cameras.main.setBounds(0, 0, mapWidth * newScaleX, mapHeight * newScaleY);
                
                this.mapScaleX = newScaleX;
                this.mapScaleY = newScaleY;
                this.mapScale = Math.min(newScaleX, newScaleY);
                
                console.log(`Resized to X:${newScaleX}, Y:${newScaleY}`);
            }
        } catch (error) {
            console.error("Error handling resize:", error);
        }
    }

    // 更新后的玩家数据设置方法
    setPlayerData(newPlayerData) {
        console.log("Setting player data:", newPlayerData);
        this.playerData = newPlayerData;
        
        // 更新UI语言
        if (this.uiManager) {
            this.uiManager.updateProgress();
        }
        
        // 安全的音频控制
        if (this.audioLoaded && newPlayerData.music) {
            if (!this.bgmPlayed) {
                try {
                    console.log("Starting background music...");
                    this.sound.play("bgm", { loop: true, volume: 0.4 });
                    this.bgmPlayed = true;
                } catch (error) {
                    console.error("Error starting background music:", error);
                    this.showNotification("音频播放失败 / Audio playback failed");
                }
            }
        } else if (this.bgmPlayed) {
            try {
                console.log("Stopping background music...");
                this.sound.stopByKey("bgm");
                this.bgmPlayed = false;
            } catch (error) {
                console.error("Error stopping background music:", error);
                try {
                    this.sound.stopAll();
                    this.bgmPlayed = false;
                } catch (stopAllError) {
                    console.error("Error stopping all audio:", stopAllError);
                }
            }
        }
    }

    // 音频状态检查方法
    isAudioAvailable() {
        return this.audioLoaded && this.sound.get('bgm') !== null;
    }

    playBackgroundMusic() {
        if (!this.isAudioAvailable()) {
            console.warn("Audio not available");
            return false;
        }

        try {
            if (!this.bgmPlayed) {
                this.sound.play("bgm", { loop: true, volume: 0.4 });
                this.bgmPlayed = true;
                return true;
            }
        } catch (error) {
            console.error("Error playing background music:", error);
            return false;
        }
        return false;
    }

    stopBackgroundMusic() {
        try {
            if (this.bgmPlayed) {
                this.sound.stopByKey("bgm");
                this.bgmPlayed = false;
                return true;
            }
        } catch (error) {
            console.error("Error stopping background music:", error);
            try {
                this.sound.stopAll();
                this.bgmPlayed = false;
                return true;
            } catch (stopAllError) {
                console.error("Error stopping all audio:", stopAllError);
                return false;
            }
        }
        return false;
    }

    // 游戏进度相关方法
    onMealRecorded() {
        // 当记录一餐时调用
        if (this.uiManager) {
            this.uiManager.updateProgress();
        }
        
        // 检查是否解锁下一天
        const progress = this.npcManager.getDailyProgress();
        if (progress.isComplete) {
            this.showDayCompleteMessage();
        }
    }

    showDayCompleteMessage() {
        const language = this.playerData.language;
        const currentDay = this.npcManager.getCurrentDay();
        
        let message;
        if (currentDay >= 7) {
            message = language === 'zh' ? 
                '🎉 恭喜完成所有7天的旅程！' : 
                '🎉 Congratulations on completing all 7 days!';
        } else {
            message = language === 'zh' ? 
                `第${currentDay}天完成！明天可以与新的NPC对话` : 
                `Day ${currentDay} complete! You can talk to a new NPC tomorrow`;
        }
        
        this.showNotification(message, 4000);
    }

    onClueReceived(clue) {
        // 当获得线索时调用
        if (this.uiManager) {
            this.uiManager.addClue(clue);
        }
    }

    onGameCompleted() {
        // 当完成全部7天时调用
        const language = this.playerData.language;
        const message = language === 'zh' ? 
            '🎊 游戏完成！正在生成你的专属彩蛋...' : 
            '🎊 Game Complete! Generating your personalized ending...';
        
        this.showNotification(message, 3000);
        
        // 延迟触发最终彩蛋
        this.time.delayedCall(3000, () => {
            if (this.npcManager) {
                this.npcManager.triggerFinalEgg();
            }
        });
    }

    // 获取当前游戏状态
    getGameState() {
        if (!this.npcManager) return null;
        
        return {
            currentDay: this.npcManager.getCurrentDay(),
            progress: this.npcManager.getDailyProgress(),
            clues: this.uiManager ? this.uiManager.getAllClues() : [],
            isGameStarted: this.gameStarted
        };
    }

    update(time, delta) {
        try {
            // 检查NPC交互
            if (this.npcManager) {
                this.npcManager.checkInteractions();
            }
            
            // 处理玩家移动
            if (!this.dialogSystem || !this.dialogSystem.isDialogActive()) {
                if (this.cursors && this.agent) {
                    if (this.cursors.left.isDown) {
                        this.agent.moveAndCheckCollision("left", this.fieldMapTileMap);
                    } else if (this.cursors.right.isDown) {
                        this.agent.moveAndCheckCollision("right", this.fieldMapTileMap);
                    } else if (this.cursors.up.isDown) {
                        this.agent.moveAndCheckCollision("up", this.fieldMapTileMap);
                    } else if (this.cursors.down.isDown) {
                        this.agent.moveAndCheckCollision("down", this.fieldMapTileMap);
                    }
                }
            }
            
            // 更新玩家位置数据
            if (this.gridEngine && this.playerData) {
                try {
                    const playerPos = this.gridEngine.getPosition("player");
                    if (playerPos) {
                        this.playerData.playLoc = [playerPos.x, playerPos.y];
                        
                        if (this.playerSprite && this.fieldMapTileMap) {
                            const worldX = playerPos.x * this.fieldMapTileMap.tileWidth * this.mapScaleX;
                            const worldY = playerPos.y * this.fieldMapTileMap.tileHeight * this.mapScaleY;
                            this.playerSprite.setPosition(worldX, worldY);
                        }
                    }
                } catch (error) {
                    // 忽略GridEngine错误
                }
            }
        } catch (error) {
            console.error("Error in update loop:", error);
        }
    }
}