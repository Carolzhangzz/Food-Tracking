// server/routes/gameRoutes.js
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Player = require("../models/Player");
const PlayerProgress = require("../models/PlayerProgress");
const MealRecord = require("../models/MealRecord");
const GameSession = require("../models/GameSession");
const AllowedId = require("../models/AllowedId");
const Clue = require("../models/Clue"); // 线索
const ConversationHistory = require("../models/ConversationHistory"); // 对话历史
const sequelize = require("../db");
const {
  generateFinalEggPrompt,
  generateFinalEggPromptPlayerOnly,
} = require("../utils/finalEggPrompt");
const { buildLocalEgg } = require("../utils/eggLocal");

const MAX_MEAL_CONTENT_LENGTH = 200;

// 解锁模式：严格“次日 00:00”才能推进（默认）
// 若想切回 “若干小时后可推进”，把 NEXT_DAY_UNLOCK_MODE=hours 并设置 CROSS_DAY_WAIT_HOURS
const NEXT_DAY_UNLOCK_MODE = process.env.NEXT_DAY_UNLOCK_MODE || "calendar";
const CROSS_DAY_WAIT_HOURS = Number(process.env.CROSS_DAY_WAIT_HOURS || 24);

/* --------------------------------- 工具函数 -------------------------------- */

async function hasRecordedAnyMealToday(playerId, day) {
  const anyMeal = await MealRecord.findOne({ where: { playerId, day } });
  return !!anyMeal;
}

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

// 计算“次日 00:00”
function nextMidnight(ts = new Date()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

// 只要有一餐就视为“今天已完成”
async function hasCompletedTodaysMeals(playerId, day) {
  const meals = await MealRecord.findAll({
    where: { playerId, day },
    attributes: ["mealType"],
  });
  const set = new Set(meals.map((m) => m.mealType));
  return set.size >= 1; // ← 关键：一天一餐就满足“当天可推进”的条件
}

// 找“最后一餐”（部分统计可能用到，保留）
async function getLastMealRecord(playerId, day) {
  return await MealRecord.findOne({
    where: { playerId, day },
    order: [["recordedAt", "DESC"]],
  });
}

// 时间闸门（严格次日 00:00 或若用小时制则基于第一餐时间 + waitHours）
async function computeAdvanceGateStrictCalendar(
  playerId,
  day,
  waitHours = CROSS_DAY_WAIT_HOURS
) {
  const first = await MealRecord.findOne({
    where: { playerId, day },
    order: [["recordedAt", "ASC"]],
  });
  if (!first) return { allowed: false, reason: "no_meal" };

  const base = first.recordedAt || first.createdAt || new Date();
  let canAdvanceAt;
  if (NEXT_DAY_UNLOCK_MODE === "calendar") {
    // 次日 00:00
    const nextMidnight = (d) => {
      const x = new Date(d);
      x.setHours(24, 0, 0, 0);
      return x;
    };
    canAdvanceAt = nextMidnight(base);
  } else {
    // 按小时
    canAdvanceAt = new Date(base.getTime() + waitHours * 3600 * 1000);
  }
  const now = new Date();
  if (now >= canAdvanceAt) return { allowed: true, canAdvanceAt };
  return {
    allowed: false,
    reason: "waiting_for_time",
    canAdvanceAt,
    waitMs: canAdvanceAt - now,
  };
}

// 读取玩家全部线索，并把同一行内的 stage1/2/3 拆成多条
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
      let json;
      try {
        json = JSON.parse(clue.clueText);
      } catch {
        json = { stage3: clue.clueText }; // 历史纯文本按 stage3
      }

      const map = [
        { key: "stage1", stage: 1 },
        { key: "stage2", stage: 2 },
        { key: "stage3", stage: 3 },
      ];

      for (const { key, stage } of map) {
        const text = json[key];
        if (!text) continue;

        out.push({
          id: `${clue.npcId}_${clue.day}_${stage}`,
          npcId: clue.npcId,
          npcName: getNPCName(clue.npcId),
          clue: text,
          day: clue.day,
          stage,
          receivedAt: clue.receivedAt,
        });
      }
    }
    return out;
  } catch (error) {
    console.error("获取玩家线索错误:", error);
    return [];
  }
}

