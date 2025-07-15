import Phaser from "phaser";

export default class DialogScene extends Phaser.Scene {
  constructor() {
    super("DialogScene");
  }

  preload() {
    // 只加载 BGM
    this.load.audio("bgm", "assets/bgm.mp3");
  }

  create() {
    const { width, height } = this.game.config;
    
    // 设置深色背景
    this.cameras.main.setBackgroundColor('#0f0f23');
    
    const dialogLines = [
      "Three days ago, he left the village without a word.",
      // "The fire in his kitchen was still warm—but he was gone.",
      // "You know as well as I do… he was never the kind to vanish without a reason.",
      // "You were once his apprentice. If anyone can find out what happened to him… it's you.",
      // "He always brought a notebook when he met someone. Maybe that's the key.",
      // "I believe those records hold the answer.",
    ];

    // 创建对话框背景
    const dialogBox = this.add.graphics();
    const boxHeight = 160;
    const boxY = height - boxHeight - 30;
    
    // 主对话框
    dialogBox.fillStyle(0x1a1a2e, 0.9);
    dialogBox.fillRoundedRect(30, boxY, width - 60, boxHeight, 8);
    
    // 对话框边框
    dialogBox.lineStyle(2, 0x4a5568);
    dialogBox.strokeRoundedRect(30, boxY, width - 60, boxHeight, 8);
    
    // 内部阴影效果
    dialogBox.lineStyle(1, 0x2d3748);
    dialogBox.strokeRoundedRect(32, boxY + 2, width - 64, boxHeight - 4, 6);

    // 说话人名字
    this.add.text(50, boxY + 15, "Uncle Bo", {
      fontSize: '16px',
      fontFamily: 'monospace',
      fill: '#ffd700',
      fontStyle: 'bold'
    });

    // 主要文本
    const textObject = this.add.text(50, boxY + 45, "", {
      fontSize: '18px',
      fontFamily: 'monospace',
      fill: '#e2e8f0',
      wordWrap: { width: width - 120 },
      lineSpacing: 6
    });

    // 继续提示符
    const continueHint = this.add.text(width - 70, boxY + boxHeight - 25, "▼", {
      fontSize: '14px',
      fontFamily: 'monospace',
      fill: '#ffd700'
    });

    // 继续提示符闪烁动画
    this.tweens.add({
      targets: continueHint,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    // 状态变量
    let currentLine = 0;
    let bgmPlayed = false;
    let isTyping = false;
    let typewriterTween;

    // 打字机效果
    const typeText = (text, callback) => {
      isTyping = true;
      textObject.setText('');
      continueHint.setVisible(false);
      
      let currentChar = 0;
      const totalChars = text.length;
      
      typewriterTween = this.tweens.add({
        targets: { value: 0 },
        value: totalChars,
        duration: totalChars * 35, // 打字速度
        ease: 'none',
        onUpdate: (tween) => {
          const progress = Math.floor(tween.getValue());
          if (progress > currentChar) {
            currentChar = progress;
            textObject.setText(text.substring(0, currentChar));
          }
        },
        onComplete: () => {
          isTyping = false;
          continueHint.setVisible(true);
          if (callback) callback();
        }
      });
    };

    // 跳过打字效果
    const skipTyping = () => {
      if (isTyping && typewriterTween) {
        typewriterTween.complete();
      }
    };

    const nextLine = () => {
      // 如果正在打字，跳过到完整显示
      if (isTyping) {
        skipTyping();
        return;
      }

      if (currentLine < dialogLines.length) {
        // 第一次播放BGM
        if (currentLine === 0 && !bgmPlayed) {
          this.sound.play("bgm", { loop: true, volume: 0.4 });
          bgmPlayed = true;
        }

        // 显示当前行
        typeText(dialogLines[currentLine]);
        currentLine++;
      } else {
        // 淡出过渡
        this.cameras.main.fadeOut(800, 15, 15, 35);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start("MainScene");
        });
      }
    };

    // 输入控制
    this.input.keyboard.on("keydown-SPACE", nextLine);
    this.input.on("pointerdown", nextLine);

    // 底部提示文字
    const hint = this.add.text(width / 2, height - 20, 
      "Press SPACE or Click to continue", {
        fontSize: '12px',
        fontFamily: 'monospace',
        fill: '#718096',
        align: 'center'
      });
    hint.setOrigin(0.5);

    // 提示文字淡入
    hint.setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: 0.8,
      duration: 2000,
      delay: 1000
    });

    // 场景淡入
    this.cameras.main.fadeIn(1000, 15, 15, 35);

    // 延迟开始第一行
    this.time.delayedCall(1200, () => {
      nextLine();
    });
  }
}