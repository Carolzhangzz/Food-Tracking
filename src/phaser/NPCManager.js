// src/phaser/NPCManager.js - 修复 NPC 交互逻辑
import Phaser from "phaser";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";
const ENABLE_CROSS_DAY_DELAY_FE =
  process.env.REACT_APP_ENABLE_CROSS_DAY_DELAY === "true";
const UI_FONT =
  "Noto Sans TC, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

function shouldEnableDelayUI() {
  return (
    !("REACT_APP_ENABLE_CROSS_DAY_DELAY" in process.env) ||
    ENABLE_CROSS_DAY_DELAY_FE
  );
}

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
    this.clueRecords = [];
    this.isUpdatingDay = false;
    this.pushedClueIds = new Set();
    this.isGeneratingFinalEgg = false;
    this.finalEggReady = false;
    this.finalEggContent = null;
    this.initializeNPCs();
    this._devSkipIssued = false;
    this._advanceTimer = null;

    // 护栏状态
    this._advanceInFlight = false;
    this.advanceGateBlockedUntil = null;
  }

  setDialogSystem(dialogSystem) {
    this.dialogSystem = dialogSystem;
  }

  async initializeNPCs() {
    const npcConfigs = [
      {
        id: "village_head",
        name:
          this.scene.playerData.language === "zh"
            ? "村长伯伯"
            : "Uncle Bo (Village Head)",
        position: { x: 1, y: 0.7 },
        day: 1,
      },
      {
        id: "shop_owner",
        name:
          this.scene.playerData.language === "zh"
            ? "店主阿桂"
            : "Grace (Shop Owner)",
        position: { x: 5, y: 5.5 },
        day: 2,
      },
      {
        id: "spice_woman",
        name:
          this.scene.playerData.language === "zh" ? "香料婆婆" : "Spice Woman",
        position: { x: 5, y: 1.5 },
        day: 3,
      },
      {
        id: "restaurant_owner",
        name:
          this.scene.playerData.language === "zh"
            ? "餐厅店长老韩"
            : "Han (Restaurant Owner)",
        position: { x: 1, y: 7.5 },
        day: 4,
      },
      {
        id: "fisherman",
        name:
          this.scene.playerData.language === "zh"
            ? "渔夫阿梁"
            : "Leon (Fisherman)",
        position: { x: 1.5, y: 4.5 },
        day: 5,
      },
      {
        id: "old_friend",
        name: this.scene.playerData.language === "zh" ? "林川" : "Rowan",
        position: { x: 5.5, y: 7 },
        day: 6,
      },
      {
        id: "secret_apprentice",
        name: this.scene.playerData.language === "zh" ? "念念" : "NianNian",
        position: { x: 0.8, y: 2.5 },
        day: 7,
      },
    ];

    npcConfigs.forEach((config) => {
      this.createNPC(config);
    });

    this.setDefaultNPCStates();

    try {
      await this.loadPlayerStatus();
      console.log("NPCs initialized with player status");
    } catch (error) {
      console.warn("Failed to load player status, using defaults:", error);
    }
  }

  setDefaultNPCStates() {
    this.npcs.forEach((npc) => {
      npc.isUnlocked = false;
      npc.hasRecordedMeal = false;
      npc.sprite.setVisible(false);
      this.removeNPCHighlight(npc);
    });

    const firstDayNPC = this.npcs.get("village_head");
    if (firstDayNPC) {
      firstDayNPC.isUnlocked = true;
      firstDayNPC.hasRecordedMeal = false;
      firstDayNPC.mealsRecorded = 0;
      firstDayNPC.hasCompletedDay = false;
      firstDayNPC.availableMealTypes = ["breakfast", "lunch", "dinner"];
      firstDayNPC.sprite.setVisible(true);

      this.highlightNPC(firstDayNPC);
      this.addNPCClickArea(firstDayNPC);
    }

    if (!this.availableNPCs || this.availableNPCs.length === 0) {
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
    }

    if (!this.playerStatus) {
      this.playerStatus = {
        playerId: this.scene.playerId,
        currentDay: 1,
        gameCompleted: false,
        firstLoginDate: new Date(),
      };
    }
  }

  // 供 DialogScene / MainScene 在返回地图后调用：重新拉取后端并刷新 NPC 可见/可点状态
  async refreshAvailableNPCs() {
    try {
      await this.loadPlayerStatus(); // 会更新 this.playerStatus, this.availableNPCs 等
    } catch (e) {
      console.warn("refreshAvailableNPCs: loadPlayerStatus failed:", e);
    }
    this.updateNPCStates();
  }

  // 仅根据现有内存状态重绑“今天”的点击区域（不访问后端）
  rebindClickAreasForCurrentDay() {
    const day = this.playerStatus?.currentDay || 1;
    const today = (this.availableNPCs || []).find((n) => n.day === day);
    if (!today) return;

    const npc = this.npcs.get(today.npcId);
    if (!npc || !npc.sprite) return;

    // 先清理提示，避免 UI 残留
    if (npc.mealHint) {
      npc.mealHint.destroy();
      npc.mealHint = null;
    }

    npc.sprite?.setVisible(true);
    this.addNPCClickArea?.(npc);
    this.highlightNPC?.(npc);

    const mealTypes =
      today.availableMealTypes && today.availableMealTypes.length > 0
        ? today.availableMealTypes
        : ["breakfast", "lunch", "dinner"];
    this.addMealTypeHint?.(npc, mealTypes);

    npc.hasRecordedMeal = false;
  }

  addMealTypeHint(npc, mealTypes = []) {
    if (npc.mealHint) {
      npc.mealHint.destroy();
      npc.mealHint = null;
    }

    if (
      !npc ||
      !npc.sprite ||
      !Array.isArray(mealTypes) ||
      mealTypes.length === 0
    )
      return;

    const lang = this.scene.playerData.language;
    const map = {
      breakfast: lang === "zh" ? "早餐" : "Breakfast",
      lunch: lang === "zh" ? "午餐" : "Lunch",
      dinner: lang === "zh" ? "晚餐" : "Dinner",
    };

    const label = mealTypes
      .map((t) => map[t] || t)
      .join(lang === "zh" ? " / " : " / ");
    const text = lang === "zh" ? `可记录：${label}` : `Available: ${label}`;

    const t = this.scene.add.text(npc.sprite.x, npc.sprite.y - 60, text, {
      fontSize: "13px",
      fontFamily: UI_FONT,
      fill: "#00ffcc",
      backgroundColor: "#000000",
      padding: { x: 6, y: 3 },
    });
    t.setOrigin(0.5);
    t.setDepth(20);

    this.scene.tweens.add({
      targets: t,
      y: t.y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    npc.mealHint = t;
  }

  async loadPlayerStatus() {
    try {
      const response = await fetch(`${API_URL}/player-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: this.scene.playerId }),
      });

      if (response.ok) {
        const data = await response.json();
        this.playerStatus = data.player;
        this.availableNPCs = data.availableNPCs;
        this.mealRecords = data.mealRecords;
        this.currentDayMealsRemaining = data.currentDayMealsRemaining || [];

        const mappedClues = (data.clueRecords || []).map((clue) => ({
          ...clue,
          npcName: this.getNPCNameByLanguage(clue.npcId),
        }));

        const byId = new Map();
        [...(this.clueRecords || []), ...mappedClues].forEach((c) =>
          byId.set(c.id, c)
        );
        this.clueRecords = Array.from(byId.values());

        if (this.scene.uiManager && Array.isArray(mappedClues)) {
          this.scene.uiManager.setClues(mappedClues);
          mappedClues.forEach((c) => this.pushedClueIds.add(c.id));
        }

        if (data.nextAdvanceAt && shouldEnableDelayUI()) {
          const readyTs = new Date(data.nextAdvanceAt).getTime();
          const waitMs = Math.max(0, readyTs - Date.now());
          if (waitMs > 0) {
            const lang = this.scene.playerData.language;
            const mins = Math.max(1, Math.ceil(waitMs / 60000));
            this.scene.showNotification(
              lang === "zh"
                ? `距离解锁下一天约 ${mins} 分钟。`
                : `~${mins} min left before next day unlock.`,
              3000
            );
            this.scheduleAdvanceCheck(waitMs);
          }
        }

        this.updateNPCStates();
        await this.checkAndUpdateCurrentDay();

        const firstDayNPC = this.availableNPCs.find((npc) => npc.day === 1);
        console.log("自动跳转调试信息：", {
          currentDay: this.playerStatus.currentDay,
          firstDayMealsRecorded: firstDayNPC?.mealsRecorded || 0,
          firstDayIsCompleted: firstDayNPC?.hasCompletedDay || false,
          currentDayMealsRemaining: this.currentDayMealsRemaining.length,
          hasNextDayNPC: this.availableNPCs.some(
            (npc) => npc.day === this.playerStatus.currentDay + 1
          ),
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
    const day = this.playerStatus?.currentDay || 1;

    // 1) 先隐藏并禁用所有 NPC
    this.npcs.forEach((npc) => {
      npc.sprite?.setVisible(false);
      npc.sprite?.disableInteractive?.();
      this.removeNPCHighlight?.(npc);
      if (npc.mealHint) {
        npc.mealHint.destroy();
        npc.mealHint = null;
      }
    });

    // 2) 找到“今天”的 NPC（来自后端 /login 或 /player-status 的 availableNPCs）
    const today = (this.availableNPCs || []).find((n) => n.day === day);
    if (!today) return;

    const npc = this.npcs.get(today.npcId);
    if (!npc || !npc.sprite) return;

    // 3) 显示、可点、高亮，并提示可记录餐别
    npc.sprite.setVisible(true);
    this.addNPCClickArea?.(npc);
    this.highlightNPC?.(npc);

    const mealTypes =
      today.availableMealTypes && today.availableMealTypes.length > 0
        ? today.availableMealTypes
        : ["breakfast", "lunch", "dinner"];
    this.addMealTypeHint?.(npc, mealTypes);

    // 4) 护栏：同一天允许运营多次进入（不要把 hasRecordedMeal 锁死）
    npc.hasRecordedMeal = false;
  }

  // 新增：显示"可对话"提示（当没有可记录餐食时）
  addChatOnlyHint(npc) {
    if (npc.mealHint) {
      npc.mealHint.destroy();
      npc.mealHint = null;
    }

    const lang = this.scene.playerData.language;
    const text = lang === "zh" ? "可对话" : "Can talk";

    const t = this.scene.add.text(npc.sprite.x, npc.sprite.y - 60, text, {
      fontSize: "13px",
      fontFamily: UI_FONT,
      fill: "#60a5fa", // 蓝色表示纯对话
      backgroundColor: "#000000",
      padding: { x: 6, y: 3 },
    });
    t.setOrigin(0.5);
    t.setDepth(20);

    this.scene.tweens.add({
      targets: t,
      y: t.y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    npc.mealHint = t;
  }

  clearAllNPCHints() {
    this.npcs.forEach((npc) => {
      if (npc.mealHint) {
        npc.mealHint.destroy();
        npc.mealHint = null;
      }
      if (npc.hoverText) {
        npc.hoverText.destroy();
        npc.hoverText = null;
      }
      if (npc.glowEffect) {
        npc.glowEffect.destroy();
        npc.glowEffect = null;
      }
      if (npc.clickArea) {
        npc.clickArea.destroy();
        npc.clickArea = null;
      }
    });
  }

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

  // 🔑 关键修复：简化交互检查逻辑
  canInteractWithNPC(npc) {
    const availableNPC = this.availableNPCs.find((a) => a.npcId === npc.id);

    console.log(`🔍 检查NPC ${npc.id} 交互权限:`, {
      找到匹配NPC: !!availableNPC,
      解锁状态: availableNPC?.unlocked,
      当前天: this.playerStatus?.currentDay,
      NPC天数: availableNPC?.day,
    });

    if (!availableNPC) {
      console.log(`❌ 未找到NPC ${npc.id} 的可用配置`);
      return false;
    }

    if (!availableNPC.unlocked) {
      console.log(`❌ NPC ${npc.id} 未解锁`);
      return false;
    }

    if (availableNPC.day !== this.playerStatus.currentDay) {
      console.log(
        `❌ NPC ${npc.id} 不是当前天 (${availableNPC.day} vs ${this.playerStatus.currentDay})`
      );
      return false;
    }

    // ✅ 关键修复：只要是当前天的已解锁NPC就可以对话
    // 不再检查餐食记录状态或完成状态
    console.log(`✅ NPC ${npc.id} 可以交互 - 当前天已解锁NPC`);
    return true;
  }
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
    } else {
      // ✅ 移除"已完成"的概念，因为可以无限对话
      message =
        language === "zh"
          ? "暂时无法与此NPC对话"
          : "Cannot interact with this NPC yet";
    }

    this.scene.showNotification(message, 3000);
  }

  async saveConversationToDatabase(npcId, speaker, content, mealType = null) {
    try {
      const currentDay = this.playerStatus.currentDay;

      const response = await fetch(`${API_URL}/save-conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: this.scene.playerId,
          npcId: npcId,
          day: currentDay,
          speaker: speaker,
          content: content,
          mealType: mealType,
          sessionId: null,
        }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Error saving conversation:", error);
      return false;
    }
  }

  // 🔑 关键修复：记录餐食后正确更新本地状态
  // 🔑 关键修复：记录餐食后正确更新本地状态
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

      console.log(`🍽️ 开始记录餐食:`, {
        npcId,
        mealType,
        currentDay,
        当前可用餐食: this.availableNPCs.find((n) => n.npcId === npcId)
          ?.availableMealTypes,
      });

      // 先保存对话历史到数据库
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
        headers: { "Content-Type": "application/json" },
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
              : this.scene.playerData.language === "zh"
              ? "未填写具体餐食"
              : "No detailed meal provided",
        }),
      });

      if (!response.ok) {
        const ct = response.headers.get("content-type") || "";
        let detail = "";
        try {
          detail = ct.includes("application/json")
            ? JSON.stringify(await response.json())
            : await response.text();
        } catch (_) {}
        throw new Error(
          `HTTP ${response.status}${detail ? ` - ${detail}` : ""}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format, expected JSON");
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to record meal");

      console.log(`✅ 后端响应:`, {
        success: data.success,
        shouldGiveClue: data.shouldGiveClue,
        availableMealTypes: data.availableMealTypes,
        hasCompletedDay: data.hasCompletedDay,
        newDay: data.newDay,
      });

      // 🔑 关键修改：正确更新本地可用 NPC 状态
      const availableNPC = this.availableNPCs.find(
        (n) => n.npcId === npcId && n.day === currentDay
      );

      if (availableNPC) {
        // 更新餐食记录数
        availableNPC.mealsRecorded = (availableNPC.mealsRecorded || 0) + 1;
        availableNPC.hasRecordedMeal = true;

        // ✅ 优先使用后端返回的 availableMealTypes
        if (Array.isArray(data.availableMealTypes)) {
          availableNPC.availableMealTypes = data.availableMealTypes;
          console.log(`🔄 服务器更新可用餐食为:`, data.availableMealTypes);
        } else {
          // 备用方案：本地删除当前餐别
          availableNPC.availableMealTypes = (
            availableNPC.availableMealTypes || []
          ).filter((t) => t !== mealType);
          console.log(
            `🔄 本地删除餐食 ${mealType}，剩余:`,
            availableNPC.availableMealTypes
          );
        }

        // ✅ 关键修复：以服务器为准设置完成状态
        if (typeof data.hasCompletedDay === "boolean") {
          availableNPC.hasCompletedDay = data.hasCompletedDay;
          console.log(`🔄 服务器设置完成状态:`, data.hasCompletedDay);
        }
        // 如果服务器没有明确返回，保持原状态不变

        console.log(`📊 更新后NPC状态:`, {
          mealsRecorded: availableNPC.mealsRecorded,
          availableMealTypes: availableNPC.availableMealTypes,
          hasCompletedDay: availableNPC.hasCompletedDay,
        });
      }

      // 🔑 关键：立即更新NPC显示状态，确保交互正确
      this.updateNPCStates();

      // 🔑 关键修改：预处理线索数据，让DialogScene能立即使用
      let processedClueData = { ...data };
      if (data.shouldGiveClue) {
        const stage =
          data.mealStage ??
          (mealType === "breakfast" ? 1 : mealType === "lunch" ? 2 : 3);

        // 如果后端没有提供clueText，本地生成
        if (!data.clueText || !data.clueText.trim()) {
          if (stage === 1 || stage === 2) {
            processedClueData.clueText = this.getVagueResponse(npcId, stage);
          } else {
            processedClueData.clueText = this.getClueForNPC(npcId);
          }
        }

        processedClueData.mealStage = stage;

        // 🔑 重要：预先添加线索到本地缓存，但不触发UI更新
        // 这样DialogScene可以立即访问到线索数据
        this.preAddClue(npcId, processedClueData.clueText, currentDay, stage);
      }

      // DEV跳过逻辑...
      const DEV_FAST_SKIP = process.env.REACT_APP_ALLOW_DEV_SKIP === "true";
      if (
        DEV_FAST_SKIP &&
        !this._devSkipIssued &&
        currentDay === 1 &&
        mealType === "dinner"
      ) {
        this._devSkipIssued = true;
        try {
          const resp = await fetch(`${API_URL}/dev/skip-to-day7`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId: this.scene.playerId }),
          });
          const j = await resp.json();

          if (j.success && j.newDay === 7) {
            await this.loadPlayerStatus();
            this.updateNPCStates();
            this.scene.showNotification(
              this.scene.playerData.language === "zh"
                ? "已跳转到第7天（开发模式）"
                : "Jumped to Day 7 (dev mode)",
              2000
            );
            return {
              success: true,
              shouldGiveClue: !!data.shouldGiveClue,
              clueText: processedClueData.clueText,
              mealStage: processedClueData.mealStage,
              nextDayUnlocked: true,
              newDay: 7,
            };
          } else {
            this._devSkipIssued = false;
            console.warn("DEV skip-to-day7 failed:", j);
          }
        } catch (e) {
          this._devSkipIssued = false;
          console.error("DEV skip-to-day7 error:", e);
        }
      }

      // 处理等待逻辑
      if (!data.newDay && data.canAdvanceAt && shouldEnableDelayUI()) {
        const lang = this.scene.playerData.language;
        const waitMs = Math.max(0, Number(data.waitMs || 0));
        const mins = Math.max(1, Math.ceil(waitMs / 60000));

        this.scene.showNotification(
          lang === "zh"
            ? `晚餐已记录，需等待约 ${mins} 分钟后进入下一天。`
            : `Dinner logged. About ${mins} min left before next day unlock.`,
          4000
        );

        this.scheduleAdvanceCheck(waitMs);
      }

      // 处理切天
      if (data.newDay) {
        this.playerStatus.currentDay = data.newDay;

        this.scene.showNotification(
          this.scene.playerData.language === "zh"
            ? `已进入第${data.newDay}天！`
            : `Day ${data.newDay} started!`,
          2500
        );

        setTimeout(async () => {
          await this.loadPlayerStatus();
          this.updateNPCStates();
        }, 800);
      }

      return {
        success: true,
        shouldGiveClue: !!data.shouldGiveClue,
        clueText: processedClueData.clueText,
        mealStage: processedClueData.mealStage,
        nextDayUnlocked: !!data.nextDayUnlocked,
        newDay: data.newDay || null,
      };
    } catch (error) {
      console.error("Error recording meal:", error);
      return { success: false, error: error.message };
    }
  }

  preAddClue(npcId, clueText, day, stage = null) {
    const stagePart =
      stage === 1 || stage === 2 || stage === 3 ? `_${stage}` : "";
    const clueId = `${npcId}_${day}${stagePart}`;

    // 检查是否已存在
    const existingIndex = (this.clueRecords || []).findIndex(
      (c) => c.id === clueId
    );
    if (existingIndex !== -1) {
      console.log("线索已存在于预缓存，跳过:", clueId);
      return;
    }

    const npc = this.npcs.get(npcId);
    const npcDisplayName =
      npc && npc.name
        ? npc.name
        : this.getNPCNameByLanguage
        ? this.getNPCNameByLanguage(npcId)
        : npcId;

    const clue = {
      id: clueId,
      npcId,
      npcName: npcDisplayName,
      clue: clueText && clueText.trim() ? clueText : "…",
      day,
      stage: stage || undefined,
      receivedAt: new Date(),
      _preAdded: true, // 标记为预添加，避免重复
    };

    this.clueRecords = this.clueRecords || [];
    this.clueRecords.push(clue);

    console.log("线索已预添加到本地缓存:", clue);
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
    const currentNPC = this.availableNPCs.find((npc) => npc.day === currentDay);
    if (!currentNPC) return;

    const isServerCompleted = currentNPC.hasCompletedDay === true;
    const hasNextDayNPC = this.availableNPCs.some(
      (npc) => npc.day === currentDay + 1
    );

    if (isServerCompleted) {
      console.log(
        `DINNER_OK: 服务器已标记完成，尝试请求切天（无需等待下一天NPC出现在列表）`
      );

      if (
        !this.advanceGateBlockedUntil ||
        Date.now() >= this.advanceGateBlockedUntil.getTime()
      ) {
        const ok = await this.forceUpdateCurrentDay();
        if (!ok) {
          setTimeout(
            () => this.loadPlayerStatus().then(() => this.updateNPCStates()),
            1200
          );
        }
      } else {
        console.log(
          "[AdvanceGate] blocked until:",
          this.advanceGateBlockedUntil
        );
      }
    } else {
      console.log(`DINNER_OK: 当天未完成，继续等待`, {
        服务器确认完成: isServerCompleted,
        是否存在下一天NPC: hasNextDayNPC,
        本地剩余餐食: currentNPC.availableMealTypes,
      });
    }
  }

  async forceUpdateCurrentDay() {
    try {
      if (this._advanceInFlight) return false;
      this._advanceInFlight = true;

      const body = {
        playerId: this.scene.playerId,
        currentDay: this.playerStatus.currentDay,
      };

      const resp = await fetch(`${API_URL}/update-current-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      if (!data.success) {
        if (
          data.error &&
          data.error.toLowerCase().includes("advance not allowed")
        ) {
          if (data.canAdvanceAt) {
            this.advanceGateBlockedUntil = new Date(data.canAdvanceAt);
          } else {
            const t = new Date();
            t.setDate(t.getDate() + 1);
            t.setHours(0, 5, 0, 0);
            this.advanceGateBlockedUntil = t;
          }

          this.scene.uiManager?.toast?.(
            this.scene.playerData.language === "zh"
              ? "已记录任意一餐。下一天的 NPC 将在“第二天”解锁。"
              : "Meal logged. Next day's NPC unlocks tomorrow."
          );
          return false;
        }

        console.warn("Update day rejected:", data);
        this.scene.uiManager?.toast?.(
          (this.scene.playerData.language === "zh"
            ? "切天失败："
            : "Advance failed: ") + (data.error || "Unknown error")
        );
        return false;
      }

      this.playerStatus.currentDay = data.newDay;
      await this.loadPlayerStatus();
      this.scene.uiManager?.toast?.(
        this.scene.playerData.language === "zh"
          ? `已进入第 ${data.newDay} 天`
          : `Advanced to Day ${data.newDay}`
      );
      return true;
    } catch (e) {
      console.error("forceUpdateCurrentDay error:", e);
      this.scene.uiManager?.toast?.(
        this.scene.playerData.language === "zh"
          ? "切天请求出错"
          : "Failed to advance day"
      );
      return false;
    } finally {
      this._advanceInFlight = false;
    }
  }

  scheduleAdvanceCheck(ms) {
    const delay = Math.min(Math.max(Number(ms) || 0, 30_000), 15 * 60_000);
    if (this._advanceTimer) {
      clearTimeout(this._advanceTimer);
      this._advanceTimer = null;
    }
    if (delay > 0) {
      this._advanceTimer = setTimeout(() => {
        this._advanceTimer = null;
        this.forceUpdateCurrentDay?.();
      }, delay);
    }
  }

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

  addClue(npcId, clueText, day, stage = null) {
    console.log(
      "[NPCManager.addClue] args:",
      npcId,
      clueText?.slice(0, 40),
      day,
      stage
    );

    const stagePart =
      stage === 1 || stage === 2 || stage === 3 ? `_${stage}` : "";
    const clueId = `${npcId}_${day}${stagePart}`;

    // 🔑 检查是否已存在（包括预添加的）
    const existingIndex = (this.clueRecords || []).findIndex(
      (c) => c.id === clueId
    );
    if (existingIndex !== -1) {
      console.log("线索已存在，直接触发UI更新:", clueId);
      const existingClue = this.clueRecords[existingIndex];

      // 如果是预添加的线索，现在正式添加到UI
      if (existingClue._preAdded) {
        delete existingClue._preAdded;

        if (
          this.scene.uiManager &&
          typeof this.scene.uiManager.addClue === "function"
        ) {
          this.scene.uiManager.addClue(existingClue);
        }
      }
      return;
    }

    // 如果不存在，正常添加新线索
    const npc = this.npcs.get(npcId);
    const npcDisplayName =
      npc && npc.name
        ? npc.name
        : this.getNPCNameByLanguage
        ? this.getNPCNameByLanguage(npcId)
        : npcId;

    const finalClue =
      clueText && clueText.trim()
        ? clueText
        : this.getNPCClue
        ? this.getNPCClue(npcId)
        : "…";

    const clue = {
      id: clueId,
      npcId,
      npcName: npcDisplayName,
      clue: finalClue,
      day,
      stage: stage || undefined,
      receivedAt: new Date(),
    };

    this.clueRecords = this.clueRecords || [];
    this.clueRecords.push(clue);

    if (
      this.scene.uiManager &&
      typeof this.scene.uiManager.addClue === "function"
    ) {
      this.scene.uiManager.addClue(clue);
    }

    console.log("新线索已添加到本地:", clue);
  }

  getVagueResponse(npcId, version = 1) {
    const language = this.scene.playerData.language;

    // NPC-specific vague responses
    const npcVagueResponses = {
      village_head: {
        zh: {
          1: "你师父常有个地方，他总去的...\n嗯，那又是哪里来着？\n啊，我记性不如从前了。\n\n哦！现在该我准备下顿饭的时候了。过几个小时再回来吧。兴许到时候什么会想起来的。",
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

  getAllClues() {
    return (this.clueRecords || []).slice().sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return (a.stage || 99) - (b.stage || 99);
    });
  }

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
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 1,
        fill: "#ffd700",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
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

  createNPC(config) {
    const npcAssetMap = {
      village_head: "npc1",
      shop_owner: "npc2",
      spice_woman: "npc3",
      restaurant_owner: "npc4",
      fisherman: "npc5",
      old_friend: "npc6",
      secret_apprentice: "npc7",
    };

    const assetKey = npcAssetMap[config.id] || "npc1";
    const npcSprite = this.scene.add.sprite(0, 0, assetKey);

    npcSprite.setScale(this.mapScale * 0.045);
    npcSprite.setDepth(5);
    npcSprite.setVisible(false);

    this.scene.gridEngine.addCharacter({
      id: config.id,
      sprite: npcSprite,
      startPosition: config.position,
    });

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
      village_head: { portraitKey: "npc1head", backgroundKey: "npc1bg" },
      shop_owner: { portraitKey: "npc2head", backgroundKey: "npc2bg" },
      spice_woman: { portraitKey: "npc3head", backgroundKey: "npc3bg" },
      restaurant_owner: { portraitKey: "npc4head", backgroundKey: "npc4bg" },
      fisherman: { portraitKey: "npc5head", backgroundKey: "npc5bg" },
      old_friend: { portraitKey: "npc6head", backgroundKey: "npc6bg" },
      secret_apprentice: { portraitKey: "npc7head", backgroundKey: "npc7bg" },
    };

    const assets = npcAssetMap[npc.id] || {};
    return {
      ...npc,
      portraitKey: assets.portraitKey,
      backgroundKey: assets.backgroundKey,
    };
  }

  highlightNPC(npc) {
    this.removeNPCHighlight(npc);

    const glowEffect = this.scene.add.graphics();
    glowEffect.lineStyle(3, 0xffd700, 0.8);
    glowEffect.strokeCircle(0, 0, 25);
    glowEffect.setPosition(npc.sprite.x, npc.sprite.y);
    glowEffect.setDepth(4);

    this.scene.tweens.add({
      targets: glowEffect,
      scaleX: { from: 1, to: 1.3 },
      scaleY: { from: 1, to: 1.3 },
      alpha: { from: 0.8, to: 0.2 },
      duration: 1500,
      repeat: -1,
      yoyo: true,
    });

    npc.glowEffect = glowEffect;
  }

  // 🔑 关键修复：确保点击区域被正确设置
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
      console.log(`🖱️ NPC ${npc.id} 被直接点击！`);
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

    console.log(`✅ 为NPC ${npc.id} 添加了点击区域`);
  }

  hideNPCHover(npc) {
    if (npc.hoverText) {
      npc.hoverText.destroy();
      npc.hoverText = null;
    }
  }

  startDialogScene(npcId) {
    console.log(`🎭 开始与NPC ${npcId} 的对话场景`);

    this.clearAllNPCHints();

    const currentDay = this.playerStatus?.currentDay;
    const today = this.availableNPCs.find(
      (n) => n.npcId === npcId && n.day === currentDay
    );
    const useConvAI = today ? today.mealsRecorded === 0 : true;

    console.log(`📋 对话配置:`, {
      当前天: currentDay,
      NPC记录餐数: today?.mealsRecorded,
      使用ConvAI: useConvAI,
    });

    this.scene.scene.pause("MainScene");
    this.scene.scene.launch("DialogScene", {
      npcId: npcId,
      npcManager: this,
      playerData: this.scene.playerData,
      mainScene: this.scene,
      useConvAI,
    });
  }

  async completeNPCInteraction(npcId) {
    try {
      const currentDay = this.playerStatus.currentDay;

      const response = await fetch(`${API_URL}/complete-npc-interaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: this.scene.playerId,
          day: currentDay,
          npcId: npcId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const availableNPC = this.availableNPCs.find((n) => n.npcId === npcId);
        if (availableNPC) {
          availableNPC.completed = true;
        }

        const npc = this.npcs.get(npcId);
        if (npc) {
          this.removeNPCHighlight(npc);
        }

        if (
          !this.finalEggReady &&
          !this.isGeneratingFinalEgg &&
          this.playerStatus.currentDay >= 7 &&
          availableNPC?.completed
        ) {
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

    if (this.finalEggReady || this.isGeneratingFinalEgg) return;

    this.scene.showNotification(
      language === "zh"
        ? "🎊 恭喜完成7天的旅程！正在生成你的专属彩蛋..."
        : "🎊 Congratulations on completing the 7-day journey! Generating your personalized ending...",
      3000
    );

    await this.triggerFinalEgg();
  }

  async triggerFinalEgg() {
    if (this.finalEggReady || this.isGeneratingFinalEgg) return;
    this.isGeneratingFinalEgg = true;

    try {
      const response = await fetch(`${API_URL}/generate-final-egg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: this.scene.playerId,
          language: this.scene.playerData.language,
        }),
      });

      const data = await response.json();
      if (!data.success)
        throw new Error(data.error || "Failed to generate final egg");

      const egg = normalizeEggPayload(data);
      this.finalEggContent = egg;
      this.finalEggReady = true;

      this.showFinalEggDialog(egg);
    } catch (error) {
      console.error("Error generating final egg:", error);

      const egg = normalizeEggPayload({
        eggContent: this.generateLocalFinalEgg(),
      });
      this.finalEggContent = egg;
      this.finalEggReady = true;

      this.showFinalEggDialog(egg);
    } finally {
      this.isGeneratingFinalEgg = false;
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

  showFinalEggDialog(egg) {
    if (this.scene.uiManager) {
      this.scene.uiManager.showFinalEgg(egg);
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
        npc.sprite.setScale(newScale * 0.09);
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
    if (this._advanceTimer) {
      clearTimeout(this._advanceTimer);
      this._advanceTimer = null;
    }
    this.npcs.forEach((npc) => {
      this.removeNPCHighlight(npc);
    });
  }
}

// 把后端返回统一转成 UI 需要的 egg 对象
function normalizeEggPayload(data) {
  // 优先：后端直接给了结构化 egg
  if (data && typeof data.egg === "object" && data.egg !== null)
    return data.egg;

  // 兼容：有些时候 eggContent 其实已经是对象
  if (data && typeof data.eggContent === "object" && data.eggContent !== null)
    return data.eggContent;

  // 老格式：纯字符串 -> 包一层给 UIManager
  const letter = typeof data?.eggContent === "string" ? data.eggContent : "";
  return {
    letter,
    summary: [],
    health: { positives: [], improvements: [] },
    recipe: { title: "", servings: 1, ingredients: [], steps: [], tip: "" },
  };
}