function getNPCName(npcId) {
  const npcNames = {
    village_head: "村长伯伯",
    shop_owner: "店主阿桂",
    spice_woman: "香料婆婆",
    restaurant_owner: "餐厅店长老韩",
    fisherman: "渔夫阿梁",
    old_friend: "林川",
    secret_apprentice: "念念",
  };
  return npcNames[npcId] || "Unknown NPC";
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

/* --------------------------------- 路由 ----------------------------------- */

// 登录
router.post("/login", async (req, res) => {
  try {
    const { playerId } = req.body;
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
      player = await Player.create({
        playerId,
        firstLoginDate: new Date(),
        currentDay: 1,
        gameCompleted: false,
        language: "en",
      });

      await PlayerProgress.create({
        playerId,
        day: 1,
        npcId: "village_head",
        unlockedAt: new Date(),
      });
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

// 玩家状态（含 nextAdvanceAt：次日 00:00）
// 玩家状态（含 nextAdvanceAt：次日 00:00 或等待小时）
router.post("/player-status", async (req, res) => {
  const { playerId } = req.body || {};
  if (!playerId)
    return res.status(400).json({ success: false, error: "缺少 playerId" });

  try {
    const player = await Player.findOne({ where: { playerId } });
    if (!player)
      return res.status(404).json({ success: false, error: "玩家未找到" });

    const currentDay = Number(player.currentDay) || 1;

    // 进度、餐食、线索
    let progresses = await PlayerProgress.findAll({ where: { playerId } }).then(
      (rs) => rs.map((r) => r.get({ plain: true }))
    );
    const mealRecords = await MealRecord.findAll({ where: { playerId } }).then(
      (rs) => rs.map((r) => r.get({ plain: true }))
    );
    const clueRecords = await getPlayerClues(playerId);

    // 兜底：当前天未解锁则创建
    const npcMap = {
      1: "village_head",
      2: "shop_owner",
      3: "spice_woman",
      4: "restaurant_owner",
      5: "fisherman",
      6: "old_friend",
      7: "secret_apprentice",
    };
    if (!progresses.some((p) => Number(p.day) === currentDay)) {
      const npcId = npcMap[currentDay];
      if (npcId) {
        await PlayerProgress.create({
          playerId,
          day: currentDay,
          npcId,
          unlockedAt: new Date(),
        });
        // 重新读取一次
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

    // 仅渲染 currentDay 的交互；去掉“完成=锁死”的概念
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
        hasCompletedDay: false, // 不用“完成”限制对话
        hasRecordedMeal: meals.length > 0,
        mealsRecorded: meals.length,
        availableMealTypes: remaining, // 仅用于显示还剩哪些餐
        isCurrentDay: dayNum === currentDay,
        canInteract: dayNum === currentDay && !!p.unlockedAt,
      };
    });

    // 计算“能否切到下一天”：需要 ≥1 餐 + 时间闸门允许
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

    // 统计
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

// ✅ 新增：辅助函数 - 检查是否至少记录了1餐
async function hasRecordedAnyMealForDay(playerId, day) {
  const anyMeal = await MealRecord.findOne({
    where: { playerId, day },
  });
  return !!anyMeal;
}

// ✅ 修改：computeAdvanceGateStrictCalendar 函数
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

// 保存对话历史
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

// 记录餐食（不做跨天推进）
router.post("/record-meal", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      playerId,
      day,
      npcId,
      npcName,
      mealType,
      mealAnswers,
      conversationHistory,
      mealContent,
    } = req.body;

    if (!playerId || !day || !npcId || !mealType || !mealContent) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "缺少必要字段" });
    }

    const player = await Player.findOne({
      where: { playerId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!player) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "玩家未找到" });
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
        npcName,
        mealType,
        mealAnswers,
        conversationHistory,
        mealContent,
      },
      { transaction: t }
    );

    // 更新当日统计（如需要）
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

    // 发放线索（按 breakfast/lunch/dinner 阶段）
    let shouldGiveClue = false;
    let clueText = null;
    let mealStage = null;
    const playerLanguage = player.language || "en";

    if (["breakfast", "lunch", "dinner"].includes(mealType)) {
      shouldGiveClue = true;
      mealStage = mealType === "breakfast" ? 1 : mealType === "lunch" ? 2 : 3;
      clueText = getClueForNPCStage(npcId, playerLanguage, mealStage);
      await saveClueToDatabase(
        playerId,
        npcId,
        clueText,
        day,
        mealStage,
        mealType
      );
    }

    // ✅ 不立刻切天，但可以“预创建”下一天的 progress（防止第二天时缺表）
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
      // 仅作为标记返回给前端：下一天已就绪，但不应显示（因为 currentDay 还没变）
      nextDayUnlocked = true;
      shouldUnlockNextDay = true;
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
      availableMealTypes: ["breakfast", "lunch", "dinner"].filter(
        (t) => t !== mealType
      ),
      nextDayUnlocked, // 仅表示后端已准备好 nextDay 的 progress
      shouldUnlockNextDay, // 供前端弹个 toast 用，不要据此切天或展示 nextDay
      currentDay: day, // 关键：保持当天，不要提前！
    });
  } catch (error) {
    await t.rollback();
    console.error("记录餐食错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "记录餐食失败", details: error.message });
  }
});

