// DialogScene.js - 修正餐食选择和线索逻辑
import Phaser from "phaser";
import npc1bg from "../assets/npc/npc1bg.png";
import npc2bg from "../assets/npc/npc2bg.png";
import npc3bg from "../assets/npc/npc3bg.png";
import npc4bg from "../assets/npc/npc4bg.png";
import npc5bg from "../assets/npc/npc5bg.png";
import npc6bg from "../assets/npc/npc6bg.png";
import npc7bg from "../assets/npc/npc7bg.png";
// 在其他 import 语句后添加
import DialogSystem from './DialogSystem.js'; // 假设 DialogSystem 在同一目录下
import {
    createDialogBox,
    createReturnButton,
    showChoiceButtons,
} from "./DialogUI.js";

const API_URL = process.env.REACT_APP_API_URL;

export default class DialogScene extends Phaser.Scene {
    constructor() {
        super({key: "DialogScene"});
        this.currentNPC = null;
        this.npcManager = null;
        this.isTyping = false;
        this.currentDialogState = "waiting_for_api";
        this.mealType = null;
        this.mealRecorded = false;
        this.dialogHistory = [];
        this.currentText = "";
        this.isMobile = false;
        this.vagueCount = 1;
        this.conversationHistory = [];

        // 对话状态管理
        this.dialogPhase = "initial";
        this._suppressReturnOnce = false;
        this.canSkipToMeal = false;
        this.dialogTurnCount = 0;
        this.maxDialogTurns = 5;
        this.fixedQuestionPhase = "meal_type";
        this.mealAnswers = {};
        this.currentQuestionIndex = 0;
        this.availableMealTypes = []; // 新增：当前可选择的餐食类型

        // 新增：资源清理追踪
        this.timers = [];
        this.eventListeners = [];

        // 添加调试标志
        this.debugMode = true;
        this.dynamicButtons = [];
        this._mealAlreadyRecorded = false;
        this.scrollOffset = 0;
        this._endingGemini = false;
    }

    init(data) {
        this.currentNPC = data.npcId;
        this.npcManager = data.npcManager;
        this.playerData = data.playerData;
        this.mainScene = data.mainScene;
        this.convaiSessionId = "-1";

        // 获取当前NPC可选择的餐食类型
        const availableNPC = this.npcManager.availableNPCs.find(
            (n) => n.npcId === this.currentNPC
        );
        this.availableMealTypes = availableNPC
            ? availableNPC.availableMealTypes || []
            : [];
        console.log(`=== DialogScene初始化 - availableMealTypes ===`);
        console.log(`当前NPC: ${this.currentNPC}`);
        console.log(`获取到的availableMealTypes:`, this.availableMealTypes);

        // 检测是否为移动端
        this.isMobile = this.scale.width < 768;

        if (this.debugMode) {
            console.log("=== DialogScene初始化 ===");
            console.log("当前NPC:", this.currentNPC);
            console.log("玩家数据:", this.playerData);
            console.log("可选餐食类型:", this.availableMealTypes);
        }
    }

    preload() {

        this.load.image('npc1bg', npc1bg);
        this.load.image('npc2bg', npc2bg);
        this.load.image('npc3bg', npc3bg);
        this.load.image('npc4bg', npc4bg);
        this.load.image('npc5bg', npc5bg);
        this.load.image('npc6bg', npc6bg);
        this.load.image('npc7bg', npc7bg);

        const npc = this.npcManager.getNPCById(this.currentNPC);
        const imageMap = {
            npc1bg, npc2bg, npc3bg, npc4bg, npc5bg, npc6bg, npc7bg
        };
        if (npc?.backgroundKey && imageMap[npc.backgroundKey]) {
            this.load.image(npc.backgroundKey, imageMap[npc.backgroundKey]);
            console.log(`Attempting to load background: ${npc.backgroundKey}`);
        }

        this.load.on("complete", () => {
            console.log("Preload complete, proceeding with dialog");
        });
    }

    create() {
        this.setupBackground();
        // ---- DialogSystem 单轨 UI ----
        this.dialogSystem = new DialogSystem(this);
        this.dialogSystem.setNPCManager(this.npcManager);

        // 建议：接收事件参数，避免以后内部改动拿不到结果
        this.dialogSystem.on("dialogEnded", (dialogResult) => this.handleDialogEnded(dialogResult));

        // 注入 requestHandler：首轮优先吐 geminiStarterMessage（仅 meal_recording 阶段生效）
        this.dialogSystem.setRequestHandler(async (npcId, userText) => {
            const phase = this.dialogPhase;
            if (userText && userText.trim()) {
                this.dialogHistory.push({type: "user", content: userText.trim()});
                this.addToConversationHistory("player", userText.trim());
            }
            // 如果刚刚切到 meal_recording，并且我们为首句准备了 starter，就先发它
            if (phase === "meal_recording" && this.geminiStarterMessage) {
                const first = this.geminiStarterMessage;
                this.geminiStarterMessage = null; // 只用一次
                return {next: true, response: first, requireInput: true, buttons: []};
            }

            // 正常走 API
            const msg = userText && userText.trim() ? userText.trim() : "hello";
            const apiResp = (phase === "meal_recording")
                ? await this.callGeminiAPI(msg)
                : await this.callConvaiAPI(msg);

            if (!apiResp?.success) {
                return {
                    next: false,
                    response: apiResp?.message || (
                        this.playerData.language === "zh"
                            ? "抱歉，暂时无法继续对话。"
                            : "Sorry, I can't continue the conversation right now."
                    ),
                };
            }
            this.dialogHistory.push({type: "assistant", content: apiResp.message});
            this.addToConversationHistory("npc", apiResp.message);
            if (this.dialogPhase === "continuing") {
                this.dialogTurnCount = (this.dialogTurnCount || 0) + 1;
                const shouldSkip = this.checkForTriggerPhrase(apiResp.message) || this.dialogTurnCount >= 3;
                if (shouldSkip) {
                    this._suppressReturnOnce = true;
                    if (this.dialogSystem?.isDialogActive()) {
                        this.dialogSystem.endDialog();
                    }
                    this.proceedToMealSelection();
                    return {next: false, response: apiResp.message};
                }
            }
            return {next: true, response: apiResp.message, requireInput: true, buttons: []};
        });

        // 启动闲聊阶段（也可按你的逻辑，等玩家触发再开）
        this.dialogSystem.startDialog(this.currentNPC, {
            isMealDialog: false,
            mealType: null,
        });
        this.dialogPhase = "continuing";
        this.dialogTurnCount = 0;
        this.canSkipToMeal = false;
        // （可选）显示历史
        this.loadAndShowHistory();
        this.setupUI();
        this.setupControls();
    }

    async loadAndShowHistory() {
        // 从 NPCManager 中获取已保存的记录
        const history = this.npcManager.mealRecords.filter(
            record => record.npcId === this.currentNPC
        );
        if (history.length > 0) {
            console.log("该NPC的历史记录:", history);
            // 这里可以添加显示逻辑（如在UI中列出）
        }
    }

    sayOnceViaDS(text, {isMealDialog = false, mealType = null} = {}) {
        // 临时请求处理器：只回一条然后结束
        this.dialogSystem.setRequestHandler(async () => ({
            next: false,
            response: text
        }));
        this.dialogSystem.startDialog(this.currentNPC, {isMealDialog, mealType});
    }

