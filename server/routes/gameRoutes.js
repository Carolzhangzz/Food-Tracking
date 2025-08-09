const express = require("express");
const router = express.Router();
const {Op} = require("sequelize");
const Player = require("../models/Player");
const PlayerProgress = require("../models/PlayerProgress");
const MealRecord = require("../models/MealRecord");
const GameSession = require("../models/GameSession");
const AllowedId = require("../models/AllowedId");
const Clue = require("../models/Clue"); // 新增
const ConversationHistory = require("../models/ConversationHistory"); // 新增
const sequelize = require('../db');

// ===== 工具函数 =====
function calculateCurrentDay(firstLoginDate) {
    const today = new Date();
    const firstLogin = new Date(firstLoginDate);

    today.setHours(0, 0, 0, 0);
    firstLogin.setHours(0, 0, 0, 0);

    const diffTime = today - firstLogin;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.min(diffDays + 1, 7);
}

async function hasCompletedTodaysMeals(playerId, day) {
    const mealRecords = await MealRecord.findAll({ where: { playerId, day } });
  const recordedTypes = mealRecords.map(rec => rec.mealType);
  // 只要记录了晚饭就算完成
  return recordedTypes.includes('dinner');
}

async function checkAndUnlockNextNPC(playerId, currentDay) {
    const completedToday = await hasCompletedTodaysMeals(playerId, currentDay);

    if (!completedToday || currentDay >= 7) {
        return false;
    }

    const nextDay = currentDay + 1;
    const existingProgress = await PlayerProgress.findOne({
        where: {playerId, day: nextDay},
    });

    if (existingProgress) {
        return false;
    }

    const npcMap = {
        2: "shop_owner",
        3: "spice_woman",
        4: "restaurant_owner",
        5: "fisherman",
        6: "old_friend",
        7: "secret_apprentice",
    };

    const nextNpcId = npcMap[nextDay];
    if (nextNpcId) {
        await PlayerProgress.create({
            playerId,
            day: nextDay,
            npcId: nextNpcId,
            unlockedAt: new Date(),
        });

        console.log(`解锁了第${nextDay}天的NPC: ${nextNpcId}`);
        return true;
    }

    return false;
}

// 新增：获取玩家线索的函数
async function getPlayerClues(playerId) {
    try {
        console.log(`获取玩家 ${playerId} 的线索...`);

        const clues = await Clue.findAll({
            where: {playerId},
            order: [['day', 'ASC'], ['receivedAt', 'ASC']]
        });

        const clueRecords = clues.map(clue => ({
            id: `${clue.npcId}_${clue.day}`,
            npcId: clue.npcId,
            npcName: getNPCName(clue.npcId), // 辅助函数获取NPC名称
            clue: clue.clueText,
            day: clue.day,
            receivedAt: clue.receivedAt
        }));

        console.log(`找到 ${clueRecords.length} 条线索`);
        return clueRecords;

    } catch (error) {
        console.error("获取玩家线索错误:", error);
        return [];
    }
}

// 辅助函数：获取NPC名称
function getNPCName(npcId) {
    const npcNames = {
        village_head: "村长伯伯",
        shop_owner: "店主阿桂",
        spice_woman: "香料婆婆",
        restaurant_owner: "餐厅店长老韩",
        fisherman: "渔夫阿梁",
        old_friend: "林川",
        secret_apprentice: "念念"
    };
    return npcNames[npcId] || "Unknown NPC";
}

// 新增：保存线索到数据库
async function saveClueToDatabase(playerId, npcId, clueText, day) {
    try {
        console.log(`保存线索到数据库: ${playerId}, ${npcId}, ${day}`);

        // 检查线索是否已存在
        const existingClue = await Clue.findOne({
            where: {playerId, npcId, day}
        });

        if (existingClue) {
            console.log("线索已存在，跳过保存");
            return true;
        }

        // 创建新线索
        await Clue.create({
            playerId,
            npcId,
            day,
            clueText,
            receivedAt: new Date()
        });

        console.log("线索保存成功");
        return true;

    } catch (error) {
        console.error("保存线索错误:", error);
        return false;
    }
}

