// server/routes/gameRoutes.js - 完整优化版
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Player = require("../models/Player");
const PlayerProgress = require("../models/PlayerProgress");
const MealRecord = require("../models/MealRecord");
const GameSession = require("../models/GameSession");
const AllowedId = require("../models/AllowedId");
const Clue = require("../models/Clue");
const ConversationHistory = require("../models/ConversationHistory");
const sequelize = require("../db");
const {
  generateFinalEggPrompt,
  generateFinalEggPromptPlayerOnly,
} = require("../utils/finalEggPrompt");
const { buildLocalEgg } = require("../utils/eggLocal");
// 🔧 导入NPC线索数据
const { npcClues, getNPCClue, extractClueKeywords } = require("../data/npcClues");

const MAX_MEAL_CONTENT_LENGTH = 200;

// 解锁模式：严格"次日 00:00"才能推进（默认）
const NEXT_DAY_UNLOCK_MODE = process.env.NEXT_DAY_UNLOCK_MODE || "calendar";
const CROSS_DAY_WAIT_HOURS = Number(process.env.CROSS_DAY_WAIT_HOURS || 24);

/* --------------------------------- 工具函数 -------------------------------- */

// NPC ID 映射
function dayToNpcId(day) {
  const map = {
    1: "uncle_bo",
    2: "shop_owner",
    3: "spice_granny",
    4: "restaurant_owner",
    5: "fisherman",
    6: "old_friend",
    7: "secret_apprentice",
  };
  return map[day] || "uncle_bo";
}

// NPC 名称映射
function getNPCName(npcId, language = "zh") {
  // 🔧 统一 ID 映射
  const idMapping = {
    "village_head": "uncle_bo",
    "spice_woman": "spice_granny",
    "npc1": "uncle_bo",
    "npc2": "shop_owner",
    "npc3": "spice_granny",
    "npc4": "restaurant_owner",
    "npc5": "fisherman",
    "npc6": "old_friend",
    "npc7": "secret_apprentice"
  };
  
  const actualId = idMapping[npcId] || npcId;

  // 优先从 npcClues.js 获取
  const { npcClues } = require("../data/npcClues");
  if (npcClues && npcClues[actualId]) {
    const npc = npcClues[actualId];
    return npc.name[language] || npc.name.zh || npc.name.en;
  }

  // 备选
  const npcNames = {
    uncle_bo: { zh: "阿桂（杂货铺）", en: "Uncle Bo" },
    shop_owner: { zh: "杂货铺老板 Grace", en: "Shop Owner Grace" },
    spice_granny: { zh: "香料婆婆", en: "Spice Granny" },
    restaurant_owner: { zh: "餐馆老板", en: "Restaurant Owner" },
    fisherman: { zh: "渔夫", en: "Fisherman" },
    old_friend: { zh: "旧友Rowan", en: "Old Friend Rowan" },
    secret_apprentice: { zh: "秘密学徒Mira", en: "Secret Apprentice Mira" },
  };
  
  const entry = npcNames[actualId];
  if (entry) {
    return entry[language] || entry.zh;
  }
  
  return actualId || "Unknown NPC";
}

// 检查是否至少记录了1餐
async function hasRecordedAnyMealForDay(playerId, day) {
  const anyMeal = await MealRecord.findOne({
    where: { playerId, day },
  });
  return !!anyMeal;
}

