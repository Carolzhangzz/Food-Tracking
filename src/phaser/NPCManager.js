// src/phaser/NPCManager.js - 完整版本，根据游戏文档配置
import Phaser from "phaser";

const API_URL = process.env.REACT_APP_API_URL;

export default class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs = [];
    this.npcSprites = [];
    this.playerStatus = null;
    this.mealRecords = [];
    this.availableNPCs = [];
    this.isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.clickDebounceTime = this.isMobile ? 300 : 300;

    console.log(`📱 设备类型: ${this.isMobile ? '移动端' : '桌面'}, 点击防抖: ${this.clickDebounceTime}ms`);

    // 🎯 7个NPC配置 - 横屏地图坐标（游戏只支持横屏）
    this.npcData = [
      {
        id: "uncle_bo",
        name: { zh: "村长", en: "Village Head" },
        position: { x: 135, y: 463 },  
        imageKey: "npc1",  
        unlockDay: 1,
        description: { zh: "师父的老友", en: "Old friend of the master" }
      },
      {
        id: "shop_owner",
        name: { zh: "杂货铺老板", en: "Shop Owner Grace" },
        position: { x: 666, y: 138 },  
        imageKey: "npc2",  
        unlockDay: 2,
        description: { zh: "杂货铺的经营者", en: "Shop owner" }
      },
      {
        id: "spice_granny",
        name: { zh: "香料奶奶", en: "Spice Granny" },
        position: { x: 243, y: 141 },
        imageKey: "npc3",
        unlockDay: 3,
        description: { zh: "知道greenwood seeds的秘密", en: "Knows about greenwood seeds" }
      },
      {
        id: "restaurant_owner",
        name: { zh: "餐厅老板", en: "Restaurant Owner" },
        position: { x: 866, y: 469 },
        imageKey: "npc4",
        unlockDay: 4,
        description: { zh: "经营村里的餐厅", en: "Runs the village restaurant" }
      },
      {
        id: "fisherman",
        name: { zh: "渔夫", en: "Fisherman" },
        position: { x: 625, y: 431 },
        imageKey: "npc5",
        unlockDay: 5,
        description: { zh: "河边的沉默渔夫", en: "Silent fisherman by the river" }
      },
      {
        id: "old_friend",
        name: { zh: "旧友Rowan", en: "Old Friend Rowan" },
        position: { x: 914, y: 95 },
        imageKey: "npc6",
        unlockDay: 6,
        description: { zh: "师父的徒弟之一", en: "One of the master's apprentices" }
      },
      {
        id: "secret_apprentice",
        name: { zh: "秘密学徒Mira", en: "Secret Apprentice Mira" },
        position: { x: 363, y: 492 },
        imageKey: "npc7",
        unlockDay: 7,
        description: { zh: "最后一位学徒", en: "The last apprentice" }
      },
    ];

    console.log("🎭 NPCManager created with 7 NPCs (Day 1-7)");

    // 🔧 不在构造函数中自动初始化，由MainScene控制初始化时机
    // this.init();
  }

  async init() {
    try {
      console.log("🔧 NPCManager 初始化开始...");
      
      // 1. 获取玩家状态
      await this.loadPlayerStatus();

      // 2. 创建所有NPC精灵
      this.createNPCSprites();

      // 3. 更新NPC状态（解锁/锁定）
      this.updateNPCStates();

      console.log("✅ NPCManager 初始化完成");
    } catch (error) {
      console.error("❌ NPCManager 初始化失败:", error);
    }
  }

  async loadPlayerStatus() {
    if (!this.scene.playerId) {
      console.warn("⚠️ 没有 playerId，跳过加载玩家状态");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/player-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: this.scene.playerId }),
      });

      if (response.ok) {
        const data = await response.json();
        this.playerStatus = data;
        this.mealRecords = data.mealRecords || [];
        
        // 🔧 同步关键数据到主场景
        if (this.scene.playerData) {
          const oldDay = this.scene.playerData.currentDay;
          this.scene.playerData.currentDay = data.player?.currentDay || data.currentDay || this.scene.playerData.currentDay;
          
          // 🔧 只有当后端确实返回了该字段时才同步，避免默认为空导致图标变绿
          if (data.currentDayMealsRemaining) {
            this.scene.playerData.currentDayMealsRemaining = data.currentDayMealsRemaining;
          }
          
          // 🔧 同步回 React Context
          if (this.scene.updatePlayerdata) {
            this.scene.updatePlayerdata({ ...this.scene.playerData });
          }
        }
        
        console.log("✅ 玩家状态加载成功:", {
          当前天数: this.getCurrentDay(),
          餐食记录: this.mealRecords.length,
          首次登录: this.playerStatus.player?.firstLoginDate,
        });
      } else {
        console.warn("⚠️ 无法加载玩家状态，使用默认值");
      }
    } catch (error) {
      console.error("❌ 加载玩家状态失败:", error);
    }
  }

  createNPCSprites() {
    console.log("🎨 开始创建NPC精灵...");

    const lang = this.scene.playerData?.language || "zh";

    this.npcData.forEach((npcData, index) => {
      const npcName = npcData.name[lang] || npcData.name.zh;

      // 🔧 调整NPC缩放比例（手机版放大）
      const isMobile = window.innerWidth < 768;
      let npcScale = isMobile ? 0.13 : 0.08; // 手机版放大60%
      if (npcData.id === 'shop_owner' || npcData.id === 'spice_granny' || npcData.id === 'secret_apprentice') {
        npcScale = isMobile ? 0.14 : 0.09; // 女NPC稍微放大一点
      }
      console.log(`📱 NPC ${npcData.id} 缩放: ${npcScale} (${isMobile ? '手机版' : '桌面版'})`);

      // 创建NPC精灵 - 🔧 使用单独NPC图片
      const npcSprite = this.scene.physics.add
        .sprite(npcData.position.x, npcData.position.y, npcData.imageKey)  // 🔧 使用imageKey而不是characters+frame
        .setOrigin(0.5)
        .setDepth(5)
        .setScale(npcScale)  // 🔧 动态缩放
        .setInteractive({ useHandCursor: true });

      // 添加NPC名字标签（手机版放大字体）
      const nameFontSize = isMobile ? "22px" : "11px"; // 🔧 手机版进一步加大
      const nameYOffset = isMobile ? -55 : -28; // 🔧 手机版名字位置进一步上移
      
      const nameText = this.scene.add.text(
        npcData.position.x,
        npcData.position.y + nameYOffset,
        npcName,
        {
          fontSize: nameFontSize,
          fontFamily: "Arial, sans-serif",
          fill: "#ffffff",
          backgroundColor: "#000000cc", // 稍微透明一点但依然清晰
          padding: { x: 12, y: 8 }, // 🔧 增加 padding 让背景黑框更大更醒目
          stroke: "#000000",
          strokeThickness: 5, // 🔧 加粗描边
          fontStyle: "bold",
        }
      );
      nameText.setOrigin(0.5).setDepth(6);

      // 创建锁定图标 🔒（手机版放大）
      const lockIconSize = isMobile ? "36px" : "20px"; // 🔧 锁图标加大
      const lockIcon = this.scene.add.text(
        npcData.position.x,
        npcData.position.y,
        "🔒",
        { fontSize: lockIconSize }
      );
      lockIcon.setOrigin(0.5).setDepth(7).setVisible(false);

      // 创建当前可交互指示器 ⬇️（手机版放大）
      const indicatorSize = isMobile ? "32px" : "18px"; // 🔧 指示器加大
      const indicatorYOffset = isMobile ? -65 : -40; // 🔧 随名字上移
      const activeIndicator = this.scene.add.text(
        npcData.position.x,
        npcData.position.y + indicatorYOffset,
        "⬇️",
        { fontSize: indicatorSize }
      );
      activeIndicator.setOrigin(0.5).setDepth(6).setVisible(false);

      // 天数标签（显示第X天，手机版放大） - 🔧 隐藏以增加解谜感
      const dayFontSize = isMobile ? "16px" : "10px";
      const dayYOffset = isMobile ? 50 : 32;
      const dayLabel = this.scene.add.text(
        npcData.position.x,
        npcData.position.y + dayYOffset,
        `${lang === "zh" ? "第" : "Day "}${npcData.unlockDay}${lang === "zh" ? "天" : ""}`,
        {
          fontSize: dayFontSize,
          fontFamily: "Arial, sans-serif",
          fill: "#fbbf24",
          backgroundColor: "#00000099",
          padding: { x: 8, y: 5 }, // 增加 padding
          stroke: "#000000",
          strokeThickness: 3, // 加粗描边
          fontStyle: "bold", // 设置为粗体
        }
      );
      dayLabel.setOrigin(0.5).setDepth(6).setVisible(false); // 🔧 默认隐藏天数标签

      // 点击事件
      npcSprite.on("pointerdown", () => {
        console.log(`🖱️ 点击了NPC: ${npcName} (${npcData.id})`);
        this.handleNPCClick(npcData, npcSprite);
      });

      // 鼠标悬停效果
      npcSprite.on("pointerover", () => {
        npcSprite.setTint(0xaaaaff);
        nameText.setScale(1.1);
      });

      npcSprite.on("pointerout", () => {
        npcSprite.clearTint();
        nameText.setScale(1);
      });

      // 存储NPC对象
      this.npcSprites.push({
        data: npcData,
        sprite: npcSprite,
        nameText: nameText,
        lockIcon: lockIcon,
        activeIndicator: activeIndicator,
        dayLabel: dayLabel,
      });

      console.log(`✅ 创建NPC ${index + 1}: ${npcName} at (${npcData.position.x}, ${npcData.position.y})`);
    });

    // 添加闪烁动画（针对活动指示器）
    this.scene.time.addEvent({
      delay: 500,
      callback: () => {
        this.npcSprites.forEach((npc) => {
          if (npc.activeIndicator.visible) {
            npc.activeIndicator.setAlpha(npc.activeIndicator.alpha === 1 ? 0.3 : 1);
          }
        });
      },
      loop: true,
    });

    console.log(`🎨 共创建 ${this.npcSprites.length} 个NPC精灵`);
  }

  updateNPCStates() {
    const currentDay = this.getCurrentDay();
    const todayMeals = this.getTodayMeals();
    const yesterdayMealCount = this.getMealsForDay(currentDay - 1).length;
    
    console.log(`📊 更新NPC状态:`, {
      当前天数: currentDay,
      今日餐数: todayMeals.length,
      昨日餐数: yesterdayMealCount,
    });

    // 🔧 重要：填充 availableNPCs 数组（DialogScene需要）
    this.availableNPCs = [];

    this.npcSprites.forEach((npc, index) => {
      const unlockDay = npc.data.unlockDay;
      
      // 🔧 解锁逻辑优化：
      // 1. 第1天NPC始终解锁
      // 2. 后续NPC解锁条件：(当前日期天数 >= NPC解锁天数) 且 (前一个NPC对应的日期至少记录了1餐)
      let isUnlocked = false;
      const isDebugPlayer = this.scene.playerId === '002';

      if (isDebugPlayer) {
        isUnlocked = true;
      } else if (unlockDay === 1) {
        isUnlocked = true;
      } else {
        // 核心逻辑：当前日期达到了解锁天数，且"前一阶段"的任务已完成
        const reachedRequiredDay = currentDay >= unlockDay;
        const prevDayMeals = this.getMealsForDay(unlockDay - 1);
        const completedPrevTask = prevDayMeals.length >= 1;
        
        isUnlocked = reachedRequiredDay && completedPrevTask;
        
        // 🔧 调试日志
        console.log(`🔍 [NPC解锁检查] NPC: ${npc.data.id}, Day: ${unlockDay}`, {
          当前天数: currentDay,
          是否到达天数: reachedRequiredDay,
          前一天餐数: prevDayMeals.length,
          是否完成前置: completedPrevTask,
          最终解锁: isUnlocked
        });
        
        if (reachedRequiredDay && !completedPrevTask) {
          console.log(`🔒 NPC ${npc.data.id} 未解锁: 已到第 ${unlockDay} 天，但前一天无记录`);
        }
      }

      // 如果是调试玩家，且还没到第7天，我们在逻辑上认为它是第7天
      const effectiveCurrentDay = isDebugPlayer ? 7 : currentDay;
      const isCurrentDay = unlockDay === effectiveCurrentDay;
      
      // 如果是调试玩家，我们允许与任何 NPC 对话，但为了触发结局，通常去 Mira (Day 7)
      const isActive = isCurrentDay && todayMeals.length < 3 && isUnlocked;
      
      // 🔧 计算可用的餐食类型（剩余未记录的）
      const allMealTypes = ['breakfast', 'lunch', 'dinner'];
      const availableMealTypes = allMealTypes.filter(mealType => !todayMeals.includes(mealType));
      
      // 🔧 添加到 availableNPCs 数组（供 DialogScene 使用）
      if (isCurrentDay && isUnlocked) {
        this.availableNPCs.push({
          npcId: npc.data.id,
          day: unlockDay,
          unlocked: true,
          availableMealTypes: availableMealTypes, // 🔑 关键：剩余可记录的餐食
          mealsRecorded: todayMeals.length,
        });
      }
      
      if (isUnlocked) {
        // ✅ 已解锁
        npc.sprite.setAlpha(1);
        npc.lockIcon.setVisible(false);
        
        if (isActive) {
          // 当天NPC且还没记录完三餐
          npc.activeIndicator.setVisible(true);
          npc.sprite.setTint(0xffff88); // 淡黄色高亮
          npc.dayLabel.setStyle({ fill: "#10b981" }); // 绿色
        } else {
          npc.activeIndicator.setVisible(false);
          npc.sprite.clearTint();
          npc.dayLabel.setStyle({ fill: "#9ca3af" }); // 灰色
        }
      } else {
        // 🔒 未解锁
        npc.sprite.setAlpha(0.5);
        npc.sprite.setTint(0x888888);
        npc.lockIcon.setVisible(true);
        npc.activeIndicator.setVisible(false);
        npc.dayLabel.setStyle({ fill: "#ef4444" }); // 红色
      }
    });

    console.log("✅ NPC状态更新完成", {
      可用NPCs: this.availableNPCs.length,
      当天剩余餐食: this.availableNPCs[0]?.availableMealTypes || []
    });
  }

  // 🔧 强制更新所有 NPC 的语言显示（名字、提示语等）
  updateLanguage() {
    const lang = this.scene.playerData?.language || "zh";
    console.log(`🌐 [NPCManager] 正在同步语言: ${lang}`);
    
    this.npcSprites.forEach(npc => {
      // 1. 更新名字标签
      const newName = npc.data.name[lang] || npc.data.name.zh;
      if (npc.nameText) {
        npc.nameText.setText(newName);
      }
      
      // 2. 更新天数标签 (Day 1 -> 第1天)
      if (npc.dayLabel) {
        const dayLabelText = lang === 'zh' ? `第 ${npc.data.unlockDay} 天` : `Day ${npc.data.unlockDay}`;
        npc.dayLabel.setText(dayLabelText);
      }
    });
    
    // 3. 刷新状态（比如解锁提示语）
    this.updateNPCStates();
    
    // 🔧 额外延迟刷新一次，确保所有数据加载完成后 UI 正确
    this.scene.time.delayedCall(500, () => this.updateNPCStates());
  }

  handleNPCClick(npcData, sprite) {
    const lang = this.scene.playerData?.language || "zh";
    const npcName = npcData.name[lang] || npcData.name.zh;
    
    console.log(`🎯 处理NPC点击: ${npcName} (${npcData.id})`);

    // 🔧 诊断用的临时 alert
    // alert(`点击了 NPC: ${npcName}`);

    // 🔧 手机游戏：点击NPC时停止玩家移动
    if (this.scene.player) {
      this.scene.isMovingToTarget = false;
      this.scene.targetX = null;
      this.scene.targetY = null;
      if (this.scene.player.setVelocity) {
        this.scene.player.setVelocity(0, 0);
      }
    }

    const currentDay = this.getCurrentDay();
    const unlockDay = npcData.unlockDay;
    const todayMeals = this.getTodayMeals();
    
    // 检查前一天餐食记录
    const isDebugPlayer = this.scene.playerId === '002';
    
    // 🔧 核心解锁逻辑：
    // 1. 调试账号 (002) 始终解锁
    // 2. 第1天 NPC 始终解锁
    // 3. 正常逻辑：当前天 >= NPC解锁天，且前一天至少记录了一餐
    const prevDayMeals = this.getMealsForDay(unlockDay - 1);
    const completedPrevTask = prevDayMeals.length >= 1;
    const reachedRequiredDay = currentDay >= unlockDay;
    
    const isUnlocked = isDebugPlayer || unlockDay === 1 || (reachedRequiredDay && completedPrevTask);
    const isCurrentDay = isDebugPlayer || unlockDay === currentDay;

    // 🔍 [DIAGNOSTIC] NPC CLICK CHECK - v2
    console.log(`📊 [NPC点击检查]`, {
      "点击NPC": npcName,
      "点击NPC ID": npcData.id,
      "游戏当前天数 (currentDay)": currentDay,
      "NPC解锁所需天数 (unlockDay)": unlockDay,
      "是否解锁 (isUnlocked)": isUnlocked,
      "是否为当天NPC (isCurrentDay)": isCurrentDay,
      "今日已记录餐食": todayMeals,
      "玩家ID": this.scene.playerId
    });
    
    // 🔒 未解锁
    if (!isUnlocked) {
      const message = lang === "zh" 
        ? `这个NPC需要完成第${unlockDay - 1}天的餐食记录才能解锁`
        : `Complete Day ${unlockDay - 1} meal records to unlock this NPC`;
      console.log(`🔒 NPC未解锁: ${message}`);
      this.scene.showNotification(message, 3000);
      return;
    }

    // ⏭️ 不是当天的NPC（只要解锁了，就允许继续补齐餐食记录）
    if (!isCurrentDay) {
      // 如果是未来的 NPC（理论上被 isUnlocked 拦截了，但以防万一）
      if (unlockDay > currentDay) {
        const activeNpcData = this.npcData.find(n => n.unlockDay === currentDay);
        const activeNpcName = activeNpcData ? (activeNpcData.name[lang] || activeNpcData.name.zh) : "???";
        const message = lang === "zh"
          ? `今天（第 ${currentDay} 天）的任务是找 ${activeNpcName} 对话哦！`
          : `Your task for today (Day ${currentDay}) is to talk to ${activeNpcName}!`;
        this.scene.showNotification(message, 3500);
        return;
      }
      
      // 如果是过去的 NPC，允许补录
      console.log(`ℹ️ 点击了过去的 NPC (Day ${unlockDay}), 允许继续对话补齐记录。`);
    }

    // ✅ 可以对话
    console.log(`✅ 开始对话: ${npcName} (针对第 ${unlockDay} 天的任务)`);
    this.startDialogWithNPC(npcData);
  }

  startDialogWithNPC(npcData) {
    const lang = this.scene.playerData?.language || "zh";
    const npcName = npcData.name[lang] || npcData.name.zh;
    const unlockDay = npcData.unlockDay;
    
    console.log(`💬 开始对话: ${npcName} (${npcData.id}), 目标天数: ${unlockDay}`);

    try {
      // 🔧 关键修复：确保主场景真的被暂停
      console.log("⏸️ 正在暂停 MainScene...");
      this.scene.scene.pause("MainScene");

      const dialogData = {
        npcId: npcData.id,
        npcName: npcName,
        playerId: this.scene.playerId,
        playerData: this.scene.playerData,
        currentDay: unlockDay, // 🔧 使用 NPC 对应的天数，确保记录存到正确的一天
        todayMeals: this.getMealsForDay(unlockDay).map(m => m.mealType), // 🔧 使用该天已有的餐食记录
        hasTalkedBefore: this.hasCompletedNPC(npcData.id),
        npcManager: this,
        useConvAI: true,
        mainScene: this.scene,
      };

      console.log(`📦 准备启动 DialogSceneRefactored，数据:`, dialogData);

      // 🔧 强制启动（如果已存在则重启）
      this.scene.scene.launch("DialogSceneRefactored", dialogData);
      this.scene.scene.bringToTop("DialogSceneRefactored");

      console.log("✅ DialogSceneRefactored 已指令启动");
    } catch (error) {
      console.error("❌ 启动对话场景失败:", error);
      alert("启动对话失败，请检查控制台: " + error.message);
      this.scene.scene.resume("MainScene");
    }
  }

  // ==================== 工具方法 ====================

  getCurrentDay() {
    // 🔧 优先访问 player 对象内的 currentDay
    if (this.playerStatus && this.playerStatus.player && this.playerStatus.player.currentDay !== undefined) {
      return Number(this.playerStatus.player.currentDay);
    }
    
    // 其次访问顶层的 currentDay
    if (this.playerStatus && this.playerStatus.currentDay !== undefined) {
      return Number(this.playerStatus.currentDay);
    }
    
    // 兜底逻辑：计算日历天数 (Calendar Day)
    if (!this.playerStatus || !this.playerStatus.player || !this.playerStatus.player.firstLoginDate) {
      console.warn("⚠️ [NPCManager] 无法获取玩家天数信息，默认使用 Day 1");
      return 1;
    }

    const firstLogin = new Date(this.playerStatus.player.firstLoginDate);
    const now = new Date();
    
    const d1 = new Date(firstLogin.getFullYear(), firstLogin.getMonth(), firstLogin.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = d2 - d1;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const calculatedDay = Math.max(1, Math.min(diffDays + 1, 7));
    console.log(`📅 [NPCManager] 后端未返回 currentDay，本地计算结果: Day ${calculatedDay}`);
    return calculatedDay;
  }

  getTodayMeals() {
    const currentDay = this.getCurrentDay();
    return this.mealRecords
      .filter(m => m.day === currentDay)
      .map(m => m.mealType); // 返回 ['breakfast', 'lunch', 'dinner']
  }

  getTodayMealCount() {
    return this.getTodayMeals().length;
  }

  getMealsForDay(day) {
    return this.mealRecords.filter(m => m.day === day);
  }

  hasRecordedMeal(mealType) {
    const todayMeals = this.getTodayMeals();
    return todayMeals.includes(mealType);
  }

  hasCompletedNPC(npcId) {
    // 检查是否和这个NPC完成过对话
    const npc = this.npcData.find(n => n.id === npcId);
    if (!npc) return false;
    
    const npcDayMeals = this.getMealsForDay(npc.unlockDay);
    return npcDayMeals.length >= 1; // 至少记录过1餐
  }

  getDailyProgress() {
    const currentDay = this.getCurrentDay();
    const todayMeals = this.getTodayMeals();
    
    return {
      currentDay,
      mealsRecorded: todayMeals.length,
      todayMeals: todayMeals, // ['breakfast', 'lunch']
      isComplete: todayMeals.length >= 3,
    };
  }

  async refreshAvailableNPCs() {
    console.log("🔄 刷新可用NPC状态");
    
    try {
      // 重新加载玩家状态
      await this.loadPlayerStatus();
      
      // 更新NPC显示状态
      this.updateNPCStates();
      
      console.log("✅ NPC状态刷新完成");
    } catch (error) {
      console.error("❌ 刷新NPC状态失败:", error);
    }
  }

  async recordMeal(mealType, mealData) {
    console.log(`🍽️ 记录餐食: ${mealType}`, mealData);

    try {
      const response = await fetch(`${API_URL}/record-meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: this.scene.playerId,
          npcId: mealData.npcId,
          mealType: mealType,
          journalRawText: mealData.journalText,
          journalSummary: mealData.summary,
          day: this.getCurrentDay(),
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ 餐食记录成功:", result);
        
        // 更新本地记录
        this.mealRecords.push({
          mealType,
          day: this.getCurrentDay(),
          npcId: mealData.npcId,
          timestamp: new Date(),
        });

        // 刷新NPC状态
        await this.refreshAvailableNPCs();

        // 通知主场景更新UI
        if (this.scene.onMealRecorded) {
          this.scene.onMealRecorded();
        }

        return result;
      } else {
        throw new Error("记录餐食失败");
      }
    } catch (error) {
      console.error("❌ 记录餐食失败:", error);
      throw error;
    }
  }

  // 销毁
  // 🔧 新增：添加线索到UIManager
  addClue(npcId, clueText, day, stage = null) {
    console.log(
      "📝 [NPCManager.addClue] NPC:",
      npcId,
      "Day:",
      day,
      "Stage:",
      stage,
      "Clue:",
      clueText?.slice(0, 40)
    );

    if (!this.scene.uiManager) {
      console.error("❌ UIManager 未初始化，无法添加线索");
      return;
    }

    const lang = this.scene.playerData?.language || "zh";
    const npcData = this.npcData.find((n) => n.id === npcId);
    const npcName = npcData ? npcData.name[lang] : npcId;

    // 调用UIManager的addClue方法（会显示通知）
    this.scene.uiManager.addClue(
      {
        npcId,
        npcName,
        clue: clueText,
        day,
        stage,
        receivedAt: new Date(),
      },
      true // 显示通知
    );

    // 同时保存到数据库
    this.saveClueToDatabase(npcId, clueText, day);
  }

  // 🔧 保存线索到数据库
  async saveClueToDatabase(npcId, clueText, day) {
    try {
      const playerId = this.scene.playerId;
      if (!playerId) {
        console.error("❌ 无法保存线索：playerId 不存在");
        return;
      }

      const response = await fetch(`${API_URL}/save-clue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          npcId,
          clueText,
          day,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ 线索已保存到数据库");
      } else {
        console.error("❌ 保存线索失败:", data.error);
      }
    } catch (error) {
      console.error("❌ 保存线索到数据库时出错:", error);
    }
  }

  destroy() {
    console.log("💥 销毁 NPCManager");
    
    this.npcSprites.forEach((npc) => {
      npc.sprite?.destroy();
      npc.nameText?.destroy();
      npc.lockIcon?.destroy();
      npc.activeIndicator?.destroy();
      npc.dayLabel?.destroy();
    });
    
    this.npcSprites = [];
  }
}

