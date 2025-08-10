// src/phaser/NPCManager.js - 更新线索和对话存储版本
import Phaser from "phaser";

const API_URL = process.env.REACT_APP_API_URL;

export default class NPCManager {
    constructor(scene, mapScale) {
        this.lastCheckDayTime = 0;
        this.checkDayInterval = 3000;
        this.scene = scene;
        this.mapScale = mapScale;
        this.npcs = new Map();
        this.dialogSystem = null;
        this.playerStatus = null;
        this.availableNPCs = [];
        this.mealRecords = [];
        this.clueRecords = []; // 从服务器加载的线索记录
        this.isUpdatingDay = false;
        this.pushedClueIds = new Set();

        this.initializeNPCs();
    }

    setDialogSystem(dialogSystem) {
        this.dialogSystem = dialogSystem;
    }

    async initializeNPCs() {
        // 7个NPC配置数据
        const npcConfigs = [
            {
                id: "village_head",
                name:
                    this.scene.playerData.language === "zh"
                        ? "村长伯伯"
                        : "Uncle Bo (Village Head)",
                position: {x: 1, y: 0.7},
                day: 1,
            },
            {
                id: "shop_owner",
                name:
                    this.scene.playerData.language === "zh"
                        ? "店主阿桂"
                        : "Grace (Shop Owner)",
                position: {x: 5, y: 1.5},
                day: 2,
            },
            {
                id: "spice_woman",
                name:
                    this.scene.playerData.language === "zh" ? "香料婆婆" : "Spice Woman",
                position: {x: 8, y: 12},
                day: 3,
            },
            {
                id: "restaurant_owner",
                name:
                    this.scene.playerData.language === "zh"
                        ? "餐厅店长老韩"
                        : "Han (Restaurant Owner)",
                position: {x: 15, y: 8},
                day: 4,
            },
            {
                id: "fisherman",
                name:
                    this.scene.playerData.language === "zh"
                        ? "渔夫阿梁"
                        : "Leon (Fisherman)",
                position: {x: 3, y: 14},
                day: 5,
            },
            {
                id: "old_friend",
                name: this.scene.playerData.language === "zh" ? "林川" : "Rowan",
                position: {x: 18, y: 12},
                day: 6,
            },
            {
                id: "secret_apprentice",
                name: this.scene.playerData.language === "zh" ? "念念" : "NianNian",
                position: {x: 10, y: 3},
                day: 7,
            },
        ];

        // 创建所有NPC
        npcConfigs.forEach((config) => {
            this.createNPC(config);
        });

        // 从服务器加载玩家状态
        await this.loadPlayerStatus();

        console.log("NPCs initialized with player status");
    }

