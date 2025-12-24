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

const MAX_MEAL_CONTENT_LENGTH = 200;

// 解锁模式：严格"次日 00:00"才能推进（默认）
const NEXT_DAY_UNLOCK_MODE = process.env.NEXT_DAY_UNLOCK_MODE || "calendar";
const CROSS_DAY_WAIT_HOURS = Number(process.env.CROSS_DAY_WAIT_HOURS || 24);

/* --------------------------------- 工具函数 -------------------------------- */

// NPC ID 映射
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

// NPC 名称映射
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

// 读取玩家全部线索（拆分 stage1/2/3）
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
  const L = (zh, en) => (language === "zh" ? zh : en);

  const lines = {
    village_head: {
      1: L(
        "你师父以前有个总爱去的地方……嗯, 是哪里来着？哎, 老了老了。哦, 时候到了, 我得去备下一餐的材料了。过几个小时再来吧, 也许我会想起点什么。",
        "Your master used to have a place he visited all the time...\nHmm, where was it again?\nAh, my memory's not what it used to be.\nOh! It's time for me to prep for my next meal. Come back in a few hours. Maybe something will come back to me."
      ),
      2: L(
        "我记起来他常去看一位女人……唔, 她是谁来着？再给我一点时间——等你吃完今天的最后一餐, 我们再聊。",
        "I remember he always visited a woman...\nHmm, who was she again?\nGive me a bit more time — let's talk again after you've finished your last meal of the day."
      ),
      3: L(
        "干得好！继续这样做。一点一点地, 你会开始理解——他当时在想什么, 他在隐藏什么。\n不需要着急。这不是你可以强迫的事情——一次吃一顿饭就好。\n他经常去阿桂的杂货铺买食材。他和华主厨认识很久了。也许你能从她那里得到一些线索。",
        "Good job! Keep doing this. Little by little, you'll start to understand—what he was thinking back then, and what he was hiding.\nNo need to rush. This isn't something you can force—just take it one meal at a time.\nHe often stopped by Grace's shop for ingredients. He and Chef Hua go way back. Maybe you will get some insights from her."
      ),
    },

    shop_owner: {
      1: L(
        "听你这么细细地讲真不错。我很想念和华主厨聊各种美食, 聊那些让菜肴特别的小食材的日子。\n我会在这等你下一餐后再来, 也许那时我会想得更清楚。",
        "It's nice hearing you share in such detail. I miss talking to Chef Hua about all things food, and all the little ingredients that make a dish special.\nI'll still be here till your next meal, so come back after that. Maybe then, the pieces will make more sense."
      ),
      2: L(
        "我一直在努力回想他当时说的关于绿木籽的话, 就在嘴边……\n等你吃完今天的最后一顿饭, 我们再聊。也许那味道会回来。",
        "I keep trying to remember exactly what he said about the greenwood seeds. It's right on the tip of my tongue.\nLet's talk again after you've wrapped up your eating for the day. Maybe the taste will come back to me."
      ),
      3: L(
        "啊, 我想起来了——那天他做了一道用绿木籽的汤。味道绝了。我后来一直想重做, 可从没成功……也不知道他还加了什么。\n冰箱里还有一些。去吧, 尝尝。但别只是吃——想一想, 你怎么吃, 你为什么吃。这就是你师父的做事方式。\n里面有一种味道……我敢肯定是来自香料婆婆的店。你该去找她。",
        "Ah, I remember now—he made a soup with greenwood seeds that day. Tasted incredible. I've tried to make it since, but I never got it right… No idea what else he put in there.\nThere's still some left in my fridge. Go ahead, give it a try. But don't just eat it—think about it. How you're eating, why you're eating. That's how your master did things.\nThere's a certain flavour in there… I swear it came from Spice Granny's shop. You should pay her a visit."
      ),
    },

    spice_woman: {
      1: L(
        "你知道…我这儿客人来来往往。有的只买基本的黑白胡椒, 有的像华主厨一样追求大胆独特的味道。\n总之, 很高兴和你聊天。但等你下一餐后再来吧, 我也会尽量回忆更多有关华主厨的事。",
        "You know... I have a lot of customers coming and going. Some just pick up the basics, black and white pepper. Some go for bold and unique flavors, like Chef Hua.\nAnyways, it's nice talking to you, but come back after your next meal, and meanwhile I'll try to recall some more details about Chef Hua."
      ),
      2: L(
        "我一直在想华主厨最近在做什么。你知道, 他的菜总有一丝神秘感——他从不满足, 总在尝试新东西。\n或许有迹可循, 但我觉得你从香料中能学到的毕竟有限。\n如果有其他关联……也许还有别的线索值得跟。\n几个小时后再来吧。回忆这些事意外地挺有趣。如果我想起了什么, 还会告诉你。",
        "I've been trying to think of what Chef Hua's been doing. You know how his cooking always had that touch of mystery—he was never satisfied, always trying something new.\nSure there might be a tell-tale sign, but I feel like you can only learn so much from spices.\nBut if there were other connections... there might be other threads worth following.\nWhy don't you come back in a few hours? It's been surprisingly fun retrieving these memories. I'll still be here if anything comes to mind."
      ),
      3: L(
        "不错——你已经记起了不少细节。\n哦, 对了, 差点忘了。韩前几天也来过。他满脸笑容, 说话客气, 但你能看出来——那人满肚子坏水。\n他来可不是为了味道。言外之意, 他是在打听你师父的灵魂香料。",
        "Not bad — you've recalled quite a bit of details.\nOh right, that reminds me. Han stopped by a couple days ago too.\nHe came in all smiles, talkin' nice, but you could tell — the guy's got nothin' but tricks up his sleeve.\nHe wasn't here for flavor. Between the lines, he was asking about your master's soul spice."
      ),
    },
  };

  const npcLines = lines[npcId] || {};
  return npcLines[stage] || npcLines[3] || L("做的好。", "Great Job.");
}


// 找出最常互动的NPC
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

// 记录餐食
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

    // 发放线索
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
      shouldGiveClue,
      clueText,
      mealStage,
      availableMealTypes: ["breakfast", "lunch", "dinner"].filter(
        (t) => t !== mealType
      ),
      nextDayUnlocked,
      shouldUnlockNextDay,
      currentDay: day,
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

module.exports = router;