// // src/phaser/NPCManager.js - 修复 NPC 交互逻辑
// import Phaser from "phaser";
// import DialogScene from "./DialogScene.js";

// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";
// const ENABLE_CROSS_DAY_DELAY_FE =
//   process.env.REACT_APP_ENABLE_CROSS_DAY_DELAY === "true";
// const UI_FONT =
//   "Noto Sans TC, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

// function shouldEnableDelayUI() {
//   return (
//     !("REACT_APP_ENABLE_CROSS_DAY_DELAY" in process.env) ||
//     ENABLE_CROSS_DAY_DELAY_FE
//   );
// }

// export default class NPCManager {
//   constructor(scene, mapScale) {
//     this._loadingCache = null;
//     this._lastLoadTime = 0;
//     this.CACHE_DURATION = 5000;

//     this.scene = scene;
//     this.mapScale = mapScale;
//     this.npcs = new Map();
//     this.dialogSystem = null;
//     this.playerStatus = null;
//     this.availableNPCs = [];
//     this.mealRecords = [];
//     this.clueRecords = [];
//     this.isUpdatingDay = false;
//     this.pushedClueIds = new Set();
//     this.isGeneratingFinalEgg = false;
//     this.finalEggReady = false;
//     this.finalEggContent = null;

//     // 🔧 新增：点击防抖
//     this._lastClickTime = 0;
//     this._clickCooldown = 300; // 300ms 防抖
//     this._isProcessingClick = false;