// 新增：保存对话历史
async function saveConversationHistory(playerId, npcId, day, speaker, content, mealType = null, sessionId = null) {
    try {
        await ConversationHistory.create({
            playerId,
            npcId,
            day,
            sessionId,
            speaker,
            content,
            mealType,
            timestamp: new Date()
        });
        return true;
    } catch (error) {
        console.error("保存对话历史错误:", error);
        return false;
    }
}

// ===== 路由处理 =====
// 登录接口 - 更新获取线索记录
router.post('/login', async (req, res) => {
    try {
        console.log("收到登录请求:", req.body);

        const {playerId} = req.body;

        if (!playerId) {
            console.log("登录失败: 缺少 playerId");
            return res.status(400).json({
                success: false,
                error: 'Player ID is required'
            });
        }

        console.log("检查允许列表中的玩家ID:", playerId);

        const allowedRecord = await AllowedId.findOne({
  where: { playerId }              // ✅ 用属性名；列名映射交给模型的 field
});
        if (!allowedRecord) {
            console.log("登录失败: 玩家ID不在允许列表中");
            return res.status(404).json({
                success: false,
                error: 'Player ID not found in database'
            });
        }

        console.log("玩家ID验证通过，标记为已使用");
        await allowedRecord.update({used: true});

        let player = await Player.findOne({where: {playerId}});

        if (!player) {
            console.log("创建新玩家记录:", playerId);
            player = await Player.create({
                playerId,
                firstLoginDate: new Date(),
                currentDay: 1,
                gameCompleted: false,
                language: 'en',
            });

            await PlayerProgress.create({
                playerId,
                day: 1,
                npcId: 'village_head',
                unlockedAt: new Date(),
            });

            console.log(`新玩家创建成功: ${playerId}`);
        } else {
            console.log("找到现有玩家记录:", playerId);
        }

        console.log("获取玩家进度记录...");
        const progressRecords = await PlayerProgress.findAll({
            where: {playerId},
            order: [['day', 'ASC']]
        });

        console.log("获取玩家餐食记录...");
        const mealRecords = await MealRecord.findAll({
            where: {playerId},
            order: [['day', 'ASC'], ['recordedAt', 'ASC']]
        });

        console.log("获取玩家线索记录...");
        // 使用新的线索获取函数
        let clueRecords = [];
        try {
            clueRecords = await getPlayerClues(playerId);
        } catch (clueError) {
            console.error("获取线索时出错，但不影响登录:", clueError);
            clueRecords = [];
        }

        console.log(`登录成功 - 进度: ${progressRecords.length}, 餐食: ${mealRecords.length}, 线索: ${clueRecords.length}`);

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
            availableNPCs: progressRecords.map(progress => ({
                day: progress.day,
                npcId: progress.npcId,
                unlocked: true,
                completed: progress.completedAt !== null,
                mealsRecorded: progress.mealsRecorded || 0,
                hasRecordedMeal: progress.hasRecordedMeal || false,
                availableMealTypes: ['breakfast', 'lunch', 'dinner']
            })),
            mealRecords: mealRecords.map(record => ({
                day: record.day,
                npcId: record.npcId,
                npcName: record.npcName,
                mealType: record.mealType,
                mealContent: record.mealContent,
                recordedAt: record.recordedAt,
            })),
            clueRecords: clueRecords, // 从数据库获取的线索记录
            totalDaysUnlocked: progressRecords.length,
        });

    } catch (error) {
        console.error('登录错误详情:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 获取玩家完整状态 - 更新线索支持
async function getPlayerFullStatus(playerId) {
    const player = await Player.findOne({where: {playerId}});

    if (!player) {
        throw new Error("Player not found");
    }

    const currentDay = calculateCurrentDay(player.firstLoginDate);

    if (currentDay !== player.currentDay) {
        await player.update({currentDay});
    }

    const progressRecords = await PlayerProgress.findAll({
        where: {playerId},
        order: [["day", "ASC"]],
    });

    const mealRecords = await MealRecord.findAll({
        where: {playerId},
        order: [
            ["day", "ASC"],
            ["recordedAt", "ASC"],
        ],
    });

    // 获取线索记录
    let clueRecords = [];
    try {
        clueRecords = await getPlayerClues(playerId);
    } catch (error) {
        console.error("获取线索时出错:", error);
        clueRecords = [];
    }

    const dailyMealCounts = {};
    mealRecords.forEach((meal) => {
        if (!dailyMealCounts[meal.day]) {
            dailyMealCounts[meal.day] = new Set();
        }
        dailyMealCounts[meal.day].add(meal.mealType);
    });

    const availableNPCs = progressRecords.map((progress) => {
        const dayMeals = dailyMealCounts[progress.day] || new Set();
        const mealsCount = dayMeals.size;
        const hasCompletedDay = dayMeals.has('dinner');
        return {
            day: progress.day,
            npcId: progress.npcId,
            unlocked: true,
            completed: progress.completedAt !== null,
            mealsRecorded: mealsCount,
            hasRecordedMeal: mealsCount > 0,
            hasCompletedDay: hasCompletedDay,
            availableMealTypes: ["breakfast", "lunch", "dinner"].filter(
                (type) => !dayMeals.has(type)
            ),
        };
    });

    return {
        player: {
            playerId: player.playerId,
            nickname: player.nickname,
            firstLoginDate: player.firstLoginDate,
            currentDay,
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
        clueRecords, // 添加线索记录
        totalDaysUnlocked: availableNPCs.length,
        currentDayMealsRemaining:
            availableNPCs.find((npc) => npc.day === currentDay)?.availableMealTypes ||
            [],
    };
}

// 获取玩家状态接口
router.post("/player-status", async (req, res) => {
    try {
        const {playerId} = req.body;

        if (!playerId) {
            return res.status(400).json({
                success: false,
                error: "Player ID is required",
            });
        }

        const statusData = await getPlayerFullStatus(playerId);

        res.json({
            success: true,
            ...statusData,
        });
    } catch (error) {
        console.error("获取玩家状态错误:", error);
        res.status(500).json({
            success: false,
            error: "获取玩家状态失败",
            details: error.message,
        });
    }
});

// 新增：保存线索接口
router.post("/save-clue", async (req, res) => {
    try {
        const {playerId, npcId, clueText, day} = req.body;

        if (!playerId || !npcId || !clueText || !day) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields"
            });
        }

        const result = await saveClueToDatabase(playerId, npcId, clueText, day);

        if (result) {
            res.json({success: true});
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to save clue"
            });
        }
    } catch (error) {
        console.error("Error saving clue:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 新增：保存对话历史接口
router.post("/save-conversation", async (req, res) => {
    try {
        const {playerId, npcId, day, speaker, content, mealType, sessionId} = req.body;

        if (!playerId || !npcId || !day || !speaker || !content) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields"
            });
        }

        const result = await saveConversationHistory(playerId, npcId, day, speaker, content, mealType, sessionId);

        if (result) {
            res.json({success: true});
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to save conversation"
            });
        }
    } catch (error) {
        console.error("Error saving conversation:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 记录餐食接口 - 更新自动保存线索
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

    // 防重复：当天同一餐别仅一次
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const existingMeal = await MealRecord.findOne({
      where: { playerId, day, mealType, recordedAt: { [Op.gte]: startOfToday } },
      transaction: t
    });
    if (existingMeal) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "今天的这一餐已经记录过了" });
    }

    // 1) 写入餐食记录
    const mealRecord = await MealRecord.create({
      playerId, day, npcId, npcName, mealType, mealAnswers, conversationHistory, mealContent
    }, { transaction: t });

    // 2) 保存对话历史（不阻断主流程）
    if (Array.isArray(conversationHistory)) {
      for (const dialog of conversationHistory) {
        await ConversationHistory.create({
          playerId,
          npcId,
          day,
          sessionId: null,
          speaker: dialog.type === "user" ? "player" : "npc",
          content: dialog.content,
          mealType,
          timestamp: new Date()
        }, { transaction: t });
      }
    }

    // 3) 更新当日进度
    const progressRecord = await PlayerProgress.findOne({
      where: { playerId, day },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (progressRecord) {
      const dayMeals = await MealRecord.findAll({ where: { playerId, day }, transaction: t });
      const mealTypes = new Set(dayMeals.map(m => m.mealType));
      await progressRecord.update({
        mealsRecorded: mealTypes.size,
        hasRecordedMeal: true
      }, { transaction: t });
    }

    // 4) 晚餐 -> 必给线索（不看中饭）
    let shouldGiveClue = false;
    let clueText = null;
    const playerLanguage = player.language || "en";
    if (mealType === "dinner") {
      shouldGiveClue = true;
      clueText = getClueForNPC(npcId, playerLanguage);
      await saveClueToDatabase(playerId, npcId, clueText, day); // 幂等
    }

    // 5) 是否“完成当天”？—— 规则改为：只要有晚饭就完成
    const completedToday = await hasCompletedTodaysMeals(playerId, day); // == 是否已有 dinner
    let hasCompletedDay = completedToday;
    let newDay = null;

    if (completedToday) {
      // 标记当日完成
      if (progressRecord && !progressRecord.completedAt) {
        await progressRecord.update({ completedAt: new Date() }, { transaction: t });
      }

      // 跨天（剧情日，不超过 7）
      const targetNewDay = Math.min(day + 1, 7);
      if (player.currentDay < targetNewDay) {
        await player.update({ currentDay: targetNewDay }, { transaction: t });
        newDay = targetNewDay;

        // 解锁下一天 NPC（若未存在）
        const npcMap = {
          2: "shop_owner",
          3: "spice_woman",
          4: "restaurant_owner",
          5: "fisherman",
          6: "old_friend",
          7: "secret_apprentice",
        };
        const nextNpcId = npcMap[targetNewDay];
        if (nextNpcId) {
          const existNext = await PlayerProgress.findOne({ where: { playerId, day: targetNewDay }, transaction: t });
          if (!existNext) {
            await PlayerProgress.create({
              playerId,
              day: targetNewDay,
              npcId: nextNpcId,
              unlockedAt: new Date(),
            }, { transaction: t });
          }
        }
      }
    }

    await t.commit();
    return res.json({
      success: true,
      mealRecord: {
        id: mealRecord.id,
        day: mealRecord.day,
        mealType: mealRecord.mealType,
        recordedAt: mealRecord.recordedAt,
      },
      hasCompletedDay,       // ✅ 晚饭后为 true
      shouldGiveClue,        // ✅ 晚饭必为 true
      clueText,              // ✅ 返回线索文本（按玩家语言）
      newDay,                // ✅ 跨天则返回新天数
      nextDayUnlocked: !!newDay
    });
  } catch (error) {
    await t.rollback();
    console.error("记录餐食错误:", error);
    return res.status(500).json({ success: false, error: "记录餐食失败", details: error.message });
  }
});