    async handleDialogEnded(dialogResultFromDS) {
        // 优先使用事件带来的结果（更稳定），回退到 getDialogResult()
        const dialogResult = dialogResultFromDS || this.dialogSystem.getDialogResult();
        console.log("对话结束，准备处理结果:", dialogResult);


        // 如果是“切到餐食选择”而触发的结束，跳过返回
        if (this._suppressReturnOnce) {
            this._suppressReturnOnce = false;
            return;
        }

        if (!dialogResult.isMealDialog || !dialogResult.currentMealType) {
            this.returnToMainScene();
            return;
        }
        if (!this.mealRecorded || this.dialogPhase !== "completed") {
            // 可选：给个温和提示（不写入记录）
            this.sayOnceViaDS(
                this.playerData.language === "zh"
                    ? "这次餐食记录未完成，下次我们再试一次吧。"
                    : "This meal log wasn’t completed. Let’s try again next time.",
                {isMealDialog: false, mealType: null}
            );
            this.time.delayedCall(800, () => this.returnToMainScene());
            return;
        }
        if (this._mealAlreadyRecorded) {
            this.returnToMainScene();
            return;
        }
        // 如果是餐食对话，调用recordMeal
        try {
            const mealContent = this.extractMealContentFromHistory();
            const result = await this.npcManager.recordMeal(
                dialogResult.currentNPC,
                dialogResult.currentMealType,
                dialogResult.mealResponses,
                this.dialogHistory,
                mealContent
            );
            this._mealAlreadyRecorded = true;

            // 把后续的线索/收尾统一放到这里（见第3点）
            await this.handleMealCompletion(result);
        } catch (e) {
            console.error("提交记录失败:", e);
            this.returnToMainScene();
        }
    }

    // checkAndUpdateCurrentDay() {
    //     const hasDinner = this.mealResults && this.mealResults.some(r => r.mealType === 'dinner');
    //     if (hasDinner) {
    //         this.currentDay += 1;
    //     }
    // }


// DialogScene.js
    setupBackground() {
        const {width, height} = this.scale;
        const npc = this.npcManager.getNPCById(this.currentNPC);
        const key = npc?.backgroundKey;

        // 先画一个灰色底，以防背景图未加载或缺失
        this.add.rectangle(width / 2, height / 2, width, height, 0x2a2a2a);

        if (key) {
            if (this.textures.exists(key)) {
                // 纹理存在时加载背景
                this.add
                    .image(width / 2, height / 2, key)
                    .setDisplaySize(width, height)
                    .setOrigin(0.5);
                console.log(`Background set for NPC ${this.currentNPC}: ${key}`);
            } else {
                // key 不在 textures 里时用深色底替代
                console.warn(`Background texture not found: ${key}`);
                this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
            }
        } else {
            // 没有配置 backgroundKey 时也用深色底
            console.warn("No backgroundKey found for NPC:", npc);
            this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        }
    }


    setupUI() {
        const {width, height} = this.scale;

        createDialogBox(this);
        if (this.dialogText) this.dialogText.setDepth(10);
        createReturnButton(this);
        this.updateStatus("");

        // 状态指示器
        const statusY = this.isMobile ? height - 30 : height - 40;
        this.statusText = this.add.text(width / 2, statusY, "", {
            fontSize: this.isMobile ? "12px" : "14px",
            fontFamily: "monospace",
            fill: "#94a3b8",
            align: "center",
        });
        this.statusText.setOrigin(0.5);
    }

    setupControls() {

        // 鼠标滚轮支持
        const wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
            if (this.conversationHistory.length > 0) {
                this.scrollOffset += deltaY > 0 ? 1 : -1;
                this.scrollOffset = Phaser.Math.Clamp(
                    this.scrollOffset,
                    0,
                    Math.max(0, this.conversationHistory.length - 4)
                );
                this.updateConversationDisplay();
            }
        };

        this.input.on("wheel", wheelHandler);
        this.eventListeners.push({event: "wheel", handler: wheelHandler});

        // 触摸滑动支持（移动端）
        if (this.isMobile) {
            let startY = 0;
            let isDragging = false;

            const pointerDownHandler = (pointer) => {
                startY = pointer.y;
                isDragging = true;
            };

            const pointerMoveHandler = (pointer) => {
                if (isDragging && this.conversationHistory.length > 0) {
                    const deltaY = pointer.y - startY;
                    if (Math.abs(deltaY) > 20) {
                        this.scrollOffset += deltaY > 0 ? -1 : 1;
                        this.scrollOffset = Phaser.Math.Clamp(
                            this.scrollOffset,
                            0,
                            Math.max(0, this.conversationHistory.length - 4)
                        );
                        this.updateConversationDisplay();
                        startY = pointer.y;
                    }
                }
            };

            const pointerUpHandler = () => {
                isDragging = false;
            };

            this.input.on("pointerdown", pointerDownHandler);
            this.input.on("pointermove", pointerMoveHandler);
            this.input.on("pointerup", pointerUpHandler);

            this.eventListeners.push(
                {event: "pointerdown", handler: pointerDownHandler},
                {event: "pointermove", handler: pointerMoveHandler},
                {event: "pointerup", handler: pointerUpHandler}
            );
        }
    }

    // 改进的Continue处理逻辑
    handleContinue() {
        // if (this.isTyping) return;
        //
        // switch (this.dialogPhase) {
        //     case "initial":
        //         // 初始状态，不做任何处理
        //         break;
        //     case "continuing":
        //         // 继续对话状态，检查是否需要显示跳过选项
        //         this.checkForSkipOption();
        //         break;
        //     case "meal_selection":
        //         // 已经在食物选择阶段，不需要继续
        //         break;
        //     case "completed":
        //         // 对话已完成
        //         break;
        // }
    }

    // 检查是否显示跳过到食物选择的选项
    checkForSkipOption() {
        if (this.dialogTurnCount >= 3 || this.canSkipToMeal) {
            this.showSkipToMealOption();
        }
    }

    // 显示跳过到食物选择的选项
    showSkipToMealOption() {
        showChoiceButtons(this, {
            continue: {
                text:
                    this.playerData.language === "zh" ? "继续对话" : "Continue talking",
                onClick: () => {
                    this.waitForUserInput();
                },
            },
            skipToMeal: {
                text:
                    this.playerData.language === "zh"
                        ? "开始记录食物"
                        : "Start recording meal",
                onClick: () => {
                    this.proceedToMealSelection();
                },
            },
        });
    }

    // 进入食物选择阶段
    proceedToMealSelection() {
        if (this.dialogSystem?.isDialogActive()) {
            // 标记这次 endDialog 是为了切到餐食选择，不要触发返回主场景
            this._suppressReturnOnce = true;
            this.dialogSystem.endDialog();
        }
        if (this.debugMode) {
            console.log("=== 进入食物选择阶段 ===");
            console.log("清理输入框和按钮");
        }

        // 清理输入框
        this.clearTextInput?.();
        this.clearAllButtons();
        this.dialogPhase = "meal_selection";

        // 延迟显示餐食选择，确保界面清理完成
        setTimeout(() => {
            this.showMealSelectionButtons();
        }, 200);
    }

    // 修改：显示餐食选择按钮 - 只显示可选择的餐食类型
    showMealSelectionButtons() {
        console.log("当前可选择的餐食:", this.availableMealTypes);

        if (this.debugMode) {
            console.log("=== 显示餐食选择按钮 ===");
            console.log("可选餐食类型:", this.availableMealTypes);
        }

        // 检查是否有可选择的餐食类型
        if (!this.availableMealTypes || this.availableMealTypes.length === 0) {
            this.dialogPhase = "completed";
            this.sayOnceViaDS(
                this.playerData.language === "zh"
                    ? "今天的餐食已经全部记录完了，明天再来吧！"
                    : "All meals for today have been recorded, come back tomorrow!",
                {isMealDialog: false, mealType: null}
            );
            this.time.delayedCall(900, () => this.returnToMainScene());
            return;
        }

        const {width, height} = this.scale;

        this.mealButtons = [];

        const startY = this.isMobile ? height * 0.3 : height * 0.35;
        const buttonSpacing = this.isMobile ? 60 : 80;
        const fontSize = this.isMobile ? "16px" : "20px";
        const padding = this.isMobile ? {x: 20, y: 12} : {x: 30, y: 15};

        // 显示提示文本
        const questionText = this.add.text(
            width / 2,
            startY - 80,
            this.playerData.language === "zh"
                ? "选择要记录的餐食类型:"
                : "Which meal do you want to record?",
            {
                fontSize: this.isMobile ? "16px" : "18px",
                fontFamily: "monospace",
                fill: "#e2e8f0",
                align: "center",
            }
        );
        questionText.setOrigin(0.5);
        questionText.setDepth(20);

        // 餐食类型的中英文映射
        const mealTypeNames = {
            breakfast: this.playerData.language === "zh" ? "早餐" : "Breakfast",
            lunch: this.playerData.language === "zh" ? "午餐" : "Lunch",
            dinner: this.playerData.language === "zh" ? "晚餐" : "Dinner",
        };

        // 只显示可选择的餐食类型
        this.availableMealTypes.forEach((mealType, index) => {
            const buttonY = startY + index * buttonSpacing;
            const displayName = mealTypeNames[mealType] || mealType;

            const button = this.add.text(width / 2, buttonY, displayName, {
                fontSize: fontSize,
                fontFamily: "monospace",
                fill: "#e2e8f0",
                backgroundColor: "#4a5568",
                padding: padding,
            });

            this.dynamicButtons.push(button);

            button.setOrigin(0.5);
            button.setInteractive({useHandCursor: true});
            button.setDepth(20);

            button.on("pointerdown", () => {
                if (this.debugMode) {
                    console.log("选择餐食:", mealType);
                }
                this.selectMeal(mealType, displayName);
            });

            button.on("pointerover", () => {
                button.setTint(0x667eea);
            });

            button.on("pointerout", () => {
                button.clearTint();
            });

            this.mealButtons.push(button);
        });

        // 保存问题文本以便清理
        this.questionText = questionText;

        if (this.debugMode) {
            console.log("餐食选择按钮创建完成，按钮数量:", this.mealButtons.length);
        }
    }

    // 改进的开始对话逻辑
    async startConversation() {
        console.log("Starting conversation with ConvAI");
        this.updateStatus("正在开始对话...");

        try {
            const response = await this.callConvaiAPI("hello");

            if (response.success) {
                this.convaiSessionId = response.sessionId;

                this.showSingleMessage("npc", response.message, () => {
                    this.dialogPhase = "initial";
                    this.updateStatus("");
                    this.showInitialChoices();
                });
            } else {
                throw new Error("ConvAI API failed");
            }
        } catch (error) {
            console.error("Error starting conversation:", error);
            const fallbackGreeting = this.getFallbackGreeting();
            this.showSingleMessage("npc", fallbackGreeting, () => {
                this.dialogPhase = "initial";
                this.updateStatus("");
                this.showInitialChoices();
            });
        }
    }

    // 显示初始选择按钮
    showInitialChoices() {
        showChoiceButtons(this, {
            continue: {
                text: this.playerData.language === "zh" ? "闲聊" : "Chatting",
                onClick: () => {
                    // hideChoiceButtons();
                    this.startContinuousDialog();
                },
            },
        });
    }

    // 开始连续对话模式
    startContinuousDialog() {
        if (this.debugMode) {
            console.log("=== 开始连续对话模式 ===");
        }

        this.dialogPhase = "continuing";
        this.dialogTurnCount = 0; // 重置对话轮数
        this.canSkipToMeal = false; // 重置跳过标志
        this.waitForUserInput();
    }

    // 改进的等待用户输入逻辑
    waitForUserInput() {
    }

    async handleUserInput(input) {
        return;
    }

    async forceEndGeminiDialog() {
        this.mealRecorded = true;
        this.currentDialogState = "completion_check";
        this.dialogPhase = "completed";

        // 不要在这里再 recordMeal —— 让 handleDialogEnded 统一提交
        // 这里只负责让 DS 正常收尾一句提示，然后 DS 会触发 handleDialogEnded
        this.sayOnceViaDS(
            this.playerData.language === "zh"
                ? "谢谢你详细的分享！我已经记录下了你的餐食信息。"
                : "Thank you for sharing your meal with me! I have recorded your meal information.",
            // 这里要传 isMealDialog: true，确保 handleDialogEnded 才会走记录逻辑
            {isMealDialog: true, mealType: this.selectedMealType}
        );
    }