//     // 🔧 新增：缓存点击处理函数
//     this._clickHandlers = new Map();

//     // 检测设备类型，调整参数
//     this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
//       navigator.userAgent
//     );

//     // 移动设备使用更长的防抖时间
//     this._clickCooldown = this.isMobile ? 500 : 300;

//     console.log(`📱 设备类型: ${this.isMobile ? "移动" : "桌面"}, 点击防抖: ${this._clickCooldown}ms`);

//     // 延迟初始化 NPCs
//     this._initialized = false;
//     this._initPromise = null;

//     console.log("🎭 NPCManager created with click optimization");
//   }

//   setDialogSystem(dialogSystem) {
//     this.dialogSystem = dialogSystem;
//   }

//   async setupAdditionalSystemsAsync() {
//     return new Promise((resolve) => {
//       console.log("🔧 Setting up additional systems...");

//       requestAnimationFrame(() => {
//         try {
//           this.setupAudio();

//           requestAnimationFrame(() => {
//             try {
//               this.setupMobileControls();
//               this.setupKeyboardHandling();

//               requestAnimationFrame(() => {
//                 console.log("✅ Additional systems setup completed");
//                 resolve();
//               });
//             } catch (error) {
//               console.error("❌ Additional systems setup failed:", error);
//               resolve();
//             }
//           });
//         } catch (error) {
//           console.error("❌ Additional systems setup failed:", error);
//           resolve();
//         }
//       });
//     });
//   }

//   showLoadingMessage(text) {
//     if (this.loadingText) {
//       this.loadingText.destroy();
//     }

//     this.loadingText = this.add.text(
//       this.scale.width / 2,
//       this.scale.height / 2,
//       text,
//       {
//         fontSize: '24px',
//         color: '#ffffff',
//         backgroundColor: '#000000',
//         padding: { x: 20, y: 10 }
//       }
//     ).setOrigin(0.5);

//     console.log("📝 Loading message:", text);
//   }

//   hideLoadingMessage() {
//     if (this.loadingText) {
//       this.loadingText.destroy();
//       this.loadingText = null;
//     }
//     console.log("✅ Loading message hidden");
//   }

//   showErrorMessage(message) {
//     console.error("💥 Showing error message:", message);

//     if (this.loadingText) {
//       this.loadingText.destroy();
//     }

//     this.loadingText = this.add.text(
//       this.scale.width / 2,
//       this.scale.height / 2,
//       `Error: ${message}`,
//       {
//         fontSize: '20px',
//         color: '#ff0000',
//         backgroundColor: '#000000',
//         padding: { x: 20, y: 10 }
//       }
//     ).setOrigin(0.5);
//   }

//   setupEventListeners() {
//     this.events.on("resume", () => {
//       console.log("🔄 MainScene resumed from dialog");

//       // 延迟执行，确保对话场景完全关闭
//       this.time.delayedCall(100, () => {
//         // 清理可能残留的浮动文本
//         this.emergencyCleanupFloatingTexts();

//         // 刷新NPC状态
//         this.refreshNPCs("resume-from-dialog");

//         // 🔑 关键：重新添加 NPC 点击区域和更新状态
//         if (this.npcManager) {
//           console.log("🔄 强制更新NPC交互状态");
//           this.npcManager.updateNPCStates();

//           // 确保所有可交互的NPC都有正确的点击区域
//           this.restoreNPCInteractions();
//         }
//       });
//     });

//     this.events.on(Phaser.Scenes.Events.RESUME, () => {
//       this.forceViewportReset();

//       // 额外的状态恢复
//       this.time.delayedCall(200, () => {
//         if (this.npcManager) {
//           this.restoreNPCInteractions();
//         }
//       });
//     });
//   }

//   async initializeMobileGame() {
//     try {
//       console.log("📱 Mobile initialization started");

//       // 1️⃣ 基础系统先加载
//       this.setupMap();
//       this.setupPlayer();
//       this.setupCamera();
//       this.showLoadingMessage("Loading mobile game...");

//       // 2️⃣ 延迟加载（逐步加载）
//       await new Promise((resolve) => setTimeout(resolve, 200)); // 减少延迟
//       await this.setupGameSystemsAsync();

//       // 3️⃣ 延迟加载 UI 和音频
//       await this.setupAdditionalSystemsAsync();

//       // 4️⃣ 加载完成
//       this.onGameInitialized();

//       // 5️⃣ 降级性能配置（移动端特有）
//       this.scale.displaySize.setAspectRatio(window.innerWidth / window.innerHeight);
//       this.scale.refresh();
//       this.cameras.main.setZoom(0.9);

//       // ✅ 限制帧率
//       if (this.game.loop) {
//         this.game.loop.targetFps = 30;
//       }

//       console.log("✅ Mobile initialization completed");

//     } catch (error) {
//       console.error("❌ Mobile initialization failed:", error);
//       this.showErrorMessage("Failed to load on mobile");
//     }
//   }

//   // 异步初始化方法
//   async initializeNPCsAsync() {
//     if (this._initialized) return;
//     if (this._initPromise) return this._initPromise;

//     console.log("🎭 Starting NPC initialization...");
//     this._initPromise = this._doInitializeNPCs();
//     return this._initPromise;
//   }

//   async setupGameSystemsAsync() {
//     return new Promise(async (resolve) => {
//       console.log("🎭 Setting up game systems...");

//       requestAnimationFrame(async () => {
//         try {
//           // 创建 DialogScene
//           let dialogScene = this.scene.get("DialogScene");
//           if (!dialogScene) {
//             this.scene.add("DialogScene", DialogScene, false);
//             dialogScene = this.scene.get("DialogScene");
//           }
//           this.dialogSystem = dialogScene;

//           // 创建 NPCManager
//           this.npcManager = new NPCManager(this, this.mapScale);

//           if (this.dialogSystem) {
//             try {
//               this.npcManager.setDialogSystem(this.dialogSystem);
//             } catch (error) {
//               console.error("Error setting up dialog system:", error);
//             }
//           }

//           // 异步初始化 NPCs
//           if (this.npcManager.initializeNPCsAsync) {
//             await this.npcManager.initializeNPCsAsync();
//           }

//           console.log("✅ Game systems setup completed");
//           resolve();
//         } catch (error) {
//           console.error("❌ Game systems setup failed:", error);
//           resolve(); // 即使失败也继续
//         }
//       });
//     });
//   }

//   cleanupClickHandlers() {
//     // 清理所有缓存的点击处理函数
//     this._clickHandlers.clear();

//     // 清理所有NPC的点击区域
//     this.npcs.forEach((npc) => {
//       if (npc.clickArea) {
//         npc.clickArea.removeAllListeners();
//         npc.clickArea.destroy();
//         npc.clickArea = null;
//       }
//       if (npc.sprite) {
//         npc.sprite.removeAllListeners();
//       }
//     });

//     // 重置状态
//     this._isProcessingClick = false;
//     this._lastClickTime = 0;

//     console.log("🧹 清理了所有点击处理器");
//   }

//   onGameInitialized() {
//     console.log("🎉 Game initialization completed!");

//     // 清理加载提示
//     this.hideLoadingMessage();

//     // 延迟显示欢迎消息
//     this.time.delayedCall(500, () => {
//       this.showWelcomeMessage();
//     });

//     this.handleResize(this.scale.gameSize);
//     this.gameStarted = true;

//     // 设置事件监听
//     this.setupEventListeners();
//   }

//   async initializeDesktopGame() {
//     try {
//       console.log("🖥️ Desktop initialization started");

//       // 第一阶段：基础系统（必须同步）
//       this.setupMap();
//       this.setupPlayer();
//       this.setupCamera();

//       // 显示加载提示
//       this.showLoadingMessage("Loading desktop game...");

//       // 第二阶段：异步加载游戏系统
//       await this.setupGameSystemsAsync();

//       // 第三阶段：异步加载其他系统
//       await this.setupAdditionalSystemsAsync();

//       // 完成初始化
//       this.onGameInitialized();

//       console.log("✅ Desktop initialization completed");

//     } catch (error) {
//       console.error("❌ Desktop initialization failed:", error);
//       this.showErrorMessage("Failed to load game");
//     }
//   }

//   // 异步初始化方法
//   async initializeGameAsync() {
//     try {
//       console.log("🚀 Starting game initialization...");

//       const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
//       console.log("设备类型:", isMobile ? "移动端" : "桌面端");

//       if (isMobile) {
//         await this.initializeMobileGame();
//       } else {
//         await this.initializeDesktopGame();
//       }

//       console.log("✅ Game initialization completed");
//     } catch (error) {
//       console.error("❌ Game initialization failed:", error);
//       this.showErrorMessage("Failed to load game");
//     }
//   }

//   async _doInitializeNPCs() {
//     try {
//       // 分阶段创建 NPCs
//       const npcConfigs = [
//         { id: "village_head", name: "村长伯伯", position: { x: 1, y: 0.7 }, day: 1 },
//         { id: "shop_owner", name: "店主阿桂", position: { x: 5, y: 5.5 }, day: 2 },
//         { id: "spice_woman", name: "香料婆婆", position: { x: 5, y: 1.5 }, day: 3 },
//         { id: "restaurant_owner", name: "餐厅店长老韩", position: { x: 1, y: 7.5 }, day: 4 },
//         { id: "fisherman", name: "渔夫阿梁", position: { x: 1.5, y: 4.5 }, day: 5 },
//         { id: "old_friend", name: "林川", position: { x: 5.5, y: 7 }, day: 6 },
//         { id: "secret_apprentice", name: "念念", position: { x: 0.8, y: 2.5 }, day: 7 },
//       ];