// 处理客户端的天数更新请求（修复版）
router.post("/update-current-day", async (req, res) => {
    // 使用事务确保数据一致性
    const transaction = await sequelize.transaction();

    try {
        const {playerId, currentDay} = req.body;

        if (!playerId || currentDay === undefined) {
            return res.status(400).json({
                success: false,
                error: "Missing playerId or currentDay"
            });
        }

        // 1. 查找玩家（加锁防止并发修改）
        const player = await Player.findOne({
            where: {playerId},
            lock: transaction.LOCK.UPDATE, // 悲观锁防止并发问题
            transaction
        });

        if (!player) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: "Player not found"
            });
        }

        // 2. 校验当前请求的天数是否与服务器记录一致（关键修复）
        // 防止旧请求覆盖新数据（例如客户端重复提交）
        if (player.currentDay !== currentDay) {
            await transaction.rollback();
            return res.status(409).json({
                success: false,
                error: `Day mismatch: server has ${player.currentDay}, request sent ${currentDay}`,
                currentDay: player.currentDay // 返回服务器实际天数
            });
        }

        // 3. 校验当前天数是否已完成所有餐食
        const hasCompleted = await hasCompletedTodaysMeals(playerId, currentDay);
        if (!hasCompleted) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: "Current day is not completed",
                currentDay: player.currentDay
            });
        }

        // 4. 计算新天数（不超过7天）
        const newDay = Math.min(currentDay + 1, 7);

        // 5. 更新玩家的currentDay
        await player.update({currentDay: newDay}, {transaction});

        // 6. 强制刷新数据，确保更新成功
        await player.reload({transaction});

        // 7. 提交事务
        await transaction.commit();

        // 记录关键日志（方便排查问题）
        console.log(`[DayUpdate] Player ${playerId} updated day from ${currentDay} to ${newDay}`);

        res.json({
            success: true,
            newDay: newDay,
            serverConfirmed: true // 新增：客户端可信任此值
        });

    } catch (error) {
        await transaction.rollback();
        console.error(`[DayUpdateError] Player ${req.body.playerId}:`, error);
        res.status(500).json({
            success: false,
            error: "Failed to update current day",
            // 发生错误时返回服务器已知的当前天数
            currentDay: req.body.playerId ? (await Player.findByPk(req.body.playerId))?.currentDay : null
        });
    }
});

