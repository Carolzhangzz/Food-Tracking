import Phaser from "phaser";
import mapJson from "../assets/tiled.json"
import tileset from "..//assets/tiles.png"
import characters from "../assets/characters.png"
import npc from "../assets/npc.png"
import create from "./create";

export default class MainScene extends Phaser.Scene {
    constructor() {
        console.log("MainScene constructor called");
        super({ key: "MainScene" });
        this.bgmPlayed = false;
    }

    init(data) {
        this.playerId = data.playerId;
        this.playerData = data.playerData;
        this.curText = "";
        this.nextButton = [];
        this.selectedButton = null;
        this.updatePlayerdata = data.updatePlayerdata;
        console.log("MainScene init with playerId:", this.playerId);
        this.dialogActive = false;
        this.npc = null; // NPC 对象

        // UI/input related instance variables
        this.inputBox = null;
        this.sendBtn = null;
        this.inputText = null;
        this.inputCursor = null;
        this.inputComponents = [];
        this.inputKeyHandler = null;
        this.enterKeyHandler = null;
        this.placeholderDisplay = null;
        this.currentInput = "";
        this.textObject = null;
        this.dialogBox = null;
        this.speakerName = null;
        this.continueHint = null;
        this.hint = null;
        this.typewriterTween = null;
        this.bgmPlayed = this.bgmPlayed || false;

        // Other state
        try {
            this.playerLoc = { x: data.playerData?.playLoc[0], y: data.playerData?.playLoc[1] };
        } catch (error) {
            this.playerLoc = { x: 0, y: 0 };
            console.error("Error initializing player location:", error);
        }

        this.nextLineavailable = true; // 控制下一行是否可用
    }

    preload() {
        this.load.audio("bgm", "assets/bgm.mp3");
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

        if (this.playerData.music) {
            this.sound.play("bgm", { loop: true, volume: 0.4 });
            this.bgmPlayed = true;
        } else if (this.bgmPlayed) {
            this.sound.stopByKey("bgm");
            this.bgmPlayed = false;
        }
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

    }