//       // 批量创建 NPCs
//       for (let i = 0; i < npcConfigs.length; i++) {
//         const config = npcConfigs[i];
//         this.createNPC(config);

//         // 每创建几个 NPC 就延迟一帧
//         if (i % 2 === 1) {
//           await new Promise(resolve => requestAnimationFrame(resolve));
//         }
//       }

//       this.setDefaultNPCStates();

//       // 异步加载玩家状态
//       try {
//         await this.loadPlayerStatus();
//         console.log("✅ NPCs initialized with player status");
//       } catch (error) {
//         console.warn("⚠️ Failed to load player status, using defaults:", error);
//       }

//       this._initialized = true;
//       console.log("✅ NPC initialization completed");

//     } catch (error) {
//       console.error("❌ NPC initialization failed:", error);
//       this._initialized = false;
//     }
//   }

//   async _doInitializeNPCs() {
//     try {
//       // 分阶段创建 NPCs
//       const npcConfigs = [
//         { id: "village_head", name: "村长伯伯", position: { x: 1, y: 0.7 }, day: 1 },
//         { id: "shop_owner", name: "店主阿桂", position: { x: 5, y: 5.5 }, day: 2 },
//         { id: "spice_woman", name: "香料婆婆", position: { x: 5, y: 1.5 }, day: 3 },
//         { id: "restaurant_owner", name: "餐厅店长老韩", position: { x: 1, y: 7.5 }, day: 4 },
//         { id: "fisherman", name: "渔夫阿梁", position: { x: 1.5, y: 4.5 }, day: 5 },
//         { id: "old_friend", name: "林川", position: { x: 5.5, y: 7 }, day: 6 },
//         { id: "secret_apprentice", name: "念念", position: { x: 0.8, y: 2.5 }, day: 7 },
//       ];

//       // 批量创建 NPCs
//       for (let i = 0; i < npcConfigs.length; i++) {
//         const config = npcConfigs[i];
//         this.createNPC(config);

//         // 每创建几个 NPC 就延迟一帧
//         if (i % 2 === 1) {
//           await new Promise(resolve => requestAnimationFrame(resolve));
//         }
//       }

//       this.setDefaultNPCStates();

//       // 异步加载玩家状态
//       try {
//         await this.loadPlayerStatus();
//         console.log("✅ NPCs initialized with player status");
//       } catch (error) {
//         console.warn("⚠️ Failed to load player status, using defaults:", error);
//       }

//       this._initialized = true;
//       console.log("✅ NPC initialization completed");

//     } catch (error) {
//       console.error("❌ NPC initialization failed:", error);
//       this._initialized = false;
//     }
//   }

//   setDefaultNPCStates() {
//     this.npcs.forEach((npc) => {
//       npc.isUnlocked = false;
//       npc.hasRecordedMeal = false;
//       npc.sprite.setVisible(false);
//       this.removeNPCHighlight(npc);
//     });

//     const firstDayNPC = this.npcs.get("village_head");
//     if (firstDayNPC) {
//       firstDayNPC.isUnlocked = true;
//       firstDayNPC.hasRecordedMeal = false;
//       firstDayNPC.mealsRecorded = 0;
//       firstDayNPC.hasCompletedDay = false;
//       firstDayNPC.availableMealTypes = ["breakfast", "lunch", "dinner"];
//       firstDayNPC.sprite.setVisible(true);

//       this.highlightNPC(firstDayNPC);
//       this.addNPCClickArea(firstDayNPC);
//     }

//     if (!this.availableNPCs || this.availableNPCs.length === 0) {
//       this.availableNPCs = [
//         {
//           day: 1,
//           npcId: "village_head",
//           unlocked: true,
//           mealsRecorded: 0,
//           hasCompletedDay: false,
//           availableMealTypes: ["breakfast", "lunch", "dinner"],
//         },
//       ];
//     }

//     if (!this.playerStatus) {
//       this.playerStatus = {
//         playerId: this.scene.playerId,
//         currentDay: 1,
//         gameCompleted: false,
//         firstLoginDate: new Date(),
//       };
//     }
//   }

//   // 供 DialogScene / MainScene 在返回地图后调用：重新拉取后端并刷新 NPC 可见/可点状态
//   async refreshAvailableNPCs() {
//     try {
//       console.log("🔄 refreshAvailableNPCs: 开始刷新NPC状态");

//       // 重新加载玩家状态（会更新 this.playerStatus, this.availableNPCs 等）
//       await this.loadPlayerStatus();

//       console.log("✅ refreshAvailableNPCs: 玩家状态加载完成", {
//         当前天: this.playerStatus?.currentDay,
//         可用NPCs数量: this.availableNPCs?.length,
//         NPC列表: this.availableNPCs?.map(
//           (n) => `${n.npcId}(Day${n.day}, unlocked:${n.unlocked})`
//         ),
//       });

//       // 🔧 关键：检查是否有新解锁的天数需要推进
//       const currentDay = this.playerStatus?.currentDay || 1;
//       const hasCurrentDayNPC = this.availableNPCs?.some(
//         (n) => n.day === currentDay && n.unlocked
//       );

//       if (!hasCurrentDayNPC && currentDay < 7) {
//         console.log(`⚠️ 第${currentDay}天没有已解锁的NPC，尝试推进天数`);

//         // 检查是否满足推进条件
//         const shouldAdvance = await this.checkShouldAdvanceDay(currentDay);
//         if (shouldAdvance) {
//           console.log("🚀 满足推进条件，调用 forceUpdateCurrentDay");
//           await this.forceUpdateCurrentDay();

//           // 推进后重新加载状态
//           await this.loadPlayerStatus();
//         }
//       }

//       // 更新NPC显示状态
//       this.updateNPCStates();

//       console.log("✅ refreshAvailableNPCs: 完成");
//     } catch (e) {
//       console.warn("refreshAvailableNPCs: loadPlayerStatus failed:", e);
//       // 即使失败也要更新显示状态
//       this.updateNPCStates();
//     }
//   }

//   async checkShouldAdvanceDay(currentDay) {
//     try {
//       // 检查当前天是否至少记录了1餐
//       const dayMeals =
//         this.mealRecords?.filter((m) => m.day === currentDay) || [];
//       const hasRecordedMeal = dayMeals.length > 0;

//       // 检查下一天的NPC是否已存在
//       const nextDay = currentDay + 1;
//       const hasNextDayNPC = this.availableNPCs?.some((n) => n.day === nextDay);

//       console.log("🔍 检查推进条件:", {
//         当前天: currentDay,
//         已记录餐数: dayMeals.length,
//         有下一天NPC: hasNextDayNPC,
//         应该推进: hasRecordedMeal && !hasNextDayNPC && currentDay < 7,
//       });
//       // return hasRecordedMeal && !hasNextDayNPC && currentDay < 7;
//       // 只允许「第1天」满足“记过至少一餐 & 没有第2天NPC”的情况下推进到第2天
//       return currentDay === 1 && hasRecordedMeal && !hasNextDayNPC;
//     } catch (error) {
//       console.error("检查推进条件失败:", error);
//       return false;
//     }
//   }

//   // 仅根据现有内存状态重绑“今天”的点击区域（不访问后端）
//   rebindClickAreasForCurrentDay() {
//     const day = this.playerStatus?.currentDay || 1;
//     const today = (this.availableNPCs || []).find((n) => n.day === day);
//     if (!today) return;

//     const npc = this.npcs.get(today.npcId);
//     if (!npc || !npc.sprite) return;

//     // 先清理提示，避免 UI 残留
//     if (npc.mealHint) {
//       npc.mealHint.destroy();
//       npc.mealHint = null;
//     }

//     npc.sprite?.setVisible(true);
//     this.addNPCClickArea?.(npc);
//     this.highlightNPC?.(npc);

//     const mealTypes = today.availableMealTypes || [];
//     if (mealTypes.length > 0) {
//       this.addMealTypeHint?.(npc, mealTypes);
//     } else {
//       // 餐都记完了，但还没解锁下一天 -> 给“可对话”提示
//       this.addChatOnlyHint?.(npc);
//     }
//     npc.hasRecordedMeal = false;
//   }

//   addMealTypeHint(npc, mealTypes = []) {
//     if (npc.mealHint) {
//       npc.mealHint.destroy();
//       npc.mealHint = null;
//     }

//     if (
//       !npc ||
//       !npc.sprite ||
//       !Array.isArray(mealTypes) ||
//       mealTypes.length === 0
//     )
//       return;

//     const lang = this.scene.playerData.language;
//     const map = {
//       breakfast: lang === "zh" ? "早餐" : "Breakfast",
//       lunch: lang === "zh" ? "午餐" : "Lunch",
//       dinner: lang === "zh" ? "晚餐" : "Dinner",
//     };

//     const label = mealTypes
//       .map((t) => map[t] || t)
//       .join(lang === "zh" ? " / " : " / ");
//     const text = lang === "zh" ? `可记录：${label}` : `Available: ${label}`;

//     const t = this.scene.add.text(npc.sprite.x, npc.sprite.y - 60, text, {
//       fontSize: "13px",
//       fontFamily: UI_FONT,
//       fill: "#00ffcc",
//       backgroundColor: "#000000",
//       padding: { x: 6, y: 3 },
//     });
//     t.setOrigin(0.5);
//     t.setDepth(20);

//     this.scene.tweens.add({
//       targets: t,
//       y: t.y - 8,
//       duration: 800,
//       yoyo: true,
//       repeat: -1,
//       ease: "Sine.easeInOut",
//     });

//     npc.mealHint = t;
//   }

//   async loadPlayerStatus() {
//     try {
//       const response = await fetch(`${API_URL}/player-status`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ playerId: this.scene.playerId }),
//       });

//       if (!response.ok) throw new Error("Failed to load player status");

//       const data = await response.json();

//       // 统一把 npc2 规范为 shop_owner（只声明一次，不要重复）
//       const norm = (id) => (id === "npc2" ? "shop_owner" : id);

//       // 玩家状态
//       this.playerStatus = data.player;

//       // 可用 NPC（规范化 npcId）
//       this.availableNPCs = (data.availableNPCs || []).map((n) => ({
//         ...n,
//         npcId: norm(n.npcId),
//       }));

//       // 已记录餐食（规范化 npcId）
//       this.mealRecords = (data.mealRecords || []).map((m) => ({
//         ...m,
//         npcId: norm(m.npcId),
//       }));

//       // 今天剩余可记的餐别
//       this.currentDayMealsRemaining = data.currentDayMealsRemaining || [];

//       // 线索：补上展示名，并去重合并
//       const mappedClues = (data.clueRecords || []).map((clue) => {
//         const cid = norm(clue.npcId);
//         return {
//           ...clue,
//           npcId: cid,
//           npcName: this.getNPCNameByLanguage(cid),
//         };
//       });
//       const byId = new Map();
//       [...(this.clueRecords || []), ...mappedClues].forEach((c) =>
//         byId.set(c.id, c)
//       );
//       this.clueRecords = Array.from(byId.values());

//       if (this.scene.uiManager && Array.isArray(mappedClues)) {
//         this.scene.uiManager.setClues(mappedClues);
//         mappedClues.forEach((c) => this.pushedClueIds.add(c.id));
//       }

//       // 如果有“等待到某个时间才能推进”的返回，则提示并定时再检查
//       if (data.nextAdvanceAt && shouldEnableDelayUI()) {
//         const readyTs = new Date(data.nextAdvanceAt).getTime();
//         const waitMs = Math.max(0, readyTs - Date.now());
//         if (waitMs > 0) {
//           const lang = this.scene.playerData.language;
//           const mins = Math.max(1, Math.ceil(waitMs / 60000));
//           this.scene.showNotification(
//             lang === "zh"
//               ? `距离解锁下一天约 ${mins} 分钟。`
//               : `~${mins} min left before next day unlock.`,
//             3000
//           );
//           this.scheduleAdvanceCheck(waitMs);
//         }
//       }