// 🔧 新增：检查是否至少记录了1餐的辅助函数
async function hasRecordedAnyMealForDay(playerId, day) {
  const anyMeal = await MealRecord.findOne({
    where: { playerId, day },
  });
  return !!anyMeal;
}

// 🔧 修复：dayToNpcId 辅助函数确保正确映射

function dayToNpcId(day) {
  const map = {
    1: "village_head",
    2: "shop_owner",
    3: "spice_woman",
    4: "restaurant_owner",
    5: "fisherman",
    6: "old_friend",
    7: "secret_apprentice",
  };
  return map[day] || "village_head";
}

// 完成 NPC 交互（保持：若今日已完成则打上 completedAt，不推进日数）
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
      const done = await hasCompletedTodaysMeals(playerId, day);
      if (done && !progressRecord.completedAt) {
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

// 生成最终彩蛋（保留）
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

    // 选每一天的一条（优先 dinner）
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
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = generateFinalEggPrompt(mealsSummary, statsData, lang);

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
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

// Gemeni 健康检查（保留）
router.get("/gemini-health", async (req, res) => {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

// 开发跳 7 天（保留）
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

//
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

    // 条件1：当天至少记录 1 餐
    const hasRecordedAnyMeal = await hasRecordedAnyMealToday(
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

    // 条件2：时间闸门（次日00:00 或 等待小时）
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

    // 真正推进 day（不超过 7）
    const newDay = Math.min(currentDay + 1, 7);
    await player.update({ currentDay: newDay }, { transaction });

    // 兜底：确保 newDay 的 progress 存在
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

/* ----------------------------- 其它小工具 ----------------------------- */

function getMostInteractedNPC(mealRecords) {
  const npcCounts = {};
  mealRecords.forEach((meal) => {
    npcCounts[meal.npcName] = (npcCounts[meal.npcName] || 0) + 1;
  });

  let maxCount = 0;
  let favoriteNPC = "村长伯伯";

  Object.entries(npcCounts).forEach(([npc, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteNPC = npc;
    }
  });

  return favoriteNPC;
}

function dayToNpcId(day) {
  const map = {
    1: "village_head",
    2: "shop_owner",
    3: "spice_woman",
    4: "restaurant_owner",
    5: "fisherman",
    6: "old_friend",
    7: "secret_apprentice",
  };
  return map[day] || "village_head";
}

// 获取NPC线索文本（分阶段）
function getClueForNPCStage(npcId, language = "en", stage = 1) {
  const L = (zh, en) => (language === "zh" ? zh : en);

  const lines = {
    // Day1 - village_head
    village_head: {
      1: L(
        "你师父以前有个总爱去的地方……嗯，是哪里来着？哎，老了老了。哦，时候到了，我得去备下一餐的材料了。过几个小时再来吧，也许我会想起点什么。",
        "Your master used to have a place he visited all the time...\nHmm, where was it again?\nAh, my memory's not what it used to be.\nOh! It's time for me to prep for my next meal. Come back in a few hours. Maybe something will come back to me."
      ),
      2: L(
        "我记起来他常去看一位女人……唔，她是谁来着？再给我一点时间——等你吃完今天的最后一餐，我们再聊。",
        "I remember he always visited a woman...\nHmm, who was she again?\nGive me a bit more time — let's talk again after you've finished your last meal of the day."
      ),
      3: L(
        "干得好！继续这样做。一点一点地，你会开始理解——他当时在想什么，他在隐藏什么。\n不需要着急。这不是你可以强迫的事情——一次吃一顿饭就好。\n他经常去阿桂的杂货铺买食材。他和华主厨认识很久了。也许你能从她那里得到一些线索。",
        "Good job! Keep doing this. Little by little, you'll start to understand—what he was thinking back then, and what he was hiding.\nNo need to rush. This isn't something you can force—just take it one meal at a time.\nHe often stopped by Grace's shop for ingredients. He and Chef Hua go way back. Maybe you will get some insights from her."
      ),
    },

    // Day2 - shop_owner
    shop_owner: {
      1: L(
        "听你这么细细地讲真不错。我很想念和华主厨聊各种美食、聊那些让菜肴特别的小食材的日子。\n我会在这等你下一餐后再来，也许那时我会想得更清楚。",
        "It’s nice hearing you share in such detail. I miss talking to Chef Hua about all things food, and all the little ingredients that make a dish special.\nI’ll still be here till your next meal, so come back after that. Maybe then, the pieces will make more sense."
      ),
      2: L(
        "我一直在努力回想他当时说的关于绿木籽的话，就在嘴边……\n等你吃完今天的最后一顿饭，我们再聊。也许那味道会回来。",
        "I keep trying to remember exactly what he said about the greenwood seeds. It’s right on the tip of my tongue.\nLet’s talk again after you’ve wrapped up your eating for the day. Maybe the taste will come back to me."
      ),
      3: L(
        "啊，我想起来了——那天他做了一道用绿木籽的汤。味道绝了。我后来一直想重做，可从没成功……也不知道他还加了什么。\n冰箱里还有一些。去吧，尝尝。但别只是吃——想一想，你怎么吃，你为什么吃。这就是你师父的做事方式。\n里面有一种味道……我敢肯定是来自香料婆婆的店。你该去找她。",
        "Ah, I remember now—he made a soup with greenwood seeds that day. Tasted incredible. I’ve tried to make it since, but I never got it right… No idea what else he put in there.\nThere’s still some left in my fridge. Go ahead, give it a try. But don’t just eat it—think about it. How you’re eating, why you’re eating. That’s how your master did things.\nThere’s a certain flavour in there… I swear it came from Spice Granny’s shop. You should pay her a visit."
      ),
    },

    // Day3 - spice_woman
    spice_woman: {
      1: L(
        "你知道…我这儿客人来来往往。有的只买基本的黑白胡椒，有的像华主厨一样追求大胆独特的味道。\n总之，很高兴和你聊天。但等你下一餐后再来吧，我也会尽量回忆更多有关华主厨的事。",
        "You know... I have a lot of customers coming and going. Some just pick up the basics, black and white pepper. Some go for bold and unique flavors, like Chef Hua.\nAnyways, it's nice talking to you, but come back after your next meal, and meanwhile I'll try to recall some more details about Chef Hua."
      ),
      2: L(
        "我一直在想华主厨最近在做什么。你知道，他的菜总有一丝神秘感——他从不满足，总在尝试新东西。\n或许有迹可循，但我觉得你从香料中能学到的毕竟有限。\n如果有其他关联……也许还有别的线索值得跟。\n几个小时后再来吧。回忆这些事意外地挺有趣。如果我想起了什么，还会告诉你。",
        "I've been trying to think of what Chef Hua's been doing. You know how his cooking always had that touch of mystery—he was never satisfied, always trying something new.\nSure there might be a tell-tale sign, but I feel like you can only learn so much from spices.\nBut if there were other connections... there might be other threads worth following.\nWhy don't you come back in a few hours? It's been surprisingly fun retrieving these memories. I'll still be here if anything comes to mind."
      ),
      3: L(
        "不错——你已经记起了不少细节。\n哦，对了，差点忘了。韩前几天也来过。他满脸笑容、说话客气，但你能看出来——那人满肚子坏水。\n他来可不是为了味道。言外之意，他是在打听你师父的灵魂香料。",
        "Not bad — you've recalled quite a bit of details.\nOh right, that reminds me. Han stopped by a couple days ago too.\nHe came in all smiles, talkin' nice, but you could tell — the guy's got nothin' but tricks up his sleeve.\nHe wasn't here for flavor. Between the lines, he was asking about your master's soul spice."
      ),
    },

    // Day4 - restaurant_owner
    restaurant_owner: {
      1: L(
        "啊，该准备了……下一波饭点马上到了。这样吧，等你下一餐后我们再聊……如果你还想知道更多的话。",
        "Ah, time to prep... next meal rush is just around the corner. Tell you what, come back after your next meal and we’ll talk more... if you’re still curious."
      ),
      2: L(
        "我有没有跟你提过我们的矛盾？是啊……矛盾不断累积。直到有一天，我们都觉得这样下去不行了。最后，他走了，从不回头。只留给我这个和一个没人记得的名字。\n我留下来，经营这地方……没发财，但也活下来了。对家人来说，足够了，也没什么好再奢求的。\n今天还没结束，我猜你还有别的要尝。等你都完成了，我们再把话说完。",
        "Did I tell you about our conflict? Yes... Conflict built up. Until one day, none of us think this could work anymore. In the end, he walked. Never looked back. Left me with this and a name no one remembered.\nI stayed. I ran this place… Didn’t get rich, but I’m surviving. Enough for my family, I guess. Nothing to ask for more.\nThere’s still time left in the day, and I’m guessing you’ve got more to taste. Once you’ve seen it through, then we can finish this conversation."
      ),
      3: L(
        "那么，现在你了解他了吗？你师父……唉，对我来说无所谓。我早就放下了。但有一件事——他的鱼粥，从不让我碰。也许他觉得我会把它变成菜单上的普通菜。\n那清水河……在村子西边。他只在那里取过一种食材，而且总是去找同一个人——那个沉默的渔夫。\n每次你师父做鱼粥，都会先去找他。我自己试过问，他一句话都不肯说。但如果你能让他说出来……别忘了回来告诉我。",
        "So, do you get him now? Your master... Eh, doesn’t matter to me. I’m too old to hold onto all that. Let it go long ago. But there’s one thing — that fish porridge of his. Never let me touch it. Maybe he thought I’d turn it into just another item on the menu.\nThat Clearwater River…. West of the village. He only took one ingredient there. Always.\nAsk the fisherman. That silent one. Every time your master made fish porridge, he went to him first. I tried asking the guy myself. He wouldn’t say a word. But if you get something out of him… Don’t forget to come back. Tell me what he told you."
      ),
    },

    // Day5 - fisherman
    fisherman: {
      1: L(
        "听起来你吃得比我还丰盛啊？哦，我知道你是谁了。好久不见，不是吗？没想到还能见到你。你长大了，很明显。\n我只是个渔夫，一直都是。但这些年，你师父和我——我们在这河边分享过不少故事。\n其实该回家了……不过我猜你是有原因才来的吧？等会儿再来，我们再聊聊。",
        "Sounds like your meals are richer than mine, eh? Oh, I know who you are. It’s been a long time, hasn’t it? I didn’t think I’d see you again. You’ve grown. That much is clear.\nI’m just a fisherman. Always have been. But over the years, your master and I—well, we shared more than a few stories over meals by this river.\nActually, time for me to head back home… But I’m guessing you came back for a reason eh? Come back and let’s catch up more."
      ),
      2: L(
        "想知道你师父最近在干什么？他一直默默地帮村子——为最需要的人做大餐，即使这意味着牺牲自己的舒适。\n但他离开的原因……我真说不出来。无论是什么，肯定重要到让他在多年为村子奉献后毅然离开。\n我知道你还有别的事，不会整天坐在这陪我。去吧——慢慢来。等你完成后再回来，也许那时一切会更清晰。",
        "Wanna know what your master’s been up to? Lately, he’s been quietly helping the village however he can. Cooking big meals for those who need it most, even if it means giving up his own comforts.\nBut the reason he left… I really can’t say. Whatever it was, it must have mattered enough for him to walk away from this village he served so faithfully, after all those years.\nI know you’ve got more to do than sit here with me all day. Go on—take your time. When you’ve finished what you need to, come back and sit a while. Maybe then the picture will be clearer."
      ),
      3: L(
        "让我想起——你还记得罗文吗？我记得你们小时候为鱼粥的做法吵过。他说先下米，你说先汆鱼。我在场，这事一直让我觉得有趣。\n他还在，就住在林子那边，过了河。\n我猜你们很久没说话了吧？你和罗文——他可是你师父最早的徒弟。",
        "Makes me think—do you still remember Rowan? I remember you two arguing over fish congee when you were kids. He swore the rice should go in first. You said to blanch the fish before anything else. I was there. That always cracked me up.\nHe’s still around, you know. Lives just past the grove, across the river. I reckon it’s been a while since you last talked? You and Rowan, the very first of his apprentices."
      ),
    },

    // Day6 - old_friend
    old_friend: {
      1: L(
        "好吧，不耽误你了。改天再聊。你今天的事不少，但总有一天，我想为你做顿饭。\n等你完成这趟“小任务”后，我们来场家庭厨房对决——哈哈！\n去忙你的吧，记得下顿饭后再来告诉我。",
        "All right, I won't keep you any longer. We'll catch up another time.\nYou've got your hands full today, but someday, I'd love to cook for you.\nMaybe after you're done with your little 'mission,' we can have a home kitchen showdown—ha ha!\nGo on with what you need to do, and be sure to come back and tell me about your next meal!"
      ),
      2: L(
        "不错！但如果你只记录了一部分，那只是讲了半天的故事。\n等你完成最后一顿饭，再来和我分享。那才是精彩的地方！",
        "Not bad! But if you only log part of your day, you're only telling half the story.\nFinish your last meal, then come share it with me. That's when the good stuff comes out!"
      ),
      3: L(
        "我知道你这么多年后为什么来了。但你要找的——不在我这。\n去年，华主厨收了个年轻徒弟。她比我们任何人都懂他。他从不让她按官方食谱做——不严格称量，不‘加正好20克这个那个’。\n他说要凭直觉做，让情绪、时刻、周遭的世界去塑造这道菜。\n她叫米拉，住在村子尽头的木亭里。去找她吧——也许她有你要的东西。",
        "I know why you're here after all these years. But what you're looking for — it's not with me.\nLast year, Master Hua took on a young apprentice. She understood him better than either of us ever did. He never had her follow any official recipes. No strict measurements, no 'add exactly 20 grams of this or that.' He told her to cook with instinct, to let the mood, the moment, and the world around her shape the dish.\nHer name's Mira. Lives out in that wooden pavilion at the edge of the village. Go find her — she might have what you're looking for."
      ),
    },

    // Day7 - secret_apprentice
    secret_apprentice: {
      1: L(
        "你来到了这里，我真高兴！你已经看到了很多——我能看出来。但相信我……最好的总是在最后。我不是想骗你，真的！这是师父常说的话。\n祝你好运。我会一直在这里……保证不会走！",
        "You find yourself here, and I’m so glad you came! You’ve already seen so much—I can tell. But trust me… the best always comes at the end. I’m not trying to fool you, promise! That’s just what Master always says.\nAnyway, best of luck out there. I’ll be right here… and I promise, I’m not going anywhere!"
      ),
      2: L(
        "喜欢！但师父总说，最后一顿饭才最能说明这一天的感觉。\n去完成它，然后回来找我。我想听听剩下的。",
        "Love it! But Master always said the last meal tells the most about how a day truly felt.\nGo finish, then come back to me. I want to hear the rest."
      ),
      3: L(
        "哇！你比我预想的更用心地吃了。师父会为你骄傲——真的。\n一周前，师父来过，在我阁楼里留了个箱子。说你给他写信——想在你回村时见他。但他去追寻他必须做的事了……所以留下了这个箱子。\n看看你……你真的找到了！去吧，打开它。我一直想知道里面是什么。",
        "Wow! You really ate with more thought than I expected. Master would’ve been proud — seriously.\nA week ago, Master came by and left a box up in my attic. Said you’d written him — wanted to see him when you got back to the village. But he was off chasing whatever it was he felt he had to do… so he left the box instead.\nAnd look at you… you actually found it! Go on, open it. I’ve been dying to know what’s inside all this time."
      ),
    },
  };

  const npcLines = lines[npcId] || {};
  return npcLines[stage] || npcLines[3] || L("做的好。", "Great Job.");
}

// 完成NPC交互
//【FOR STAGES】
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
      const done = await hasCompletedTodaysMeals(playerId, day); // ← 是否已有晚餐
      if (done && !progressRecord.completedAt) {
        await progressRecord.update({ completedAt: new Date() });
      }
    }

    res.json({
      success: true,
      message: "NPC interaction completed",
    });
  } catch (error) {
    console.error("Error completing NPC interaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete NPC interaction",
    });
  }
});

