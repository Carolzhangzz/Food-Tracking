// NPCManager.js - 更新后的NPC管理器，支持7天进度系统
import Phaser from 'phaser';

export default class NPCManager {
    constructor(scene, mapScale) {
        this.scene = scene;
        this.mapScale = mapScale;
        this.npcs = new Map();
        this.dialogSystem = null;
        this.currentDay = 1;
        this.dailyMealsRecorded = 0;
        this.totalMealsRequired = 3; // 早餐、午餐、晚餐
        this.initializeNPCs();
    }

    setDialogSystem(dialogSystem) {
        this.dialogSystem = dialogSystem;
    }

    initializeNPCs() {
        // 7个NPC配置数据（对应7天）
        const npcConfigs = [
            {
                id: 'village_head',
                name: this.scene.playerData.language === 'zh' ? '村长' : 'Village Head',
                position: { x: 1, y: 1},
                day: 1,
                isUnlocked: true
            },
            {
                id: 'shop_owner',
                name: this.scene.playerData.language === 'zh' ? '店主阿桂' : 'Grace (Shop Owner)',
                position: { x: 12, y: 5 },
                day: 2,
                isUnlocked: false
            },
            {
                id: 'spice_woman',
                name: this.scene.playerData.language === 'zh' ? '香料婆婆' : 'Spice Woman',
                position: { x: 8, y: 12 },
                day: 3,
                isUnlocked: false
            },
            {
                id: 'restaurant_owner',
                name: this.scene.playerData.language === 'zh' ? '餐厅店长老韩' : 'Han (Restaurant Owner)',
                position: { x: 15, y: 8 },
                day: 4,
                isUnlocked: false
            },
            {
                id: 'fisherman',
                name: this.scene.playerData.language === 'zh' ? '渔夫阿梁' : 'Leon (Fisherman)',
                position: { x: 3, y: 14 },
                day: 5,
                isUnlocked: false
            },
            {
                id: 'old_friend',
                name: this.scene.playerData.language === 'zh' ? '林川' : 'Rowan',
                position: { x: 18, y: 12 },
                day: 6,
                isUnlocked: false
            },
            {
                id: 'secret_apprentice',
                name: this.scene.playerData.language === 'zh' ? '念念' : 'NianNian',
                position: { x: 10, y: 3 },
                day: 7,
                isUnlocked: false
            }
        ];

        // 创建所有NPC
        npcConfigs.forEach(config => {
            this.createNPC(config);
        });

        // 加载当前进度
        this.loadGameProgress();

        console.log("NPCs initialized:", this.npcs.size);
    }