//       // 刷新 NPC 显示与推进检查
//       this.updateNPCStates();
//       await this.checkAndUpdateCurrentDay();

//       const firstDayNPC = this.availableNPCs.find((npc) => npc.day === 1);
//       console.log("自动跳转调试信息：", {
//         currentDay: this.playerStatus.currentDay,
//         firstDayMealsRecorded: firstDayNPC?.mealsRecorded || 0,
//         firstDayIsCompleted: firstDayNPC?.hasCompletedDay || false,
//         currentDayMealsRemaining: this.currentDayMealsRemaining.length,
//         hasNextDayNPC: this.availableNPCs.some(
//           (npc) => npc.day === this.playerStatus.currentDay + 1
//         ),
//       });

//       console.log(`Player status loaded:`, {
//         playerId: this.playerStatus.playerId,
//         currentDay: this.playerStatus.currentDay,
//         gameCompleted: this.playerStatus.gameCompleted,
//         availableNPCs: this.availableNPCs.length,
//         mealRecords: this.mealRecords.length,
//         clueRecords: this.clueRecords.length,
//         currentDayMealsRemaining: this.currentDayMealsRemaining,
//       });
//     } catch (error) {
//       // 兜底：后端挂了也能玩 Day1
//       if (this.scene?.showNotification) {
//         this.scene.showNotification(
//           this.scene.playerData.language === "zh"
//             ? "服务器暂时不可用，使用本地进度。"
//             : "Server unavailable, using local progress.",
//           2500
//         );
//       }

//       if (!this.playerStatus || !this.playerStatus.currentDay) {
//         this.playerStatus = {
//           playerId: this.scene.playerId,
//           currentDay: 1,
//           gameCompleted: false,
//           firstLoginDate: new Date(),
//         };
//         this.availableNPCs = [
//           {
//             day: 1,
//             npcId: "village_head",
//             unlocked: true,
//             mealsRecorded: 0,
//             hasCompletedDay: false,
//             availableMealTypes: ["breakfast", "lunch", "dinner"],
//           },
//         ];
//         this.mealRecords = [];
//         this.clueRecords = [];
//         this.currentDayMealsRemaining = ["breakfast", "lunch", "dinner"];
//         this.updateNPCStates();
//       }
//     }
//   }

//   _doUpdateNPCStates() {
//     // 原来的 updateNPCStates 代码放在这里

//     const day = this.playerStatus?.currentDay || 1;
//     console.log(`🔄 更新NPC状态 (Day ${day})`);

//     // 防止频繁调用
//     if (this._updateNPCStatesTimer) {
//       clearTimeout(this._updateNPCStatesTimer);
//     }

//     this._updateNPCStatesTimer = setTimeout(() => {
//       this._doUpdateNPCStates();
//     }, 100); // 100ms 防抖

//     // ... 原有的 updateNPCStates 实现 ...
//   }

//   // NPCManager.js - 修复 updateNPCStates 方法
//   // updateNPCStates() {
//   //   // 防止频繁调用
//   //   if (this._updateNPCStatesTimer) {
//   //     clearTimeout(this._updateNPCStatesTimer);
//   //   }

//   //   this._updateNPCStatesTimer = setTimeout(() => {
//   //     this._doUpdateNPCStates();
//   //   }, 100); // 100ms 防抖
//   // }

//   // 新增：显示"可对话"提示（当没有可记录餐食时）
//   addChatOnlyHint(npc) {
//     if (npc.mealHint) {
//       npc.mealHint.destroy();
//       npc.mealHint = null;
//     }

//     const lang = this.scene.playerData.language;
//     const text = lang === "zh" ? "可对话" : "Can talk";

//     const t = this.scene.add.text(npc.sprite.x, npc.sprite.y - 60, text, {
//       fontSize: "13px",
//       fontFamily: UI_FONT,
//       fill: "#60a5fa", // 蓝色表示纯对话
//       backgroundColor: "#000000",
//       padding: { x: 6, y: 3 },
//     });
//     t.setOrigin(0.5);
//     t.setDepth(20);

//     this.scene.tweens.add({
//       targets: t,
//       y: t.y - 8,
//       duration: 800,
//       yoyo: true,
//       repeat: -1,
//       ease: "Sine.easeInOut",
//     });

//     npc.mealHint = t;
//   }

//   clearAllNPCHints() {
//     this.npcs.forEach((npc) => {
//       if (npc.mealHint) {
//         npc.mealHint.destroy();
//         npc.mealHint = null;
//       }
//       if (npc.hoverText) {
//         npc.hoverText.destroy();
//         npc.hoverText = null;
//       }
//       if (npc.glowEffect) {
//         npc.glowEffect.destroy();
//         npc.glowEffect = null;
//       }
//       if (npc.clickArea) {
//         npc.clickArea.destroy();
//         npc.clickArea = null;
//       }
//     });
//   }

//   getNPCNameByLanguage(npcId) {
//     const language = this.scene.playerData.language;

//     const npcNames = {
//       village_head: {
//         zh: "村长伯伯",
//         en: "Uncle Bo (Village Head)",
//       },
//       shop_owner: {
//         zh: "店主阿桂",
//         en: "Grace (Shop Owner)",
//       },
//       spice_woman: {
//         zh: "香料婆婆",
//         en: "Spice Woman",
//       },
//       restaurant_owner: {
//         zh: "餐厅店长老韩",
//         en: "Han (Restaurant Owner)",
//       },
//       fisherman: {
//         zh: "渔夫阿梁",
//         en: "Leon (Fisherman)",
//       },
//       old_friend: {
//         zh: "林川",
//         en: "Rowan",
//       },
//       secret_apprentice: {
//         zh: "念念",
//         en: "NianNian",
//       },
//     };

//     const nameObj = npcNames[npcId];
//     return nameObj ? nameObj[language] || nameObj.en : "Unknown NPC";
//   }

//   // 🔑 关键修复：简化交互检查逻辑
//   canInteractWithNPC(npc) {
//     const availableNPC = this.availableNPCs.find((a) => a.npcId === npc.id);

//     console.log(`🔍 检查NPC ${npc.id} 交互权限:`, {
//       找到匹配NPC: !!availableNPC,
//       解锁状态: availableNPC?.unlocked,
//       当前天: this.playerStatus?.currentDay,
//       NPC天数: availableNPC?.day,
//     });

//     if (!availableNPC) {
//       console.log(`❌ 未找到NPC ${npc.id} 的可用配置`);
//       return false;
//     }

//     if (!availableNPC.unlocked) {
//       console.log(`❌ NPC ${npc.id} 未解锁`);
//       return false;
//     }

//     if (availableNPC.day !== this.playerStatus.currentDay) {
//       console.log(
//         `❌ NPC ${npc.id} 不是当前天 (${availableNPC.day} vs ${this.playerStatus.currentDay})`
//       );
//       return false;
//     }

//     // ✅ 关键修复：只要是当前天的已解锁NPC就可以对话
//     // 不再检查餐食记录状态或完成状态
//     console.log(`✅ NPC ${npc.id} 可以交互 - 当前天已解锁NPC`);
//     return true;
//   }
//   showInteractionBlockedMessage(npc) {
//     const language = this.scene.playerData.language;
//     let message;

//     const availableNPC = this.availableNPCs.find(
//       (availableNPC) => availableNPC.npcId === npc.id
//     );

//     if (!availableNPC) {
//       message =
//         language === "zh"
//           ? "这个NPC还未解锁，需要先完成前面的任务"
//           : "This NPC is not unlocked yet, complete previous tasks first";
//     } else if (availableNPC.day > this.playerStatus.currentDay) {
//       message =
//         language === "zh"
//           ? `这是第${availableNPC.day}天的NPC，请先完成当前天的任务`
//           : `This is Day ${availableNPC.day} NPC, please complete current day's tasks first`;
//     } else if (availableNPC.day < this.playerStatus.currentDay) {
//       message =
//         language === "zh"
//           ? "这是之前的NPC，当前无法再次对话"
//           : "This is a previous day's NPC, cannot interact again";
//     } else {
//       // ✅ 移除"已完成"的概念，因为可以无限对话
//       message =
//         language === "zh"
//           ? "暂时无法与此NPC对话"
//           : "Cannot interact with this NPC yet";
//     }

//     this.scene.showNotification(message, 3000);
//   }

//   async saveConversationToDatabase(npcId, speaker, content, mealType = null) {
//     try {
//       const currentDay = this.playerStatus.currentDay;

//       const response = await fetch(`${API_URL}/save-conversation`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           playerId: this.scene.playerId,
//           npcId: npcId,
//           day: currentDay,
//           speaker: speaker,
//           content: content,
//           mealType: mealType,
//           sessionId: null,
//         }),
//       });

//       const data = await response.json();
//       return data.success;
//     } catch (error) {
//       console.error("Error saving conversation:", error);
//       return false;
//     }
//   }
//   async checkShouldAdvanceDay(currentDay) {
//     try {
//       // 检查当前天是否已经记录了至少一餐
//       const dayMeals =
//         this.mealRecords?.filter((m) => m.day === currentDay) || [];
//       const hasRecordedMeal = dayMeals.length > 0;

//       // 检查下一天的NPC是否已存在
//       const nextDay = currentDay + 1;
//       const hasNextDayNPC = this.availableNPCs?.some((n) => n.day === nextDay);

//       console.log("🔍 检查推进条件:", {
//         当前天: currentDay,
//         已记录餐数: dayMeals.length,
//         有下一天NPC: hasNextDayNPC,
//         应该推进: hasRecordedMeal && !hasNextDayNPC && currentDay < 7,
//       });

//       return hasRecordedMeal && !hasNextDayNPC && currentDay < 7;
//     } catch (error) {
//       console.error("检查推进条件失败:", error);
//       return false;
//     }
//   }

//   // 🔑 关键修复：记录餐食后正确更新本地状态（无 DEV 跳天）
//   async recordMeal(
//     npcId,
//     mealType,
//     mealAnswers,
//     conversationHistory,
//     mealContent
//   ) {
//     try {
//       const npc = this.npcs.get(npcId);
//       const currentDay = this.playerStatus.currentDay;

//       console.log(`🍽️ 开始记录餐食:`, {
//         npcId,
//         mealType,
//         currentDay,
//         当前可用餐食: this.availableNPCs.find((n) => n.npcId === npcId)
//           ?.availableMealTypes,
//       });

//       // 调用后端 /record-meal
//       const resp = await fetch(`${API_URL}/record-meal`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           playerId: this.scene.playerId,
//           day: currentDay,
//           npcId,
//           npcName: npc ? npc.name : "Unknown NPC",
//           mealType,
//           mealAnswers,
//           conversationHistory,
//           mealContent:
//             mealContent && mealContent.trim()
//               ? mealContent
//               : this.scene.playerData.language === "zh"
//                 ? "未填写具体餐食"
//                 : "No detailed meal provided",
//         }),
//       });

//       if (!resp.ok) {
//         const ct = resp.headers.get("content-type") || "";
//         let detail = "";
//         try {
//           detail = ct.includes("application/json")
//             ? JSON.stringify(await resp.json())
//             : await resp.text();
//         } catch (_) { }
//         throw new Error(`HTTP ${resp.status}${detail ? ` - ${detail}` : ""}`);
//       }

//       const data = await resp.json();
//       if (!data.success) throw new Error(data.error || "Failed to record meal");

//       console.log(`✅ /record-meal 响应:`, {
//         success: data.success,
//         shouldGiveClue: data.shouldGiveClue,
//         availableMealTypes: data.availableMealTypes,
//         nextDayUnlocked: data.nextDayUnlocked,
//         newDay: data.newDay,
//         currentDay: data.currentDay,
//         isFirstMealToday: data.isFirstMealToday,
//       });

//       // 🔧 关键修复：立即更新本地状态
//       const todayNPC = this.availableNPCs.find(
//         (n) => n.npcId === npcId && n.day === currentDay
//       );
//       if (todayNPC) {
//         todayNPC.mealsRecorded = (todayNPC.mealsRecorded || 0) + 1;
//         todayNPC.hasRecordedMeal = true;

