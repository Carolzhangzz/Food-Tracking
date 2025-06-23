import Agent from "./Agent";
import Phaser from "phaser";

export default function create() {
  // 添加对话函数
  this.showDialog = (text) => {
    alert(text); // 后续可以替换成 Phaser UI
  };

  // 2️⃣ 加载地图和图块集
  this.fieldMapTileMap = this.make.tilemap({ key: "field-map" });
  this.fieldMapTileMap.addTilesetImage("GPTRPG", "tiles");

  // ✅ 第二步：读取尺寸和设置相机
  const mapWidth = this.fieldMapTileMap.width;
  const mapHeight = this.fieldMapTileMap.height;
  const center = this.fieldMapTileMap.tileToWorldXY(
    Math.floor(mapWidth / 2),
    Math.floor(mapHeight / 2)
  );
  this.cameras.main.setZoom(0.65);
  this.cameras.main.centerOn(center.x, center.y);
  // 设置摄像机边界，限制视角不能看到外部
  this.cameras.main.setBounds(
    0,
    0,
    this.fieldMapTileMap.widthInPixels,
    this.fieldMapTileMap.heightInPixels
  );

  // 3️⃣ 创建每一层的 tile 图层，并放大
  this.fieldMapTileMap.layers.forEach((_, i) => {
    const layer = this.fieldMapTileMap.createLayer(i, "GPTRPG", 0, 0);
    layer.scale = 3;
  });

  // 4️⃣ 创建植物图层，用于种植功能（目前你可能不需要）
  this.plantLayer = this.fieldMapTileMap.createBlankLayer(
    "plants",
    "GPTRPG",
    0,
    0
  );
  this.plantLayer.scale = 3;
  this.plantLayer = this.add.container(); // 用 container 可以容纳任意对象

  // 5️⃣ 加载玩家角色并添加键盘控制键
  const playerSprite = this.add.sprite(0, 0, "player");
  playerSprite.scale = 3;
  playerSprite.setDepth(6); // 保证在最上层显示
  this.cursors = this.input.keyboard.createCursorKeys(); // 方向键
  this.interactKey = this.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.SPACE
  ); // 空格键交互
  this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C); // 切换视角

  this.playerView = true; // 当前是否处于玩家跟随视角
  this.cKey.on("down", togglePlayerView, this); // 绑定切换函数

  // 6️⃣ 初始化 GridEngine，配置玩家初始位置
  const agentId = "player";
  const gridEngineConfig = {
    characters: [
      {
        id: agentId,
        sprite: playerSprite,
        walkingAnimationMapping: 6,
        startPosition: { x: 7, y: 6 },
      },
    ],
  };
  this.gridEngine.create(this.fieldMapTileMap, gridEngineConfig);

  // 7️⃣ 创建 Agent 类的实例（可选逻辑）
  this.agent = new Agent(this.gridEngine, this.fieldMapTileMap, agentId, {
    x: 6,
    y: 5,
  });

  // 8️⃣ 添加 NPC
  const npcSprite = this.add.sprite(0, 0, "npc"); // 假设你加载了 npc 图像资源
  npcSprite.scale = 2;
  npcSprite.setScale(0.15); // 缩小到原来的 50%
  // npcSprite.setDisplaySize(16, 32); // 或者你想要的任意大小
  npcSprite.setDepth(5);

  this.gridEngine.addCharacter({
    id: "npc1",
    sprite: npcSprite,
    walkingAnimationMapping: 6,
    startPosition: { x: 10, y: 6 },
  });

  // 9️⃣ 设置桥梁（可选逻辑）
  this.gridEngine.setTransition({ x: 10, y: 26 }, "ground", "bridge");
  this.gridEngine.setTransition({ x: 10, y: 39 }, "bridge", "ground");
  this.gridEngine.setTransition({ x: 11, y: 26 }, "ground", "bridge");
  this.gridEngine.setTransition({ x: 11, y: 39 }, "bridge", "ground");
  this.gridEngine.setTransition({ x: 9, y: 26 }, "ground", "bridge");
  this.gridEngine.setTransition({ x: 9, y: 39 }, "bridge", "ground");

  // 🔟 将 gridEngine 暴露给调试器或浏览器控制台
  window.__GRID_ENGINE__ = this.gridEngine;

  // 🔄 切换视角函数（玩家跟随视角 / 自由观察视角）
  function togglePlayerView() {
    this.playerView = !this.playerView;

    if (this.playerView) {
      this.cameras.main.startFollow(playerSprite, true);
      this.cameras.main.setFollowOffset(
        -playerSprite.width,
        -playerSprite.height
      );
    } else {
      this.cameras.main.zoom = 0.85;

      const controlConfig = {
        camera: this.cameras.main,
        left: this.cursors.left,
        right: this.cursors.right,
        up: this.cursors.up,
        down: this.cursors.down,
        zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
        zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        acceleration: 0.06,
        drag: 0.0005,
        maxSpeed: 1.0,
      };

      this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(
        controlConfig
      );
    }
  }
}