    async loadPlayerStatus() {
        try {
            const response = await fetch(`${API_URL}/player-status`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({playerId: this.scene.playerId}),
            });

            if (response.ok) {
                const data = await response.json();
                this.playerStatus = data.player;
                this.availableNPCs = data.availableNPCs;
                this.mealRecords = data.mealRecords;
                this.currentDayMealsRemaining = data.currentDayMealsRemaining || [];

                // 先把服务端线索按当前语言映射出来
                const mappedClues = (data.clueRecords || []).map((clue) => ({
                    ...clue,
                    clue: this.getNPCClue(clue.npcId),               // 当前语言的线索文本
                    npcName: this.getNPCNameByLanguage(clue.npcId),  // 当前语言的NPC名
                }));

// 更新本地线索列表（去重合并：以 id 为主键）
                const existingById = new Map((this.clueRecords || []).map(c => [c.id, c]));
                mappedClues.forEach(c => existingById.set(c.id, c));
                this.clueRecords = Array.from(existingById.values());

// 只把“没推送过”的线索丢给 UI
                if (this.scene.uiManager && this.clueRecords.length > 0) {
                    for (const clue of mappedClues) {
                        if (!this.pushedClueIds.has(clue.id)) {
                            this.scene.uiManager.addClue(clue);
                            this.pushedClueIds.add(clue.id);
                        }
                    }
                }

                // 更新NPC状态
                this.updateNPCStates();

                // 新增：加载完状态后检查是否需要更新天数（关键修改）
                await this.checkAndUpdateCurrentDay();

                // 补充调试信息：检查第一天完成状态和当前天数
                const firstDayNPC = this.availableNPCs.find(npc => npc.day === 1);
                console.log("自动跳转调试信息：", {
                    currentDay: this.playerStatus.currentDay, // 当前天数
                    firstDayMealsRecorded: firstDayNPC?.mealsRecorded || 0, // 第一天已记录餐数
                    firstDayIsCompleted: firstDayNPC?.hasCompletedDay || false, // 第一天是否完成
                    currentDayMealsRemaining: this.currentDayMealsRemaining.length, // 当前天剩余餐数
                    hasNextDayNPC: this.availableNPCs.some(npc => npc.day === this.playerStatus.currentDay + 1) // 是否有下一天NPC
                });

                console.log(`Player status loaded:`, {
                    playerId: this.playerStatus.playerId,
                    currentDay: this.playerStatus.currentDay,
                    gameCompleted: this.playerStatus.gameCompleted,
                    availableNPCs: this.availableNPCs.length,
                    mealRecords: this.mealRecords.length,
                    clueRecords: this.clueRecords.length,
                    currentDayMealsRemaining: this.currentDayMealsRemaining,
                });
            } else {
                throw new Error("Failed to load player status");
            }
        } catch (error) {
            if (this.scene?.showNotification) {
                this.scene.showNotification(
                    this.scene.playerData.language === "zh"
                        ? "服务器暂时不可用，使用本地进度。"
                        : "Server unavailable, using local progress.",
                    2500
                );
            }

            // 如果真的没有任何本地状态（第一次加载失败），才初始化一次
            if (!this.playerStatus || !this.playerStatus.currentDay) {
                this.playerStatus = {
                    playerId: this.scene.playerId,
                    currentDay: 1,
                    gameCompleted: false,
                    firstLoginDate: new Date(),
                };
                this.availableNPCs = [
                    {
                        day: 1,
                        npcId: "village_head",
                        unlocked: true,
                        mealsRecorded: 0,
                        hasCompletedDay: false,
                        availableMealTypes: ["breakfast", "lunch", "dinner"],
                    },
                ];
                this.mealRecords = [];
                this.clueRecords = [];
                this.currentDayMealsRemaining = ["breakfast", "lunch", "dinner"];
                this.updateNPCStates();
            }
        }
    }

    updateNPCStates() {
        // 重置所有NPC状态
        this.npcs.forEach((npc) => {
            npc.isUnlocked = false;
            npc.hasRecordedMeal = false;
            npc.sprite.setVisible(false);
            this.removeNPCHighlight(npc);
        });

        // 根据服务器数据更新NPC状态
        this.availableNPCs.forEach((availableNPC) => {
            const npc = this.npcs.get(availableNPC.npcId);
            if (npc) {
                // 更新NPC名称为当前语言
                npc.name = this.getNPCNameByLanguage(availableNPC.npcId);

                npc.isUnlocked = availableNPC.unlocked;
                npc.hasRecordedMeal = availableNPC.hasRecordedMeal;
                npc.mealsRecorded = availableNPC.mealsRecorded;
                npc.hasCompletedDay = availableNPC.hasCompletedDay;
                npc.availableMealTypes = availableNPC.availableMealTypes || [];
                npc.sprite.setVisible(true);

                // 高亮显示当前天的NPC（如果还没完成完整记录）
                if (
                    availableNPC.day === this.playerStatus.currentDay &&
                    !availableNPC.hasCompletedDay
                ) {
                    this.highlightNPC(npc);
                    this.addNPCClickArea(npc);

                    // 添加餐食提示
                    this.addMealTypeHint(npc, availableNPC.availableMealTypes);
                }
            }
        });
    }

    // 新增：根据当前语言获取NPC名称
    getNPCNameByLanguage(npcId) {
        const language = this.scene.playerData.language;

        const npcNames = {
            village_head: {
                zh: "村长伯伯",
                en: "Uncle Bo (Village Head)",
            },
            shop_owner: {
                zh: "店主阿桂",
                en: "Grace (Shop Owner)",
            },
            spice_woman: {
                zh: "香料婆婆",
                en: "Spice Woman",
            },
            restaurant_owner: {
                zh: "餐厅店长老韩",
                en: "Han (Restaurant Owner)",
            },
            fisherman: {
                zh: "渔夫阿梁",
                en: "Leon (Fisherman)",
            },
            old_friend: {
                zh: "林川",
                en: "Rowan",
            },
            secret_apprentice: {
                zh: "念念",
                en: "NianNian",
            },
        };

        const nameObj = npcNames[npcId];
        return nameObj ? nameObj[language] || nameObj.en : "Unknown NPC";
    }

    // 新增：显示可记录的餐食类型提示
    addMealTypeHint(npc, availableMealTypes) {
        if (availableMealTypes.length === 0) return;

        const language = this.scene.playerData.language;
        const mealNames = {
            breakfast: language === "zh" ? "早餐" : "Breakfast",
            lunch: language === "zh" ? "午餐" : "Lunch",
            dinner: language === "zh" ? "晚餐" : "Dinner",
        };

        const hintText = availableMealTypes
            .map((type) => mealNames[type])
            .join(", ");
        const prefix = language === "zh" ? "可记录: " : "Available: ";

        npc.mealHint = this.scene.add.text(
            npc.sprite.x,
            npc.sprite.y + 40,
            prefix + hintText,
            {
                fontSize: "10px",
                fontFamily: "monospace",
                fill: "#fbbf24",
                backgroundColor: "#1f2937",
                padding: {x: 6, y: 3},
            }
        );
        npc.mealHint.setOrigin(0.5);
        npc.mealHint.setDepth(15);
    }

    // 检查是否可以与NPC交互
    canInteractWithNPC(npc) {

        const availableNPC = this.availableNPCs.find(
            (availableNPC) => availableNPC.npcId === npc.id
        );

        if (!availableNPC || !availableNPC.unlocked) {
            return false;
        }

        // 检查是否是当前天的NPC
        if (availableNPC.day !== this.playerStatus.currentDay) {
            return false;
        }

        if (availableNPC.hasCompletedDay) return false;

        // 检查是否还有可记录的餐食
        return (
            availableNPC.availableMealTypes &&
            availableNPC.availableMealTypes.length > 0
        );
    }

    // 显示交互阻止消息
    showInteractionBlockedMessage(npc) {
        const language = this.scene.playerData.language;
        let message;

        const availableNPC = this.availableNPCs.find(
            (availableNPC) => availableNPC.npcId === npc.id
        );

        if (!availableNPC) {
            message =
                language === "zh"
                    ? "这个NPC还未解锁，需要先完成前面的任务"
                    : "This NPC is not unlocked yet, complete previous tasks first";
        } else if (availableNPC.day > this.playerStatus.currentDay) {
            message =
                language === "zh"
                    ? `这是第${availableNPC.day}天的NPC，请先完成当前天的任务`
                    : `This is Day ${availableNPC.day} NPC, please complete current day's tasks first`;
        } else if (availableNPC.day < this.playerStatus.currentDay) {
            message =
                language === "zh"
                    ? "这是之前的NPC，当前无法再次对话"
                    : "This is a previous day's NPC, cannot interact again";
        } else if (availableNPC.hasCompletedDay) {
            message =
                language === "zh"
                    ? "今天已完成记录（已记录晚餐）。"
                    : "Today is complete (dinner recorded).";
        } else if (
            !availableNPC.availableMealTypes ||
            availableNPC.availableMealTypes.length === 0
        ) {
            message =
                language === "zh"
                    ? "今天已经没有可记录的餐食了"
                    : "No more meals available to record today";
        } else {
            message =
                language === "zh"
                    ? "暂时无法与此NPC对话"
                    : "Cannot interact with this NPC yet";
        }

        this.scene.showNotification(message, 3000);
    }

    // 新增：保存对话到数据库
    async saveConversationToDatabase(npcId, speaker, content, mealType = null) {
        try {
            const currentDay = this.playerStatus.currentDay;

            const response = await fetch(`${API_URL}/save-conversation`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    playerId: this.scene.playerId,
                    npcId: npcId,
                    day: currentDay,
                    speaker: speaker, // 'player' or 'npc'
                    content: content,
                    mealType: mealType,
                    sessionId: null, // 可以添加session管理
                }),
            });

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error("Error saving conversation:", error);
            return false;
        }
    }

    // 记录餐食到数据库 - 更新版本，自动保存线索
    // NPCManager.js
    async recordMeal(
        npcId,
        mealType,
        mealAnswers,
        conversationHistory,
        mealContent
    ) {
        try {
            const npc = this.npcs.get(npcId);
            const currentDay = this.playerStatus.currentDay;

            // 先保存对话历史到数据库（保持不变）
            if (conversationHistory && Array.isArray(conversationHistory)) {
                for (const dialog of conversationHistory) {
                    await this.saveConversationToDatabase(
                        npcId,
                        dialog.type === "user" ? "player" : "npc",
                        dialog.content,
                        mealType
                    );
                }
            }

            // 调后端
            const response = await fetch(`${API_URL}/record-meal`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    playerId: this.scene.playerId,
                    day: currentDay,
                    npcId,
                    npcName: npc ? npc.name : "Unknown NPC",
                    mealType,
                    mealAnswers,
                    conversationHistory,
                    mealContent:
                        mealContent && mealContent.trim()
                            ? mealContent
                            : (this.scene.playerData.language === "zh"
                                ? "未填写具体餐食"
                                : "No detailed meal provided"),
                }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error || "Failed to record meal");

            // 本地可用 NPC 状态最小更新（把当前餐别移出）
            const availableNPC = this.availableNPCs.find(
                (n) => n.npcId === npcId && n.day === currentDay
            );


            if (availableNPC) {
                availableNPC.mealsRecorded = (availableNPC.mealsRecorded || 0) + 1;
                availableNPC.hasRecordedMeal = true;

                // ✅ 优先使用后端返回的 availableMealTypes；若无则本地删掉当前餐别
                if (Array.isArray(data.availableMealTypes)) {
                    availableNPC.availableMealTypes = data.availableMealTypes;
                } else {
                    availableNPC.availableMealTypes = (availableNPC.availableMealTypes || []).filter(
                        (t) => t !== mealType
                    );
                }

                // ✅ 以服务器为准
                if (typeof data.hasCompletedDay === "boolean") {
                    availableNPC.hasCompletedDay = data.hasCompletedDay;
                }
            }


            // 晚餐给线索：前端立即显示（同时后端已落库）
            if (data.shouldGiveClue && data.clueText) {
                this.addClue(npcId, data.clueText, currentDay);
            }

            // ❗️关键：只在后端明确给出 newDay 时才切天 + 刷新
            if (data.newDay) {
                this.playerStatus.currentDay = data.newDay;

                this.scene.showNotification(
                    this.scene.playerData.language === "zh"
                        ? `已进入第${data.newDay}天！`
                        : `Day ${data.newDay} started!`,
                    2500
                );

                // 用服务器状态兜底一次（无需“乐观NPC覆盖”，以服务端为准）
                setTimeout(async () => {
                    await this.loadPlayerStatus();
                    this.updateNPCStates();
                }, 800);
            }

            // ❌ 不再做：本地“乐观跨天”覆盖 availableNPCs
            // ❌ 不再做：在未完成时调用 forceUpdateCurrentDay()
            // ❌ 不再做：循环重试同步（失败就保留当前本地状态即可）

            return {
                success: true,
                shouldGiveClue: !!data.shouldGiveClue,
                clueText: data.clueText,
                nextDayUnlocked: !!data.nextDayUnlocked,
                newDay: data.newDay || null,
            };
        } catch (error) {
            console.error("Error recording meal:", error);
            return {success: false, error: error.message};
        }
    }

    async checkAndUpdateCurrentDay() {
        const now = Date.now();
        if (now - this.lastCheckDayTime < this.checkDayInterval) {
            console.log("检查天数更新过于频繁，跳过");
            return;
        }
        this.lastCheckDayTime = now;

        if (!this.playerStatus) return;

        const currentDay = this.playerStatus.currentDay;
        const currentNPC = this.availableNPCs.find(npc => npc.day === currentDay);
        if (!currentNPC) return;

// ✅ DINNER_OK：只要服务器确认完成就切天（不再要求本地餐别清空）
        const isServerCompleted = currentNPC.hasCompletedDay === true;
        const hasNextDayNPC = this.availableNPCs.some(npc => npc.day === currentDay + 1);

        if (isServerCompleted && hasNextDayNPC) {
            console.log(`DINNER_OK: 服务器确认第${currentDay}天完成，切到第${currentDay + 1}天`);
            await this.forceUpdateCurrentDay();
        } else {
            console.log(`DINNER_OK: 等待服务器完成标记/或下一天未解锁`, {
                服务器确认完成: isServerCompleted,
                是否存在下一天NPC: hasNextDayNPC,
                本地剩余餐食: currentNPC.availableMealTypes
            });
        }
    }