//         if (Array.isArray(data.availableMealTypes)) {
//           todayNPC.availableMealTypes = data.availableMealTypes;
//         } else {
//           todayNPC.availableMealTypes = (
//             todayNPC.availableMealTypes || []
//           ).filter((t) => t !== mealType);
//         }
//       }

//       // 🔧 关键修复：处理天数推进的三种情况
//       if (data.newDay) {
//         // 情况1：服务器直接推进了天数
//         const oldDay = this.playerStatus.currentDay;
//         this.playerStatus.currentDay = data.newDay;

//         console.log(`🎉 服务器直接推进天数: ${oldDay} -> ${data.newDay}`);

//         // 立即重新加载状态
//         setTimeout(async () => {
//           await this.loadPlayerStatus();
//           this.updateNPCStates();
//         }, 500);
//       } else if (data.nextDayUnlocked && data.isFirstMealToday) {
//         // 情况2：这是今天第一餐，且后端解锁了下一天
//         console.log("🔓 第一餐记录完成，下一天已解锁，立即刷新状态");

//         // 🔧 重要：检查是否应该推进天数
//         setTimeout(async () => {
//           await this.loadPlayerStatus();

//           // 检查是否满足推进条件
//           const shouldAdvance = await this.checkShouldAdvanceDay(currentDay);
//           if (shouldAdvance) {
//             console.log("🚀 满足推进条件，调用 forceUpdateCurrentDay");
//             await this.forceUpdateCurrentDay();
//           } else {
//             this.updateNPCStates();
//           }
//         }, 800);
//       } else if (data.nextDayUnlocked) {
//         // 情况3：非第一餐，但解锁了下一天（可能需要等待时间条件）
//         console.log("🔓 解锁了下一天但非第一餐，刷新状态");

//         setTimeout(async () => {
//           await this.loadPlayerStatus();
//           this.updateNPCStates();
//         }, 500);
//       } else {
//         // 情况4：普通餐食记录，只需更新当前状态
//         console.log("📝 普通餐食记录，更新当前状态");
//         this.updateNPCStates();
//       }

//       // 处理线索数据...
//       let processedClueData = { ...data };
//       if (data.shouldGiveClue) {
//         const stage =
//           data.mealStage ??
//           (mealType === "breakfast" ? 1 : mealType === "lunch" ? 2 : 3);

//         if (!data.clueText || !data.clueText.trim()) {
//           processedClueData.clueText =
//             stage === 3
//               ? this.getNPCClue(npcId)
//               : this.getVagueResponse(npcId, stage);
//         }

//         processedClueData.mealStage = stage;
//         this.preAddClue(npcId, processedClueData.clueText, currentDay, stage);
//       }

//       return {
//         success: true,
//         shouldGiveClue: !!data.shouldGiveClue,
//         clueText: processedClueData.clueText,
//         mealStage: processedClueData.mealStage,
//         nextDayUnlocked: !!data.nextDayUnlocked,
//         newDay: data.newDay || null,
//         isFirstMealToday: !!data.isFirstMealToday,
//       };
//     } catch (error) {
//       console.error("Error recording meal:", error);
//       return { success: false, error: error.message };
//     }
//   }

//   // 🔧 新增：检查是否应该推进天数的方法
//   async chDay(currentDay) {
//     try {
//       // 检查当前天是否已经记录了至少一餐
//       const todayNPC = this.availableNPCs.find((n) => n.day === currentDay);
//       if (!todayNPC) return false;

//       // 如果今天已经记录了餐食，且还没有下一天的NPC，应该推进
//       const hasRecordedMeal = todayNPC.mealsRecorded > 0;
//       const nextDayNPC = this.availableNPCs.find(
//         (n) => n.day === currentDay + 1
//       );

//       console.log("🔍 检查切天条件:", {
//         当前天: currentDay,
//         已记录餐数: todayNPC.mealsRecorded,
//         有下一天NPC: !!nextDayNPC,
//         应该推进: hasRecordedMeal && !nextDayNPC && currentDay < 7,
//       });

//       return hasRecordedMeal && !nextDayNPC && currentDay < 7;
//     } catch (error) {
//       console.error("检查切天条件失败:", error);
//       return false;
//     }
//   }

//   preAddClue(npcId, clueText, day, stage = null) {
//     const stagePart =
//       stage === 1 || stage === 2 || stage === 3 ? `_${stage}` : "";
//     const clueId = `${npcId}_${day}${stagePart}`;

//     // 检查是否已存在
//     const existingIndex = (this.clueRecords || []).findIndex(
//       (c) => c.id === clueId
//     );
//     if (existingIndex !== -1) {
//       console.log("线索已存在于预缓存，跳过:", clueId);
//       return;
//     }

//     const npc = this.npcs.get(npcId);
//     const npcDisplayName =
//       npc && npc.name
//         ? npc.name
//         : this.getNPCNameByLanguage
//           ? this.getNPCNameByLanguage(npcId)
//           : npcId;

//     const clue = {
//       id: clueId,
//       npcId,
//       npcName: npcDisplayName,
//       clue: clueText && clueText.trim() ? clueText : "…",
//       day,
//       stage: stage || undefined,
//       receivedAt: new Date(),
//       _preAdded: true, // 标记为预添加，避免重复
//     };

//     this.clueRecords = this.clueRecords || [];
//     this.clueRecords.push(clue);

//     console.log("线索已预添加到本地缓存:", clue);
//   }

//   async checkAndUpdateCurrentDay() {
//     const now = Date.now();
//     if (now - this.lastCheckDayTime < this.checkDayInterval) {
//       console.log("检查天数更新过于频繁，跳过");
//       return;
//     }
//     this.lastCheckDayTime = now;

//     if (!this.playerStatus) return;

//     const currentDay = this.playerStatus.currentDay;
//     const currentNPC = this.availableNPCs.find((npc) => npc.day === currentDay);
//     if (!currentNPC) return;

//     const isServerCompleted = currentNPC.hasCompletedDay === true;
//     const hasNextDayNPC = this.availableNPCs.some(
//       (npc) => npc.day === currentDay + 1
//     );

//     if (isServerCompleted) {
//       console.log(
//         `DINNER_OK: 服务器已标记完成，尝试请求切天（无需等待下一天NPC出现在列表）`
//       );

//       if (
//         !this.advanceGateBlockedUntil ||
//         Date.now() >= this.advanceGateBlockedUntil.getTime()
//       ) {
//         const ok = await this.forceUpdateCurrentDay();
//         if (!ok) {
//           setTimeout(
//             () => this.loadPlayerStatus().then(() => this.updateNPCStates()),
//             1200
//           );
//         }
//       } else {
//         console.log(
//           "[AdvanceGate] blocked until:",
//           this.advanceGateBlockedUntil
//         );
//       }
//     } else {
//       console.log(`DINNER_OK: 当天未完成，继续等待`, {
//         服务器确认完成: isServerCompleted,
//         是否存在下一天NPC: hasNextDayNPC,
//         本地剩余餐食: currentNPC.availableMealTypes,
//       });
//     }
//   }

//   async forceUpdateCurrentDay() {
//     try {
//       if (this._advanceInFlight) {
//         console.log("⏳ 切天请求正在进行中，跳过");
//         return false;
//       }

//       this._advanceInFlight = true;

//       const body = {
//         playerId: this.scene.playerId,
//         currentDay: this.playerStatus.currentDay,
//       };

//       console.log("📤 发送切天请求:", body);

//       const resp = await fetch(`${API_URL}/update-current-day`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });

//       const data = await resp.json();
//       console.log("📥 切天响应:", data);

//       if (!data.success) {
//         if (
//           data.error &&
//           data.error.toLowerCase().includes("advance not allowed")
//         ) {
//           // 时间限制，设置阻塞时间
//           if (data.canAdvanceAt) {
//             this.advanceGateBlockedUntil = new Date(data.canAdvanceAt);
//           }

//           const lang = this.scene.playerData.language;
//           this.scene.showNotification(
//             lang === "zh"
//               ? "已记录餐食。下一天将在明天解锁。"
//               : "Meal recorded. Next day will unlock tomorrow.",
//             3000
//           );
//           return false;
//         }

//         console.warn("切天被拒绝:", data);
//         return false;
//       }

//       // 🔧 切天成功，立即更新本地状态
//       const oldDay = this.playerStatus.currentDay;
//       this.playerStatus.currentDay = data.newDay;

//       // 🔧 立即重新加载状态，确保新NPC出现
//       await this.loadPlayerStatus();
//       this.updateNPCStates();

//       this.scene.showNotification(
//         this.scene.playerData.language === "zh"
//           ? `已进入第 ${data.newDay} 天`
//           : `Advanced to Day ${data.newDay}`,
//         2500
//       );

//       console.log(`✅ 成功从第${oldDay}天推进到第${data.newDay}天`);
//       return true;
//     } catch (e) {
//       console.error("切天请求失败:", e);
//       return false;
//     } finally {
//       this._advanceInFlight = false;
//     }
//   }

//   scheduleAdvanceCheck(ms) {
//     const delay = Math.min(Math.max(Number(ms) || 0, 30_000), 15 * 60_000);
//     if (this._advanceTimer) {
//       clearTimeout(this._advanceTimer);
//       this._advanceTimer = null;
//     }
//     if (delay > 0) {
//       this._advanceTimer = setTimeout(() => {
//         this._advanceTimer = null;
//         this.forceUpdateCurrentDay?.();
//       }, delay);
//     }
//   }

//   getDailyProgress() {
//     const currentDay = this.getCurrentDay();
//     const currentNPC = this.availableNPCs.find((npc) => npc.day === currentDay);

//     return {
//       currentDay: currentDay,
//       mealsRecorded: currentNPC ? currentNPC.mealsRecorded || 0 : 0,
//       totalMealsRequired: 3,
//       isComplete: currentNPC ? currentNPC.hasCompletedDay || false : false,
//       remainingMealTypes: currentNPC ? currentNPC.availableMealTypes || [] : [],
//     };
//   }

//   addClue(npcId, clueText, day, stage = null) {
//     console.log(
//       "[NPCManager.addClue] args:",
//       npcId,
//       clueText?.slice(0, 40),
//       day,
//       stage
//     );

//     const stagePart =
//       stage === 1 || stage === 2 || stage === 3 ? `_${stage}` : "";
//     const clueId = `${npcId}_${day}${stagePart}`;

//     // 🔑 检查是否已存在（包括预添加的）
//     const existingIndex = (this.clueRecords || []).findIndex(
//       (c) => c.id === clueId
//     );
//     if (existingIndex !== -1) {
//       console.log("线索已存在，直接触发UI更新:", clueId);
//       const existingClue = this.clueRecords[existingIndex];

//       // 如果是预添加的线索，现在正式添加到UI
//       if (existingClue._preAdded) {
//         delete existingClue._preAdded;

//         if (
//           this.scene.uiManager &&
//           typeof this.scene.uiManager.addClue === "function"
//         ) {
//           this.scene.uiManager.addClue(existingClue);
//         }
//       }
//       return;
//     }

//     // 如果不存在，正常添加新线索
//     const npc = this.npcs.get(npcId);
//     const npcDisplayName =
//       npc && npc.name
//         ? npc.name
//         : this.getNPCNameByLanguage
//           ? this.getNPCNameByLanguage(npcId)
//           : npcId;

//     const finalClue =
//       clueText && clueText.trim()
//         ? clueText
//         : this.getNPCClue
//           ? this.getNPCClue(npcId)
//           : "…";

//     const clue = {
//       id: clueId,
//       npcId,
//       npcName: npcDisplayName,
//       clue: finalClue,
//       day,
//       stage: stage || undefined,
//       receivedAt: new Date(),
//     };

//     this.clueRecords = this.clueRecords || [];
//     this.clueRecords.push(clue);

//     if (
//       this.scene.uiManager &&
//       typeof this.scene.uiManager.addClue === "function"
//     ) {
//       this.scene.uiManager.addClue(clue);
//     }

//     console.log("新线索已添加到本地:", clue);
//   }

//   getVagueResponse(npcId, version = 1) {
//     const language = this.scene.playerData.language;

