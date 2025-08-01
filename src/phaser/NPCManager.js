import Phaser from "phaser";

const API_URL = process.env.REACT_APP_API_URL;

export class NPCManager {
  constructor(scene, mapScale, playerContext) {
    this.scene = scene;
    this.playerContext = playerContext;
    this.mapScale = mapScale;
    this.npcs = new Map();
    this.dialogSystem = null;
    // this.currentDay = 1;
    // this.dailyMealsRecorded = 0;
    // this.totalMealsRequired = 3;
    this.allMealsData = [];
    this.npcProgress = {
      npcDialogStates: {},      // 每个NPC的对话状态
      npcInteractionLogs: [],   // NPC交互记录
      npcClueStatus: {}         // 线索发放状态
    };
    this.initializeNPCs();
    console.log("NPCManager 接收的 playerContext:", this.playerContext);
    console.log("是否包含玩家ID:", !!this.playerContext?.playerId);
    console.log("是否包含游戏进度:", !!this.playerContext?.gameProgress);
  }

  setDialogSystem(dialogSystem) {
    this.dialogSystem = dialogSystem;
  }

  initializeNPCs() {
    // 7个NPC配置数据（对应7天）
    const npcConfigs = [
      {
        id: "village_head",
        name: "村长",
        position: {x: 1, y: 1},
        day: 1,
        isUnlocked: false,
        convaiId: "111",
        portraitKey: "npc1head",
        backgroundKey: "npc1bg",
        journalTriggers: ["village_head_journal_1", "village_head_journal_2", "village_head_journal_3"]
      },
      {
        id: "shop_owner",
        name: "店主阿桂",
        position: {x: 12, y: 5},
        day: 2,
        isUnlocked: false,
        convaiId: "222",
        portraitKey: "npc2head",
        backgroundKey: "npc2bg",
        journalTriggers: ["shop_owner_journal_1", "shop_owner_journal_2", "shop_owner_journal_3"]
      },
      {
        id: "spice_woman",
        name: "香料婆婆",
        position: {x: 8, y: 12},
        day: 3,
        isUnlocked: false,
        convaiId: "333",
        portraitKey: "npc3head",
        backgroundKey: "npc3bg",
        journalTriggers: ["spice_woman_journal_1", "spice_woman_journal_2", "spice_woman_journal_3"]
      },
      {
        id: "restaurant_owner",
        name: "餐厅店长老韩",
        position: {x: 15, y: 8},
        day: 4,
        isUnlocked: false,
        convaiId: "444",
        portraitKey: "npc4head",
        backgroundKey: "npc4bg",
        journalTriggers: ["restaurant_owner_journal_1", "restaurant_owner_journal_2", "restaurant_owner_journal_3"]
      },
      {
        id: "fisherman",
        name: "渔夫阿梁",
        position: {x: 3, y: 14},
        day: 5,
        isUnlocked: false,
        convaiId: "555",
        portraitKey: "npc5head",
        backgroundKey: "npc5bg",
        journalTriggers: ["fisherman_journal_1", "fisherman_journal_2", "fisherman_journal_3"]
      },
      {
        id: "old_friend",
        name: "林川",
        position: {x: 18, y: 12},
        day: 6,
        isUnlocked: false,
        convaiId: "666",
        portraitKey: "npc6head",
        backgroundKey: "npc6bg",
        journalTriggers: ["old_friend_journal_1", "old_friend_journal_2", "old_friend_journal_3"]
      },
      {
        id: "secret_apprentice",
        name: "念念",
        position: {x: 10, y: 3},
        day: 7,
        isUnlocked: false,
        convaiId: "777",
        portraitKey: "npc7head",
        backgroundKey: "npc7bg",
        journalTriggers: ["secret_apprentice_journal_1", "secret_apprentice_journal_2", "secret_apprentice_journal_3"]
      },
    ];

    // 创建所有NPC
    npcConfigs.forEach((config) => {
      this.createNPC(config);
    });

    // 先加载NPC专属进度，再同步全局进度
    this.loadGameProgress().then(() => {
      this.syncGameProgress(); // 确保最终以全局进度为准
    });
    console.log("NPCs initialized:", this.npcs.size);
    console.log("Current NPC unlocked:", this.getCurrentDayNPC()?.isUnlocked);
  }