// 增强结束检测
    async processResponse(response) {
        if (this.dialogPhase === "continuing") {
            if (this.checkForTriggerPhrase(response.message)) {
                this.proceedToMealSelection();
            } else if (this.dialogTurnCount >= 4) {
                this.proceedToMealSelection();
            } else if (this.dialogTurnCount >= 2) {
                this.showContinueOrSkipChoice();
            }
        } else if (this.dialogPhase === "meal_recording") {
            if (this.detectThankYouMessage(response.message)) {
                this.mealRecorded = true;
                this.currentDialogState = "completion_check";
                this.dialogPhase = "completed";
                this.sayOnceViaDS(
                    this.playerData.language === "zh"
                        ? "谢谢你详细的分享！我已经记录下了你的餐食信息。"
                        : "Thank you for sharing your meal with me! I have recorded your meal information.",
                    {isMealDialog: true, mealType: this.selectedMealType}
                );
            } else if (this.geminiTurnCount >= this.maxGeminiTurns) {
                this.forceEndGeminiDialog();
            }
        }
    }

// 新增：处理响应错误
    async handleResponseError(response) {
        const errorMessage = response?.error || "API调用失败";
        console.error("Response error:", errorMessage);

        if (this.dialogPhase === "continuing") {
            const fallbackMessage =
                this.playerData.language === "zh"
                    ? "让我们开始记录你的食物吧。"
                    : "Let's start recording your meal.";

            this.sayOnceViaDS(fallbackMessage, {isMealDialog: false, mealType: null});
            this.proceedToMealSelection();
            return;
        } else {
            await this.handleError(new Error(errorMessage));
        }
    }

// 新增：通用错误处理
    async handleError(error) {
        console.error("Dialog error:", error);

        const errorMessage =
            this.playerData.language === "zh"
                ? "抱歉，出现了一些问题。让我们继续其他话题吧。"
                : "Sorry, something went wrong. Let's continue with other topics.";

        this.sayOnceViaDS(errorMessage, {isMealDialog: false, mealType: null});
        if (this.dialogPhase === "continuing") {
            this.proceedToMealSelection();
        } else {
            this.dialogPhase = "completed";
        }
        return;
    }

// 显示继续对话或跳过的选择
    showContinueOrSkipChoice() {
        //使用creatd button的方法来创建这两个按钮
        if (this.dialogSystem?.isDialogActive()) return; // 避免叠 UI
        if (this.debugMode) {
            console.log("显示继续对话或跳过按钮");
        }
        showChoiceButtons(this, {
            continue: {
                text: this.playerData.language === "zh" ? "继续聊天" : "Keep chatting",
                onClick: () => {
                    if (this.debugMode) {
                        console.log("用户选择继续聊天");
                    }
                    // hideChoiceButtons();
                    this.updateStatus("");
                    // 继续聊天，等待下一轮输入
                    this.waitForUserInput();
                },
            },
            record: {
                text: this.playerData.language === "zh" ? "记录食物" : "Record meal",
                onClick: () => {
                    if (this.debugMode) {
                        console.log("用户选择记录食物");
                    }
                    // hideChoiceButtons();
                    this.updateStatus("");
                    // 跳转到食物选择
                    this.proceedToMealSelection();
                },
            },
        });
    }

// 不同npc的触发短语
    checkForTriggerPhrase(message) {
        const npcTriggerMap = {
            village_head: "I believe those records hold the key",
            shop_owner: "He always stood right here before leaving",
            spice_woman: "She whispered to me about a secret ingredient",
            restaurant_owner: "Only the bold flavors can reveal the truth",
            fisherman: "He dropped a note into the river that day",
            old_friend: "You remember our old recipe book, right?",
            secret_apprentice: "I saw him writing in that journal again...",
        };

        const triggerPhrase = npcTriggerMap[this.currentNPC];
        return triggerPhrase && message.includes(triggerPhrase);
    }

// 添加对话到历史记录并更新显示
    addToConversationHistory(speaker, message) {
        const npc = this.npcManager.getNPCById(this.currentNPC);
        const npcName = npc ? npc.name : "NPC";

        this.conversationHistory.push({
            speaker: speaker === "npc" ? npcName : "Player",
            message: message,
            timestamp: Date.now(),
        });

        this.updateConversationDisplay();
    }