// 生成最终彩蛋 - 更新以使用完整的餐食和对话历史
router.post("/generate-final-egg", async (req, res) => {
  let mealsSummary = []; // 供本地兜底用
  try {
    const { playerId, language } = req.body;
    const lang = language === "zh" ? "zh" : "en";

    if (!playerId) {
      return res
        .status(400)
        .json({ success: false, error: "Player ID is required" });
    }

    // 1) 拉数据
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

    console.log("[/generate-final-egg] records=", {
      meals: mealRecords.length,
      conversations: conversationRecords.length,
      days: Array.from(new Set(mealRecords.map((m) => m.day))).length,
      sampleMealsHead: mealRecords
        .slice(0, 2)
        .map((r) => ({ day: r.day, mealType: r.mealType })),
    });

    if (mealRecords.length === 0) {
      console.warn(
        "[/generate-final-egg] No meal records found, returning 400"
      );
      return res.status(400).json({
        success: false,
        error: "No meal records found for this player",
      });
    }

    // 2) 组装原有的 mealsSummary（给兜底用，不传给模型）
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

    // 3) 只关注玩家输入：为每一天挑一条（优先 dinner），并截断文本，最多 9 条
    const byDay = new Map();
    for (const r of mealRecords) {
      const d = Number(r.day);
      const prev = byDay.get(d);
      // 优先选择 dinner；否则保留已有/最后一条
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
        text: (r.mealContent || "").slice(0, 160), // 截断，避免超长
      }))
      .slice(0, 9); // 控制体量

    console.log(
      "[/generate-final-egg] compactMeals.count =",
      compactMeals.length,
      "sample =",
      compactMeals.slice(0, 2)
    );

    // 4) 调 LLM（失败则本地兜底）
    let egg;
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = generateFinalEggPrompt(mealsSummary, statsData, lang);

      // ★ 用 generationConfig，强制 JSON 输出 & 提高上限，避免 MAX_TOKENS
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      });

      // —— 诊断：SDK 返回结构 —— //
      console.log(
        "[/generate-final-egg] result keys:",
        Object.keys(result || {})
      );
      console.log(
        "[/generate-final-egg] response keys:",
        Object.keys(result?.response || {})
      );

      let rawText = await extractTextFromGemini(result);
      if (!rawText || !rawText.trim()) {
        // 有些 SDK 在 responseMimeType=json 时，把 JSON 放在 parts[0].text 之外
        // 再兜一次 candidates->content->parts
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

      // ★ 输出原始返回，方便排查（截断到 2000 字）
      console.log("[Gemini][RAW]", (rawText || "").slice(0, 2000));

      // ★ 轻量修复：去掉 ```json 包裹 & 裁剪到最外层 {}
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
        console.warn(
          "[Gemini] JSON.parse failed once, try minor comma fix…",
          e1?.message
        );
        console.warn(
          "[Gemini] textForParse.head =",
          textForParse?.slice?.(0, 400)
        );
        console.warn(
          "[Gemini] textForParse.tail =",
          textForParse?.slice?.(-400)
        );
        // ★ 再给一次机会：去掉行尾多余逗号
        const minor = textForParse.replace(/,\s*([}\]])/g, "$1");
        egg = JSON.parse(minor);
      }

      // ★ 最终做个结构兜底，避免 key 缺失导致前端报错
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
      const code = apiError?.status || apiError?.code;
      if (code === 401 || code === 403) {
        console.error("[Gemini] Auth/permissions error:", apiError);
      } else if (code === 429) {
        console.error("[Gemini] Quota exceeded:", apiError);
      } else {
        console.error("[Gemini] Other error or JSON parse error:", apiError);
      }
      egg = buildLocalEgg(mealsSummary, lang);
    }
    // 5) 标记完成 & 返回
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

