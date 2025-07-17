// SimpleTestScene.js - 用于测试的简化场景
import Phaser from "phaser";

export default class SimpleTestScene extends Phaser.Scene {
    constructor() {
        super({ key: "SimpleTestScene" });
        console.log("SimpleTestScene constructor called");
    }

    init(data) {
        console.log("SimpleTestScene init() called with data:", data);
        this.playerData = data.playerData;
    }

    preload() {
        console.log("SimpleTestScene preload() started");
        
        // 创建简单的彩色方块用于测试
        this.load.image('test-tile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        
        console.log("SimpleTestScene preload() completed");
    }

    create() {
        console.log("SimpleTestScene create() started");
        
        const { width, height } = this.scale;
        console.log(`Screen size: ${width}x${height}`);

        // 设置背景色
        this.cameras.main.setBackgroundColor('#228B22'); // 绿色背景

        // 创建测试文本
        const titleText = this.add.text(width / 2, 100, 'Game Loaded Successfully!', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        });
        titleText.setOrigin(0.5);

        // 显示玩家数据
        if (this.playerData) {
            const playerText = this.add.text(width / 2, 150, 
                `Welcome ${this.playerData.firstName || 'Player'}!`, {
                fontSize: '20px',
                fill: '#ffff00',
                fontFamily: 'Arial'
            });
            playerText.setOrigin(0.5);

            const langText = this.add.text(width / 2, 180, 
                `Language: ${this.playerData.language || 'en'}`, {
                fontSize: '16px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            });
            langText.setOrigin(0.5);
        }

        // 创建一个可移动的测试精灵
        this.testPlayer = this.add.rectangle(width / 2, height / 2, 32, 32, 0xff0000);
        this.testPlayer.setStrokeStyle(2, 0x000000);

        // 添加移动文本提示
        this.add.text(width / 2, height - 100, 
            'Use Arrow Keys to Move Red Square', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // 设置键盘控制
        this.cursors = this.input.keyboard.createCursorKeys();

        // 添加一些装饰
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const color = Math.random() * 0xffffff;
            this.add.circle(x, y, 10, color, 0.5);
        }

        // 添加点击测试
        this.input.on('pointerdown', (pointer) => {
            const clickText = this.add.text(pointer.x, pointer.y, 'Click!', {
                fontSize: '16px',
                fill: '#ff00ff'
            });
            clickText.setOrigin(0.5);
            
            // 2秒后移除文本
            this.time.delayedCall(2000, () => {
                if (clickText) clickText.destroy();
            });
        });

        console.log("SimpleTestScene create() completed");
    }

    update() {
        // 处理玩家移动
        if (this.cursors && this.testPlayer) {
            const speed = 5;
            
            if (this.cursors.left.isDown) {
                this.testPlayer.x -= speed;
            }
            if (this.cursors.right.isDown) {
                this.testPlayer.x += speed;
            }
            if (this.cursors.up.isDown) {
                this.testPlayer.y -= speed;
            }
            if (this.cursors.down.isDown) {
                this.testPlayer.y += speed;
            }
            
            // 边界检查
            this.testPlayer.x = Phaser.Math.Clamp(this.testPlayer.x, 16, this.scale.width - 16);
            this.testPlayer.y = Phaser.Math.Clamp(this.testPlayer.y, 16, this.scale.height - 16);
        }
    }
}