    async loadGameProgress() {
        try {
            const response = await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/game-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: this.scene.playerId })
            });
            
            if (response.ok) {
                const progress = await response.json();
                this.currentDay = progress.currentDay || 1;
                this.dailyMealsRecorded = progress.dailyMealsRecorded || 0;
                
                // 解锁对应的NPC
                this.unlockNPCsUpToDay(this.currentDay);
                
                console.log(`Game progress loaded: Day ${this.currentDay}, Meals recorded: ${this.dailyMealsRecorded}`);
            }
        } catch (error) {
            console.error('Error loading game progress:', error);
            // 使用默认值：第一天开始
            this.currentDay = 1;
            this.dailyMealsRecorded = 0;
        }
    }

    unlocksUpToDay(day) {
        this.npcs.forEach(npc => {
            if (npc.day <= day) {
                npc.isUnlocked = true;
                npc.sprite.setVisible(true);
            }
        });
    }

    createNPC(config) {
        const npcSprite = this.scene.add.sprite(0, 0, "npc");
        npcSprite.setScale(this.mapScale * 0.3);
        npcSprite.setDepth(5);
        npcSprite.setVisible(config.isUnlocked);

        // 添加到GridEngine
        this.scene.gridEngine.addCharacter({
            id: config.id,
            sprite: npcSprite,
            walkingAnimationMapping: 6,
            startPosition: config.position,
        });

        // NPC数据
        const npcData = {
            id: config.id,
            name: config.name,
            position: config.position,
            sprite: npcSprite,
            isUnlocked: config.isUnlocked,
            day: config.day,
            hasCompletedDialog: false,
            dialogState: 'initial',
            currentMeal: null,
            mealsRecordedToday: 0,
            hasClueGiven: false
        };

        this.npcs.set(config.id, npcData);
        console.log(`NPC ${config.id} created for day ${config.day}`);
        return npcData;
    }

    getNPCById(id) {
        return this.npcs.get(id);
    }

    getCurrentDayNPC() {
        return Array.from(this.npcs.values()).find(npc => npc.day === this.currentDay);
    }

    checkInteractions() {
        if (this.dialogSystem && this.dialogSystem.isDialogActive()) {
            return;
        }

        const currentNPC = this.getCurrentDayNPC();
        if (currentNPC && currentNPC.isUnlocked && this.isPlayerNearNPC(currentNPC.id)) {
            if (Phaser.Input.Keyboard.JustDown(this.scene.interactKey)) {
                this.dialogSystem.startDialog(currentNPC.id);
            }
        }
    }

    isPlayerNearNPC(npcId) {
        try {
            const playerPos = this.scene.gridEngine.getPosition("player");
            const npcPos = this.scene.gridEngine.getPosition(npcId);
            return Math.abs(playerPos.x - npcPos.x) + Math.abs(playerPos.y - npcPos.y) === 1;
        } catch (error) {
            console.error(`Error checking distance to NPC ${npcId}:`, error);
            return false;
        }
    }

    async handleNPCDialog(npcId, userInput = "") {
        const npc = this.npcs.get(npcId);
        if (!npc) {
            return { response: "NPC not found", buttons: [], next: false };
        }

        const language = this.scene.playerData.language;
        
        switch (npc.dialogState) {
            case 'initial':
                return this.handleInitialDialog(npc);
                
            case 'meal_selection':
                return this.handleMealSelection(npc, userInput);
                
            case 'food_recording':
                return await this.handleFoodRecording(npc, userInput);
                
            case 'completion_check':
                return this.handleCompletionCheck(npc, userInput);
                
            case 'clue_giving':
                return this.handleClueGiving(npc);
                
            case 'completed':
                return this.handleCompletedDialog(npc);
                
            default:
                return { response: "Dialog state error", buttons: [], next: false };
        }
    }

    handleInitialDialog(npc) {
        const language = this.scene.playerData.language;
        npc.dialogState = 'meal_selection';
        
        const greeting = this.getNPCGreeting(npc.id);
        const question = language === 'zh' ? 
            "你想记录哪一餐的食物日记？" : 
            "Which meal would you like to record in your food journal?";
        const buttons = language === 'zh' ? 
            ["早餐", "午餐", "晚餐"] : 
            ["Breakfast", "Lunch", "Dinner"];
        
        return {
            response: greeting + " " + question,
            buttons: buttons,
            next: true
        };
    }

    handleMealSelection(npc, userInput) {
        const language = this.scene.playerData.language;
        const mealMap = {
            'Breakfast': 'breakfast', 'Lunch': 'lunch', 'Dinner': 'dinner',
            '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner'
        };
        
        npc.currentMeal = mealMap[userInput] || 'breakfast';
        npc.dialogState = 'food_recording';
        
        const prompt = language === 'zh' ? 
            `请详细描述你的${userInput}，包括吃了什么、怎么做的、什么时候吃的、为什么选择这些食物等。` :
            `Please describe your ${userInput} in detail, including what you ate, how it was prepared, when you ate it, why you chose these foods, etc.`;
        
        return {
            response: prompt,
            buttons: [],
            next: true,
            requireInput: true
        };
    }

    async handleFoodRecording(npc, userInput) {
        const language = this.scene.playerData.language;
        
        if (!userInput || userInput.trim().length === 0) {
            const prompt = language === 'zh' ? 
                "请输入你的食物记录。" : 
                "Please enter your food record.";
            return {
                response: prompt,
                buttons: [],
                next: true,
                requireInput: true
            };
        }

        try {
            // 调用食物记录API
            const response = await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/record-meal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: this.scene.playerId,
                    npcId: npc.id,
                    day: this.currentDay,
                    meal: npc.currentMeal,
                    content: userInput,
                    language: language
                })
            });

            if (response.ok) {
                const result = await response.json();
                npc.mealsRecordedToday++;
                this.dailyMealsRecorded++;
                
                npc.dialogState = 'completion_check';
                
                const thankYou = language === 'zh' ? 
                    "谢谢你与我分享这顿饭的记录。" : 
                    "Thanks for sharing your meal record with me.";
                
                const question = language === 'zh' ? 
                    "你今天已经记录了所有三餐了吗？" : 
                    "Have you recorded all three meals today?";
                
                const buttons = language === 'zh' ? ["是的", "还没有"] : ["Yes", "Not yet"];
                
                return {
                    response: thankYou + " " + question,
                    buttons: buttons,
                    next: true
                };
            } else {
                throw new Error('Failed to record meal');
            }
        } catch (error) {
            console.error('Error recording meal:', error);
            const errorMsg = language === 'zh' ? 
                "记录失败，请重试。" : 
                "Recording failed, please try again.";
            return {
                response: errorMsg,
                buttons: [],
                next: true,
                requireInput: true
            };
        }
    }

    handleCompletionCheck(npc, userInput) {
        const language = this.scene.playerData.language;
        const isComplete = userInput === "Yes" || userInput === "是的";
        
        if (isComplete) {
            npc.dialogState = 'clue_giving';
            npc.hasCompletedDialog = true;
            return this.handleClueGiving(npc);
        } else {
            npc.dialogState = 'completed';
            const encouragement = this.getVagueResponse();
            return {
                response: encouragement,
                buttons: [],
                next: false
            };
        }
    }

    handleClueGiving(npc) {
        const language = this.scene.playerData.language;
        npc.hasClueGiven = true;
        npc.dialogState = 'completed';
        
        const clue = this.getNPCClue(npc.id);
        
        // 添加线索到UI管理器
        if (this.scene.uiManager) {
            this.scene.uiManager.addClue({
                npcName: npc.name,
                clue: clue,
                day: this.currentDay
            });
        }
        
        // 检查是否可以进入下一天
        this.checkDayProgression();
        
        return {
            response: clue,
            buttons: [],
            next: false
        };
    }

    handleCompletedDialog(npc) {
        const language = this.scene.playerData.language;
        const completedMsg = language === 'zh' ? 
            "我们今天已经聊过了。" : 
            "We've already talked today.";
        return {
            response: completedMsg,
            buttons: [],
            next: false
        };
    }

    async checkDayProgression() {
        const currentNPC = this.getCurrentDayNPC();
        if (currentNPC && currentNPC.hasCompletedDialog && currentNPC.hasClueGiven) {
            if (this.currentDay < 7) {
                // 进入下一天
                this.currentDay++;
                this.dailyMealsRecorded = 0;
                
                // 解锁下一个NPC
                const nextNPC = Array.from(this.npcs.values()).find(npc => npc.day === this.currentDay);
                if (nextNPC) {
                    nextNPC.isUnlocked = true;
                    nextNPC.sprite.setVisible(true);
                    
                    const message = this.scene.playerData.language === 'zh' ? 
                        `第${this.currentDay}天开始！新的NPC ${nextNPC.name} 已解锁！` : 
                        `Day ${this.currentDay} begins! New NPC ${nextNPC.name} unlocked!`;
                    this.scene.showNotification(message);
                }
                
                // 保存进度
                await this.saveGameProgress();
            } else {
                // 第7天完成，触发最终彩蛋
                await this.triggerFinalEgg();
            }
        }
    }

    async saveGameProgress() {
        try {
            await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/save-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: this.scene.playerId,
                    currentDay: this.currentDay,
                    dailyMealsRecorded: this.dailyMealsRecorded
                })
            });
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    async triggerFinalEgg() {
        const language = this.scene.playerData.language;
        
        try {
            // 调用LLM生成最终彩蛋
            const response = await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/generate-final-egg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: this.scene.playerId,
                    language: language
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showFinalEggDialog(result.eggContent);
            }
        } catch (error) {
            console.error('Error generating final egg:', error);
            const fallbackMsg = language === 'zh' ? 
                "恭喜你完成了7天的旅程！你找到了师父的秘方线索。" :
                "Congratulations on completing the 7-day journey! You found clues to your master's secret recipe.";
            this.showFinalEggDialog(fallbackMsg);
        }
    }

    showFinalEggDialog(content) {
        // 显示最终彩蛋对话框
        if (this.scene.uiManager) {
            this.scene.uiManager.showFinalEgg(content);
        }
    }

    getNPCGreeting(npcId) {
        const language = this.scene.playerData.language;
        const greetings = {
            'village_head': {
                'zh': "你总算回来了……你师傅，他出事了。",
                'en': "You're finally back... Your master, something happened to him."
            },
            'shop_owner': {
                'zh': "哟，回来了啊。你师傅离开那天，也是从这门口进来的。",
                'en': "Oh, you're back. Your master came through this door the day he left."
            },
            'spice_woman': {
                'zh': "……你是他的小徒弟吧？",
                'en': "...You're his little apprentice, aren't you?"
            },
            'restaurant_owner': {
                'zh': "你手里那点调料味儿，我一闻就知道——她让你来的。",
                'en': "I can smell that blend from the doorway... let me guess. She sent you."
            },
            'fisherman': {
                'zh': "诶，小X，这么多年了。没想到啊，还能再见到你。",
                'en': "Well now... Look who it is. Been a long time, hasn't it?"
            },
            'old_friend': {
                'zh': "你终于来了，我的好弟兄，最近过得如何？",
                'en': "You finally came, my good brother, how have you been recently?"
            },
            'secret_apprentice': {
                'zh': "你终于来啦哥哥，我在这等了好久好久都以为你不会来了呢。",
                'en': "You finally came, brother. I've been waiting here for so long, I thought you wouldn't come."
            }
        };
        
        return greetings[npcId] ? 
            (greetings[npcId][language] || greetings[npcId]['en']) : 
            "Hello!";
    }

    getVagueResponse() {
        const language = this.scene.playerData.language;
        const responses = language === 'zh' ? [
            "能听到你如此详细的分享真是太好了...也许下次这些碎片会更有意义。",
            "我一直在努力记住他关于那些食材说过的话...吃完下顿饭后我们再聊吧。"
        ] : [
            "It's nice hearing you share in such detail... Maybe next time the pieces will make more sense.",
            "I keep trying to remember exactly what he said about those ingredients... Let's talk again after your next meal."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getNPCClue(npcId) {
        const language = this.scene.playerData.language;
        const clues = {
            'village_head': {
                'zh': "三天前，他不声不响地离开了村子。只留下厨房还温着火，却不见人影。那本他最宝贝的秘方笔记……也一并消失了。",
                'en': "Three days ago, he left the village without a word. The fire in his kitchen was still warm—but he was gone. And with him, his most treasured possession: that recipe journal he guarded with his life."
            },
            'shop_owner': {
                'zh': "他最常买哪几样料，可那天——他却突然问起'青木籽'。他以前从来不碰那玩意儿。",
                'en': "He always bought the same ingredients, but that day—he suddenly asked about 'greenwood seeds'. He never touched those before."
            },
            'spice_woman': {
                'zh': "他说——'要不是那个人把它弄俗了'，他都不想再碰。你知道他说的是谁吗？",
                'en': "He said—'If it weren't for that person making it vulgar', he wouldn't want to touch it again. Do you know who he was talking about?"
            },
            'restaurant_owner': {
                'zh': "有一锅粥，他始终没让我碰。说什么得亲自守着火慢慢熬着。'云头鲤'。",
                'en': "There was one pot—congee with Yunhead Carp. He never let me touch it. Had to be slow cooked. Alone. By the river."
            },
            'fisherman': {
                'zh': "你师傅……他那天，在那块老礁石边，煮了一锅鱼粥。一锅白，一锅清。没叫我尝，就说了句：'等潮涨再开。'",
                'en': "Your master... that day, by the old rocks, he made two pots of fish congee. One milky, one clear. He didn't let me taste a drop. Just said: 'Open it when the tide comes in.'"
            },
            'old_friend': {
                'zh': "师傅从小不喜欢我你了解的，自然什么都不会和我说。但是念念，他最近收了一个孩子叫念念。住在村尾的阁楼。",
                'en': "Master never liked me since childhood, naturally he wouldn't tell me anything. But about NianNian, he recently took in a child called NianNian. Lives in the attic at the end of the village."
            },
            'secret_apprentice': {
                'zh': "他把最后一页藏在他'最常回头看的地方'。不是厨房，也不是餐馆。是他写下第一道菜的地方！在阁楼上那道木梁上。",
                'en': "He hid the last page in the place he 'most often looked back at'. Not the kitchen, not the restaurant. The place where he wrote his first recipe! On the wooden beam in the attic."
            }
        };
        
        return clues[npcId] ? 
            (clues[npcId][language] || clues[npcId]['en']) : 
            "No clue available";
    }


    // npc 的大小
    updateScale(newScale) {
        this.mapScale = newScale;
        this.npcs.forEach(npc => {
            if (npc.sprite) {
                npc.sprite.setScale(newScale * 0.1);
            }
        });
    }

    getAllClues() {
        const clues = [];
        this.npcs.forEach(npc => {
            if (npc.hasClueGiven) {
                clues.push({
                    npcName: npc.name,
                    clue: this.getNPCClue(npc.id),
                    day: npc.day
                });
            }
        });
        return clues.sort((a, b) => a.day - b.day);
    }

    getCurrentDay() {
        return this.currentDay;
    }

    getDailyProgress() {
        return {
            currentDay: this.currentDay,
            mealsRecorded: this.dailyMealsRecorded,
            totalMealsRequired: this.totalMealsRequired,
            isComplete: this.dailyMealsRecorded >= this.totalMealsRequired
        };
    }
}