// Add this new helper (near the helpers section)
async function getLastMealRecord(playerId, day) {
  return await MealRecord.findOne({
    where: { playerId, day },
    order: [["recordedAt", "DESC"]],
  });
}

// NEW: 计算跨天等待门槛
// 默认等待8小时（跨天）
async function computeAdvanceGate(
  playerId,
  day,
  waitHours = CROSS_DAY_WAIT_HOURS
) {
  const last = await getLastMealRecord(playerId, day);
  if (!last) return { allowed: false, reason: "no_meal" };
  const base = last.recordedAt || last.createdAt || new Date();
  const canAdvanceAt = new Date(base.getTime() + waitHours * 3600 * 1000);
  const now = new Date();
  if (now >= canAdvanceAt) return { allowed: true, canAdvanceAt };
  return {
    allowed: false,
    reason: "wait",
    canAdvanceAt,
    waitMs: canAdvanceAt - now,
  };
}

// 辅助函数：找出最常互动的NPC
function getMostInteractedNPC(mealRecords) {
  const npcCounts = {};
  mealRecords.forEach((meal) => {
    npcCounts[meal.npcName] = (npcCounts[meal.npcName] || 0) + 1;
  });

  let maxCount = 0;
  let favoriteNPC = "村长伯伯";

  Object.entries(npcCounts).forEach(([npc, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteNPC = npc;
    }
  });

  return favoriteNPC;
}