// 获取NPC线索文本的函数
function getClueForNPC(npcId, language = 'zh') {
    const clues = {
        village_head: {
            zh: "干得好！继续这样做。一点一点地，你会开始理解——他当时在想什么，他在隐藏什么。\n\n不需要着急。这不是你可以强迫的事情——只需要一次吃一顿饭。\n\n他经常去格蕾丝的店买食材。他和华主厨回去的路很远。也许你会从她那里得到一些见解。",
            en: "Good job! Keep it up. Bit by bit, you'll start to understand—what he was thinking, what he was hiding.\n\nNo need to rush. This isn't something you can force—just one meal at a time.\n\nHe often went to Grace's shop for ingredients. He had a long way back with Chef Hua. Maybe you'll get some insights from her."
        },
        shop_owner: {
            zh: "他最常买那几样料，可那天——他却突然问起'青木籽'。他以前从来不碰那玩意儿。",
            en: "He always bought the same ingredients, but that day—he suddenly asked about 'greenwood seeds'. He never touched those before."
        },
        spice_woman: {
            zh: "他说——'要不是那个人把它弄俗了'，他都不想再碰青木籽。你知道他说的是谁吗？",
            en: "He said—'If it weren't for that person making it vulgar', he wouldn't want to touch greenwood seeds again. Do you know who he was talking about?"
        },
        restaurant_owner: {
            zh: "有一锅粥，他始终没让我碰。说什么得亲自守着火慢慢熬着。'云头鲤'。",
            en: "There was one pot—congee with Yunhead Carp. He never let me touch it. Had to be slow cooked. Alone. By the river."
        },
        fisherman: {
            zh: "你师傅……他那天，在那块老礁石边，煮了一锅鱼粥。一锅白，一锅清。没叫我尝，就说了句：'等潮涨再开。'",
            en: "Your master... that day, by the old rocks, he made two pots of fish congee. One milky, one clear. He didn't let me taste a drop. Just said: 'Open it when the tide comes in.'"
        },
        old_friend: {
            zh: "师傅从小不喜欢我你了解的，自然什么都不会和我说。但是念念，他最近收了一个孩子叫念念。住在村尾的阁楼。",
            en: "Master never liked me since childhood, naturally he wouldn't tell me anything. But about NianNian, he recently took in a child called NianNian. Lives in the attic at the end of the village."
        },
        secret_apprentice: {
            zh: "他把最后一页藏在他'最常回头看的地方'。不是厨房，也不是餐馆。是他写下第一道菜的地方！在阁楼上那道木梁上。",
            en: "He hid the last page in the place he 'most often looked back at'. Not the kitchen, not the restaurant. The place where he wrote his first recipe! On the wooden beam in the attic."
        }
    };

    const clue = clues[npcId];
    if (!clue) {
        return language === 'zh' ? "暂无线索" : "No clue available";
    }

    return clue[language] || clue.zh;
}

