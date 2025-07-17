// NPCManager.js - NPC管理器
import Phaser from 'phaser';

export default class NPCManager {
    constructor(scene, mapScale) {
        this.scene = scene;
        this.mapScale = mapScale;
        this.npcs = new Map();
        this.dialogSystem = null;
        this.initializeNPCs();
    }

    setDialogSystem(dialogSystem) {
        this.dialogSystem = dialogSystem;
    }

    initializeNPCs() {
        // NPC配置数据
        const npcConfigs = [
            {
                id: 'uncle_bo',
                name: 'Uncle Bo',
                position: { x: 1, y: 7 },
                isUnlocked: true,
                day: 1
            },
            {
                id: 'farmer',
                name: 'Farmer Joe', 
                position: { x: 8, y: 3 },
                isUnlocked: false,
                day: 2
            }
            // 可以继续添加更多NPC
        ];

        // 创建所有NPC
        npcConfigs.forEach(config => {
            this.createNPC(config);
        });

        console.log("NPCs initialized:", this.npcs.size);
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
            selectedMeal: null,
            vagueTries: 0
        };

        this.npcs.set(config.id, npcData);
        console.log(`NPC ${config.id} created at position:`, config.position);
        return npcData;
    }

    getNPCById(id) {
        return this.npcs.get(id);
    }

    checkInteractions() {
        if (this.dialogSystem && this.dialogSystem.isDialogActive()) {
            return; // 对话进行中时不检查交互
        }

        this.npcs.forEach((npc) => {
            if (npc.isUnlocked && this.isPlayerNearNPC(npc.id)) {
                if (Phaser.Input.Keyboard.JustDown(this.scene.interactKey)) {
                    this.dialogSystem.startDialog(npc.id);
                }
            }
        });
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

    unlockNextNPC(currentNPCDay) {
        const nextNPC = Array.from(this.npcs.values()).find(npc => npc.day === currentNPCDay + 1);
        if (nextNPC && !nextNPC.isUnlocked) {
            nextNPC.isUnlocked = true;
            nextNPC.sprite.setVisible(true);
            console.log(`NPC ${nextNPC.id} unlocked!`);
            
            const message = this.scene.playerData.language === 'zh' ? 
                `新的NPC ${nextNPC.name} 已解锁！` : 
                `New NPC ${nextNPC.name} unlocked!`;
            this.scene.showNotification(message);
        }
    }

    updateScale(newScale) {
        this.mapScale = newScale;
        this.npcs.forEach(npc => {
            if (npc.sprite) {
                npc.sprite.setScale(newScale * 0.3);
            }
        });
    }

    async handleNPCDialog(npcId, userInput = "") {
        const npc = this.npcs.get(npcId);
        if (!npc) {
            return {
                response: "NPC not found",
                buttons: [],
                next: false
            };
        }

        const language = this.scene.playerData.language;
        
        switch (npc.dialogState) {
            case 'initial':
                npc.dialogState = 'food_question';
                const greeting = this.getNPCGreeting(npcId);
                const question = language === 'zh' ? 
                    "你想了解我哪一餐的食物记录？" : 
                    "Which meal would you like to know about my food journaling?";
                const buttons = language === 'zh' ? 
                    ["早餐", "午餐", "晚餐"] : 
                    ["Breakfast", "Lunch", "Dinner"];
                
                return {
                    response: greeting + " " + question,
                    buttons: buttons,
                    next: true
                };

            case 'food_question':
                const mealMap = {
                    'Breakfast': 'breakfast', 'Lunch': 'lunch', 'Dinner': 'dinner',
                    '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner'
                };
                
                npc.selectedMeal = mealMap[userInput] || 'breakfast';
                
                if (npc.selectedMeal === 'dinner') {
                    npc.hasCompletedDialog = true;
                    npc.dialogState = 'completed';
                    
                    // 解锁下一个NPC
                    this.unlockNextNPC(npc.day);
                    
                    const clue = this.getNPCClue(npcId);
                    // 通知UI管理器添加线索
                    if (this.scene.uiManager) {
                        this.scene.uiManager.addClue({
                            npcName: npc.name,
                            clue: clue
                        });
                    }
                    
                    return {
                        response: clue,
                        buttons: [],
                        next: false
                    };
                } else {
                    npc.vagueTries++;
                    const vagueResponse = this.getVagueResponse();
                    
                    if (npc.vagueTries >= 2) {
                        npc.dialogState = 'completed';
                        return {
                            response: vagueResponse,
                            buttons: [],
                            next: false
                        };
                    } else {
                        const question = language === 'zh' ? 
                            "你想了解我哪一餐的食物记录？" : 
                            "Which meal would you like to know about my food journaling?";
                        const buttons = language === 'zh' ? 
                            ["早餐", "午餐", "晚餐"] : 
                            ["Breakfast", "Lunch", "Dinner"];
                        
                        return {
                            response: vagueResponse + " " + question,
                            buttons: buttons,
                            next: true
                        };
                    }
                }

            case 'completed':
                const completedMsg = language === 'zh' ? 
                    "我们已经聊过了。" : 
                    "We've already talked.";
                return {
                    response: completedMsg,
                    buttons: [],
                    next: false
                };

            default:
                return {
                    response: "Error in dialog state",
                    buttons: [],
                    next: false
                };
        }
    }

    getNPCGreeting(npcId) {
        const language = this.scene.playerData.language;
        const greetings = {
            'uncle_bo': {
                'zh': "你好！我是博叔。你终于回来了...我们需要谈谈你师父的事情。",
                'en': "Hello! I'm Uncle Bo. You're finally back... We need to talk about your master."
            },
            'farmer': {
                'zh': "你好！我是农夫乔。你师父是我的老顾客，听说他失踪了...真是令人担心。",
                'en': "Hello! I'm Farmer Joe. Your master was a regular customer, heard he went missing... quite worrying."
            }
        };
        
        return greetings[npcId] ? 
            (greetings[npcId][language] || greetings[npcId]['en']) : 
            "Hello!";
    }

    getVagueResponse() {
        const language = this.scene.playerData.language;
        const responses = language === 'zh' ? [
            "嗯...那个时候我记录得不太清楚...",
            "抱歉，我对那餐的记录比较模糊..."
        ] : [
            "Hmm... I didn't record that meal very clearly...",
            "Sorry, my records for that meal are quite vague..."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getNPCClue(npcId) {
        const language = this.scene.playerData.language;
        const clues = {
            'uncle_bo': {
                'zh': "三天前，他不声不响地离开了村子。他厨房里的火还是温的，但人已经不见了。你应该知道...他从来不是那种会无缘无故消失的人。",
                'en': "Three days ago, he left the village without a word. The fire in his kitchen was still warm—but he was gone. You know as well as I do… he was never the kind to vanish without a reason."
            },
            'farmer': {
                'zh': "你师父经常在这里买新鲜蔬菜。上周他问我有没有特殊的香料，说是要做一道失传的菜。我告诉他去找老李，他那里有稀有的调料。",
                'en': "Your master often bought fresh vegetables here. Last week he asked me if I had any special spices, said he wanted to make a lost recipe. I told him to find Old Li, he has rare seasonings."
            }
        };
        
        return clues[npcId] ? 
            (clues[npcId][language] || clues[npcId]['en']) : 
            "No clue available";
    }

    getAllClues() {
        const clues = [];
        this.npcs.forEach(npc => {
            if (npc.hasCompletedDialog && npc.selectedMeal === 'dinner') {
                clues.push({
                    npcName: npc.name,
                    clue: this.getNPCClue(npc.id)
                });
            }
        });
        return clues;
    }
}