// 生成备用彩蛋
function generateFallbackEgg(statsData, language) {
  if (language === "zh") {
    return `亲爱的徒弟，

虽然我不在身边，但通过这7天${statsData.totalMeals}顿餐食的记录，我看到了你对美食和生活的用心。每一顿饭都是一个故事，每一次与${statsData.favoriteNPC}等村民的对话都是一次成长。

你用心记录的${statsData.daysCompleted}天时光，让我看到了一个真正理解"食物即生活"的厨师。真正的烹饪秘诀不在于复杂的技巧，而在于用心对待每一餐，就像你这七天所做的那样。

每一次对话、每一顿记录，都在告诉我：你已经明白了烹饪的真谛——不仅是制作食物，更是用心生活。

继续用爱烹饪，用心生活。你已经成为了一名真正的厨师。

——你永远的师父`;
  } else {
    return `Dear apprentice,

Although I'm not by your side, through these 7 days and ${statsData.totalMeals} meal records, I see your dedication to food and life. Every meal is a story, every conversation with ${statsData.favoriteNPC} and other villagers is growth.

Your thoughtful recording of ${statsData.daysCompleted} days shows me a chef who truly understands "food is life." The real secret of cooking lies not in complex techniques, but in treating every meal with heart, just as you have done.

Every conversation, every record, tells me: you understand the essence of cooking—not just making food, but living with intention.

Continue cooking with love and living with heart. You have become a true chef.

—— Your eternal master`;
  }
}

module.exports = router;

router.get("/gemini-health", async (req, res) => {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });

    let text = "no-text";
    if (typeof result?.response?.text === "function") {
      text = await result.response.text(); // ✅ 这里加 await
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

router.post("/dev/skip-to-day7", async (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) {
      return res
        .status(400)
        .json({ success: false, error: "Player ID is required" });
    }

    // 用环境变量控制，避免生产误用
    if (process.env.ALLOW_DEV_SKIP !== "true") {
      return res
        .status(403)
        .json({ success: false, error: "DEV skip is disabled" });
    }

    // 1) 玩家 currentDay 设为 7（不改 gameCompleted）
    await Player.update({ currentDay: 7 }, { where: { playerId } });

    // 2) PlayerProgress：1-6 天完成；第 7 天解锁未完成
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

      // upsert：模型已做 underscored 映射，驼峰写法即可
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

function dayToNpcId(day) {
  const map = {
    1: "village_head",
    2: "shop_owner",
    3: "spice_woman",
    4: "restaurant_owner",
    5: "fisherman",
    6: "old_friend",
    7: "secret_apprentice",
  };
  return map[day] || "village_head";
}