// 完成NPC交互
router.post("/complete-npc-interaction", async (req, res) => {
    try {
        const {playerId, day, npcId} = req.body;
        if (!playerId || !day || !npcId) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
        }

        const progressRecord = await PlayerProgress.findOne({
            where: {playerId, day},
        });

        if (progressRecord) {
            await progressRecord.update({
                completedAt: new Date(),
            });
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
    try {
        const {playerId, language} = req.body;

        if (!playerId) {
            return res.status(400).json({
                success: false,
                error: "Player ID is required",
            });
        }

        // 获取玩家的所有餐食记录
        const mealRecords = await MealRecord.findAll({
            where: {playerId},
            order: [
                ["day", "ASC"],
                ["recordedAt", "ASC"],
            ],
        });

        // 获取玩家的所有对话历史（可选，用于更丰富的彩蛋内容）
        const conversationRecords = await ConversationHistory.findAll({
            where: {playerId},
            order: [["timestamp", "ASC"]],
        });

        if (mealRecords.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No meal records found for this player",
            });
        }

        // 准备餐食数据摘要（包含更多细节）
        const mealsSummary = mealRecords.map((record) => ({
            day: record.day,
            npcName: record.npcName,
            mealType: record.mealType,
            content: record.mealContent,
            answers: record.mealAnswers,
            date: record.recordedAt,
        }));

        // 统计数据
        const statsData = {
            totalMeals: mealRecords.length,
            daysCompleted: new Set(mealRecords.map(m => m.day)).size,
            favoriteNPC: getMostInteractedNPC(mealRecords),
            totalConversations: conversationRecords.length
        };

        // 调用Gemini API生成最终彩蛋
        try {
            const {GoogleGenAI} = await import("@google/genai");
            const ai = new GoogleGenAI({
                apiKey: process.env.GEMINI_API_KEY,
            });

            const prompt = generateFinalEggPrompt(mealsSummary, statsData, language);

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        role: "user",
                        parts: [{text: prompt}],
                    },
                ],
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                },
            });

            const eggContent = response.text || "Thank you for your journey...";

            // 标记游戏为已完成
            await Player.update({gameCompleted: true}, {where: {playerId}});

            res.json({
                success: true,
                eggContent,
                mealsSummary,
                statsData,
            });
        } catch (apiError) {
            console.error("Error calling Gemini API for final egg:", apiError);

            // 生成备用彩蛋
            const fallbackEgg = generateFallbackEgg(statsData, language);

            res.json({
                success: true,
                eggContent: fallbackEgg,
                mealsSummary,
                statsData,
            });
        }
    } catch (error) {
        console.error("Error generating final egg:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate final egg",
            details: error.message,
        });
    }
});