// 更新对话框中的所有对话内容
    updateConversationDisplay() {
        let displayText = "";

        // 计算对话框的可见行数
        const lineHeight = this.isMobile ? 20 : 24;
        const dialogBoxHeight = this.isMobile ? 150 : 200;
        const maxVisibleLines = Math.floor(dialogBoxHeight / lineHeight) - 1;

        // 将所有对话合并为一个字符串，并按行分割
        let allLines = [];
        this.conversationHistory.forEach((entry, index) => {
            if (index > 0) allLines.push(""); // 空行分隔

            const speakerLine = `${entry.speaker}:`;
            allLines.push(speakerLine);

            // 将长消息按宽度分割成多行
            const maxCharsPerLine = this.isMobile ? 35 : 50;
            const isCJK = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(entry.message);
            if (isCJK) {
                const chars = [...entry.message];
                let line = "";
                chars.forEach(ch => {
                    if ((line + ch).length > maxCharsPerLine && line.length > 0) {
                        allLines.push(line);
                        line = ch;
                    } else {
                        line += ch;
                    }
                });
                if (line.trim()) allLines.push(line.trim());
            } else {
                const words = entry.message.split(" ");
                let currentLine = "";
                words.forEach((word) => {
                    if ((currentLine + word).length > maxCharsPerLine && currentLine.length > 0) {
                        allLines.push(currentLine);
                        currentLine = word + " ";
                    } else {
                        currentLine += word + " ";
                    }
                });
                if (currentLine.trim()) allLines.push(currentLine.trim());
            }
        });

        // 只显示最后的几行

        // 使用滚动偏移显示
        const start = Math.max(0, allLines.length - maxVisibleLines - this.scrollOffset);
        const end = Math.min(allLines.length, start + maxVisibleLines);
        const visibleLines = allLines.slice(start, end);


        displayText = visibleLines.join("\n");

        if (this.dialogText) {
            this.dialogText.setText(displayText);
        }

        // 添加滚动指示器
        if (allLines.length > maxVisibleLines) {
            this.showScrollIndicator();
        } else {
            this.hideScrollIndicator();
        }
    }

// 添加滚动指示器显示方法
    showScrollIndicator() {
        if (!this.scrollIndicator) {
            const {width, height} = this.cameras.main;

            this.scrollIndicator = this.add.text(width - 30, height * 0.6, "↑↓", {
                fontSize: "12px",
                fontFamily: "monospace",
                fill: "#94a3b8",
            });
            this.scrollIndicator.setOrigin(0.5);
            this.scrollIndicator.setDepth(15);
        }
        this.scrollIndicator.setVisible(true);
    }

// 添加隐藏滚动指示器方法
    hideScrollIndicator() {
        if (this.scrollIndicator) {
            this.scrollIndicator.setVisible(false);
        }
    }

// 显示单条消息（用于打字效果）
    showSingleMessage(speaker, message, callback) {
        const npc = this.npcManager.getNPCById(this.currentNPC);
        const npcName = npc ? npc.name : "NPC";
        const displayName = speaker === "npc" ? npcName : "Player";

        const fullMessage = `${displayName}: ${message}`;
        this.currentText = fullMessage;

        this.isTyping = true;
        if (this.dialogText) {
            this.dialogText.setText("");
        }
        if (this.continueHint) {
            this.continueHint.setVisible(false);
        }

        let currentChar = 0;
        const totalChars = fullMessage.length;
        const typeSpeed = this.isMobile ? 25 : 30;

        const typewriterTimer = this.time.addEvent({
            delay: typeSpeed,
            repeat: totalChars - 1,
            callback: () => {
                currentChar++;
                const currentDisplayText = fullMessage.substring(0, currentChar);
                if (this.dialogText) {
                    this.dialogText.setText(currentDisplayText);
                }

                if (currentChar >= totalChars) {
                    this.isTyping = false;
                    if (this.continueHint) {
                        this.continueHint.setVisible(true);
                    }

                    // 打字完成后添加到历史记录
                    this.addToConversationHistory(speaker, message);

                    if (callback) callback();
                }
            },
        });

        // 追踪定时器以便清理
        this.timers.push(typewriterTimer);
    }

