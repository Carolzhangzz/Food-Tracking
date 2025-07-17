// UIManager.js - UI管理器
import Phaser from 'phaser';

export default class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.clues = [];
        this.notifications = [];
        // 不在这里创建线索本按钮，因为Control.jsx已经有了
    }

    addClue(clue) {
        this.clues.push(clue);
        this.showNotification(
            this.scene.playerData.language === 'zh' ? 
                '新线索已添加！' : 
                'New clue added!'
        );
    }

    getAllClues() {
        return this.clues;
    }

    showNotification(message, duration = 3000) {
        const { width } = this.scene.scale;
        
        const notification = this.scene.add.text(width / 2, 80, message, {
            fontSize: '16px',
            fontFamily: 'monospace',
            fill: '#ffd700',
            backgroundColor: '#1a1a2e',
            padding: { x: 20, y: 10 }
        });
        notification.setOrigin(0.5);
        notification.setScrollFactor(0);
        notification.setDepth(150);

        // 添加到通知列表
        this.notifications.push(notification);

        // 如果有多个通知，调整位置
        this.updateNotificationPositions();

        // 淡出动画
        this.scene.tweens.add({
            targets: notification,
            alpha: { from: 1, to: 0 },
            duration: duration,
            onComplete: () => {
                // 从列表中移除
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
                notification.destroy();
                this.updateNotificationPositions();
            }
        });
    }

    updateNotificationPositions() {
        this.notifications.forEach((notification, index) => {
            notification.y = 80 + (index * 50);
        });
    }

    showClueJournal() {
        const { width, height } = this.scene.scale;
        
        // 检查是否已经有线索本打开
        if (this.scene.children.list.some(child => child.depth === 200)) {
            return;
        }
        
        // 创建背景
        const journalBg = this.scene.add.graphics();
        journalBg.fillStyle(0x1a1a2e, 0.95);
        journalBg.fillRoundedRect(50, 50, width - 100, height - 100, 8);
        journalBg.lineStyle(2, 0x4a5568);
        journalBg.strokeRoundedRect(50, 50, width - 100, height - 100, 8);
        journalBg.setScrollFactor(0);
        journalBg.setDepth(200);

        // 标题
        const title = this.scene.add.text(width / 2, 80, 
            this.scene.playerData.language === 'zh' ? '线索记录本' : 'Clue Journal', {
            fontSize: '24px',
            fontFamily: 'monospace',
            fill: '#ffd700',
            fontStyle: 'bold',
            align: 'center'
        });
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(200);

        // 线索内容
        let yOffset = 120;
        this.clues.forEach((clue, index) => {
            const clueText = this.scene.add.text(70, yOffset, 
                `${clue.npcName}: ${clue.clue}`, {
                fontSize: '16px',
                fontFamily: 'monospace',
                fill: '#e2e8f0',
                wordWrap: { width: width - 160 },
                lineSpacing: 4
            });
            clueText.setScrollFactor(0);
            clueText.setDepth(200);
            yOffset += clueText.height + 20;
        });

        if (this.clues.length === 0) {
            const noCluesText = this.scene.add.text(width / 2, height / 2, 
                this.scene.playerData.language === 'zh' ? '暂无线索' : 'No clues yet', {
                fontSize: '18px',
                fontFamily: 'monospace',
                fill: '#718096',
                align: 'center'
            });
            noCluesText.setOrigin(0.5);
            noCluesText.setScrollFactor(0);
            noCluesText.setDepth(200);
        }

        // 关闭按钮
        const closeButton = this.scene.add.text(width - 80, 70, 'X', {
            fontSize: '20px',
            fontFamily: 'monospace',
            fill: '#ff6b6b',
            fontStyle: 'bold'
        });
        closeButton.setScrollFactor(0);
        closeButton.setDepth(200);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => {
            this.closeClueJournal();
        });
    }

    closeClueJournal() {
        // 销毁所有journal相关元素
        this.scene.children.list.forEach(child => {
            if (child.depth === 200) {
                child.destroy();
            }
        });
    }

    // 创建游戏内UI按钮（移动端友好）
    createMobileUI() {
        const { width, height } = this.scene.scale;
        
        // 创建移动端控制按钮
        if (this.isMobile()) {
            this.createMobileControls();
        }
    }

    createMobileControls() {
        const { width, height } = this.scene.scale;
        
        // 方向键控制
        const buttonSize = 60;
        const buttonGap = 10;
        const rightMargin = 30;
        const bottomMargin = 30;

        // 创建虚拟方向键
        const directions = [
            { key: 'up', x: rightMargin + buttonSize, y: height - bottomMargin - buttonSize * 2 - buttonGap },
            { key: 'down', x: rightMargin + buttonSize, y: height - bottomMargin },
            { key: 'left', x: rightMargin, y: height - bottomMargin - buttonSize },
            { key: 'right', x: rightMargin + buttonSize * 2 + buttonGap, y: height - bottomMargin - buttonSize }
        ];

        directions.forEach(dir => {
            const button = this.scene.add.graphics();
            button.fillStyle(0x4a5568, 0.7);
            button.fillCircle(buttonSize/2, buttonSize/2, buttonSize/2);
            button.lineStyle(2, 0x718096);
            button.strokeCircle(buttonSize/2, buttonSize/2, buttonSize/2);
            button.setPosition(dir.x, dir.y);
            button.setScrollFactor(0);
            button.setDepth(100);
            button.setInteractive(new Phaser.Geom.Circle(buttonSize/2, buttonSize/2, buttonSize/2), 
                Phaser.Geom.Circle.Contains);

            // 添加方向箭头
            const arrow = this.scene.add.text(dir.x + buttonSize/2, dir.y + buttonSize/2, 
                this.getArrowSymbol(dir.key), {
                fontSize: '20px',
                fill: '#e2e8f0'
            });
            arrow.setOrigin(0.5);
            arrow.setScrollFactor(0);
            arrow.setDepth(101);

            // 按钮事件
            button.on('pointerdown', () => {
                this.handleMobileMovement(dir.key);
                button.fillStyle(0x718096, 0.9);
                button.fillCircle(buttonSize/2, buttonSize/2, buttonSize/2);
            });

            button.on('pointerup', () => {
                button.fillStyle(0x4a5568, 0.7);
                button.fillCircle(buttonSize/2, buttonSize/2, buttonSize/2);
            });
        });
    }

    getArrowSymbol(direction) {
        const symbols = {
            'up': '↑',
            'down': '↓', 
            'left': '←',
            'right': '→'
        };
        return symbols[direction] || '•';
    }

    handleMobileMovement(direction) {
        if (this.scene.agent && !this.scene.dialogSystem.isDialogActive()) {
            this.scene.agent.moveAndCheckCollision(direction, this.scene.fieldMapTileMap);
        }
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // 清理资源
    destroy() {
        this.notifications.forEach(notification => {
            if (notification && notification.destroy) {
                notification.destroy();
            }
        });
        this.notifications = [];
        this.clues = [];
    }
}