// 辅助函数：找出最常互动的NPC
function getMostInteractedNPC(mealRecords) {
    const npcCounts = {};
    mealRecords.forEach(meal => {
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

// 生成最终彩蛋的提示词
function generateFinalEggPrompt(mealsSummary, statsData, language) {
    if (language === "zh") {
        return `你是一位失踪厨师的师傅，现在要给你的徒弟写一段感人的留言。这个徒弟在7天里完成了一段美食记录之旅：

总共记录了 ${statsData.totalMeals} 顿餐食，完成了 ${statsData.daysCompleted} 天的记录。
与 ${statsData.favoriteNPC} 互动最多。
进行了 ${statsData.totalConversations} 次对话。

餐食记录详情：
${mealsSummary.map((meal, index) =>
            `第${meal.day}天 - ${meal.npcName}: ${meal.mealType} - ${meal.content}`
        ).join('\n')}

请基于这些详细的记录，写一段温暖、感人的留言，告诉徒弟你看到了他的成长和用心，并给出人生的感悟。要体现出你对他记录每一餐的重视和感动。字数控制在250-350字。要有师父的语气和深度。`;
    } else {
        return `You are a missing chef's master, now writing a touching message to your apprentice. This apprentice completed a culinary journey over 7 days:

Recorded a total of ${statsData.totalMeals} meals across ${statsData.daysCompleted} days.
Interacted most with ${statsData.favoriteNPC}.
Had ${statsData.totalConversations} conversations.

Meal records details:
${mealsSummary.map((meal, index) =>
            `Day ${meal.day} - ${meal.npcName}: ${meal.mealType} - ${meal.content}`
        ).join('\n')}

Based on these detailed records, write a warm and touching message telling your apprentice that you see their growth and dedication, sharing life insights. Show how moved you are by their careful recording of each meal. Keep it 250-350 words. Use the tone and depth of a master chef.`;
    }
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