// 获取NPC的备用问候语
    getFallbackGreeting() {
        const npcGreetings = {
            village_head: {
                zh: "你总算回来了……你师傅，他出事了。我相信你能找出真相。",
                en: `Three days ago, he left the village without a word.
The fire in his kitchen was still warm—but he was gone.
You know as well as I do... he was never the type to vanish without a reason. He barely ever left the village.
You were once his apprentice. If anyone can figure out what happened to him... it's you.
But this search—it's not just about turning over kitchen drawers.
Not long ago, he always carried a notebook whenever he met someone.
Maybe by following his method, you'll understand how he thinks.
I believe those records hold the key.`,
            },
        };

        const greeting = npcGreetings[this.currentNPC];
        return greeting
            ? greeting[this.playerData.language] || greeting.en
            : "Hello...";
    }

    enableInputBox() {
        // if (this.debugMode) {
        //     console.log("=== 启用输入框 ===");
        //     console.log("当前状态:", this.isWaitingForInput);
        //     console.log("当前对话阶段:", this.dialogPhase);
        // }
        //
        // // 强制重置状态
        // this.isWaitingForInput = true;
        //
        // // 确保输入框被创建
        // this.createTextInput();
    }

    disableInputBox() {
        // if (this.debugMode) {
        //     console.log("=== 禁用输入框 ===");
        // }
        //
        // this.isWaitingForInput = false;
        // this.clearTextInput();
        // // 清除回调函数
        // this.onUserSubmit = null;
    }

    async callConvaiAPI(userMessage) {
        if (this.debugMode) {
            console.log("=== 调用 ConvAI API ===");
            console.log("用户消息:", userMessage);
            console.log("当前NPC:", this.currentNPC);
            console.log("会话ID:", this.convaiSessionId);
        }

        this.npcMap = new Map();
        this.npcMap.set("village_head", "d38ecac8-5c6b-11f0-946c-42010a7be01f");
        this.npcMap.set("shop_owner", "902b34ac-6b65-11f0-a142-42010a7be01f");
        this.npcMap.set("spice_woman", "529a416e-6b65-11f0-af2e-42010a7be01f");
        this.npcMap.set("restaurant_owner", "6c4ed624-4b26-11f0-854d-42010a7be01f");
        this.npcMap.set("fisherman", "2e287d62-4b28-11f0-b155-42010a7be01f");
        this.npcMap.set("old_friend", "abc629d8-6b65-11f0-bc84-42010a7be01f");
        this.npcMap.set("secret_apprentice", "a9394c0e-4d88-11f0-b18a-42010a7be01f");


        const charID = this.npcMap.get(this.currentNPC);

        try {
            const requestBody = {
                userText: userMessage,
                charID: charID,
                sessionID: this.convaiSessionId,
                voiceResponse: false,
            };

            if (this.debugMode) {
                console.log("请求体:", requestBody);
                console.log("API URL:", `${API_URL}/convai-chat`);
            }

            const response = await fetch(`${API_URL}/convai-chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (this.debugMode) {
                console.log("HTTP响应状态:", response.status);
                console.log("HTTP响应OK:", response.ok);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (this.debugMode) {
                console.log("ConvAI 响应数据:", data);
            }
            if (data && data.skipToMeal) {
                return {
                    success: true,
                    message: data.text || (
                        this.playerData.language === "zh"
                            ? "今天先跳过对话，直接去记录你的餐食吧。"
                            : "We’ll skip the dialogue for now and go straight to logging your meal."
                    ),
                    skipToMeal: true,
                };
            }

            if (data.sessionID) {
                this.convaiSessionId = data.sessionID;
            }
            return {
                success: true,
                message: data.text || "ConvAI 无返回文本",
                sessionId: this.convaiSessionId,
            };
        } catch (error) {
            console.error("Error calling ConvAI API:", error);
            return {
                success: false,
                skipToMeal: true, // ← 出错也跳
                error: error.message || "ConvAI API call failed",
                message:
                    this.playerData.language === "zh"
                        ? "对不起，发生了错误。我们直接开始记录你的餐食吧。"
                        : "Sorry, something went wrong. Let’s go ahead and log your meal.",
            };
        }
    }

    async callGeminiAPI(userInput) {
        if (this.debugMode) {
            console.log("=== 调用 Gemini API ===");
            console.log("用户输入:", userInput);
            console.log("当前NPC:", this.currentNPC);
            console.log("餐食类型:", this.selectedMealType);
            console.log("当前轮数:", this.geminiTurnCount);
        }

        try {
            const requestBody = {
                userInput: userInput,
                npcId: this.currentNPC,
                mealType: this.selectedMealType,
                mealAnswers: this.mealAnswers,
                dialogHistory: this.dialogHistory,
                turnCount: this.geminiTurnCount, // 新增：传递轮数给后端
            };

            if (this.debugMode) {
                console.log("Gemini 请求体:", requestBody);
            }

            const response = await fetch(`${API_URL}/gemini-chat`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (this.debugMode) {
                console.log("Gemini 响应数据:", data);
                console.log("响应消息:", data.message);
            }

            if (data.success) {
                return {
                    success: true,
                    message: data.message,
                };
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

// 修改选择餐食方法
    async selectMeal(mealType, displayName) {
        if (this.debugMode) {
            console.log("=== 选择餐食 ===");
            console.log("选择的餐食:", mealType);
        }

        // 清理餐食选择按钮
        this.clearAllButtons();

        // 记录选择的餐食
        this.selectedMealType = mealType;
        this.addToConversationHistory("player", displayName);

        // 初始化答案存储
        this.mealAnswers = {
            mealType: mealType,
        };

        // 直接显示所有固定问题
        this.showAllFixedQuestions();
    }

// 显示所有固定问题（一次性显示）
    showAllFixedQuestions() {
        if (this.debugMode) {
            console.log("=== 显示所有固定问题 ===");
        }

        const {width, height} = this.scale;

        // 清理现有按钮
        this.clearAllButtons();

        // 问题和选项数据
        const questions = [
            {
                title:
                    this.playerData.language === "zh"
                        ? "1. 你的餐食是如何获得的？"
                        : "1. How is your meal obtained?",
                options:
                    this.playerData.language === "zh"
                        ? ["A. 家里做的", "B. 餐厅用餐", "C. 外卖/打包", "D. 即食食品"]
                        : [
                            "A. Home-cooked meals",
                            "B. Eat out at restaurants",
                            "C. Takeout or delivery",
                            "D. Ready-to-eat meals",
                        ],
                key: "obtainMethod",
            },
            {
                title:
                    this.playerData.language === "zh"
                        ? "2. 你什么时候吃的这餐？"
                        : "2. What time did you have this meal?",
                options:
                    this.playerData.language === "zh"
                        ? [
                            "A. 清晨 (7点前)",
                            "B. 上午 (7-11点)",
                            "C. 中午 (11点-下午2点)",
                            "D. 下午 (下午2-5点)",
                            "E. 傍晚 (下午5-9点)",
                            "F. 夜晚 (9点后)",
                        ]
                        : [
                            "A. Early morning (before 7:00 AM)",
                            "B. Morning (7:00–11:00 AM)",
                            "C. Midday (11:00 AM–2:00 PM)",
                            "D. Afternoon (2:00–5:00 PM)",
                            "E. Evening (5:00–9:00 PM)",
                            "F. Night (after 9:00 PM)",
                        ],
                key: "mealTime",
            },
            {
                title:
                    this.playerData.language === "zh"
                        ? "3. 你用了多长时间吃完？"
                        : "3. How long did you eat?",
                options:
                    this.playerData.language === "zh"
                        ? ["A. 不到10分钟", "B. 10-30分钟", "C. 30-60分钟", "D. 超过60分钟"]
                        : [
                            "A. Less than 10 minutes",
                            "B. 10–30 minutes",
                            "C. 30–60 minutes",
                            "D. More than 60 minutes",
                        ],
                key: "duration",
            },
        ];

        this.fixedQuestionButtons = [];
        this.questionAnswers = {}; // 存储每个问题的答案

        let currentY = this.isMobile ? height * 0.1 : height * 0.15;
        const questionSpacing = this.isMobile ? 120 : 150;
        const optionSpacing = this.isMobile ? 25 : 30;
        const fontSize = this.isMobile ? "11px" : "13px";
        const titleFontSize = this.isMobile ? "13px" : "15px";

        questions.forEach((question, qIndex) => {
            // 显示问题标题
            const questionTitle = this.add.text(width / 2, currentY, question.title, {
                fontSize: titleFontSize,
                fontFamily: "monospace",
                fill: "#f1f5f9",
                align: "center",
                fontStyle: "bold",
            });
            questionTitle.setOrigin(0.5);
            questionTitle.setDepth(20);
            this.fixedQuestionButtons.push(questionTitle);

            currentY += 35;

            // 显示选项按钮
            question.options.forEach((option, oIndex) => {
                const button = this.add.text(width / 2, currentY, option, {
                    fontSize: fontSize,
                    fontFamily: "monospace",
                    fill: "#e2e8f0",
                    backgroundColor: "#4a5568",
                    padding: {x: 12, y: 6},
                });

                button.setOrigin(0.5);
                button.setInteractive({useHandCursor: true});
                button.setDepth(20);
                button._qid = qIndex;

                button.on("pointerdown", () => {
                    this.selectFixedQuestionAnswer(question.key, option, oIndex, qIndex);
                });

                button.on("pointerover", () => {
                    button.setTint(0x667eea);
                });

                button.on("pointerout", () => {
                    button.clearTint();
                });

                this.fixedQuestionButtons.push(button);
                currentY += optionSpacing;
            });

            currentY += questionSpacing - question.options.length * optionSpacing;
        });

        // 添加提交按钮（初始隐藏）
        this.submitButton = this.add.text(
            width / 2,
            currentY + 30,
            this.playerData.language === "zh" ? "提交所有答案" : "Submit All Answers",
            {
                fontSize: this.isMobile ? "14px" : "16px",
                fontFamily: "monospace",
                fill: "#ffffff",
                backgroundColor: "#10b981",
                padding: {x: 20, y: 10},
            }
        );
        this.submitButton.setOrigin(0.5);
        this.submitButton.setDepth(20);
        this.submitButton.setVisible(false);

        this.submitButton.setInteractive({useHandCursor: true});
        this.submitButton.on("pointerdown", () => {
            this.submitAllFixedAnswers();
        });

        this.submitButton.on("pointerover", () => {
            this.submitButton.setTint(0x059669);
        });

        this.submitButton.on("pointerout", () => {
            this.submitButton.clearTint();
        });

        this.fixedQuestionButtons.push(this.submitButton);
    }

// 选择固定问题的答案
    selectFixedQuestionAnswer(questionKey, answer, answerIndex, questionIndex) {
        if (this.debugMode) {
            console.log("=== 选择固定问题答案 ===");
            console.log("问题:", questionKey, "答案:", answer);
        }

        // 存储答案
        this.questionAnswers[questionKey] = {text: answer, index: answerIndex};
        this.mealAnswers[questionKey] = {text: answer, index: answerIndex};

        // 添加到对话历史
        this.addToConversationHistory("player", answer);

        // 仅重置同一题目的按钮样式
        this.fixedQuestionButtons
            .filter(b => b && b.setText && b._qid === questionIndex)
            .forEach((b) => {
                b.clearTint();
                b.setAlpha(0.7);
            });

        // 高亮当前选中的按钮
        const clickedButton = this.fixedQuestionButtons.find(
            (btn) => btn.text === answer
        );
        if (clickedButton) {
            clickedButton.setTint(0x10b981);
            clickedButton.setAlpha(1);
        }

        // 检查是否所有问题都已回答
        const totalQuestions = 3;
        const answeredQuestions = Object.keys(this.questionAnswers).length;

        if (this.debugMode) {
            console.log("已回答问题数:", answeredQuestions, "/", totalQuestions);
        }

        if (answeredQuestions >= totalQuestions) {
            this.submitButton.setVisible(true);
            this.submitButton.setTint(0x10b981);
        }
    }

// 提交所有固定问题的答案
    async submitAllFixedAnswers() {
        if (this.debugMode) {
            console.log("=== 提交所有固定答案 ===");
            console.log("所有答案:", this.mealAnswers);
        }

        // 清理固定问题界面
        this.clearAllButtons();

        // 开始 Gemini 对话
        this.startGeminiChat();
    }

// 1. 修改结束消息检测方法
    detectThankYouMessage(text) {
        const lowerText = text.toLowerCase();
        console.log("检测结束消息:", lowerText); // 添加调试日志

        return (
            // Gemini 系统提示词中的准确结束语
            lowerText.includes("thanks for sharing your meal with me") ||
            lowerText.includes("thank you for sharing your meal with me") ||
            // 中文版本
            lowerText.includes("谢谢你分享你的餐食") ||
            lowerText.includes("谢谢你与我分享餐食") ||
            // 其他可能的结束模式
            lowerText.includes("good job! keep doing this") ||
            lowerText.includes("little by little, you'll start to understand") ||
            lowerText.includes("no need to rush") ||
            lowerText.includes("take it one meal at a time") ||
            // 添加更通用的结束检测
            (lowerText.includes("thanks") && lowerText.includes("meal")) ||
            (lowerText.includes("thank you") && lowerText.includes("sharing")) ||
            // 对话轮数限制作为后备检测
            this.geminiTurnCount >= 5 // 新增：最多5轮Gemini对话
        );
    }

    clearTextInput() {
        if (this.debugMode) {
            console.log("=== 清理文本输入框 ===");
            console.log("输入框存在:", this.textInput ? "是" : "否");
            console.log("发送按钮存在:", this.sendButton ? "是" : "否");
        }

        if (this.textInput) {
            if (this.textInputKeyDownHandler) {
                this.textInput.removeEventListener(
                    "keydown",
                    this.textInputKeyDownHandler
                );
                this.textInputKeyDownHandler = null;
            }
            if (this.textInput.parentNode) {
                this.textInput.parentNode.removeChild(this.textInput);
            }
            this.textInput = null;
        }

        if (this.sendButton) {
            this.sendButton.onclick = null;
            if (this.sendButton.parentNode) {
                this.sendButton.parentNode.removeChild(this.sendButton);
            }
            this.sendButton = null;
        }

        // 清除回调函数
        this.onUserSubmit = null;

        if (this.debugMode) {
            console.log("文本输入框清理完成");
        }
    }

// 修复：添加线索到NPC管理器时确保使用当前语言
    async handleMealCompletion(recordResult) {
        try {
            if (this.debugMode) {
                console.log("记录结果:", recordResult); // 使用传递过来的真实结果
            }
            if (!recordResult.success) {
                throw new Error(recordResult.error || "Failed to record meal");
            }

            // 根据返回结果决定给出线索还是普通结束
            if (recordResult.shouldGiveClue) {
                console.log("给出线索并完成NPC交互");
                // 修复：确保使用当前语言获取线索
                const clue = this.getClueForNPC(this.currentNPC);

                // 只在这里添加线索到NPC管理器，确保传递正确的语言版本
                this.npcManager.addClue(
                    this.currentNPC,
                    clue,
                    this.npcManager.getCurrentDay()
                );

                this.dialogPhase = "completed";
                await this.npcManager.completeNPCInteraction(this.currentNPC);
                this.notifyMealRecorded();
                this.sayOnceViaDS(
                    this.getClueForNPC(this.currentNPC),
                    {isMealDialog: false, mealType: null}
                );
            } else {
                console.log("普通餐食记录完成，不给线索");
                this.dialogPhase = "completed";
                this.notifyMealRecorded();
                this.sayOnceViaDS(
                    this.playerData.language === "zh"
                        ? "谢谢你的分享！记得按时吃饭哦。"
                        : "Thanks for sharing! Remember to eat on time.",
                    {isMealDialog: false, mealType: null}
                );
            }
        } catch (error) {
            console.error("处理食物记录完成时出错:", error);
            this.dialogPhase = "completed";
            this.sayOnceViaDS(
                this.playerData.language === "zh"
                    ? "抱歉，记录餐食时出现了问题。请稍后再试。"
                    : "Sorry, there was an error recording your meal. Please try again later.",
                {isMealDialog: false, mealType: null}
            );
        }
    }

    notifyMealRecorded() {
        // 只通知场景记录了餐食，不再添加线索
        if (this.mainScene.onMealRecorded) {
            this.mainScene.onMealRecorded();
        }
    }

    extractMealContentFromHistory() {
        // 提取用户在Gemini对话阶段的所有输入
        const start = Number.isInteger(this.geminiHistoryStart) ? this.geminiHistoryStart : 0;
        const mealPhaseHistory = this.dialogHistory
            .slice(start)
            .filter((entry) => entry.type === "user" && !this.isFixedQuestionAnswer(entry.content));


        // 将用户的餐食描述合并
        const mealDescriptions = mealPhaseHistory.map((entry) => entry.content);
        const mealDescription = mealDescriptions.join(" "); // 变量名修改
        console.log("提取的餐食描述:", mealDescription); // 日志更新
        return mealDescription; // 返回值命名统一
    }

// 新增：判断是否是固定问题的答案
    isFixedQuestionAnswer(content) {
        const enPrefixes = [
            "A. Home-cooked meals", "B. Eat out at restaurants", "C. Takeout or delivery", "D. Ready-to-eat meals",
            "A. Early morning", "B. Morning", "C. Midday", "D. Afternoon", "E. Evening", "F. Night",
            "A. Less than 10 minutes", "B. 10–30 minutes", "C. 30–60 minutes", "D. More than 60 minutes",
        ];
        const zhPrefixes = [
            "A. 家里做的", "B. 餐厅用餐", "C. 外卖/打包", "D. 即食食品",
            "A. 清晨", "B. 上午", "C. 中午", "D. 下午", "E. 傍晚", "F. 夜晚",
            "A. 不到10分钟", "B. 10-30分钟", "C. 30-60分钟", "D. 超过60分钟",
        ];
        return [...enPrefixes, ...zhPrefixes].some(prefix => content.startsWith(prefix));
    }

// 标记NPC完成交互
    markNPCCompleted() {
        // 添加线索到UI管理器
        if (this.mainScene && this.mainScene.uiManager) {
            const npc = this.npcManager.getNPCById(this.currentNPC);
            const clueText = this.getClueForNPC(this.currentNPC);
            const clueShort = this.extractClueKeywords(clueText);

            this.mainScene.uiManager.addClue({
                npcName: npc ? npc.name : "Unknown NPC",
                clue: clueShort,
                day: this.npcManager.getCurrentDay(),
            });
        }

        // 通知场景记录了餐食
        if (this.mainScene.onMealRecorded) {
            this.mainScene.onMealRecorded();
        }
    }

// 3. New method to check if this is first interaction with NPC
    checkIfFirstInteraction() {
        // This should check your game state/save data
        // For now, return true as placeholder - implement based on your save system
        if (this.npcManager && this.npcManager.hasInteractedWith) {
            return !this.npcManager.hasInteractedWith(this.currentNPC);
        }
        return true; // Default to first interaction
    }

// 4. Get vague dialog from frontend (no backend call)
    getVagueDialogFromFrontend(npcId) {
        const language = this.playerData.language;

        const npcVagueResponses = {
            village_head: {
                zh: "你记录得很用心。不过，我觉得你师傅更喜欢听晚餐的故事。也许你可以晚上再来和我聊聊？",
                en: "You're recording very thoughtfully. But I think your master preferred hearing dinner stories. Maybe you could come back in the evening to chat with me?",
            },
            shop_owner: {
                zh: "嗯，这个记录不错。不过你师傅总是说，晚餐时的回忆最深刻。要不你今天晚餐后再来？",
                en: "Hmm, this record is good. But your master always said dinner memories are the deepest. Why don't you come back after dinner today?",
            },
            spice_woman: {
                zh: "香料的秘密，往往在夜幕降临时才会显现。晚餐时分，再来找我吧。",
                en: "The secrets of spices often reveal themselves when night falls. Come find me at dinner time.",
            },
            restaurant_owner: {
                zh: "作为厨师，我最看重的是晚餐时光。那时候的味觉最敏锐。今晚再来吧。",
                en: "As a chef, I value dinner time the most. That's when taste buds are sharpest. Come back tonight.",
            },
            fisherman: {
                zh: "渔人最懂得等待的艺术。耐心等到晚餐时分，我们再好好聊聊。",
                en: "Fishermen understand the art of waiting. Wait patiently until dinner time, then we'll have a good chat.",
            },
            old_friend: {
                zh: "老朋友之间的深谈，总是在晚餐时最有意义。今晚见？",
                en: "Deep conversations between old friends are always most meaningful at dinner. See you tonight?",
            },
            secret_apprentice: {
                zh: "师傅说过，最重要的话要在一天结束时说。晚餐后，我会告诉你更多。",
                en: "Master said the most important words should be spoken at day's end. After dinner, I'll tell you more.",
            },
        };

        const responses = npcVagueResponses[npcId];
        if (!responses) {
            return language === "zh"
                ? "记录得不错。不过晚餐时分再来，我可能会有更多话要说。"
                : "Good record. But come back at dinner time, I might have more to say.";
        }

        return responses[language] || responses.en;
    }

    extractClueKeywords(fullClue) {
        // 简化版关键词提取
        //
        const sentences = fullClue.split(/[.。]/);
        return sentences[0] + "...";
    }

// 获取线索的方法 - 确保根据当前语言返回正确的线索
    getClueForNPC(npcId) {
        const language = this.playerData.language;

        const clues = {
            village_head: {
                zh: "干得好！继续这样做。一点一点地，你会开始理解——他当时在想什么，他在隐藏什么。\n\n不需要着急。这不是你可以强迫的事情——只需要一次吃一顿饭。\n\n他经常去格蕾丝的店买食材。他和华主厨回去的路很远。也许你会从她那里得到一些见解。",
                en: "Good job! Keep doing this. Little by little, you'll start to understand—what he was thinking back then, and what he was hiding.\n\nNo need to rush. This isn't something you can force—just take it one meal at a time.\n\nHe often stopped by Grace's shop for ingredients. He and Chef Hua go way back. Maybe you will get some insights from her.",
            },
            shop_owner: {
                zh: "他最常买那几样料，可那天——他却突然问起'青木籽'。他以前从来不碰那玩意儿。\n\n他说需要做一道特别的汤。我问他为什么，他只是摇摇头说：'有些味道，一旦失去就再也找不回来了。'\n\n如果你想知道更多，去找香料婆婆吧。她可能知道那些青木籽的用途。",
                en: "He always bought the same ingredients, but that day—he suddenly asked about 'greenwood seeds'. He never touched those before.\n\nHe said he needed to make a special soup. When I asked why, he just shook his head and said: 'Some flavors, once lost, can never be found again.'\n\nIf you want to know more, go find the Spice Granny. She might know what those greenwood seeds are for.",
            },
            spice_woman: {
                zh: "他说——'要不是那个人把它弄俗了'，他都不想再碰青木籽。你知道他说的是谁吗？\n\n我看得出来，他心里有很深的怨恨。那种表情...就像是被最信任的人背叛了一样。\n\n他提到了河边的那家餐厅。说那里有他要找的答案。去看看吧，也许华主厨知道些什么。",
                en: "He said—'If it weren't for that person making it vulgar', he wouldn't want to touch greenwood seeds again. Do you know who he was talking about?\n\nI could see deep resentment in his heart. That expression... like being betrayed by someone he trusted most.\n\nHe mentioned the restaurant by the river. Said there were answers he was looking for. Go take a look, maybe Chef Hua knows something.",
            },
            restaurant_owner: {
                zh: "有一锅粥，他始终没让我碰。说什么得亲自守着火慢慢熬着。'云头鲤'。\n\n他做的时候眼神很奇怪，既专注又痛苦。我问他这道菜有什么特别，他说：'这是我欠某人的。'\n\n后来他提到了河边的渔夫老刘。说只有他知道最好的云头鲤在哪里能找到。也许你该去问问他。",
                en: "There was one pot—congee with Yunhead Carp. He never let me touch it. Had to be slow cooked. Alone. By the river.\n\nHis expression was strange when he made it, both focused and pained. When I asked what was special about this dish, he said: 'This is what I owe someone.'\n\nLater he mentioned Old Liu, the fisherman by the river. Said only he knew where to find the best Yunhead Carp. Maybe you should go ask him.",
            },
            fisherman: {
                zh: "你师傅……他那天，在那块老礁石边，煮了一锅鱼粥。一锅白，一锅清。没叫我尝，就说了句：'等潮涨再开。'\n\n我看他把什么东西放进了那锅清粥里，然后就一直盯着水面发呆。等我再看时，他已经把两锅粥都倒进了河里。\n\n他说他有个老朋友，住在村子里。也许那个人知道他在想什么。去找找看吧。",
                en: "Your master... that day, by the old rocks, he made two pots of fish congee. One milky, one clear. He didn't let me taste a drop. Just said: 'Open it when the tide comes in.'\n\nI saw him put something into that clear congee, then he just stared at the water surface in a daze. When I looked again, he had poured both pots into the river.\n\nHe said he had an old friend living in the village. Maybe that person knows what he was thinking. Go look for them.",
            },
            old_friend: {
                zh: "师傅从小不喜欢我你了解的，自然什么都不会和我说。但是念念，他最近收了一个孩子叫念念。住在村尾的阁楼。\n\n那孩子很聪明，师傅教了他很多东西。我觉得如果有人知道师傅在想什么，那一定是念念。\n\n但是要小心，那孩子对陌生人很警惕。你需要证明你真的是师傅的徒弟才行。",
                en: "Master never liked me since childhood, naturally he wouldn't tell me anything. But about NianNian, he recently took in a child called NianNian. Lives in the attic at the end of the village.\n\nThat child is very smart, Master taught him many things. I think if anyone knows what Master was thinking, it must be NianNian.\n\nBut be careful, that child is very wary of strangers. You need to prove you're really Master's apprentice.",
            },
            secret_apprentice: {
                zh: "他把最后一页藏在他'最常回头看的地方'。不是厨房，也不是餐馆。是他写下第一道菜的地方！在阁楼上那道木梁上。\n\n他说过，如果有一天他不在了，那一页纸会告诉你一切的真相。包括他为什么要离开，包括他一直在寻找的那个人。\n\n但是师傅也说了，只有真正理解他的人才能找到那张纸。你准备好了吗？",
                en: "He hid the last page in the place he 'most often looked back at'. Not the kitchen, not the restaurant. The place where he wrote his first recipe! On the wooden beam in the attic.\n\nHe said if one day he wasn't there, that page would tell you the whole truth. Including why he had to leave, including the person he's been searching for.\n\nBut Master also said only someone who truly understands him can find that paper. Are you ready?",
            },
        };

        const clue = clues[npcId];
        if (!clue) {
            const defaultClue = {
                zh: "很抱歉，我没有关于这个人的更多信息。",
                en: "I'm sorry, I don't have more information about this person.",
            };
            return defaultClue[language] || defaultClue.en;
        }

        return clue[language] || clue.en;
    }

    getVagueResponse(npcId, version = 1) {
        const language = this.playerData.language;

        // NPC-specific vague responses
        const npcVagueResponses = {
            village_head: {
                zh: {
                    1: "你师傅常有个地方，他总去的...\n嗯，那又是哪里来着？\n啊，我记性不如从前了。\n\n哦！现在该我准备下顿饭的时候了。过几个小时再回来吧。兴许到时候什么会想起来的。",
                    2: "我记得他总是去拜访一个女人...\n嗯，她又是谁来着？\n再给我点时间——等你吃完今天最后一顿饭后我们再聊吧。",
                },
                en: {
                    1: "Your master used to have a place he visited all the time...\nHmm, where was it again?\nAh, my memory's not what it used to be.\n\nOh! It's time for me to prep for my next meal. Come back in a few hours. Maybe something will come back to me.",
                    2: "I remember he always visited a woman...\nHmm, who was she again?\nGive me a bit more time — let's talk again after you've finished your last meal of the day.",
                },
            },
            // 可以为其他 NPC 添加更多响应
        };

        const npcResponses = npcVagueResponses[npcId];
        if (!npcResponses) {
            // 默认回复
            return language === "zh"
                ? "让我想想...等你下顿饭后再来吧。"
                : "Let me think... come back after your next meal.";
        }

        const languageResponses = npcResponses[language] || npcResponses.en;
        return languageResponses[version] || languageResponses[1];
    }

    returnToMainScene() {
        // 清理输入框
        this.clearTextInput();

        // 清理滚动指示器
        if (this.scrollIndicator) {
            this.scrollIndicator.destroy();
            this.scrollIndicator = null;
        }

        // 返回主场景
        this.scene.stop();
        this.scene.resume("MainScene");
    }

    shutdown() {
        if (this.debugMode) {
            console.log("=== DialogScene 关闭清理 ===");
        }

        // 清理所有定时器
        this.timers.forEach((timer) => {
            if (timer && !timer.hasDispatched) {
                timer.destroy();
            }
        });
        this.timers = [];

        // 清理事件监听器
        this.eventListeners.forEach(({event, handler}) => {
            if (this.input && this.input.removeListener) {
                this.input.removeListener(event, handler);
            }
        });
        this.eventListeners = [];

        // 清理输入框
        this.clearTextInput();

        // 清理滚动指示器
        if (this.scrollIndicator) {
            this.scrollIndicator.destroy();
            this.scrollIndicator = null;
        }

        // 清理所有按钮
        this.clearAllButtons();
// 避免 destroy() -> endDialog() -> emit 触发业务提交
        this._suppressReturnOnce = true;

// 解绑事件（如果刚才加了 off）
        if (this.dialogSystem?.off) {
            this.dialogSystem.off("dialogEnded", this.handleDialogEnded);
        }

        // 重置回调函数
        this.onUserSubmit = null;
        this.dialogSystem?.destroy();
    }

// 更新状态显示
    updateStatus(text) {
        if (this.statusText) {
            this.statusText.setText(text);
            // 如果文本不为空，设置5秒后自动清空
            if (text) {
                const timer = this.time.delayedCall(5000, () => {
                    if (this.statusText) this.statusText.setText("");
                });
                this.timers.push(timer);
            }
        }
    }

// 清理所有按钮
    clearAllButtons() {
        // 清理动态按钮
        if (this.dynamicButtons) {
            this.dynamicButtons.forEach((button) => {
                if (button && button.destroy) button.destroy();
            });
            this.dynamicButtons = [];
        }

        // 也可以保留原有固定数组的清理，以防万一
        if (this.fixedQuestionButtons) {
            this.fixedQuestionButtons.forEach((button) => button.destroy());
            this.fixedQuestionButtons = [];
        }

        if (this.mealButtons) {
            this.mealButtons.forEach((button) => button.destroy());
            this.mealButtons = [];
        }

        if (this.questionText) {
            this.questionText.destroy();
            this.questionText = null;
        }

        if (this.submitButton) {
            this.submitButton.destroy();
            this.submitButton = null;
        }
    }

    startGeminiChat() {
        if (this.debugMode) {
            console.log("=== 开始 Gemini 对话 ===");
            console.log("餐食类型:", this.selectedMealType);
            console.log("固定答案:", this.mealAnswers);
        }

        this.clearAllButtons();
        this.dialogPhase = "meal_recording";
        this.geminiHistoryStart = this.dialogHistory.length;

        // 新增：初始化 Gemini 对话轮数
        this.geminiTurnCount = 0;
        this.maxGeminiTurns = 5;
        this.geminiStarterMessage = this.playerData.language === "zh"
            ? "好的，我们开始记录本次用餐。"
            : "Okay, let’s log this meal.";

        this.dialogSystem.setRequestHandler(async (npcId, userText) => {
            const phase = this.dialogPhase;

            // 仅一次的开场白
            if (phase === "meal_recording" && this.geminiStarterMessage) {
                const first = this.geminiStarterMessage;
                this.geminiStarterMessage = null;
                return {next: true, response: first, requireInput: true, buttons: []};
            }

            const msg = userText && userText.trim() ? userText.trim() : "hello";
            const apiResp = (phase === "meal_recording")
                ? await this.callGeminiAPI(msg)
                : await this.callConvaiAPI(msg);

            if (apiResp?.skipToMeal) {
                // 不要触发返回主场景
                this._suppressReturnOnce = true;
                if (this.dialogSystem?.isDialogActive()) {
                    this.dialogSystem.endDialog();
                }
                this.proceedToMealSelection();
                // 给一条占位回复，让 UI 有反馈
                return {
                    next: false,
                    response: apiResp.message || (
                        this.playerData.language === "zh"
                            ? "今天先跳过对话，直接去记录你的餐食吧。"
                            : "We’ll skip the dialogue for now and go straight to logging your meal."
                    )
                };
            }
            if (!apiResp?.success) {
                return {
                    next: false,
                    response: apiResp?.message || (
                        this.playerData.language === "zh"
                            ? "抱歉，暂时无法继续对话。"
                            : "Sorry, I can't continue the conversation right now."
                    ),
                };
            }

            // ==== 结束条件（关键补充）====
            if (phase === "meal_recording") {
                this.geminiTurnCount = (this.geminiTurnCount || 0) + 1;

                const shouldEndByMsg = this.detectThankYouMessage(apiResp.message);
                const shouldEndByTurns = this.geminiTurnCount >= this.maxGeminiTurns;

                if (shouldEndByMsg || shouldEndByTurns) {
                    // ✨ 新增：在返回前把状态标记为完成，避免 handleDialogEnded 误判
                    this.mealRecorded = true;
                    this.currentDialogState = "completion_check";
                    this.dialogPhase = "completed";
                    return {next: false, response: apiResp.message};
                }

                return {next: true, response: apiResp.message, requireInput: true};
            }

            // 闲聊阶段：达到阈值或遇到触发词→收尾并跳到餐食选择
            if (this.checkForTriggerPhrase(apiResp.message) || this.dialogTurnCount++ >= 3) {
                // 先设置抑制标记，避免 handleDialogEnded 误返回主场景
                this._suppressReturnOnce = true;
                this.dialogSystem.endDialog();
                this.proceedToMealSelection();
                return {next: false, response: apiResp.message};
            }


            // 继续闲聊
            return {next: true, response: apiResp.message, requireInput: true};
        });

        this.dialogSystem.startDialog(this.currentNPC, {
            isMealDialog: true,
            mealType: this.selectedMealType,
        });
    }

    checkUnusualMealTime() {
        const mealTime = this.mealAnswers.mealTime;
        if (!this.selectedMealType) return false;
        const mealType = this.selectedMealType.toLowerCase();

        if (!mealTime || mealTime.index === undefined || mealTime.index === null) {
            return false;
        }

        const timeIndex = mealTime.index; // 0-5 对应 A-F 选项

        // 定义正常时间范围（按选项索引）
        const normalTimes = {
            breakfast: [1], // B. Morning (7:00–11:00 AM)
            lunch: [2, 3], // C. Midday (11:00 AM–2:00 PM), D. Afternoon (2:00–5:00 PM)
            dinner: [4, 5], // E. Evening (5:00–9:00 PM), F. Night (after 9:00 PM)
        };

        const normalTimeRange = normalTimes[mealType];

        if (!normalTimeRange) {
            return false;
        }

        // 如果用餐时间不在正常范围内，则需要询问原因
        return !normalTimeRange.includes(timeIndex);
    }
}

