import Phaser from "phaser";
import mapJson from "../assets/tiled.json"
import tileset from "..//assets/tiles.png"
import characters from "../assets/characters.png"
import npc from "../assets/npc.png"
import create from "./create";

export default class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainScene" });
        this.dialogActive = false;
        this.npc = null; // NPC 对象
        this.nextLineavailable = true; // 控制下一行是否可用
    }

    preload() {

        this.load.image("tiles", tileset, {
            frameWidth: 16,
            frameHeight: 9,
        });

        this.load.tilemapTiledJSON("field-map", mapJson);
        this.load.spritesheet("player", characters, {
            frameWidth: 26,
            frameHeight: 36,
        });

        // // npc不是精灵图
        this.load.image("npc", npc, {
            frameWidth: 16,
            frameHeight: 9,
        });

        // this.load.spritesheet("plant", tileset, {
        //   frameWidth: 16,
        //   frameHeight: 9,
        // });
    }

    create() {
        create.call(this);
        // 对话内容
        this.dialogLines = [
            "Three days ago, he left the village without a word.",
        ];
        this.currentLine = 0;
        this.isTyping = false;
        this.typewriterTween = null;

        // 监听对话事件
        this.input.keyboard.on("keydown-SPACE", this.nextLine, this);
        this.input.on("pointerdown", this.nextLine, this);
    }

    showDialognew() {
        const { width, height } = this.game.config;
        const boxHeight = 160;
        const boxY = height - boxHeight;

        // 创建对话框背景
        this.dialogBox = this.add.graphics();
        this.dialogBox.fillStyle(0x1a1a2e, 0.9);
        this.dialogBox.fillRoundedRect(30, boxY, width, boxHeight, 8);
        this.dialogBox.lineStyle(2, 0x4a5568);
        this.dialogBox.strokeRoundedRect(30, boxY, width, boxHeight, 8);
        this.dialogBox.lineStyle(1, 0x2d3748);
        this.dialogBox.strokeRoundedRect(32, boxY + 2, width - 4, boxHeight - 4, 6);

        // 说话人名字
        this.speakerName = this.add.text(50, boxY + 15, "Uncle Bo", {
            fontSize: '16px',
            fontFamily: 'monospace',
            fill: '#ffd700',
            fontStyle: 'bold'
        });

        // 主要文本
        this.textObject = this.add.text(50, boxY + 45, "", {
            fontSize: '18px',
            fontFamily: 'monospace',
            fill: '#e2e8f0',
            wordWrap: { width: width - 120 },
            lineSpacing: 6
        });

        // 继续提示符
        this.continueHint = this.add.text(width - 70, boxY + boxHeight - 25, "▼", {
            fontSize: '14px',
            fontFamily: 'monospace',
            fill: '#ffd700'
        });
        this.tweens.add({
            targets: this.continueHint,
            alpha: { from: 1, to: 0.3 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // 底部提示文字
        this.hint = this.add.text(width / 2, height - 20,
            "Press SPACE or Click to continue", {
            fontSize: '12px',
            fontFamily: 'monospace',
            fill: '#718096',
            align: 'center'
        });
        this.hint.setOrigin(0.5);
        this.hint.setAlpha(0);
        this.tweens.add({
            targets: this.hint,
            alpha: 0.8,
            duration: 2000,
            delay: 1000
        });

        // 场景淡入
        this.cameras.main.fadeIn(1000, 15, 15, 35);

        // 延迟开始第一行
        this.time.delayedCall(1200, () => {
            this.nextLine();
        });

        if (this.nextLineavailable) {
            // 创建 input 框
            this.inputBox = document.createElement("input");
            this.inputBox.type = "text";
            this.inputBox.placeholder = "请输入内容...";
            this.inputBox.style.position = "absolute";
            this.inputBox.style.left = (this.game.canvas.offsetLeft + 60) + "px";
            this.inputBox.style.top = (this.game.canvas.offsetTop + this.game.config.height - 60) + "px";
            this.inputBox.style.zIndex = 1000;
            document.body.appendChild(this.inputBox);

            // 创建发送按钮
            this.sendBtn = document.createElement("button");
            this.sendBtn.innerText = "发送";
            this.sendBtn.style.position = "absolute";
            this.sendBtn.style.left = (this.game.canvas.offsetLeft + 260) + "px";
            this.sendBtn.style.top = (this.game.canvas.offsetTop + this.game.config.height - 60) + "px";
            this.sendBtn.style.zIndex = 1000;
            document.body.appendChild(this.sendBtn);

            // 监听发送
            this.sendBtn.onclick = async () => {
                this.input.keyboard.on("keydown-SPACE", this.nextLine, this);
                this.input.on("pointerdown", this.nextLine, this);
                this.inputBox.value = "";
                this.nextLine()
            };

            // 支持回车发送
            this.inputBox.onkeydown = (e) => {
                e.stopPropagation();
                if (e.key === "Enter") this.sendBtn.onclick();
            };

            // restrict listen of keydown and pointerdown
            this.input.keyboard.off("keydown-SPACE", this.nextLine, this);
            this.input.off("pointerdown", this.nextLine, this);


        }
    }

    typeText(text, callback) {
        this.isTyping = true;
        this.textObject.setText('');
        this.continueHint.setVisible(false);
        let currentChar = 0;
        const totalChars = text.length;
        this.typewriterTween = this.tweens.add({
            targets: { value: 0 },
            value: totalChars,
            duration: totalChars * 35,
            ease: 'none',
            onUpdate: (tween) => {
                const progress = Math.floor(tween.getValue());
                if (progress > currentChar) {
                    currentChar = progress;
                    this.textObject.setText(text.substring(0, currentChar));
                }
            },
            onComplete: () => {
                this.isTyping = false;
                this.continueHint.setVisible(true);
                if (callback) callback();
            }
        });
    }

    skipTyping() {
        if (this.isTyping && this.typewriterTween) {
            this.typewriterTween.complete();
        }
    }


    destroyInputBox() {
        if (this.inputBox) {
            document.body.removeChild(this.inputBox);
            this.inputBox = null;
        }
        if (this.sendBtn) {
            document.body.removeChild(this.sendBtn);
            this.sendBtn = null;
        }
    }

    async nextLine() {
        if (!this.dialogActive) return;
        if (this.isTyping) {
            this.skipTyping();
            return;
        }
        let result;
        // collect user input
        const userInput = this.inputBox ? this.inputBox.value.trim() : "";
        try {
            result = await (await fetch("http://127.0.0.1:8000/api/nextDialog", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    playerId: 123, // 示例数据
                    npcId: this.npc,
                    userInput: userInput // 传递用户输入
                })
            })).json();
        } catch (error) {
            console.error("Error fetching next dialog:", error);
            return;
        }
        if (this.nextLineavailable) {
            this.nextLineavailable = result.next
            this.typeText(result.response);
            this.currentLine++;
        } else {
            this.cameras.main.fadeOut(800, 15, 15, 35);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.nextLineavailable = true;
                this.dialogBox.destroy();
                this.speakerName.destroy();
                this.textObject.destroy();
                this.continueHint.destroy();
                this.hint.destroy();
                this.destroyInputBox();
                this.dialogActive = false;
                this.currentLine = 0;
                this.scene.start("MainScene");
            });
        }
    }

    update(time, delta) {
        // 这里只做玩家和NPC距离检测，触发对话

        if (this.playerView) {
            const playerPos = this.gridEngine.getPosition("player");
            const npcPos = this.gridEngine.getPosition("npc1");
            const isNextToNPC =
                Math.abs(playerPos.x - npcPos.x) + Math.abs(playerPos.y - npcPos.y) === 1;
            if (isNextToNPC && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                if (!this.dialogActive) {
                    this.npc = "npc1"; // 设置当前对话的 NPC ID
                    this.dialogActive = true;
                    this.showDialognew();
                }
            }
            // 玩家移动
            if (this.cursors.left.isDown) {
                this.agent.moveAndCheckCollision("left", this.fieldMapTileMap);
            } else if (this.cursors.right.isDown) {
                this.agent.moveAndCheckCollision("right", this.fieldMapTileMap);
            } else if (this.cursors.up.isDown) {
                this.agent.moveAndCheckCollision("up", this.fieldMapTileMap);
            } else if (this.cursors.down.isDown) {
                this.agent.moveAndCheckCollision("down", this.fieldMapTileMap);
            }
        } else {
            this.controls.update(delta);
        }
    }
}
