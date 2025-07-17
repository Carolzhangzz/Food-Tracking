// TestScene.js - 放在 src/phaser/ 目录下
import Phaser from "phaser";

export default class TestScene extends Phaser.Scene {
    constructor() {
        super({ key: "TestScene" });
        console.log("TestScene constructor called");
    }

    init(data) {
        console.log("TestScene init called with:", data);
    }

    preload() {
        console.log("TestScene preload started");
        // 不加载任何外部资源，避免路径问题
    }

    create() {
        console.log("TestScene create started");
        console.log("Camera background before change:", this.cameras.main.backgroundColor);
        
        // 设置明显的背景色
        this.cameras.main.setBackgroundColor('#00ff00'); // 绿色
        
        console.log("Camera background after change:", this.cameras.main.backgroundColor);
        
        // 获取屏幕尺寸
        const { width, height } = this.scale;
        console.log(`Screen size: ${width} x ${height}`);
        
        // 添加文本测试
        const text = this.add.text(width / 2, height / 2, 'PHASER IS WORKING!', {
            fontSize: '48px',
            fill: '#000000',
            fontFamily: 'Arial',
            stroke: '#ffffff',
            strokeThickness: 4
        });
        text.setOrigin(0.5);
        console.log("Text added:", text);
        
        // 添加彩色矩形
        const rect1 = this.add.rectangle(100, 100, 100, 100, 0xff0000);
        const rect2 = this.add.rectangle(width - 100, 100, 100, 100, 0x0000ff);
        const rect3 = this.add.rectangle(100, height - 100, 100, 100, 0xffff00);
        const rect4 = this.add.rectangle(width - 100, height - 100, 100, 100, 0xff00ff);
        
        console.log("Rectangles added");
        
        // 添加交互测试
        this.input.on('pointerdown', (pointer) => {
            console.log('Screen clicked at:', pointer.x, pointer.y);
            
            // 在点击位置添加圆圈
            const circle = this.add.circle(pointer.x, pointer.y, 20, 0x00ffff);
            
            // 2秒后移除
            this.time.delayedCall(2000, () => {
                if (circle) circle.destroy();
            });
        });
        
        // 添加键盘测试
        this.input.keyboard.on('keydown', (event) => {
            console.log('Key pressed:', event.key);
        });
        
        console.log("TestScene create completed successfully");
    }
    
    update() {
        // 简单的更新循环，不做任何事情
    }
}