// MainScene.js - 修复音频加载问题
import Phaser from "phaser";
import mapJson from "../assets/tiled.json"
import tileset from "../assets/tiles.png"
import characters from "../assets/characters.png"
import npc from "../assets/npc.png"
import Agent from "./Agent";
import bgmMp3 from "../assets/bgm.mp3";
import DialogSystem from "./DialogSystem.js";
import NPCManager from "./NPCManager.js";
import UIManager from "./UIManager.js";

export default class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainScene" });
        this.bgmPlayed = false;
        this.audioLoaded = false; // 添加音频加载状态跟踪
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
            // 检查音频是否成功加载
            this.audioLoaded = this.sound.get('bgm') !== null;
            console.log('Audio loaded:', this.audioLoaded);
        });

        this.load.on('loaderror', (file) => {
            console.error('Failed to load file:', file.src, file.key);
        });

        // 预加载所有资源
        try {
            // 音频加载 - 添加错误处理
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

        // 添加音频加载失败的处理
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

            console.log("MainScene create() completed successfully");
        } catch (error) {
            console.error("Error in MainScene create():", error);
            // 创建错误提示
            this.add.text(100, 100, "Error loading game. Check console.", {
                fontSize: '20px',
                fill: '#ff0000'
            });
        }
    }

    setupMap() {
        console.log("Setting up map...");
        try {
            // 创建地图
            this.fieldMapTileMap = this.make.tilemap({ key: "field-map" });
            console.log("Tilemap created:", this.fieldMapTileMap);
            
            this.fieldMapTileMap.addTilesetImage("tiles", "tiles");
            console.log("Tileset added");
            
            // 创建地图层
            const mainLayer = this.fieldMapTileMap.createLayer('layer', 'tiles', 0, 0);
            console.log("Main layer created:", mainLayer);
            
            if (!mainLayer) {
                throw new Error("Failed to create main layer");
            }
            
            // 获取屏幕和地图尺寸
            const gameWidth = this.scale.width;
            const gameHeight = this.scale.height;
            const mapWidth = this.fieldMapTileMap.widthInPixels;
            const mapHeight = this.fieldMapTileMap.heightInPixels;
            
            console.log(`Screen: ${gameWidth}x${gameHeight}, Map: ${mapWidth}x${mapHeight}`);
            
            // 计算拉伸缩放 - 分别计算X和Y轴缩放，允许变形以填满屏幕
            const scaleX = gameWidth / mapWidth;
            const scaleY = gameHeight / mapHeight;
            
            // 使用分别的缩放，让地图完全填满屏幕（可能会有轻微变形）
            mainLayer.setScale(scaleX, scaleY);
            
            // 保存缩放信息
            this.mapScaleX = scaleX;
            this.mapScaleY = scaleY;
            this.mapScale = Math.min(scaleX, scaleY); // 用于其他元素的统一缩放
            
            console.log(`Map scaled to X:${scaleX}, Y:${scaleY}`);
            
            // 确保地图居中
            mainLayer.setPosition(0, 0);
            
        } catch (error) {
            console.error("Error setting up map:", error);
            // 创建备用地图
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
            // 计算玩家精灵的世界位置（考虑地图缩放）
            const playerWorldX = this.playerLoc.x * this.fieldMapTileMap.tileWidth * this.mapScaleX;
            const playerWorldY = this.playerLoc.y * this.fieldMapTileMap.tileHeight * this.mapScaleY;
            
            // 创建玩家精灵
            this.playerSprite = this.add.sprite(playerWorldX, playerWorldY, "player");
            console.log("Player sprite created at:", playerWorldX, playerWorldY);
            
            // 使用适中的缩放，让玩家在各种屏幕上都合适
            const playerScale = Math.min(this.mapScaleX, this.mapScaleY) * 1.5;
            this.playerSprite.setScale(playerScale);
            this.playerSprite.setDepth(10);
            
            // 设置输入
            this.cursors = this.input.keyboard.createCursorKeys();
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            
            // 检查 GridEngine 是否可用
            if (!this.gridEngine) {
                console.error("GridEngine not available!");
                return;
            }

            // 初始化GridEngine
            const gridEngineConfig = {
                characters: [{
                    id: "player",
                    sprite: this.playerSprite,
                    walkingAnimationMapping: 6,
                    startPosition: this.playerLoc,
                }],
            };

            // 只有在地图存在时才添加碰撞
            if (this.fieldMapTileMap) {
                gridEngineConfig.collision = {
                    blockedTiles: [4, 5, 6, 25, 26, 27, 28, 29, 30, 32, 33, 34, 42, 44, 60, 62]
                };
                this.gridEngine.create(this.fieldMapTileMap, gridEngineConfig);
            } else {
                console.warn("No tilemap available, GridEngine not initialized");
            }
            
            // 创建Agent用于移动
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
                // 设置相机边界 - 使用缩放后的地图尺寸
                const scaledMapWidth = this.fieldMapTileMap.widthInPixels * this.mapScaleX;
                const scaledMapHeight = this.fieldMapTileMap.heightInPixels * this.mapScaleY;
                
                this.cameras.main.setBounds(0, 0, scaledMapWidth, scaledMapHeight);
                
                // 设置相机跟随玩家
                if (this.playerSprite) {
                    this.cameras.main.startFollow(this.playerSprite, true);
                    // 调整跟随偏移，让玩家始终在屏幕中心
                    this.cameras.main.setFollowOffset(0, 0);
                }
            }
            
            this.cameras.main.setZoom(1);
            
            // 处理窗口大小变化
            this.scale.on('resize', this.handleResize, this);
            
            console.log("Camera setup completed");
        } catch (error) {
            console.error("Error setting up camera:", error);
        }
    }

    setupAudio() {
        console.log("Setting up audio...");
        try {
            // 检查音频是否加载成功并且玩家启用了音乐
            if (this.audioLoaded && this.playerData && this.playerData.music && !this.bgmPlayed) {
                console.log("Attempting to play background music...");
                try {
                    this.sound.play("bgm", { loop: true, volume: 0.4 });
                    this.bgmPlayed = true;
                    console.log("Background music started successfully");
                } catch (audioError) {
                    console.error("Error playing background music:", audioError);
                    this.audioLoaded = false; // 标记音频不可用
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

    handleResize(gameSize) {
        console.log("Handling resize:", gameSize);
        try {
            const width = gameSize.width;
            const height = gameSize.height;
            
            if (this.fieldMapTileMap) {
                const mapWidth = this.fieldMapTileMap.widthInPixels;
                const mapHeight = this.fieldMapTileMap.heightInPixels;
                
                // 重新计算拉伸缩放
                const newScaleX = width / mapWidth;
                const newScaleY = height / mapHeight;
                
                // 更新地图缩放
                const mainLayer = this.fieldMapTileMap.getLayer('layer');
                if (mainLayer && mainLayer.tilemapLayer) {
                    mainLayer.tilemapLayer.setScale(newScaleX, newScaleY);
                }
                
                // 更新玩家缩放和位置
                if (this.playerSprite && this.gridEngine) {
                    const playerPos = this.gridEngine.getPosition("player");
                    if (playerPos) {
                        // 重新计算玩家世界位置
                        const playerWorldX = playerPos.x * this.fieldMapTileMap.tileWidth * newScaleX;
                        const playerWorldY = playerPos.y * this.fieldMapTileMap.tileHeight * newScaleY;
                        
                        this.playerSprite.setPosition(playerWorldX, playerWorldY);
                        
                        // 调整玩家缩放
                        const playerScale = Math.min(newScaleX, newScaleY) * 1.5;
                        this.playerSprite.setScale(playerScale);
                    }
                }
                
                // 更新NPC缩放
                if (this.npcManager) {
                    this.npcManager.updateScale(Math.min(newScaleX, newScaleY));
                }
                
                // 更新相机边界
                this.cameras.main.setBounds(0, 0, mapWidth * newScaleX, mapHeight * newScaleY);
                
                // 保存新的缩放值
                this.mapScaleX = newScaleX;
                this.mapScaleY = newScaleY;
                this.mapScale = Math.min(newScaleX, newScaleY);
                
                console.log(`Resized to X:${newScaleX}, Y:${newScaleY}`);
            }
        } catch (error) {
            console.error("Error handling resize:", error);
        }
    }

    // 公共方法供其他系统调用
    showNotification(message) {
        if (this.uiManager) {
            this.uiManager.showNotification(message);
        }
    }

    // 修复音频控制方法
    setPlayerData(newPlayerData) {
        console.log("Setting player data:", newPlayerData);
        this.playerData = newPlayerData;
        
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
                // 尝试停止所有音频
                try {
                    this.sound.stopAll();
                    this.bgmPlayed = false;
                } catch (stopAllError) {
                    console.error("Error stopping all audio:", stopAllError);
                }
            }
        }
    }

    // 添加音频状态检查方法
    isAudioAvailable() {
        return this.audioLoaded && this.sound.get('bgm') !== null;
    }

    // 安全的音频播放方法
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

    // 安全的音频停止方法
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
                        
                        // 更新玩家精灵的世界坐标（考虑地图缩放）
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