  async loadGameProgress() {
    try {
      const response = await fetch(`${API_URL}/game-progress`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({playerId: this.scene.playerId}),
      });

      if (response.ok) {
        const progress = await response.json();
        // this.currentDay = progress.currentDay || 1;
        // this.dailyMealsRecorded = progress.dailyMealsRecorded || 0;
        // this.allMealsData = progress.allMealsData || [];

        this.npcProgress = {
          npcDialogStates: progress.npcDialogStates || {},
          npcInteractionLogs: progress.npcInteractionLogs || [],
          npcClueStatus: progress.npcClueStatus || {}
        };

        // 解锁对应的NPC
        // this.unlockNPCsUpToDay(this.currentDay);

        // 恢复NPC的对话状态
        this.restoreNPCStates();

        // console.log(
        //     `Game progress loaded: Day ${this.playerContext.gameProgress.currentDay}, Meals recorded today: ${this.playerContext.gameProgress.dailyMealsRecorded}`
        // );

        const currentDay = this.playerContext?.gameProgress?.currentDay ?? 1;
        const dailyMeals = this.playerContext?.gameProgress?.dailyMealsRecorded ?? 0;
        console.log(
          `Game progress loaded: Day ${currentDay}, Meals recorded today: ${dailyMeals}`
        );
      }
    } catch (error) {
      console.error("Error loading game progress:", error);
      // // 使用默认值：第一天开始
      // this.currentDay = 1;
      // this.dailyMealsRecorded = 0;
      // this.allMealsData = [];

      // 错误时使用默认NPC状态
      this.npcProgress = {
        npcDialogStates: {},
        npcInteractionLogs: [],
        npcClueStatus: {}
      };
    }
  }

  // 从加载的NPC进度中恢复状态
  restoreNPCStates() {
    this.npcs.forEach((npc) => {
      // 恢复对话状态
      if (this.npcProgress.npcDialogStates[npc.id]) {
        npc.dialogState = this.npcProgress.npcDialogStates[npc.id].dialogState;
        npc.hasCompletedDialog = this.npcProgress.npcDialogStates[npc.id].hasCompletedDialog;
        npc.hasRecordedAnyMeal = this.npcProgress.npcDialogStates[npc.id].hasRecordedAnyMeal;
      }
      // 恢复线索状态
      if (this.npcProgress.npcClueStatus[npc.id]) {
        npc.hasClueGiven = this.npcProgress.npcClueStatus[npc.id];
      }
    });
  }

  // 同步PlayerContext中的全局进度到NPCManager
  syncGameProgress() {
    const {gameProgress, foodJournal} = this.playerContext;
    // 1. 用全局进度解锁NPC（关键：以全局天数为准）
    this.unlockNPCsUpToDay(gameProgress.currentDay);
    // 2. 同步全局餐食记录
    this.allMealsData = foodJournal;
    // 3. 日志输出同步结果
    console.log(`同步全局进度：第 ${gameProgress.currentDay} 天，已记录 ${gameProgress.dailyMealsRecorded}/${gameProgress.totalMealsRequired} 餐`);
  }

  unlockNPCsUpToDay(day) {
    this.npcs.forEach((npc) => {
      if (npc.day <= day) {
        npc.isUnlocked = true;
        npc.sprite.setVisible(true);

        // 高亮显示当天的NPC
        if (npc.day === day) {
          if (npc.glowEffect) {
            npc.glowEffect.destroy();
          }
          this.highlightNPC(npc);
          this.addNPCClickArea(npc); // 添加点击区域
        }
      }
    });
  }

  // 从PlayerContext获取当前天数
  getCurrentDay() {
    return this.playerContext.gameProgress.currentDay;
  }

  // 从PlayerContext获取今日已记录餐数
  getDailyMealsRecorded() {
    return this.playerContext.gameProgress.dailyMealsRecorded;
  }

  // 从PlayerContext获取每日所需记录的餐数
  getTotalMealsRequired() {
    return this.playerContext.gameProgress.totalMealsRequired;
  }

  // 检查当天是否已完成所有餐食记录
  isDayComplete() {
    return this.getDailyMealsRecorded() >= this.getTotalMealsRequired();
  }

  highlightNPC(npc) {
    // 为当天的NPC添加高亮效果
    const glowEffect = this.scene.add.graphics();
    glowEffect.lineStyle(3, 0xffd700, 0.8);
    glowEffect.strokeCircle(0, 0, 25); // 增大高亮范围
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
    // 为NPC添加扩大的点击区域
    if (npc.clickArea) {
      npc.clickArea.destroy();
    }

    const clickRadius = 40; // 扩大的点击区域
    npc.clickArea = this.scene.add.graphics();
    npc.clickArea.fillStyle(0x00ff00, 0); // 透明的绿色（调试时可以设置为0.3查看区域）
    npc.clickArea.fillCircle(0, 0, clickRadius);
    npc.clickArea.setPosition(npc.sprite.x, npc.sprite.y);
    npc.clickArea.setDepth(3);
    npc.clickArea.setInteractive(
        new Phaser.Geom.Circle(0, 0, clickRadius),
        Phaser.Geom.Circle.Contains
    );

    // 设置点击事件
    npc.clickArea.on("pointerdown", () => {
      console.log(`NPC ${npc.id} clicked directly!`);
      if (this.canInteractWithNPC(npc)) {
        this.startDialogScene(npc.id);
      } else {
        this.showInteractionBlockedMessage(npc);
      }
    });

    // 添加悬停效果（主要用于PC端）
    npc.clickArea.on("pointerover", () => {
      this.showNPCHover(npc);
    });

    npc.clickArea.on("pointerout", () => {
      this.hideNPCHover(npc);
    });
  }

  showNPCHover(npc) {
    if (npc.hoverText) return; // 避免重复创建

    const language = this.scene.playerData.language;
    const hintText = language === "zh" ? "点击对话" : "Tap to talk";

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

    // 添加浮动动画
    this.scene.tweens.add({
      targets: npc.hoverText,
      y: npc.hoverText.y - 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  hideNPCHover(npc) {
    if (npc.hoverText) {
      npc.hoverText.destroy();
      npc.hoverText = null;
    }
  }

  createNPC(config) {
    const npcSprite = this.scene.add.sprite(0, 0, "npc");
    npcSprite.setScale(this.mapScale * 0.3); // 修复NPC尺寸，避免过大
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
      dialogState: "initial",
      currentMeal: null,
      mealsRecordedToday: 0,
      hasRecordedAnyMeal: false, // 新增：是否记录了至少一餐
      glowEffect: null,
      clickArea: null,
      hoverText: null,
      portraitKey: config.portraitKey,
      backgroundKey: config.backgroundKey,
    };

    this.npcs.set(config.id, npcData);
    console.log(`NPC ${config.id} created for day ${config.day}`);
    return npcData;
  }

  getNPCById(id) {
    const npc = this.npcs.get(id);
    if (!npc) return null;
    return {
      ...npc,
    };
  }

  getCurrentDayNPC() {
    return Array.from(this.npcs.values()).find(
        (npc) => npc.day === this.getCurrentDay()
    );
  }

  // 移除原来的键盘交互检测方法
  // checkInteractions() 方法已删除

  // 判断玩家是否靠近NPC（保留用于其他逻辑）
  isPlayerNearNPC(npcId) {
    try {
      const playerPos = this.scene.gridEngine.getPosition("player");
      const npcPos = this.scene.gridEngine.getPosition(npcId);
      return (
          Math.abs(playerPos.x - npcPos.x) + Math.abs(playerPos.y - npcPos.y) <= 2
      );
    } catch (error) {
      console.error(`Error checking distance to NPC ${npcId}:`, error);
      return false;
    }
  }

  // async handleNPCDialog(npcId, userInput = "") {
  //   const npc = this.npcs.get(npcId);
  //   if (!npc) {
  //     return { response: "NPC not found", buttons: [], next: false };
  //   }

  //   const language = this.scene.playerData.language;

  //   switch (npc.dialogState) {
  //     case "initial":
  //       return this.handleInitialDialog(npc);

  //     case "meal_selection":
  //       return this.handleMealSelection(npc, userInput);

  //     case "food_recording":
  //       return await this.handleFoodRecording(npc, userInput);

  //     case "completion_check":
  //       return this.handleCompletionCheck(npc, userInput);

  //     case "clue_giving":
  //       return this.handleClueGiving(npc);

  //     case "completed":
  //       return this.handleCompletedDialog(npc);

  //     default:
  //       return { response: "Dialog state error", buttons: [], next: false };
  //   }
  // }

  // async handleFoodRecording(npc, userInput) {
  //   const language = this.scene.playerData.language;

  //   if (!userInput || userInput.trim().length === 0) {
  //     const prompt =
  //       language === "zh"
  //         ? "请输入你的食物记录，越详细越好。"
  //         : "Please enter your food record, the more detailed the better.";
  //     return {
  //       response: prompt,
  //       buttons: [],
  //       next: true,
  //       requireInput: true,
  //     };
  //   }

  //   try {
  //     // 保存餐饮记录到内存
  //     const mealRecord = {
  //       day: this.currentDay,
  //       npcId: npc.id,
  //       npcName: npc.name,
  //       meal: npc.currentMeal,
  //       content: userInput,
  //       timestamp: new Date().toISOString(),
  //     };
  //     this.allMealsData.push(mealRecord);

  //     // 调用食物记录API
  //     const response = await fetch(`${API_URL}/record-meal`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         playerId: this.scene.playerId,
  //         ...mealRecord,
  //         language: language,
  //       }),
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       npc.mealsRecordedToday++;
  //       this.dailyMealsRecorded++;

  //       npc.dialogState = "completion_check";

  //       const thankYou =
  //         language === "zh"
  //           ? "谢谢你与我分享这顿饭的记录。这让我想起了你师父..."
  //           : "Thanks for sharing your meal record with me. It reminds me of your master...";

  //       const question =
  //         language === "zh"
  //           ? "\n\n你今天已经记录了所有三餐了吗？"
  //           : "\n\nHave you recorded all three meals today?";

  //       const buttons =
  //         language === "zh" ? ["是的", "还没有"] : ["Yes", "Not yet"];

  //       return {
  //         response: thankYou + question,
  //         buttons: buttons,
  //         next: true,
  //       };
  //     } else {
  //       throw new Error("Failed to record meal");
  //     }
  //   } catch (error) {
  //     console.error("Error recording meal:", error);
  //     const errorMsg =
  //       language === "zh"
  //         ? "记录失败，请重试。"
  //         : "Recording failed, please try again.";
  //     return {
  //       response: errorMsg,
  //       buttons: [],
  //       next: true,
  //       requireInput: true,
  //     };
  //   }
  // }

  // handleCompletionCheck(npc, userInput) {
  //   const language = this.scene.playerData.language;

  //   if (userInput === "是的" || userInput === "Yes") {
  //     // 玩家确认已完成所有三餐
  //     npc.dialogState = "clue_giving";
  //     npc.hasCompletedDialog = true;

  //     const clueIntro =
  //       language === "zh"
  //         ? "很好！既然你已经完成了今天的记录，我可以告诉你一个关于你师父的重要线索："
  //         : "Great! Since you've completed today's records, I can tell you an important clue about your master:";

  //     return {
  //       response: clueIntro,
  //       buttons: [],
  //       next: true,
  //     };
  //   } else {
  //     // 玩家还没完成所有餐食记录
  //     npc.dialogState = "completed";

  //     const reminder =
  //       language === "zh"
  //         ? "那请你先完成今天的所有三餐记录吧。记录完成后再来找我，我会告诉你重要的线索。"
  //         : "Then please complete all three meals for today first. Come back to me after recording everything, and I'll tell you important clues.";

  //     return {
  //       response: reminder,
  //       buttons: [],
  //       next: false,
  //     };
  //   }
  // }

  // async handleCompletedDialog(npc) {
  //   const lang = this.scene.playerData.language;

  //   // 检查是否是最后一天且已给出线索
  //   if (this.currentDay === 7 && npc.hasClueGiven) {
  //     return this.handleFinalEggDialog(npc);
  //   }

  //   // 固定的结束语
  //   const farewell =
  //     lang === "zh"
  //       ? "今天我们已经聊过了。请记录完所有三餐后再来找我。"
  //       : "We've already talked today. Please record all three meals and come back to me.";

  //   return {
  //     response: farewell,
  //     buttons: [],
  //     next: false,
  //   };
  // }

  // async handleFinalEggDialog(npc) {
  //   const lang = this.scene.playerData.language;

  //   // 固定的结束语
  //   const farewell =
  //     lang === "zh"
  //       ? "感谢这几天的陪伴……让我来为你准备一个特别的惊喜！"
  //       : "Thanks for spending these days with me… Let me prepare a special surprise for you!";

  //   // 异步向后端请求 LLM 生成彩蛋
  //   try {
  //     const resp = await fetch(`${API_URL}/generate-final-egg`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         playerId: this.scene.playerId,
  //         meals: this.allMealsData,
  //         language: lang,
  //       }),
  //     });

  //     if (resp.ok) {
  //       const { eggText } = await resp.json();
  //       // 使用UI管理器展示彩蛋文本
  //       if (this.scene.uiManager) {
  //         this.scene.uiManager.showFinalEgg(eggText);
  //       }
  //     } else {
  //       throw new Error("Failed to generate final egg");
  //     }
  //   } catch (e) {
  //     console.error("彩蛋生成失败：", e);
  //     const fallbackText =
  //       lang === "zh"
  //         ? "彩蛋生成失败，请稍后重试哦~"
  //         : "Failed to prepare the surprise. Please try again later.";

  //     if (this.scene.uiManager) {
  //       this.scene.uiManager.showFinalEgg(fallbackText);
  //     }
  //   }

  //   return {
  //     response: farewell,
  //     buttons: [],
  //     next: false,
  //   };
  // }

  handleClueGiving(npc) {
    const language = this.scene.playerData.language;
    npc.hasClueGiven = true;
    npc.dialogState = "completed";

    this.npcProgress.npcClueStatus[npc.id] = true;
    this.saveNPCProgress().catch(error => console.error(error));
    const clue = this.getNPCClue(npc.id);

    // 添加线索到UI管理器
    if (this.scene.uiManager) {
      this.scene.uiManager.addClue({
        npcName: npc.name,
        clue: clue,
        day: this.getCurrentDay(),
      });
    }

    // 移除高亮效果
    if (npc.glowEffect) {
      npc.glowEffect.destroy();
      npc.glowEffect = null;
    }

    // 隐藏点击区域的悬停效果
    this.hideNPCHover(npc);

    // 通知场景记录了餐食
    if (this.scene.onMealRecorded) {
      this.scene.onMealRecorded();
    }

    // 检查是否可以进入下一天
    this.checkDayProgression();

    return {
      response: clue,
      buttons: [],
      next: false,
    };
  }

  async checkDayProgression() {
    const currentNPC = this.getCurrentDayNPC();
    const currentDay = this.getCurrentDay();

    if (
        currentNPC &&
        currentNPC.hasCompletedDialog &&
        currentNPC.hasClueGiven &&
      currentDay < 7
    ) {
      // 调用PlayerContext的方法更新全局进度
      await this.playerContext.saveGameProgress({
        currentDay: currentDay + 1,
        dailyMealsRecorded: 0,
      });

      this.syncGameProgress();

      // 解锁下一个NPC
      const nextNPC = this.getCurrentDayNPC();
      const message =
          this.scene.playerData.language === "zh"
              ? `第${currentDay + 1}天开始！\n新的NPC ${nextNPC.name} 已解锁！`
              : `Day ${currentDay + 1} begins!\nNew NPC ${nextNPC.name} unlocked!`;
          this.scene.showNotification(message, 5000);
        } else if (currentDay >= 7) {
          this.scene.showNotification(
            this.scene.playerData.language === "zh"
              ? "恭喜完成7天的旅程！正在生成你的专属彩蛋..."
              : "Congratulations on completing the 7-day journey! Generating your personalized ending...",
            3000
          );

        setTimeout(() => {
          this.triggerFinalEgg();
        }, 3000);
      }
    }


  // 保存游戏进度到后端
  async saveNPCProgress() {
    try {
      await fetch(`${API_URL}/save-progress`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          playerId: this.scene.playerId,
          npcProgress: this.npcProgress
        }),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  }

  async triggerFinalEgg() {
    const language = this.scene.playerData.language;

    try {
      // 准备所有餐饮数据的摘要
      const mealsSummary = this.allMealsData.map((meal) => ({
        day: meal.day,
        npc: meal.npcName,
        meal: meal.meal,
        content: meal.content,
      }));

      // 调用LLM生成最终彩蛋
      const response = await fetch(`${API_URL}/generate-final-egg`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          playerId: this.scene.playerId,
          language: language,
          mealsData: mealsSummary,
          cluesCollected: this.getAllClues(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        this.showFinalEggDialog(result.eggContent);
      } else {
        throw new Error("Failed to generate final egg");
      }
    } catch (error) {
      console.error("Error generating final egg:", error);

      // 使用本地生成的彩蛋作为后备
      const fallbackEgg = this.generateLocalFinalEgg();
      this.showFinalEggDialog(fallbackEgg);
    }
  }

  generateLocalFinalEgg() {
    const language = this.scene.playerData.language;

    // 基于收集的餐饮数据生成一个简单的本地彩蛋
    const uniqueFoods = new Set();
    this.allMealsData.forEach((meal) => {
      // 简单提取食物关键词
      const words = meal.content.split(/[,，、。\s]+/);
      words.forEach((word) => {
        if (word.length > 1) uniqueFoods.add(word);
      });
    });

    const foodsList = Array.from(uniqueFoods)
        .slice(0, 5)
        .join(language === "zh" ? "、" : ", ");

    if (language === "zh") {
      return `师父留给你的秘方：\n\n"亲爱的徒弟，你的美食之旅让我看到了你的成长。\n\n通过你记录的${foodsList}等食材，我看到了你对美食的热爱和理解。\n\n真正的秘方不在于特定的食材，而在于用心烹饪每一道菜，就像你这七天所做的那样。\n\n继续用爱烹饪，用心品味生活。\n\n——你的师父"`;
    } else {
      return `Your Master's Secret Recipe:\n\n"Dear apprentice, your culinary journey shows me how much you've grown.\n\nThrough the ${foodsList} and other ingredients you've recorded, I see your love and understanding of food.\n\nThe true secret recipe isn't about specific ingredients, but about cooking every dish with heart, just as you've done these seven days.\n\nContinue cooking with love and savoring life with your heart.\n\n——Your Master"`;
    }
  }

  showFinalEggDialog(content) {
    // 显示最终彩蛋对话框
    if (this.scene.uiManager) {
      this.scene.uiManager.showFinalEgg(content);
    }

    // 触发游戏完成事件
    if (this.scene.onGameCompleted) {
      this.scene.onGameCompleted();
    }
  }

  getNPCGreeting(npcId) {
    const language = this.scene.playerData.language;
    const greetings = {
      // 村长
      village_head: {
        zh:
            "你总算回来了……你师傅，他出事了。\n\n" +
            "三天前，他没有留下只言片语就离开了村子。\n" +
            "炉灶里的火还温着，但人却消失了。\n\n" +
            "你也知道，他从不是会无故离开的人。他几乎从未离开过村子。\n\n" +
            "你曾是他的徒弟。\n" +
            "如果有人能查出发生了什么，那就是你。\n\n" +
            "但这次，不只是翻翻厨房的抽屉那么简单。\n\n" +
            "他总是带着一本小本子，记录他与人的每次交流。\n" +
            "也许你能试着用他的方式，去理解他的思路。\n\n" +
            "我相信，那些记录里藏着线索。",
        en:
            "You're finally back… Something happened to your master.\n\n" +
            "Three days ago, he left the village without a word.\n" +
            "The fire in his kitchen was still warm—but he was gone.\n\n" +
            "You know as well as I do… he was never the kind to vanish without a reason.\n" +
            "He has barely left the village his whole life.\n\n" +
            "You were once his apprentice. If anyone can find out what happened to him… it's you.\n\n" +
            "But this search—it's not just about turning over kitchen drawers.\n\n" +
            "Not long ago, he always brought a notebook whenever he met someone.\n" +
            "Maybe by following his method, you can understand how he thinks.\n\n" +
            "I believe those records hold the key.",
      },
      // 店主阿桂
      shop_owner: {
        zh: "哟，回来了啊。你师傅离开那天，也是从这门口进来的。",
        en: "Oh, you're back. Your master came through this door the day he left.",
      },
      spice_woman: {
        zh: "……你是他的小徒弟吧？",
        en: "...You're his little apprentice, aren't you?",
      },
      restaurant_owner: {
        zh: "你手里那点调料味儿，我一闻就知道——她让你来的。",
        en: "I can smell that blend from the doorway... let me guess. She sent you.",
      },
      fisherman: {
        zh: "诶，小X，这么多年了。没想到啊，还能再见到你。",
        en: "Well now... Look who it is. Been a long time, hasn't it?",
      },
      old_friend: {
        zh: "你终于来了，我的好弟兄，最近过得如何？",
        en: "You finally came, my good brother, how have you been recently?",
      },
      secret_apprentice: {
        zh: "你终于来啦哥哥，我在这等了好久好久都以为你不会来了呢。",
        en: "You finally came, brother. I've been waiting here for so long, I thought you wouldn't come.",
      },
    };

    return greetings[npcId]
        ? greetings[npcId][language] || greetings[npcId]["en"]
        : "Hello!";
  }

  getNPCClue(npcId) {
    const language = this.scene.playerData.language;
    const clues = {
      village_head: {
        zh: "🔍 三天前，他不声不响地离开了村子。只留下厨房还温着火，却不见人影。那本他最宝贝的秘方笔记……也一并消失了。",
        en: "🔍 Three days ago, he left the village without a word. The fire in his kitchen was still warm—but he was gone. And with him, his most treasured possession: that recipe journal he guarded with his life.",
      },
      shop_owner: {
        zh: "🔍 他最常买那几样料，可那天——他却突然问起'青木籽'。他以前从来不碰那玩意儿。",
        en: "🔍 He always bought the same ingredients, but that day—he suddenly asked about 'greenwood seeds'. He never touched those before.",
      },
      spice_woman: {
        zh: "🔍 他说——'要不是那个人把它弄俗了'，他都不想再碰。你知道他说的是谁吗？",
        en: "🔍 He said—'If it weren't for that person making it vulgar', he wouldn't want to touch it again. Do you know who he was talking about?",
      },
      restaurant_owner: {
        zh: "🔍 有一锅粥，他始终没让我碰。说什么得亲自守着火慢慢熬着。'云头鲤'。",
        en: "🔍 There was one pot—congee with Yunhead Carp. He never let me touch it. Had to be slow cooked. Alone. By the river.",
      },
      fisherman: {
        zh: "🔍 你师傅……他那天，在那块老礁石边，煮了一锅鱼粥。一锅白，一锅清。没叫我尝，就说了句：'等潮涨再开。'",
        en: "🔍 Your master... that day, by the old rocks, he made two pots of fish congee. One milky, one clear. He didn't let me taste a drop. Just said: 'Open it when the tide comes in.'",
      },
      old_friend: {
        zh: "🔍 师傅从小不喜欢我你了解的，自然什么都不会和我说。但是念念，他最近收了一个孩子叫念念。住在村尾的阁楼。",
        en: "🔍 Master never liked me since childhood, naturally he wouldn't tell me anything. But about NianNian, he recently took in a child called NianNian. Lives in the attic at the end of the village.",
      },
      secret_apprentice: {
        zh: "🔍 他把最后一页藏在他'最常回头看的地方'。不是厨房，也不是餐馆。是他写下第一道菜的地方！在阁楼上那道木梁上。",
        en: "🔍 He hid the last page in the place he 'most often looked back at'. Not the kitchen, not the restaurant. The place where he wrote his first recipe! On the wooden beam in the attic.",
      },
    };

    return clues[npcId]
        ? clues[npcId][language] || clues[npcId]["en"]
        : "No clue available";
  }

  updateScale(newScale) {
    this.mapScale = newScale;
    this.npcs.forEach((npc) => {
      if (npc.sprite) {
        npc.sprite.setScale(newScale * 0.3); // 修复缩放比例
      }
      // 同时更新高亮效果和点击区域的位置
      if (npc.glowEffect) {
        npc.glowEffect.setPosition(npc.sprite.x, npc.sprite.y);
      }
      if (npc.clickArea) {
        npc.clickArea.setPosition(npc.sprite.x, npc.sprite.y);
      }
    });
  }

  // 新增方法：检查是否可以与NPC交互
  canInteractWithNPC(npc) {
    // 检查是否是当天的NPC
    if (npc.day !== this.getCurrentDay()) {
      return false;
    }

    // 检查前一天是否完成了至少一餐的记录
    if (npc.day > 1) {
      const previousDayNPC = Array.from(this.npcs.values()).find(
          (n) => n.day === npc.day - 1
      );
      if (!previousDayNPC || !previousDayNPC.hasRecordedAnyMeal) {
        return false;
      }
    }

    return npc.isUnlocked;
  }

  showInteractionBlockedMessage(npc) {
    const language = this.scene.playerData.language;
    let message;

    if (npc.day > this.getCurrentDay()) {
      message =
          language === "zh"
              ? `这是第${npc.day}天的NPC，请先完成今天的任务`
              : `This is Day ${npc.day} NPC, please complete today's tasks first`;
    } else if (npc.day === this.getCurrentDay() && npc.day > 1) {
      message =
          language === "zh"
              ? "你需要先和前一天的NPC记录至少一餐才能解锁"
              : "You need to record at least one meal with the previous day's NPC to unlock";
    } else {
      message =
          language === "zh"
              ? "暂时无法与此NPC对话"
              : "Cannot interact with this NPC yet";
    }

    this.scene.showNotification(message, 3000);
  }

  startDialogScene(npcId) {
    console.log(`Starting dialog scene with NPC: ${npcId}`);

    // 暂停主场景并启动对话场景
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
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    npc.hasCompletedDialog = true;
    npc.hasRecordedAnyMeal = true; // 标记已记录至少一餐

    // 保存NPC对话状态到专属进度
    this.npcProgress.npcDialogStates[npc.id] = {
      dialogState: npc.dialogState,
      hasCompletedDialog: npc.hasCompletedDialog,
      hasRecordedAnyMeal: npc.hasRecordedAnyMeal
    };
    await this.playerContext.saveGameProgress({ ... });

    if (npc.glowEffect) {
      npc.glowEffect.destroy();
      npc.glowEffect = null;
    }

    if (this.shouldProgressToNextDay(npc)) {
      await this.playerContext.saveGameProgress({ ... });
    }
  }

  shouldProgressToNextDay(completedNPC) {
    // 如果当前NPC已完成对话且记录了餐食
    return completedNPC.hasCompletedDialog && completedNPC.hasRecordedAnyMeal;
  }

  async progressToNextDay() {
    if (this.getCurrentDay() >= 7) {
      // 游戏完成
      this.triggerGameCompletion();
      return;
    }

    // 调用PlayerContext的方法更新全局进度
    await this.playerContext.saveGameProgress({  // 这里修改了
      currentDay: this.getCurrentDay() + 1,
      dailyMealsRecorded: 0,
    });

    this.syncGameProgress();  // 这里添加了


    // 解锁下一个NPC
    const nextNPC = Array.from(this.npcs.values()).find(
        (npc) => npc.day === this.getCurrentDay()
    );


    // if (nextNPC) {
    //   nextNPC.isUnlocked = true;
    //   nextNPC.sprite.setVisible(true);
    //   this.highlightNPC(nextNPC);
    //   this.addNPCClickArea(nextNPC);
    //
    //   const message =
    //       this.scene.playerData.language === "zh"
    //           ? `🌅 第${this.getCurrentDay()}天开始！\n新的NPC ${nextNPC.name} 已解锁！`
    //           : `🌅 Day ${this.getCurrentDay()} begins!\nNew NPC ${nextNPC.name} unlocked!`;
    //
    //   this.scene.showNotification(message, 5000);
    // }

    // 保存进度
    // await this.saveGameProgress(); // already realized in "await this.playerContext.saveGameProgress({ ... });"
  }

  triggerGameCompletion() {
    const message =
        this.scene.playerData.language === "zh"
            ? "🎊 恭喜完成7天的旅程！正在生成你的专属彩蛋..."
            : "🎊 Congratulations on completing the 7-day journey! Generating your personalized ending...";

    this.scene.showNotification(message, 3000);

    setTimeout(() => {
      // 在 setTimeout 回调中处理异步操作的 Promise
      this.triggerFinalEgg().catch(error => {
        console.error("触发最终彩蛋时发生错误:", error);
      });
    }, 3000);
  }

  getAllClues() {
    const clues = [];
    this.npcs.forEach((npc) => {
      if (npc.hasClueGiven) {
        clues.push({
          npcName: npc.name,
          clue: this.getNPCClue(npc.id),
          day: npc.day,
        });
      }
    });
    return clues.sort((a, b) => a.day - b.day);
  }

  getDailyProgress() {
    return {
      currentDay: this.getCurrentDay(),
      mealsRecorded: this.getDailyMealsRecorded(),
      totalMealsRequired: this.getTotalMealsRequired(),
      isComplete: this.isDayComplete(),
    };
  }

  destroy() {
    this.npcs.forEach((npc) => {
      if (npc.glowEffect) {
        npc.glowEffect.destroy();
      }
      if (npc.clickArea) {
        npc.clickArea.destroy();
      }
      this.hideNPCHover(npc);
    });
  }
}