// 在NPCManager类中添加
    async forceUpdateCurrentDay() {
        if (this.isUpdatingDay) {
            console.log("正在更新天数中，跳过重复调用");
            return false;
        }
        this.isUpdatingDay = true;

        try {
            const originalDay = this.playerStatus.currentDay;
            const response = await fetch(`${API_URL}/update-current-day`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({playerId: this.scene.playerId, currentDay: originalDay})
            });

            const data = await response.json();
            if (data.success) {
                console.log(`服务器确认天数更新：从${originalDay}→${data.newDay}`);
                // 仅在服务器成功返回后，才更新本地天数
                this.playerStatus.currentDay = data.newDay;
                // 延迟重新加载，确保服务器数据已写入
                setTimeout(async () => {
                    await this.loadPlayerStatus();
                    this.updateNPCStates();
                }, 1500); // 延长延迟至1.5秒，确保服务器同步
                this.scene.showNotification(
                    this.scene.playerData.language === "zh"
                        ? `已进入第${data.newDay}天！`
                        : `Day ${data.newDay} started!`,
                    3000
                );
                return true;
            } else {
                console.error("服务器拒绝更新天数：", data.error || "未知错误");
                // 服务器拒绝时，不更新本地天数
                return false;
            }
        } catch (error) {
            console.error("天数更新请求失败：", error);
            // 网络错误时，保持本地原天数
            return false;
        } finally {
            this.isUpdatingDay = false;
        }
    }

    // 获取每日进度
    getDailyProgress() {
        const currentDay = this.getCurrentDay();
        const currentNPC = this.availableNPCs.find((npc) => npc.day === currentDay);

        return {
            currentDay: currentDay,
            mealsRecorded: currentNPC ? currentNPC.mealsRecorded || 0 : 0,
            totalMealsRequired: 3,
            isComplete: currentNPC ? currentNPC.hasCompletedDay || false : false,
            remainingMealTypes: currentNPC ? currentNPC.availableMealTypes || [] : [],
        };
    }

    // 新增：添加线索到本地存储（现在主要用于UI更新）
    addClue(npcId, clueText, day) {
        const npc = this.npcs.get(npcId);
        const clueId = `${npcId}_${day}`;

        // 检查是否已存在相同的线索
        const existingIndex = this.clueRecords.findIndex((c) => c.id === clueId);
        if (existingIndex !== -1) {
            console.log("线索已存在，跳过添加:", clueId);
            return;
        }

        // 确保使用当前语言的线索文本
        const currentLanguageClue = this.getNPCClue(npcId);

        const clue = {
            id: clueId,
            npcId: npcId,
            npcName: npc ? npc.name : "Unknown NPC",
            clue: currentLanguageClue, // 使用当前语言的线索
            day: day,
            receivedAt: new Date(),
        };

        this.clueRecords.push(clue);

        // 通知UI管理器
        if (this.scene.uiManager && this.scene.uiManager.addClue) {
            this.scene.uiManager.addClue(clue);
        }

        console.log("新线索已添加到本地:", clue);
    }

    // 获取所有线索
    getAllClues() {
        return this.clueRecords.sort((a, b) => a.day - b.day);
    }

    // 移除NPC高亮时也要清理餐食提示
    removeNPCHighlight(npc) {
        if (npc.glowEffect) {
            npc.glowEffect.destroy();
            npc.glowEffect = null;
        }
        if (npc.clickArea) {
            npc.clickArea.destroy();
            npc.clickArea = null;
        }
        if (npc.mealHint) {
            npc.mealHint.destroy();
            npc.mealHint = null;
        }
        this.hideNPCHover(npc);
    }

    // 显示NPC悬停信息
    showNPCHover(npc) {
        if (npc.hoverText) return;

        const language = this.scene.playerData.language;
        const availableNPC = this.availableNPCs.find((n) => n.npcId === npc.id);

        let hintText;
        if (
            availableNPC &&
            availableNPC.availableMealTypes &&
            availableNPC.availableMealTypes.length > 0
        ) {
            const nextMeal = availableNPC.availableMealTypes[0];
            const mealNames = {
                breakfast: language === "zh" ? "早餐" : "Breakfast",
                lunch: language === "zh" ? "午餐" : "Lunch",
                dinner: language === "zh" ? "晚餐" : "Dinner",
            };

            hintText =
                language === "zh"
                    ? `记录${mealNames[nextMeal]}`
                    : `Record ${mealNames[nextMeal]}`;
        } else {
            hintText = language === "zh" ? "点击对话" : "Tap to talk";
        }

        npc.hoverText = this.scene.add.text(
            npc.sprite.x,
            npc.sprite.y - 50,
            hintText,
            {
                fontSize: "14px",
                fontFamily: "monospace",
                fill: "#ffd700",
                backgroundColor: "#000000",
                padding: {x: 8, y: 4},
            }
        );
        npc.hoverText.setOrigin(0.5);
        npc.hoverText.setDepth(20);

        this.scene.tweens.add({
            targets: npc.hoverText,
            y: npc.hoverText.y - 10,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });
    }

    // 其他方法保持不变
    createNPC(config) {
        // 定义 NPC id 与资源键的映射（对应 MainScene 中预加载的 npc1 到 npc7）
        const npcAssetMap = {
            village_head: "npc1",
            shop_owner: "npc2",
            spice_woman: "npc3",
            restaurant_owner: "npc4",
            fisherman: "npc5",
            old_friend: "npc6",
            secret_apprentice: "npc7"
        };

        // 根据 NPC id 获取对应的资源键
        const assetKey = npcAssetMap[config.id] || "npc1"; // 默认使用 npc1

        // 使用正确的资源键创建精灵
        const npcSprite = this.scene.add.sprite(0, 0, assetKey);
        npcSprite.setScale(this.mapScale * 0.15);
        npcSprite.setDepth(5);
        npcSprite.setVisible(false);

        // 添加到GridEngine
        this.scene.gridEngine.addCharacter({
            id: config.id,
            sprite: npcSprite,
            // walkingAnimationMapping: 6,
            startPosition: config.position,
        });

        // NPC数据
        const npcData = {
            id: config.id,
            name: config.name,
            position: config.position,
            sprite: npcSprite,
            day: config.day,
            isUnlocked: false,
            hasRecordedMeal: false,
            mealsRecorded: 0,
            hasCompletedDay: false,
            availableMealTypes: [],
            glowEffect: null,
            clickArea: null,
            hoverText: null,
            mealHint: null,
        };

        this.npcs.set(config.id, npcData);
        return npcData;
    }

    getNPCById(id) {
        const npc = this.npcs.get(id);
        if (!npc) return null;

        const npcAssetMap = {
            village_head: {portraitKey: "npc1head", backgroundKey: "npc1bg"},
            shop_owner: {portraitKey: "npc2head", backgroundKey: "npc2bg"},
            spice_woman: {portraitKey: "npc3head", backgroundKey: "npc3bg"},
            restaurant_owner: {portraitKey: "npc4head", backgroundKey: "npc4bg"},
            fisherman: {portraitKey: "npc5head", backgroundKey: "npc5bg"},
            old_friend: {portraitKey: "npc6head", backgroundKey: "npc6bg"},
            secret_apprentice: {portraitKey: "npc7head", backgroundKey: "npc7bg"},
        };

        const assets = npcAssetMap[npc.id] || {};
        return {
            ...npc,
            portraitKey: assets.portraitKey,
            backgroundKey: assets.backgroundKey,
        };
    }

    highlightNPC(npc) {
        // 移除旧的高亮
        this.removeNPCHighlight(npc);

        // 创建新的高亮效果
        const glowEffect = this.scene.add.graphics();
        glowEffect.lineStyle(3, 0xffd700, 0.8);
        glowEffect.strokeCircle(0, 0, 25);
        glowEffect.setPosition(npc.sprite.x, npc.sprite.y);
        glowEffect.setDepth(4);

        // 添加脉冲动画
        this.scene.tweens.add({
            targets: glowEffect,
            scaleX: {from: 1, to: 1.3},
            scaleY: {from: 1, to: 1.3},
            alpha: {from: 0.8, to: 0.2},
            duration: 1500,
            repeat: -1,
            yoyo: true,
        });

        npc.glowEffect = glowEffect;
    }

    addNPCClickArea(npc) {
        if (npc.clickArea) {
            npc.clickArea.destroy();
        }

        const clickRadius = 40;
        npc.clickArea = this.scene.add.graphics();
        npc.clickArea.fillStyle(0x00ff00, 0);
        npc.clickArea.fillCircle(0, 0, clickRadius);
        npc.clickArea.setPosition(npc.sprite.x, npc.sprite.y);
        npc.clickArea.setDepth(3);
        npc.clickArea.setInteractive(
            new Phaser.Geom.Circle(0, 0, clickRadius),
            Phaser.Geom.Circle.Contains
        );

        npc.clickArea.on("pointerdown", () => {
            console.log(`NPC ${npc.id} clicked directly!`);
            if (this.canInteractWithNPC(npc)) {
                this.startDialogScene(npc.id);
            } else {
                this.showInteractionBlockedMessage(npc);
            }
        });

        npc.clickArea.on("pointerover", () => {
            this.showNPCHover(npc);
        });

        npc.clickArea.on("pointerout", () => {
            this.hideNPCHover(npc);
        });
    }

    hideNPCHover(npc) {
        if (npc.hoverText) {
            npc.hoverText.destroy();
            npc.hoverText = null;
        }
    }

    startDialogScene(npcId) {
        console.log(`Starting dialog scene with NPC: ${npcId}`);
        this.scene.scene.pause("MainScene");
        this.scene.scene.launch("DialogScene", {
            npcId: npcId,
            npcManager: this,
            playerData: this.scene.playerData,
            mainScene: this.scene,
        });
    }

    // 完成NPC交互
    async completeNPCInteraction(npcId) {
        try {
            const currentDay = this.playerStatus.currentDay;

            const response = await fetch(`${API_URL}/complete-npc-interaction`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    playerId: this.scene.playerId,
                    day: currentDay,
                    npcId: npcId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // 更新本地状态
                const availableNPC = this.availableNPCs.find((n) => n.npcId === npcId);
                if (availableNPC) {
                    availableNPC.completed = true;
                }

                // 移除高亮效果
                const npc = this.npcs.get(npcId);
                if (npc) {
                    this.removeNPCHighlight(npc);
                }

                // 检查是否游戏完成
                if (this.playerStatus.currentDay >= 7 && availableNPC?.completed) {
                    this.triggerGameCompletion();
                }

                return true;
            } else {
                throw new Error(data.error || "Failed to complete NPC interaction");
            }
        } catch (error) {
            console.error("Error completing NPC interaction:", error);
            return false;
        }
    }

    async triggerGameCompletion() {
        const language = this.scene.playerData.language;

        this.scene.showNotification(
            language === "zh"
                ? "🎊 恭喜完成7天的旅程！正在生成你的专属彩蛋..."
                : "🎊 Congratulations on completing the 7-day journey! Generating your personalized ending...",
            3000
        );

        setTimeout(async () => {
            await this.triggerFinalEgg();
        }, 3000);
    }

    async triggerFinalEgg() {
        try {
            const response = await fetch(`${API_URL}/generate-final-egg`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    playerId: this.scene.playerId,
                    language: this.scene.playerData.language,
                }),
            });

            const data = await response.json();

            if (data.success) {
                this.showFinalEggDialog(data.eggContent);
            } else {
                throw new Error(data.error || "Failed to generate final egg");
            }
        } catch (error) {
            console.error("Error generating final egg:", error);
            const fallbackEgg = this.generateLocalFinalEgg();
            this.showFinalEggDialog(fallbackEgg);
        }
    }

    generateLocalFinalEgg() {
        const language = this.scene.playerData.language;
        const mealCount = this.mealRecords.length;

        if (language === "zh") {
            return `亲爱的徒弟，\n\n通过这7天的记录，我看到了你对美食和生活的用心。你记录了${mealCount}餐，每一顿饭都是一个故事，每一次品尝都是一次成长。\n\n真正的烹饪秘诀不在于复杂的技巧，而在于用心对待每一餐，就像你这七天所做的那样。\n\n继续用爱烹饪，用心生活。\n\n——你的师父`;
        } else {
            return `Dear apprentice,\n\nThrough these 7 days of records, I see your dedication to food and life. You recorded ${mealCount} meals, each one a story, each taste a moment of growth.\n\nThe real secret of cooking lies not in complex techniques, but in treating every meal with heart, just as you have done these seven days.\n\nContinue cooking with love and living with heart.\n\n—— Your Master`;
        }
    }

    showFinalEggDialog(content) {
        if (this.scene.uiManager) {
            this.scene.uiManager.showFinalEgg(content);
        }

        if (this.scene.onGameCompleted) {
            this.scene.onGameCompleted();
        }
    }

    getCurrentDay() {
        return this.playerStatus ? this.playerStatus.currentDay : 1;
    }

    getNPCClue(npcId) {
        const language = this.scene.playerData.language;
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

    updateScale(newScale) {
        this.mapScale = newScale;
        this.npcs.forEach((npc) => {
            if (npc.sprite) {
                // 原来：newScale * 0.3
                // 修改为：newScale * 0.15 (保持一致)
                npc.sprite.setScale(newScale * 0.15); // 这里也要对应修改
            }
            if (npc.glowEffect) {
                npc.glowEffect.setPosition(npc.sprite.x, npc.sprite.y);
            }
            if (npc.clickArea) {
                npc.clickArea.setPosition(npc.sprite.x, npc.sprite.y);
            }
            if (npc.mealHint) {
                npc.mealHint.setPosition(npc.sprite.x, npc.sprite.y + 40);
            }
        });
    }

    destroy() {
        this.npcs.forEach((npc) => {
            this.removeNPCHighlight(npc);
        });
    }
}