//     // NPC-specific vague responses
//     const npcVagueResponses = {
//       village_head: {
//         zh: {
//           1: "你师父常有个地方，他总去的...\n嗯，那又是哪里来着？\n啊，我记性不如从前了。\n\n哦！现在该我准备下顿饭的时候了。过几个小时再回来吧。兴许到时候什么会想起来的。",
//           2: "我记得他总是去拜访一个女人...\n嗯，她又是谁来着？\n再给我点时间——等你吃完今天最后一顿饭后我们再聊吧。",
//         },
//         en: {
//           1: "Your master used to have a place he visited all the time...\nHmm, where was it again?\nAh, my memory's not what it used to be.\n\nOh! It's time for me to prep for my next meal. Come back in a few hours. Maybe something will come back to me.",
//           2: "I remember he always visited a woman...\nHmm, who was she again?\nGive me a bit more time — let's talk again after you've finished your last meal of the day.",
//         },
//       },
//       // 可以为其他 NPC 添加更多响应
//     };

//     const npcResponses = npcVagueResponses[npcId];
//     if (!npcResponses) {
//       // 默认回复
//       return language === "zh"
//         ? "让我想想...等你下顿饭后再来吧。"
//         : "Let me think... come back after your next meal.";
//     }

//     const languageResponses = npcResponses[language] || npcResponses.en;
//     return languageResponses[version] || languageResponses[1];
//   }

//   getAllClues() {
//     return (this.clueRecords || []).slice().sort((a, b) => {
//       if (a.day !== b.day) return a.day - b.day;
//       return (a.stage || 99) - (b.stage || 99);
//     });
//   }

//   removeNPCHighlight(npc) {
//     if (npc.glowEffect) {
//       npc.glowEffect.destroy();
//       npc.glowEffect = null;
//     }
//     if (npc.clickArea) {
//       npc.clickArea.destroy();
//       npc.clickArea = null;
//     }
//     if (npc.mealHint) {
//       npc.mealHint.destroy();
//       npc.mealHint = null;
//     }
//     this.hideNPCHover(npc);
//   }

//   showNPCHover(npc) {
//     if (npc.hoverText) return;

//     const language = this.scene.playerData.language;
//     const availableNPC = this.availableNPCs.find((n) => n.npcId === npc.id);

//     let hintText;
//     if (
//       availableNPC &&
//       availableNPC.availableMealTypes &&
//       availableNPC.availableMealTypes.length > 0
//     ) {
//       const nextMeal = availableNPC.availableMealTypes[0];
//       const mealNames = {
//         breakfast: language === "zh" ? "早餐" : "Breakfast",
//         lunch: language === "zh" ? "午餐" : "Lunch",
//         dinner: language === "zh" ? "晚餐" : "Dinner",
//       };

//       hintText =
//         language === "zh"
//           ? `记录${mealNames[nextMeal]}`
//           : `Record ${mealNames[nextMeal]}`;
//     } else {
//       hintText = language === "zh" ? "点击对话" : "Tap to talk";
//     }

//     npc.hoverText = this.scene.add.text(
//       npc.sprite.x,
//       npc.sprite.y - 50,
//       hintText,
//       {
//         fontSize: "14px",
//         fontFamily: UI_FONT,
//         stroke: "#000000",
//         strokeThickness: 1,
//         fill: "#ffd700",
//         backgroundColor: "#000000",
//         padding: { x: 8, y: 4 },
//       }
//     );
//     npc.hoverText.setOrigin(0.5);
//     npc.hoverText.setDepth(20);

//     this.scene.tweens.add({
//       targets: npc.hoverText,
//       y: npc.hoverText.y - 10,
//       duration: 800,
//       yoyo: true,
//       repeat: -1,
//       ease: "Sine.easeInOut",
//     });
//   }

//   createNPC(config) {
//     const npcAssetMap = {
//       village_head: "npc1",
//       shop_owner: "npc2",
//       spice_woman: "npc3",
//       restaurant_owner: "npc4",
//       fisherman: "npc5",
//       old_friend: "npc6",
//       secret_apprentice: "npc7",
//     };

//     const assetKey = npcAssetMap[config.id] || "npc1";
//     const npcSprite = this.scene.add.sprite(0, 0, assetKey);

//     npcSprite.setScale(this.mapScale * 0.045);
//     npcSprite.setDepth(5);
//     npcSprite.setVisible(false);

//     this.scene.gridEngine.addCharacter({
//       id: config.id,
//       sprite: npcSprite,
//       startPosition: config.position,
//     });

//     const npcData = {
//       id: config.id,
//       name: config.name,
//       position: config.position,
//       sprite: npcSprite,
//       day: config.day,
//       isUnlocked: false,
//       hasRecordedMeal: false,
//       mealsRecorded: 0,
//       hasCompletedDay: false,
//       availableMealTypes: [],
//       glowEffect: null,
//       clickArea: null,
//       hoverText: null,
//       mealHint: null,
//     };

//     this.npcs.set(config.id, npcData);
//     return npcData;
//   }

//   getNPCById(id) {
//     const npc = this.npcs.get(id);
//     if (!npc) return null;

//     const npcAssetMap = {
//       village_head: { portraitKey: "npc1head", backgroundKey: "npc1bg" },
//       shop_owner: { portraitKey: "npc2head", backgroundKey: "npc2bg" },
//       spice_woman: { portraitKey: "npc3head", backgroundKey: "npc3bg" },
//       restaurant_owner: { portraitKey: "npc4head", backgroundKey: "npc4bg" },
//       fisherman: { portraitKey: "npc5head", backgroundKey: "npc5bg" },
//       old_friend: { portraitKey: "npc6head", backgroundKey: "npc6bg" },
//       secret_apprentice: { portraitKey: "npc7head", backgroundKey: "npc7bg" },
//     };

//     const assets = npcAssetMap[npc.id] || {};
//     return {
//       ...npc,
//       portraitKey: assets.portraitKey,
//       backgroundKey: assets.backgroundKey,
//     };
//   }

//   highlightNPC(npc) {
//     this.removeNPCHighlight(npc);

//     const glowEffect = this.scene.add.graphics();
//     glowEffect.lineStyle(3, 0xffd700, 0.8);
//     glowEffect.strokeCircle(0, 0, 25);
//     glowEffect.setPosition(npc.sprite.x, npc.sprite.y);
//     glowEffect.setDepth(4);

//     this.scene.tweens.add({
//       targets: glowEffect,
//       scaleX: { from: 1, to: 1.3 },
//       scaleY: { from: 1, to: 1.3 },
//       alpha: { from: 0.8, to: 0.2 },
//       duration: 1500,
//       repeat: -1,
//       yoyo: true,
//     });

//     npc.glowEffect = glowEffect;
//   }

//   // 🔑 关键修复：确保点击区域被正确设置
//   // NPCManager.js
//   addNPCClickArea(npc) {
//     // 清理旧的交互区域
//     if (npc.clickArea) {
//       // 移除旧的事件监听
//       npc.clickArea.removeAllListeners();
//       npc.clickArea.destroy();
//       npc.clickArea = null;
//     }

//     // 清理 sprite 上的旧监听器
//     if (npc.sprite) {
//       npc.sprite.removeAllListeners();
//     }

//     // 透明点击圈
//     const clickRadius = 48;
//     const g = this.scene.add.graphics();
//     g.fillStyle(0x00ff00, 0);
//     g.fillCircle(0, 0, clickRadius);
//     g.setPosition(npc.sprite.x, npc.sprite.y);
//     g.setDepth(9999);

//     // 让透明圈可交互
//     g.setInteractive(
//       new Phaser.Geom.Circle(0, 0, clickRadius),
//       Phaser.Geom.Circle.Contains
//     );

//     // 让 sprite 自身也可点
//     npc.sprite.setInteractive({
//       useHandCursor: true,
//       pixelPerfect: false
//     });

//     // 🔧 优化的点击处理 - 使用防抖和缓存
//     const handleClick = this.createClickHandler(npc);

//     // 绑定点击事件
//     g.once("pointerdown", handleClick); // 使用 once 而不是 on
//     npc.sprite.once("pointerdown", handleClick);

//     // 🔧 简化的悬浮效果 - 移除复杂的hover逻辑
//     g.on("pointerover", () => {
//       if (!this._isProcessingClick) {
//         this.showSimpleNPCHover(npc);
//       }
//     });
//     g.on("pointerout", () => {
//       this.hideNPCHover(npc);
//     });

//     // 保存引用
//     npc.clickArea = g;

//     console.log(`✅ 为NPC ${npc.id} 添加了优化的点击区域`);
//   }

//   createClickHandler(npc) {
//     // 如果已经有缓存的处理函数，重用它
//     if (this._clickHandlers.has(npc.id)) {
//       return this._clickHandlers.get(npc.id);
//     }

//     const handler = () => {
//       const now = Date.now();

//       // 防抖检查
//       if (now - this._lastClickTime < this._clickCooldown) {
//         console.log(`⏱️ NPC ${npc.id} 点击被防抖拦截`);
//         return;
//       }

//       // 防止重复处理
//       if (this._isProcessingClick) {
//         console.log(`⏱️ NPC ${npc.id} 正在处理中，忽略重复点击`);
//         return;
//       }

//       this._lastClickTime = now;
//       this._isProcessingClick = true;

//       console.log(`🖱️ NPC ${npc.id} 点击处理开始`);

//       // 实际的点击逻辑
//       if (this.canInteractWithNPC(npc)) {
//         // 立即移除点击监听，防止重复触发
//         if (npc.clickArea) {
//           npc.clickArea.removeAllListeners("pointerdown");
//         }
//         if (npc.sprite) {
//           npc.sprite.removeAllListeners("pointerdown");
//         }

//         // 延迟启动对话场景，给UI一个响应时间
//         requestAnimationFrame(() => {
//           this.startDialogScene(npc.id);

//           // 300ms 后重置处理状态
//           setTimeout(() => {
//             this._isProcessingClick = false;
//           }, 300);
//         });
//       } else {
//         this.showInteractionBlockedMessage(npc);
//         this._isProcessingClick = false;
//       }
//     };

//     // 缓存处理函数
//     this._clickHandlers.set(npc.id, handler);
//     return handler;
//   }

//   // ==================== 4. 简化的悬浮提示 ====================
//   showSimpleNPCHover(npc) {
//     // 如果已经有悬浮文本，不重复创建
//     if (npc.hoverText) {
//       return;
//     }

//     const lang = this.scene.playerData.language;
//     const npcName = this.getNPCNameByLanguage(npc.id);

//     const text = this.scene.add.text(
//       npc.sprite.x,
//       npc.sprite.y - 70,
//       npcName,
//       {
//         fontSize: "14px",
//         fontFamily: "Arial",
//         fill: "#ffffff",
//         backgroundColor: "#000000aa",
//         padding: { x: 8, y: 4 },
//       }
//     );
//     text.setOrigin(0.5);
//     text.setDepth(10000);

//     npc.hoverText = text;
//   }

//   hideNPCHover(npc) {
//     if (npc.hoverText) {
//       npc.hoverText.destroy();
//       npc.hoverText = null;
//     }
//   }

//   cleanupClickHandlers() {
//     // 清理所有缓存的点击处理函数
//     this._clickHandlers.clear();

//     // 清理所有NPC的点击区域
//     this.npcs.forEach((npc) => {
//       if (npc.clickArea) {
//         npc.clickArea.removeAllListeners();
//         npc.clickArea.destroy();
//         npc.clickArea = null;
//       }
//       if (npc.sprite) {
//         npc.sprite.removeAllListeners();
//       }
//     });

//     // 重置状态
//     this._isProcessingClick = false;
//     this._lastClickTime = 0;

//     console.log("🧹 清理了所有点击处理器");
//   }

//   // ==================== 7. 优化的 startDialogScene 函数 ====================
//   // 替换原有的 startDialogScene 函数：

//   startDialogScene(npcId) {
//     console.log(`🎭 开始与NPC ${npcId} 的对话场景`);

//     this.clearAllNPCHints();

//     const currentDay = this.playerStatus?.currentDay;
//     const today = this.availableNPCs.find(
//       (n) => n.npcId === npcId && n.day === currentDay
//     );
//     const useConvAI = today ? today.mealsRecorded === 0 : true;

//     try {
//       const mainScene = this.scene.scene.get("MainScene");

//       // 🔧 关键修复：先检查场景是否真正在运行
//       const isRunning = mainScene &&
//         mainScene.scene.isActive() &&
//         mainScene.scene.isRunning();  // ← 这是新增的关键检查

