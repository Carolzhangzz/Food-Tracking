// NPCBase.js - NPC基础类
export default class NPCBase {
  constructor(scene, config) {
    this.scene = scene;
    this.id = config.id;
    this.name = config.name;
    this.position = config.position;
    this.spriteKey = config.spriteKey;
    this.isUnlocked = config.isUnlocked || false;
    this.hasCompletedDialog = false;
    this.dialogState = 'initial'; // initial, food_question, completed
    this.selectedMeal = null;
    this.vagueTries = 0; // 记录vague回复次数
    this.maxVagueTries = 2;
    
    this.createSprite();
    this.setupInteraction();
  }

  createSprite() {
    this.sprite = this.scene.add.sprite(0, 0, this.spriteKey);
    this.sprite.setScale(0.15);
    this.sprite.setDepth(5);
    
    // 添加到GridEngine
    this.scene.gridEngine.addCharacter({
      id: this.id,
      sprite: this.sprite,
      walkingAnimationMapping: 6,
      startPosition: this.position,
    });

    // 如果未解锁，隐藏NPC
    if (!this.isUnlocked) {
      this.sprite.setVisible(false);
    }
  }

  setupInteraction() {
    // 在场景的update方法中会检查距离和交互
  }

  unlock() {
    this.isUnlocked = true;
    this.sprite.setVisible(true);
    console.log(`NPC ${this.id} unlocked!`);
  }

  isPlayerNearby() {
    const playerPos = this.scene.gridEngine.getPosition("player");
    const npcPos = this.scene.gridEngine.getPosition(this.id);
    return Math.abs(playerPos.x - npcPos.x) + Math.abs(playerPos.y - npcPos.y) === 1;
  }

  // 检查是否可以解锁下一个NPC
  canUnlockNext() {
    return this.hasCompletedDialog && this.selectedMeal === 'dinner';
  }

  // 获取初始问候语
  getInitialGreeting() {
    const language = this.scene.playerData.language;
    if (language === 'zh') {
      return `你好！我是${this.name}。`;
    } else {
      return `Hello! I'm ${this.name}.`;
    }
  }

  // 获取餐点问题
  getMealQuestion() {
    const language = this.scene.playerData.language;
    if (language === 'zh') {
      return "你想了解我哪一餐的食物记录？";
    } else {
      return "Which meal would you like to know about my food journaling?";
    }
  }

  // 获取餐点选择按钮
  getMealButtons() {
    const language = this.scene.playerData.language;
    if (language === 'zh') {
      return ["早餐", "午餐", "晚餐"];
    } else {
      return ["Breakfast", "Lunch", "Dinner"];
    }
  }

  // 获取vague回复
  getVagueResponse() {
    const language = this.scene.playerData.language;
    const responses = language === 'zh' ? [
      "嗯...那个时候我记录得不太清楚...",
      "抱歉，我对那餐的记录比较模糊..."
    ] : [
      "Hmm... I didn't record that meal very clearly...",
      "Sorry, my records for that meal are quite vague..."
    ];
    
    return responses[Math.min(this.vagueTries, responses.length - 1)];
  }

  // 获取线索（每个NPC重写此方法）
  getClue() {
    const language = this.scene.playerData.language;
    if (language === 'zh') {
      return "这是一个基础线索。";
    } else {
      return "This is a base clue.";
    }
  }

  // 处理对话逻辑
  async handleDialog(userInput = "") {
    const language = this.scene.playerData.language;
    
    switch (this.dialogState) {
      case 'initial':
        this.dialogState = 'food_question';
        return {
          response: this.getInitialGreeting() + " " + this.getMealQuestion(),
          buttons: this.getMealButtons(),
          next: true
        };

      case 'food_question':
        // 处理餐点选择
        const mealMap = {
          'Breakfast': 'breakfast',
          'Lunch': 'lunch', 
          'Dinner': 'dinner',
          '早餐': 'breakfast',
          '午餐': 'lunch',
          '晚餐': 'dinner'
        };
        
        this.selectedMeal = mealMap[userInput] || 'breakfast';
        
        if (this.selectedMeal === 'dinner') {
          // 选择晚餐，给出线索
          this.hasCompletedDialog = true;
          this.dialogState = 'completed';
          
          // 添加线索到玩家记录
          this.scene.addClueToJournal(this.getClue());
          
          return {
            response: this.getClue(),
            buttons: [],
            next: false
          };
        } else {
          // 选择其他餐点，给出vague回复
          this.vagueTries++;
          
          if (this.vagueTries >= this.maxVagueTries) {
            this.dialogState = 'completed';
            return {
              response: this.getVagueResponse(),
              buttons: [],
              next: false
            };
          } else {
            return {
              response: this.getVagueResponse() + " " + this.getMealQuestion(),
              buttons: this.getMealButtons(),
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
}