    typeText(text, callback) {
        this.isTyping = true;
        console.log("Typing text:", this.textObject);
        if (this.textObject == null)
            return;
        this.textObject.setText('');
        this.continueHint.setVisible(false);
        let currentChar = 0;
        const totalChars = text.length;
        this.curText = text; // 保存当前文本以便后续使用
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
            this.typewriterTween.stop();
            this.textObject.setText(this.curText);
            this.typewriterTween.complete();
        }
    }

    setPlayerData(newPlayerData) {
        this.playerData = newPlayerData;
        if (this.playerData.music) {
            if (!this.bgmPlayed) {
                this.sound.play("bgm", { loop: true, volume: 0.4 });
                this.bgmPlayed = true;
            }
        } else {
            this.sound.stopByKey("bgm");
            this.bgmPlayed = false;
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
        this.inputBox = null; // 清除输入框引用
        console.log("User input collected:", userInput);
        try {
            result = await (await fetch("https://twilight-king-cf43.1442334619.workers.dev/api/nextDialog", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    playerId: this.playerId, // 示例数据
                    npcId: this.npc,
                    userInput: userInput,
                    language: this.playerData.language // 传递语言设置
                })
            })).json();
        } catch (error) {
            console.error("Error fetching next dialog:", error);
            return;
        }
        if (this.nextLineavailable) {
            this.nextLineavailable = result.next
            this.nextButton = result.button
            console.log("Next line available:", this.nextLineavailable);
            this.typeText(result.response, () => {
                if (this.nextLineavailable) {
                    // 创建 input 框
                    if (this.nextButton.length === 0) {
                        // Create input box background
                        this.inputBox = document.createElement("input");
                        this.inputBox.type = "text";
                        if (this.playerData.language === 'zh') {
                            this.inputBox.placeholder = "请输入内容...";
                        } else {
                            this.inputBox.placeholder = "Type your response...";
                        }
                        this.inputBox.style.position = "absolute";
                        this.inputBox.style.left = (this.game.canvas.offsetLeft + 60) + "px";
                        this.inputBox.style.top = (this.game.canvas.offsetTop + this.game.config.height - 60) + "px";
                        this.inputBox.style.zIndex = 1000;
                        document.body.appendChild(this.inputBox);

                        // 创建发送按钮
                        this.sendBtn = document.createElement("button");
                        if (this.playerData.language === 'zh') {
                            this.sendBtn.innerText = "发送";
                        } else {
                            this.sendBtn.innerText = "Send";
                        }
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
                            this.destroyInputBox();
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
                    else {
                        // show a list of button inputs
                        // Create button container
                        const buttonContainer = this.add.container(0, 0);
                        const buttonY = this.game.config.height - 100;
                        const buttonSpacing = 150;
                        const startX = 50;


                        // restrict listen of keydown and pointerdown
                        this.input.keyboard.off("keydown-SPACE", this.nextLine, this);
                        this.input.off("pointerdown", this.nextLine, this);
                        this.buttons = []

                        this.nextButton.forEach((buttonText, index) => {
                            // Create button background
                            const buttonBg = this.add.graphics();
                            buttonBg.fillStyle(0x4a5568, 0.9);
                            buttonBg.fillRoundedRect(0, 0, 140, 35, 5);
                            buttonBg.lineStyle(2, 0x718096);
                            buttonBg.strokeRoundedRect(0, 0, 140, 35, 5);

                            // Create button text
                            const buttonTextObj = this.add.text(70, 17.5, buttonText, {
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                fill: '#e2e8f0',
                                align: 'center'
                            });
                            buttonTextObj.setOrigin(0.5);

                            // Create interactive button group
                            const button = this.add.container(startX + (index * buttonSpacing), buttonY, [buttonBg, buttonTextObj]);
                            button.setSize(140, 35);
                            button.setInteractive({ useHandCursor: true });

                            // Button hover effects
                            button.on('pointerover', () => {
                                buttonBg.clear();
                                buttonBg.fillStyle(0x718096, 0.9);
                                buttonBg.fillRoundedRect(0, 0, 140, 35, 5);
                                buttonBg.lineStyle(2, 0xffd700);
                                buttonBg.strokeRoundedRect(0, 0, 140, 35, 5);
                            });

                            button.on('pointerout', () => {
                                buttonBg.clear();
                                buttonBg.fillStyle(0x4a5568, 0.9);
                                buttonBg.fillRoundedRect(0, 0, 140, 35, 5);
                                buttonBg.lineStyle(2, 0x718096);
                                buttonBg.strokeRoundedRect(0, 0, 140, 35, 5);
                            });

                            button.on('pointerdown', () => {
                                // Store selected button text for API call
                                this.inputBox = { value: buttonText };
                                this.buttons.forEach(btn => btn.destroy());
                                this.buttons = [];
                                buttonContainer.destroy();
                                // Clean up input components
                                // this.nextLine();
                                this.input.keyboard.on("keydown-SPACE", this.nextLine, this);
                                this.input.on("pointerdown", this.nextLine, this);
                            });

                            // Add button to container
                            this.buttons.push(button)
                            this.buttons.push(buttonBg);
                            this.buttons.push(buttonTextObj);

                            buttonContainer.add(button);
                        });
                    }
                }
            });
            this.currentLine++;
        } else {
            this.nextLineavailable = true;
            this.dialogBox.destroy();
            this.speakerName.destroy();
            this.textObject.destroy();
            this.continueHint.destroy();
            this.hint.destroy();
            this.dialogActive = false;
            this.currentLine = 0;

            const playerPos = this.gridEngine.getPosition("player");
            this.playerData.playLoc = [playerPos.x, playerPos.y];
            console.log("Player location updated:", playerPos);

            this.updatePlayerdata({
                playLoc: [playerPos.x, playerPos.y]
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