//       if (!isRunning) {
//         console.error("❌ MainScene 未运行");
//         this._isProcessingClick = false;
//         return;
//       }

//       // 如果场景正在运行，先暂停它
//       if (!mainScene.scene.isPaused()) {
//         this.scene.scene.pause("MainScene");
//         console.log("✅ MainScene 已暂停");
//       }

//       // 然后启动对话场景
//       this.scene.scene.launch("DialogScene", {
//         npcId: npcId,
//         npcManager: this,
//         playerData: this.scene.playerData,
//         mainScene: this.scene,
//         useConvAI,
//       });

//       console.log("✅ DialogScene 已启动");

//       // 重置点击状态
//       setTimeout(() => {
//         this._isProcessingClick = false;
//       }, 300);

//     } catch (error) {
//       console.error("❌ 启动对话场景失败:", error);
//       this._isProcessingClick = false;
//     }
//   }

//   async completeNPCInteraction(npcId) {
//     try {
//       const currentDay = this.playerStatus.currentDay;

//       const response = await fetch(`${API_URL}/complete-npc-interaction`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           playerId: this.scene.playerId,
//           day: currentDay,
//           npcId: npcId,
//         }),
//       });

//       const data = await response.json();

//       if (data.success) {
//         const availableNPC = this.availableNPCs.find((n) => n.npcId === npcId);
//         if (availableNPC) {
//           availableNPC.completed = true;
//         }

//         const npc = this.npcs.get(npcId);
//         if (npc) {
//           this.removeNPCHighlight(npc);
//         }

//         if (
//           !this.finalEggReady &&
//           !this.isGeneratingFinalEgg &&
//           this.playerStatus.currentDay >= 7 &&
//           availableNPC?.completed
//         ) {
//           this.triggerGameCompletion();
//         }

//         return true;
//       } else {
//         throw new Error(data.error || "Failed to complete NPC interaction");
//       }
//     } catch (error) {
//       console.error("Error completing NPC interaction:", error);
//       return false;
//     }
//   }

//   async triggerGameCompletion() {
//     const language = this.scene.playerData.language;

//     if (this.finalEggReady || this.isGeneratingFinalEgg) return;

//     this.scene.showNotification(
//       language === "zh"
//         ? "🎊 恭喜完成7天的旅程！正在生成你的专属彩蛋..."
//         : "🎊 Congratulations on completing the 7-day journey! Generating your personalized ending...",
//       3000
//     );

//     await this.triggerFinalEgg();
//   }

//   async triggerFinalEgg() {
//     if (this.finalEggReady || this.isGeneratingFinalEgg) return;
//     this.isGeneratingFinalEgg = true;

//     try {
//       const response = await fetch(`${API_URL}/generate-final-egg`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           playerId: this.scene.playerId,
//           language: this.scene.playerData.language,
//         }),
//       });

//       const data = await response.json();
//       if (!data.success)
//         throw new Error(data.error || "Failed to generate final egg");

//       const egg = normalizeEggPayload(data);
//       this.finalEggContent = egg;
//       this.finalEggReady = true;

//       this.showFinalEggDialog(egg);
//     } catch (error) {
//       console.error("Error generating final egg:", error);

//       const egg = normalizeEggPayload({
//         eggContent: this.generateLocalFinalEgg(),
//       });
//       this.finalEggContent = egg;
//       this.finalEggReady = true;

//       this.showFinalEggDialog(egg);
//     } finally {
//       this.isGeneratingFinalEgg = false;
//     }
//   }

//   generateLocalFinalEgg() {
//     const language = this.scene.playerData.language;
//     const mealCount = this.mealRecords.length;

//     if (language === "zh") {
//       return `亲爱的徒弟，\n\n通过这7天的记录，我看到了你对美食和生活的用心。你记录了${mealCount}餐，每一顿饭都是一个故事，每一次品尝都是一次成长。\n\n真正的烹饪秘诀不在于复杂的技巧，而在于用心对待每一餐，就像你这七天所做的那样。\n\n继续用爱烹饪，用心生活。\n\n——你的师父`;
//     } else {
//       return `Dear apprentice,\n\nThrough these 7 days of records, I see your dedication to food and life. You recorded ${mealCount} meals, each one a story, each taste a moment of growth.\n\nThe real secret of cooking lies not in complex techniques, but in treating every meal with heart, just as you have done these seven days.\n\nContinue cooking with love and living with heart.\n\n—— Your Master`;
//     }
//   }

//   showFinalEggDialog(egg) {
//     if (this.scene.uiManager) {
//       this.scene.uiManager.showFinalEgg(egg);
//     }

//     if (this.scene.onGameCompleted) {
//       this.scene.onGameCompleted();
//     }
//   }

//   getCurrentDay() {
//     return this.playerStatus ? this.playerStatus.currentDay : 1;
//   }

//   getNPCClue(npcId) {
//     const language = this.scene.playerData.language;
//     const clues = {
//       village_head: {
//         zh: "干得好！继续这样做。一点一点地，你会开始理解——他当时在想什么，他在隐藏什么。\n\n不需要着急。这不是你可以强迫的事情——只需要一次吃一顿饭。\n\n他经常去格蕾丝的店买食材。他和华主厨回去的路很远。也许你会从她那里得到一些见解。",
//         en: "Good job! Keep doing this. Little by little, you'll start to understand—what he was thinking back then, and what he was hiding.\n\nNo need to rush. This isn't something you can force—just take it one meal at a time.\n\nHe often stopped by Grace's shop for ingredients. He and Chef Hua go way back. Maybe you will get some insights from her.",
//       },
//       shop_owner: {
//         zh: "他最常买那几样料，可那天——他却突然问起'青木籽'。他以前从来不碰那玩意儿。\n\n他说需要做一道特别的汤。我问他为什么，他只是摇摇头说：'有些味道，一旦失去就再也找不回来了。'\n\n如果你想知道更多，去找香料婆婆吧。她可能知道那些青木籽的用途。",
//         en: "He always bought the same ingredients, but that day—he suddenly asked about 'greenwood seeds'. He never touched those before.\n\nHe said he needed to make a special soup. When I asked why, he just shook his head and said: 'Some flavors, once lost, can never be found again.'\n\nIf you want to know more, go find the Spice Granny. She might know what those greenwood seeds are for.",
//       },
//       spice_woman: {
//         zh: "他说——'要不是那个人把它弄俗了'，他都不想再碰青木籽。你知道他说的是谁吗？\n\n我看得出来，他心里有很深的怨恨。那种表情...就像是被最信任的人背叛了一样。\n\n他提到了河边的那家餐厅。说那里有他要找的答案。去看看吧，也许华主厨知道些什么。",
//         en: "He said—'If it weren't for that person making it vulgar', he wouldn't want to touch greenwood seeds again. Do you know who he was talking about?\n\nI could see deep resentment in his heart. That expression... like being betrayed by someone he trusted most.\n\nHe mentioned the restaurant by the river. Said there were answers he was looking for. Go take a look, maybe Chef Hua knows something.",
//       },
//       restaurant_owner: {
//         zh: "有一锅粥，他始终没让我碰。说什么得亲自守着火慢慢熬着。'云头鲤'。\n\n他做的时候眼神很奇怪，既专注又痛苦。我问他这道菜有什么特别，他说：'这是我欠某人的。'\n\n后来他提到了河边的渔夫老刘。说只有他知道最好的云头鲤在哪里能找到。也许你该去问问他。",
//         en: "There was one pot—congee with Yunhead Carp. He never let me touch it. Had to be slow cooked. Alone. By the river.\n\nHis expression was strange when he made it, both focused and pained. When I asked what was special about this dish, he said: 'This is what I owe someone.'\n\nLater he mentioned Old Liu, the fisherman by the river. Said only he knew where to find the best Yunhead Carp. Maybe you should go ask him.",
//       },
//       fisherman: {
//         zh: "你师傅……他那天，在那块老礁石边，煮了一锅鱼粥。一锅白，一锅清。没叫我尝，就说了句：'等潮涨再开。'\n\n我看他把什么东西放进了那锅清粥里，然后就一直盯着水面发呆。等我再看时，他已经把两锅粥都倒进了河里。\n\n他说他有个老朋友，住在村子里。也许那个人知道他在想什么。去找找看吧。",
//         en: "Your master... that day, by the old rocks, he made two pots of fish congee. One milky, one clear. He didn't let me taste a drop. Just said: 'Open it when the tide comes in.'\n\nI saw him put something into that clear congee, then he just stared at the water surface in a daze. When I looked again, he had poured both pots into the river.\n\nHe said he had an old friend living in the village. Maybe that person knows what he was thinking. Go look for them.",
//       },
//       old_friend: {
//         zh: "师傅从小不喜欢我你了解的，自然什么都不会和我说。但是念念，他最近收了一个孩子叫念念。住在村尾的阁楼。\n\n那孩子很聪明，师傅教了他很多东西。我觉得如果有人知道师傅在想什么，那一定是念念。\n\n但是要小心，那孩子对陌生人很警惕。你需要证明你真的是师傅的徒弟才行。",
//         en: "Master never liked me since childhood, naturally he wouldn't tell me anything. But about NianNian, he recently took in a child called NianNian. Lives in the attic at the end of the village.\n\nThat child is very smart, Master taught him many things. I think if anyone knows what Master was thinking, it must be NianNian.\n\nBut be careful, that child is very wary of strangers. You need to prove you're really Master's apprentice.",
//       },
//       secret_apprentice: {
//         zh: "他把最后一页藏在他'最常回头看的地方'。不是厨房，也不是餐馆。是他写下第一道菜的地方！在阁楼上那道木梁上。\n\n他说过，如果有一天他不在了，那一页纸会告诉你一切的真相。包括他为什么要离开，包括他一直在寻找的那个人。\n\n但是师傅也说了，只有真正理解他的人才能找到那张纸。你准备好了吗？",
//         en: "He hid the last page in the place he 'most often looked back at'. Not the kitchen, not the restaurant. The place where he wrote his first recipe! On the wooden beam in the attic.\n\nHe said if one day he wasn't there, that page would tell you the whole truth. Including why he had to leave, including the person he's been searching for.\n\nBut Master also said only someone who truly understands him can find that paper. Are you ready?",
//       },
//     };

//     const clue = clues[npcId];
//     if (!clue) {
//       const defaultClue = {
//         zh: "很抱歉，我没有关于这个人的更多信息。",
//         en: "I'm sorry, I don't have more information about this person.",
//       };
//       return defaultClue[language] || defaultClue.en;
//     }

//     return clue[language] || clue.en;
//   }

//   updateScale(newScale) {
//     this.mapScale = newScale;
//     this.npcs.forEach((npc) => {
//       if (npc.sprite) {
//         npc.sprite.setScale(newScale * 0.09);
//       }
//       if (npc.glowEffect) {
//         npc.glowEffect.setPosition(npc.sprite.x, npc.sprite.y);
//       }
//       if (npc.clickArea) {
//         npc.clickArea.setPosition(npc.sprite.x, npc.sprite.y);
//       }
//       if (npc.mealHint) {
//         npc.mealHint.setPosition(npc.sprite.x, npc.sprite.y + 40);
//       }
//     });
//   }

//   destroy() {
//     if (this._advanceTimer) {
//       clearTimeout(this._advanceTimer);
//       this._advanceTimer = null;
//     }
//     this.npcs.forEach((npc) => {
//       this.removeNPCHighlight(npc);
//     });
//   }
// }

// // 把后端返回统一转成 UI 需要的 egg 对象
// function normalizeEggPayload(data) {
//   // 优先：后端直接给了结构化 egg
//   if (data && typeof data.egg === "object" && data.egg !== null)
//     return data.egg;

//   // 兼容：有些时候 eggContent 其实已经是对象
//   if (data && typeof data.eggContent === "object" && data.eggContent !== null)
//     return data.eggContent;

//   // 老格式：纯字符串 -> 包一层给 UIManager
//   const letter = typeof data?.eggContent === "string" ? data.eggContent : "";
//   return {
//     letter,
//     summary: [],
//     health: { positives: [], improvements: [] },
//     recipe: { title: "", servings: 1, ingredients: [], steps: [], tip: "" },
//   };
// }