// 计算"次日 00:00"
function nextMidnight(ts = new Date()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

// 时间闸门（严格次日 00:00 或若用小时制则基于第一餐时间 + waitHours）
async function computeAdvanceGateStrictCalendar(
  playerId,
  day,
  waitHours = CROSS_DAY_WAIT_HOURS
) {
  // 检查是否至少记录了1餐
  const hasAnyMeal = await hasRecordedAnyMealForDay(playerId, day);
  if (!hasAnyMeal) {
    return {
      allowed: false,
      reason: "no_meal_recorded",
      message: "需要至少记录1餐才能进入下一天",
    };
  }

  // 找当天"第一餐"（用于计算等待时间）
  const firstMeal = await MealRecord.findOne({
    where: { playerId, day },
    order: [["recordedAt", "ASC"]],
  });

  if (!firstMeal) {
    return {
      allowed: false,
      reason: "no_meal_found",
    };
  }

  const base = firstMeal.recordedAt || firstMeal.createdAt || new Date();
  let canAdvanceAt;

  if (NEXT_DAY_UNLOCK_MODE === "calendar") {
    // 次日00:00模式
    canAdvanceAt = nextMidnight(base);
  } else {
    // 小时制模式
    canAdvanceAt = new Date(base.getTime() + waitHours * 3600 * 1000);
  }

  const now = new Date();
  if (now >= canAdvanceAt) {
    return { allowed: true, canAdvanceAt };
  }

  return {
    allowed: false,
    reason: "waiting_for_time",
    canAdvanceAt,
    waitMs: canAdvanceAt - now,
  };
}

// 从 Gemini 结果提取文本
async function extractTextFromGemini(result) {
  try {
    if (result?.response?.text && typeof result.response.text === "function") {
      const t = await result.response.text();
      if (t && t.trim()) return t.trim();
    }
    if (typeof result?.text === "string" && result.text.trim()) {
      return result.text.trim();
    }
    const parts =
      result?.response?.candidates?.[0]?.content?.parts ||
      result?.candidates?.[0]?.content?.parts ||
      [];
    const txt = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    if (txt) return txt;
    return null;
  } catch (e) {
    console.error("[extractTextFromGemini] failed:", e);
    return null;
  }
}

// 🔧 读取玩家全部线索（支持新旧格式）
async function getPlayerClues(playerId) {
  try {
    const clues = await Clue.findAll({
      where: { playerId },
      order: [
        ["day", "ASC"],
        ["receivedAt", "ASC"],
      ],
    });

    const out = [];
    for (const clue of clues) {
      // 🔧 新格式：直接有clueType字段
      if (clue.clueType) {
        let keywords = [];
        try {
          keywords = clue.keywords ? JSON.parse(clue.keywords) : [];
        } catch { keywords = []; }
        
        out.push({
          id: `${clue.npcId}_${clue.day}_${clue.mealType || 'unknown'}`,
          npcId: clue.npcId,
          npcName: clue.npcName || getNPCName(clue.npcId),
          clue: clue.clueText,
          clueType: clue.clueType,  // 'vague' 或 'true'
          keywords,
          shortVersion: clue.shortVersion,
          mealType: clue.mealType,
          nextNPC: clue.nextNPC,
          day: clue.day,
          receivedAt: clue.receivedAt,
          // 用于显示的高亮版本
          highlightedClue: clue.clueText.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffd700">$1</strong>')
        });
      } else {
        // 旧格式：兼容处理
        let json;
        try {
          json = JSON.parse(clue.clueText);
        } catch {
          json = { stage3: clue.clueText };
        }

        const map = [
          { key: "stage1", stage: 1, clueType: 'vague' },
          { key: "stage2", stage: 2, clueType: 'vague' },
          { key: "stage3", stage: 3, clueType: 'true' },
        ];

        for (const { key, stage, clueType: ct } of map) {
          const text = json[key];
          if (!text) continue;

          out.push({
            id: `${clue.npcId}_${clue.day}_${stage}`,
            npcId: clue.npcId,
            npcName: getNPCName(clue.npcId),
            clue: text,
            clueType: ct,
            day: clue.day,
            stage,
            receivedAt: clue.receivedAt,
          });
        }
      }
    }
    return out;
  } catch (error) {
    console.error("获取玩家线索错误:", error);
    return [];
  }
}

// 多阶段线索写入（同一行合并）
async function saveClueToDatabase(
  playerId,
  npcId,
  clueText,
  day,
  stage = null,
  mealType = null
) {
  try {
    const key = stage === 1 ? "stage1" : stage === 2 ? "stage2" : "stage3";
    let row = await Clue.findOne({ where: { playerId, npcId, day } });

    if (!row) {
      const payload = {};
      payload[key] = clueText;
      await Clue.create({
        playerId,
        npcId,
        day,
        clueText: JSON.stringify(payload),
        receivedAt: new Date(),
      });
      return true;
    }

    let json;
    try {
      json = JSON.parse(row.clueText);
      if (typeof json !== "object" || json === null)
        throw new Error("not-json");
    } catch {
      json = { stage3: row.clueText };
    }

    if (json[key]) return true; // 幂等
    json[key] = clueText;

    await row.update({
      clueText: JSON.stringify(json),
      receivedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error("保存线索错误:", error);
    return false;
  }
}

// 保存对话历史
async function saveConversationHistory(
  playerId,
  npcId,
  day,
  speaker,
  content,
  mealType = null,
  sessionId = null
) {
  try {
    await ConversationHistory.create({
      playerId,
      npcId,
      day,
      sessionId,
      speaker,
      content,
      mealType,
      timestamp: new Date(),
    });
    return true;
  } catch (error) {
    console.error("保存对话历史错误:", error);
    return false;
  }
}

// 获取NPC线索文本（分阶段）
function getClueForNPCStage(npcId, language = "en", stage = 1) {
  const playerLanguage = language === "zh" ? "zh" : "en";
  const { getNPCClue } = require("../data/npcClues");
  
  // 🔧 映射 ID 以匹配 npcClues.js
  const idMapping = {
    "village_head": "uncle_bo",
    "spice_woman": "spice_granny",
    "npc1": "uncle_bo",
    "npc2": "shop_owner",
    "npc3": "spice_granny",
    "npc4": "restaurant_owner",
    "npc5": "fisherman",
    "npc6": "old_friend",
    "npc7": "secret_apprentice"
  };
  const actualId = idMapping[npcId] || npcId;

  if (stage === 3) {
    const clue = getNPCClue(actualId, "true", 0, playerLanguage);
    return clue ? clue.text : (playerLanguage === "zh" ? "做的好。" : "Great Job.");
  } else {
    const clue = getNPCClue(actualId, "vague", stage - 1, playerLanguage);
    return clue ? clue.text : (playerLanguage === "zh" ? "做的好。" : "Great Job.");
  }
}


// 找出最常互动的NPC
function getMostInteractedNPC(mealRecords) {
  // ... (省略部分，保持原有逻辑)
  return favoriteNPC;
}

// 🔧 工具函数：计算天数差（基于当地日期）
function calculateDayNumber(firstLoginDate, clientDateObj) {
  try {
    const firstDate = new Date(firstLoginDate);
    
    // 玩家首次登录的年、月、日
    const d1 = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    
    // 玩家当前的年、月、日（从客户端传来）
    let d2;
    if (clientDateObj && clientDateObj.year) {
      d2 = new Date(clientDateObj.year, clientDateObj.month - 1, clientDateObj.day);
    } else {
      const now = new Date();
      d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    
    const diffTime = d2 - d1;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // 返回天数（第一天是1，第二天是2...）
    if (diffDays < 0) return 1;
    return diffDays + 1;
  } catch (e) {
    console.error("日期计算错误:", e);
    return 1;
  }
}

/* --------------------------------- 路由 ----------------------------------- */

// 登录
router.post("/login", async (req, res) => {
  try {
    const { playerId, clientDate } = req.body;
    if (!playerId) {
      return res
        .status(400)
        .json({ success: false, error: "Player ID is required" });
    }

    const allowedRecord = await AllowedId.findOne({ where: { playerId } });
    if (!allowedRecord) {
      return res
        .status(404)
        .json({ success: false, error: "Player ID not found in database" });
    }
    await allowedRecord.update({ used: true });

    let player = await Player.findOne({ where: { playerId } });

    if (!player) {
      // 首次登录：记录服务器当前时间作为基准
      const now = new Date();
      player = await Player.create({
        playerId,
        firstLoginDate: now,
        currentDay: 1,
        gameCompleted: false,
        language: "en",
      });

      await PlayerProgress.create({
        playerId,
        day: 1,
        npcId: "uncle_bo",
        unlockedAt: now,
      });
    } else {
      // 再次登录：进阶逻辑优化
      const calendarDay = calculateDayNumber(player.firstLoginDate, clientDate);
      let targetDay = player.currentDay;

      console.log(`📅 玩家 ${playerId} 登录。首次登录: ${player.firstLoginDate}, 当前日历天数: ${calendarDay}, 数据库存储天数: ${player.currentDay}`);

      // 🔧 关键改进：如果玩家还没记录过任何餐食，不自动进阶天数
      // 只有当 (日历天数 > 当前存储天数) 且 (当前存储天数至少有一餐记录) 时，才进阶
      if (calendarDay > player.currentDay) {
        const recordedMealsOnCurrentDay = await MealRecord.count({
          where: { playerId, day: player.currentDay }
        });

        if (recordedMealsOnCurrentDay > 0) {
          // 进阶到日历当前天，或逐天增加
          targetDay = calendarDay;
          console.log(`🚀 玩家在第 ${player.currentDay} 天有 ${recordedMealsOnCurrentDay} 条记录，允许进阶到第 ${targetDay} 天`);
        } else {
          console.log(`⏳ 玩家在第 ${player.currentDay} 天没有记录，保持在第 ${player.currentDay} 天，虽然日历已经是第 ${calendarDay} 天`);
        }
      }

      if (targetDay > player.currentDay) {
        await player.update({ currentDay: targetDay });
        
        // 确保进阶后所有缺失天数的进度记录都存在
        for (let d = player.currentDay; d <= targetDay; d++) {
          const progressExists = await PlayerProgress.findOne({
            where: { playerId, day: d }
          });
          
          if (!progressExists) {
            await PlayerProgress.create({
              playerId,
              day: d,
              npcId: dayToNpcId(d),
              unlockedAt: new Date(),
            });
          }
        }
      }
    }

    const progressRecords = await PlayerProgress.findAll({
      where: { playerId },
      order: [["day", "ASC"]],
    });

    const mealRecords = await MealRecord.findAll({
      where: { playerId },
      order: [
        ["day", "ASC"],
        ["recordedAt", "ASC"],
      ],
    });

    let clueRecords = [];
    try {
      clueRecords = await getPlayerClues(playerId);
    } catch (clueError) {
      console.error("获取线索时出错，但不影响登录:", clueError);
      clueRecords = [];
    }

    // 汇总每天已吃哪些餐
    const dailySet = {};
    for (const m of mealRecords) {
      if (!dailySet[m.day]) dailySet[m.day] = new Set();
      dailySet[m.day].add(m.mealType);
    }

    const availableNPCs = progressRecords.map((p) => {
      const set = dailySet[p.day] || new Set();
      const mealsRecorded = set.size;
      const hasCompletedDay = mealsRecorded > 0;
      const availableMealTypes = ["breakfast", "lunch", "dinner"].filter(
        (t) => !set.has(t)
      );

      return {
        day: p.day,
        npcId: p.npcId,
        unlocked: true,
        completed: p.completedAt !== null,
        mealsRecorded,
        hasRecordedMeal: mealsRecorded > 0,
        hasCompletedDay,
        availableMealTypes,
      };
    });

    const currentDay = player.currentDay;
    const currentSet = dailySet[currentDay] || new Set();
    const currentDayMealsRemaining = ["breakfast", "lunch", "dinner"].filter(
      (t) => !currentSet.has(t)
    );

    res.json({
      success: true,
      player: {
        playerId: player.playerId,
        nickname: player.nickname,
        firstLoginDate: player.firstLoginDate,
        currentDay: player.currentDay,
        gameCompleted: player.gameCompleted,
        language: player.language,
        progress: player.progress,
      },
      availableNPCs,
      mealRecords: mealRecords.map((record) => ({
        day: record.day,
        npcId: record.npcId,
        npcName: record.npcName,
        mealType: record.mealType,
        mealContent: record.mealContent,
        recordedAt: record.recordedAt,
      })),
      clueRecords,
      totalDaysUnlocked: progressRecords.length,
      currentDayMealsRemaining,
    });
  } catch (error) {
    console.error("登录错误详情:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// 玩家状态
router.post("/player-status", async (req, res) => {
  const { playerId } = req.body || {};
  if (!playerId)
    return res.status(400).json({ success: false, error: "缺少 playerId" });

  try {
    const player = await Player.findOne({ where: { playerId } });
    if (!player)
      return res.status(404).json({ success: false, error: "玩家未找到" });

    const currentDay = Number(player.currentDay) || 1;

    let progresses = await PlayerProgress.findAll({ where: { playerId } }).then(
      (rs) => rs.map((r) => r.get({ plain: true }))
    );
    const mealRecords = await MealRecord.findAll({ where: { playerId } }).then(
      (rs) => rs.map((r) => r.get({ plain: true }))
    );
    const clueRecords = await getPlayerClues(playerId);

    // 兜底：当前天未解锁则创建
    if (!progresses.some((p) => Number(p.day) === currentDay)) {
      const npcId = dayToNpcId(currentDay);
      if (npcId) {
        await PlayerProgress.create({
          playerId,
          day: currentDay,
          npcId,
          unlockedAt: new Date(),
        });
        progresses = await PlayerProgress.findAll({ where: { playerId } }).then(
          (rs) => rs.map((r) => r.get({ plain: true }))
        );
      }
    }

    // 聚合每天每 NPC 的餐
    const allMealsByDayNpc = new Map();
    mealRecords.forEach((m) => {
      const key = `${m.day}__${m.npcId}`;
      if (!allMealsByDayNpc.has(key)) allMealsByDayNpc.set(key, []);
      allMealsByDayNpc.get(key).push(m);
    });

    const availableNPCs = progresses.map((p) => {
      const dayNum = Number(p.day);
      const key = `${dayNum}__${p.npcId}`;
      const meals = allMealsByDayNpc.get(key) || [];
      const recordedTypes = new Set(meals.map((m) => m.mealType));
      const remaining = ["breakfast", "lunch", "dinner"].filter(
        (t) => !recordedTypes.has(t)
      );

      return {
        day: dayNum,
        npcId: p.npcId,
        unlocked: !!p.unlockedAt,
        hasCompletedDay: false,
        hasRecordedMeal: meals.length > 0,
        mealsRecorded: meals.length,
        availableMealTypes: remaining,
        isCurrentDay: dayNum === currentDay,
        canInteract: dayNum === currentDay && !!p.unlockedAt,
      };
    });

    // 计算能否切到下一天
    const mealsToday = mealRecords.filter((m) => Number(m.day) === currentDay);
    const hasAny = mealsToday.length > 0;

    let canAdvanceToNextDay = false;
    let nextAdvanceAt = null;

    if (hasAny) {
      const gate = await computeAdvanceGateStrictCalendar(
        playerId,
        currentDay,
        CROSS_DAY_WAIT_HOURS
      );
      if (gate.allowed) canAdvanceToNextDay = true;
      else nextAdvanceAt = gate.canAdvanceAt || null;
    }

    const statsInfo = {
      totalMealsRecorded: mealRecords.length,
      mealsByDay: {},
      unlockedDays: progresses.length,
      canAdvanceToNextDay,
      nextDayWillBe: Math.min(currentDay + 1, 7),
    };
    mealRecords.forEach((meal) => {
      if (!statsInfo.mealsByDay[meal.day]) statsInfo.mealsByDay[meal.day] = [];
      statsInfo.mealsByDay[meal.day].push({
        mealType: meal.mealType,
        npcName: meal.npcName,
        recordedAt: meal.recordedAt,
      });
    });

    // 获取当天剩余餐食
    const recordedToday = new Set(mealsToday.map(m => m.mealType));
    const currentDayMealsRemaining = ["breakfast", "lunch", "dinner"].filter(t => !recordedToday.has(t));

    return res.json({
      success: true,
      player: {
        playerId: player.playerId,
        currentDay,
        gameCompleted: !!player.gameCompleted,
        language: player.language || "en",
        firstLoginDate: player.firstLoginDate,
        progress: player.progress,
      },
      availableNPCs,
      currentDayMealsRemaining, // 🔧 新增：同步返回当天剩余餐食
      mealRecords: mealRecords.map((r) => ({
        day: r.day,
        npcId: r.npcId,
        npcName: r.npcName,
        mealType: r.mealType,
        mealContent: r.mealContent,
        recordedAt: r.recordedAt,
      })),
      clueRecords,
      canAdvanceToNextDay,
      nextAdvanceAt,
      statsInfo,
      totalDaysUnlocked: progresses.length,
    });
  } catch (err) {
    console.error("[/player-status] error:", err);
    return res.json({
      success: false,
      error: "服务器错误",
      details: err.message,
    });
  }
});

// 保存线索
router.post("/save-clue", async (req, res) => {
  try {
    const { playerId, npcId, clueText, day } = req.body;

    if (!playerId || !npcId || !clueText || !day) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const result = await saveClueToDatabase(playerId, npcId, clueText, day);

    if (result) {
      res.json({ success: true });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to save clue",
      });
    }
  } catch (error) {
    console.error("Error saving clue:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 获取玩家的所有线索
router.get("/clues/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: "Missing playerId",
      });
    }

    const clues = await getPlayerClues(playerId);

    res.json({
      success: true,
      clues: clues,
      total: clues.length,
    });
  } catch (error) {
    console.error("Error fetching clues:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔧 旧的保存对话历史路由（已弃用，使用下面的新路由）
/*
router.post("/save-conversation", async (req, res) => {
  try {
    const { playerId, npcId, day, speaker, content, mealType, sessionId } =
      req.body;

    if (!playerId || !npcId || !day || !speaker || !content) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const result = await saveConversationHistory(
      playerId,
      npcId,
      day,
      speaker,
      content,
      mealType,
      sessionId
    );

    if (result) {
      res.json({ success: true });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to save conversation",
      });
    }
  } catch (error) {
    console.error("Error saving conversation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
*/

// 记录餐食
router.post("/record-meal", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      playerId,
      day: rawDay,
      npcId,
      npcName,
      mealType,
      answers, 
      mealAnswers, 
      conversationHistory,
      mealContent,
    } = req.body;

    // 🔧 确定实际的day值
    const day = rawDay || 1;
    
    // 🔧 确定实际的answers（兼容旧格式）
    const actualAnswers = mealAnswers || answers || {};

    const player = await Player.findOne({
      where: { playerId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!player) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "玩家未找到" });
    }

    // 🔧 修复 NPC 名字提取：如果传入的是 ID 或者 "NPC"，尝试获取漂亮的中文/英文名
    let actualNPCName = npcName;
    if (!npcName || npcName === "NPC" || npcName === npcId) {
      actualNPCName = getNPCName(npcId, player.language || "zh");
    }
    
    console.log(`👤 记录餐食 - NPC ID: ${npcId}, 最终名字: ${actualNPCName}, 餐食: ${mealType}, Day: ${day}`);
    if (!playerId || !day || !npcId || !mealType || !mealContent) {
      await t.rollback();
      console.error("❌ 缺少必要字段:", { playerId, day, npcId, mealType, hasContent: !!mealContent });
      return res.status(400).json({ success: false, error: "缺少必要字段" });
    }

    // 同天同餐别仅一次
    const existingMeal = await MealRecord.findOne({
      where: { playerId, day, mealType },
      transaction: t,
    });
    if (existingMeal) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, error: "今天的这一餐已经记录过了" });
    }

    // 写入餐食
    const mealRecord = await MealRecord.create(
      {
        playerId,
        day,
        npcId,
        npcName: actualNPCName,
        mealType,
        mealAnswers: actualAnswers,
        conversationHistory,
        mealContent,
      },
      { transaction: t }
    );

    // 更新当日统计
    const progressRecord = await PlayerProgress.findOne({
      where: { playerId, day },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (progressRecord) {
      const dayMeals = await MealRecord.findAll({
        where: { playerId, day },
        transaction: t,
      });
      const mealTypes = new Set(dayMeals.map((m) => m.mealType));
      await progressRecord.update(
        {
          mealsRecorded: dayMeals.length,
          hasRecordedMeal: dayMeals.length > 0,
          availableMealTypes: JSON.stringify(
            ["breakfast", "lunch", "dinner"].filter((x) => !mealTypes.has(x))
          ),
        },
        { transaction: t }
      );
    }

    // 🔧 发放线索 - 根据餐食类型决定给vague还是true线索
    const playerLanguage = player.language || "en";
    let clueType = null;
    let clueText = null;
    let shouldGiveClue = true; // 每次都给线索（vague或true）
    
    try {
      // 获取该NPC当前的vague计数（第次数vague）
      const previousVagueCount = await Clue.count({
        where: { playerId, npcId, clueType: 'vague' }
      });
      
      console.log(`🎯 [线索判定] NPC: ${npcId}, 餐食: ${mealType}, 已有vague数: ${previousVagueCount}`);
      
      if (mealType === "dinner") {
        // 🌙 晚餐 = 给真实线索 (Stage 3)
        clueType = "true";
        clueText = getClueForNPCStage(npcId, playerLanguage, 3);
        console.log(`✅ [晚餐] 给予真实线索:`, clueText?.substring(0, 30));
      } else {
        // 🌞 早餐/午餐 = 给模糊线索 (Stage 1 或 2)
        clueType = "vague";
        const stage = previousVagueCount === 0 ? 1 : 2;
        clueText = getClueForNPCStage(npcId, playerLanguage, stage);
        console.log(`ℹ️ [${mealType}] 给予模糊线索 (阶段 ${stage}):`, clueText?.substring(0, 30));
      }
      
      // 统一 ID 映射
      const idMapping = {
        "village_head": "uncle_bo",
        "spice_woman": "spice_granny",
        "npc1": "uncle_bo",
        "npc2": "shop_owner",
        "npc3": "spice_granny",
        "npc4": "restaurant_owner",
        "npc5": "fisherman",
        "npc6": "old_friend",
        "npc7": "secret_apprentice"
      };
      const actualNpcId = idMapping[npcId] || npcId;

      // 保存线索到数据库
      if (clueText && typeof clueText === 'string') {
        try {
          const { cleanText, keywords, shortVersion } = extractClueKeywords(clueText, playerLanguage);
          
          await Clue.create({
            playerId,
            npcId: actualNpcId,
            npcName: actualNPCName, 
            clueType,
            clueText: cleanText,
            keywords: JSON.stringify(keywords),
            shortVersion,
            day,
            mealType,
            nextNPC: npcClues[actualNpcId]?.nextNPC || null
          }, { transaction: t });
          
          console.log(`✅ 线索保存成功！`);
        } catch (clueError) {
          console.error("⚠️ 保存线索记录失败 (可能是数据库字段未迁移):", clueError.message);
          // 这里的错误不回滚事务，允许玩家继续保存餐食记录
        }
      }
    } catch (clueLogicError) {
      console.error("⚠️ 获取线索逻辑出错 (允许继续保存餐食):", clueLogicError.message);
    }

    // 预创建下一天的 progress
    let nextDayUnlocked = false;
    let shouldUnlockNextDay = false;
    if (day < 7) {
      const nextDay = day + 1;
      const exists = await PlayerProgress.findOne({
        where: { playerId, day: nextDay },
        transaction: t,
      });
      if (!exists) {
        const nextNpcId = dayToNpcId(nextDay);
        if (nextNpcId) {
          await PlayerProgress.create(
            {
              playerId,
              day: nextDay,
              npcId: nextNpcId,
              unlockedAt: new Date(),
            },
            { transaction: t }
          );
        }
      }
      nextDayUnlocked = true;
      shouldUnlockNextDay = true;
    }

    // 🔧 获取当天所有已记录的餐食，确保准确性
    const allRecordedMeals = await MealRecord.findAll({
      where: { playerId, day },
      transaction: t,
    });
    const recordedTypes = new Set(allRecordedMeals.map((m) => m.mealType));
    const remainingMeals = ["breakfast", "lunch", "dinner"].filter(
      (type) => !recordedTypes.has(type)
    );
    
    console.log(`📊 餐食记录完成 - 今日已记: ${Array.from(recordedTypes).join(",")}, 剩余: ${remainingMeals.join(",")}`);

    // 🔧 新增：检查游戏是否最终完成 (第7天且无剩余餐食)
    let finalGameCompleted = false;
    if (day >= 7 && remainingMeals.length === 0) {
      console.log(`🎉 玩家 ${playerId} 已完成全周任务！`);
      await player.update({ gameCompleted: true }, { transaction: t });
      finalGameCompleted = true;
    }

    await t.commit();

    return res.json({
      success: true,
      mealRecord: {
        id: mealRecord.id,
        day: mealRecord.day,
        npcId: mealRecord.npcId,
        npcName: mealRecord.npcName,
        mealType: mealRecord.mealType,
        mealContent: mealRecord.mealContent,
        recordedAt: mealRecord.recordedAt,
      },
      // 🔧 线索信息
      shouldGiveClue,
      clueType,
      clueText,
      clueData: clueData ? {
        npcName: clueData.npcName,
        nextNPC: clueData.nextNPC,
        type: clueType
      } : null,
      currentDayMealsRemaining: remainingMeals,
      availableMealTypes: remainingMeals,
      nextDayUnlocked,
      shouldUnlockNextDay,
      currentDay: day,
      gameCompleted: finalGameCompleted, // 🔧 返回给前端
    });
  } catch (error) {
    await t.rollback();
    console.error("记录餐食错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "记录餐食失败", details: error.message });
  }
});

// 完成 NPC 交互
router.post("/complete-npc-interaction", async (req, res) => {
  try {
    const { playerId, day, npcId } = req.body;
    if (!playerId || !day || !npcId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const progressRecord = await PlayerProgress.findOne({
      where: { playerId, day },
    });

    if (progressRecord) {
      const hasAnyMeal = await hasRecordedAnyMealForDay(playerId, day);
      if (hasAnyMeal && !progressRecord.completedAt) {
        await progressRecord.update({ completedAt: new Date() });
      }
    }

    res.json({ success: true, message: "NPC interaction completed" });
  } catch (error) {
    console.error("Error completing NPC interaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete NPC interaction",
    });
  }
});

// 更新当前天数
router.post("/update-current-day", async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { playerId, currentDay } = req.body;

    if (!playerId || currentDay === undefined) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "Missing playerId or currentDay",
      });
    }

    const player = await Player.findOne({
      where: { playerId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!player) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, error: "Player not found" });
    }

    // 检查是否至少记录了1餐
    const hasRecordedAnyMeal = await hasRecordedAnyMealForDay(
      playerId,
      currentDay
    );
    if (!hasRecordedAnyMeal) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "Need to record at least one meal before advancing.",
        currentDay: player.currentDay,
      });
    }

    // 时间闸门
    const gate = await computeAdvanceGateStrictCalendar(
      playerId,
      currentDay,
      CROSS_DAY_WAIT_HOURS
    );
    if (!gate.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "Not time yet to advance.",
        canAdvanceAt: gate.canAdvanceAt || null,
        currentDay: player.currentDay,
        waitMs: gate.waitMs,
      });
    }

    // 推进天数
    const newDay = Math.min(currentDay + 1, 7);
    await player.update({ currentDay: newDay }, { transaction });

    // 确保新天的 progress 存在
    const nextNpcId = dayToNpcId(newDay);
    const exists = await PlayerProgress.findOne({
      where: { playerId, day: newDay },
      transaction,
    });
    if (!exists && nextNpcId) {
      await PlayerProgress.create(
        {
          playerId,
          day: newDay,
          npcId: nextNpcId,
          unlockedAt: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();
    return res.json({
      success: true,
      currentDay: newDay,
      serverConfirmed: true,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`[DayUpdateError] Player ${req.body.playerId}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to update current day",
      currentDay: req.body.playerId
        ? (await Player.findByPk(req.body.playerId))?.currentDay
        : null,
    });
  }
});

// 生成最终彩蛋
router.post("/generate-final-egg", async (req, res) => {
  let mealsSummary = [];
  try {
    const { playerId, language } = req.body;
    const lang = language === "zh" ? "zh" : "en";

    if (!playerId) {
      return res
        .status(400)
        .json({ success: false, error: "Player ID is required" });
    }

    const mealRecords = await MealRecord.findAll({
      where: { playerId },
      order: [
        ["day", "ASC"],
        ["recordedAt", "ASC"],
      ],
    });

    const conversationRecords = await ConversationHistory.findAll({
      where: { playerId },
      order: [["timestamp", "ASC"]],
    });

    if (mealRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No meal records found for this player",
      });
    }

    mealsSummary = mealRecords.map((r) => ({
      day: r.day,
      npcName: r.npcName,
      mealType: r.mealType,
      content: (r.mealContent || "").slice(0, MAX_MEAL_CONTENT_LENGTH),
      answers: r.mealAnswers,
      date: r.recordedAt,
    }));

    const statsData = {
      totalMeals: mealRecords.length,
      daysCompleted: new Set(mealRecords.map((m) => m.day)).size,
      favoriteNPC: getMostInteractedNPC(mealRecords),
      totalConversations: conversationRecords.length,
    };

    const byDay = new Map();
    for (const r of mealRecords) {
      const d = Number(r.day);
      const prev = byDay.get(d);
      if (
        !prev ||
        r.mealType === "dinner" ||
        (prev.mealType !== "dinner" && r.recordedAt > prev.recordedAt)
      ) {
        byDay.set(d, r);
      }
    }
    const compactMeals = Array.from(byDay.values())
      .sort((a, b) => a.day - b.day)
      .map((r) => ({
        day: r.day,
        mealType: r.mealType,
        text: (r.mealContent || "").slice(0, 160),
      }))
      .slice(0, 9);

    let egg;
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const prompt = generateFinalEggPrompt(mealsSummary, statsData, lang);

      const model = ai.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let rawText = await extractTextFromGemini(result);
      if (!rawText || !rawText.trim()) {
        const parts =
          result?.response?.candidates?.[0]?.content?.parts ||
          result?.candidates?.[0]?.content?.parts ||
          [];
        rawText =
          rawText ||
          parts
            .map((p) => (typeof p?.text === "string" ? p.text : ""))
            .join("")
            .trim();
      }

      function roughJsonRepair(s) {
        if (!s) return s;
        s = s
          .replace(/^\s*```json\s*/i, "")
          .replace(/\s*```\s*$/i, "")
          .trim();
        const first = s.indexOf("{");
        const last = s.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
          s = s.slice(first, last + 1);
        }
        return s;
      }

      let textForParse = roughJsonRepair(rawText);
      try {
        egg = JSON.parse(textForParse);
      } catch (e1) {
        const minor = textForParse.replace(/,\s*([}\]])/g, "$1");
        egg = JSON.parse(minor);
      }

      if (!egg || typeof egg !== "object") throw new Error("empty egg");
      egg.letter ??= "";
      egg.summary ??= [];
      egg.health ??= { positives: [], improvements: [] };
      egg.recipe ??= {
        title: "",
        servings: 1,
        ingredients: [],
        steps: [],
        tip: "",
      };
    } catch (apiError) {
      console.error("[Gemini] Error:", apiError);
      egg = buildLocalEgg(mealsSummary, lang);
    }

    await Player.update({ gameCompleted: true }, { where: { playerId } });

    return res.json({
      success: true,
      egg,
      mealsSummary,
      statsData,
    });
  } catch (outerErr) {
    console.error("Error generating final egg:", outerErr);
    const fallbackEgg = buildLocalEgg(mealsSummary, "en");
    return res.json({
      success: true,
      egg: fallbackEgg,
      mealsSummary,
      statsData: {},
    });
  }
});

// Gemini 健康检查
router.get("/gemini-health", async (req, res) => {
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });

    let text = "no-text";
    if (typeof result?.response?.text === "function") {
      text = await result.response.text();
    } else if (typeof result?.text === "string") {
      text = result.text;
    }

    res.json({ ok: true, text });
  } catch (e) {
    res.status(500).json({
      ok: false,
      err: String(e),
      code: e?.status || e?.code,
    });
  }
});

// 开发跳天功能
router.post("/dev/skip-to-day7", async (req, res) => {
  try {
    const { playerId } = req.body;

    if (process.env.NODE_ENV === "production") {
      return res
        .status(403)
        .json({ success: false, error: "DEV skip disabled in production" });
    }
    if (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!playerId) {
      return res
        .status(400)
        .json({ success: false, error: "Player ID is required" });
    }

    if (process.env.ALLOW_DEV_SKIP !== "true") {
      return res
        .status(403)
        .json({ success: false, error: "DEV skip is disabled" });
    }

    await Player.update({ currentDay: 7 }, { where: { playerId } });

    const days = [1, 2, 3, 4, 5, 6, 7];
    for (const d of days) {
      const base = {
        playerId,
        day: d,
        npcId: dayToNpcId(d),
        unlockedAt: new Date(),
      };

      if (d <= 6) {
        base.completedAt = new Date();
        base.mealsRecorded = 1;
        base.hasRecordedMeal = true;
      } else {
        base.completedAt = null;
        base.mealsRecorded = 0;
        base.hasRecordedMeal = false;
      }
      await PlayerProgress.upsert(base);
    }

    return res.json({ success: true, newDay: 7 });
  } catch (err) {
    console.error("[DEV] skip-to-day7 error:", err);
    return res.status(500).json({
      success: false,
      error: "skip-to-day7 failed",
      details: err.message,
    });
  }
});

// ==================== 对话历史API ====================

// 保存对话历史
router.post("/save-conversation", async (req, res) => {
  console.log("💾 [API] POST /save-conversation - 批量保存对话");
  
  try {
    const { playerId, npcId, conversationType, conversationData } = req.body;
    
    if (!playerId || !npcId || !conversationData || !conversationData.history) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: playerId, npcId, conversationData.history"
      });
    }

    const { history, day, mealType } = conversationData;
    
    // 🔧 关键改进：将对话历史逐条保存，以便于数据分析
    const savedRecords = [];
    for (const entry of history) {
      // entry 格式: { type: 'npc'|'user', content: '...', speakerName: '...' }
      const record = await ConversationHistory.create({
        playerId: playerId,
        npcId: npcId,
        day: day || 1,
        speaker: entry.type === 'user' ? 'player' : 'npc',
        content: entry.content,
        mealType: mealType || null,
        timestamp: new Date()
      });
      savedRecords.push(record.id);
    }
    
    console.log(`✅ 成功保存了 ${savedRecords.length} 条对话记录`);
    
    res.json({
      success: true,
      count: savedRecords.length,
      message: "Full conversation history saved successfully"
    });
    
  } catch (error) {
    console.error("❌ 保存对话历史失败:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取对话历史
router.get("/conversation-history", async (req, res) => {
  console.log("📚 [API] GET /conversation-history");
  
  try {
    const { playerId, npcId, limit = 5 } = req.query;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: playerId"
      });
    }
    
    // 构建查询条件
    const where = { playerId };
    if (npcId) {
      where.npcId = npcId;
    }
    
    // 查询对话历史
    const conversations = await ConversationHistory.findAll({
      where: where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit)
    });
    
    console.log(`✅ 找到 ${conversations.length} 条对话记录`);
    
    res.json({
      success: true,
      count: conversations.length,
      history: conversations
    });
    
  } catch (error) {
    console.error("❌ 获取对话历史失败:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ----------------------------------------------------------------
// 🔧 终极报告生成接口 (从 geminiRoutes 迁移至此以确保路由 100% 通畅)
// ----------------------------------------------------------------
router.post("/generate-final-report", async (req, res) => {
  const { playerId } = req.body;
  console.log(`📜 [Backend] 正在为玩家 ${playerId} 生成总结报告...`);
  
  try {
    // 1. 获取玩家所有餐食记录
    const meals = await MealRecord.findAll({
      where: { playerId },
      order: [['day', 'ASC'], ['recordedAt', 'ASC']]
    });

    if (!meals || meals.length === 0) {
      return res.status(404).json({ success: false, error: "未找到任何餐食记录，无法生成报告。" });
    }

    // 2. 准备数据
    const mealSummary = meals.map(m => `Day ${m.day} - ${m.mealType}: ${m.mealContent || "No data"}`).join("\n");

    // 3. 构建提示词 (Master Chef Hua 视角)
    const prompt = `You are Master Chef Hua. Your apprentice has completed 7 days of food journaling.
    Please write a final heartwarming and wise letter to them. 
    Summarize their habits and give specific advice based on these records:
    
    DATA:
    ${mealSummary}
    
    REQUIREMENTS:
    - Language: Provide BOTH Chinese and English.
    - Format: JSON
    - Structure: { "title": {"en": "..", "zh": ".."}, "letterBody": {"en": "..", "zh": ".."}, "wisdom": {"en": "..", "zh": ".."}, "signature": {"en": "..", "zh": ".."} }`;

    // 4. 初始化 Gemini (内部动态导入防止加载失败)
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // 清理并解析 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const report = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!report) throw new Error("AI 响应格式解析失败");

    res.json({ success: true, report });

  } catch (error) {
    console.error("❌ 生成报告失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;