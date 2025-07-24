// routes/playerRoutes.js
const express = require("express");
const router = express.Router();
const Player = require("../models/Player");
const AllowedId = require("../models/AllowedId");

// 登录接口
// 客户端 POST /api/login 带 playerId
// 后端查数据库：有就返回成功，没就404
router.post("/login", async (req, res) => {
  const { playerId } = req.body;

  try {
    const record = await AllowedId.findOne({ where: { player_id: playerId } });

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Player ID not found in database" });
    }

    await record.update({ used: true });

    // 查找或创建玩家存档
    let player = await Player.findOne({ where: { playerId } });
    if (!player) {
      player = await Player.create({ playerId });
    }

    res.json(player); // ✅ 返回完整 player 信息，前端需要用
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 获取玩家游戏进度
router.post("/game-progress", async (req, res) => {
  const { playerId } = req.body;

  try {
    const player = await Player.findOne({ where: { playerId } });
    if (!player) {
      return res
        .status(404)
        .json({ success: false, message: "Player not found" });
    }

    res.json(player.progress || {});
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Error retrieving game progress" });
  }
});

// 获取玩家存档
router.get("/player/:playerId", async (req, res) => {
  const { playerId } = req.params;

  try {
    // 使用 allowedId 查找玩家
    const player = await Player.findOne({ where: { playerId } });
    if (!player) {
      return res
        .status(404)
        .json({ success: false, message: "Player not found" });
    }

    res.json({ success: true, data: player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 保存游戏进度
router.post("/save-progress", async (req, res) => {
  const { playerId, ...progress } = req.body;

  try {
    const player = await Player.findOne({ where: { playerId } });

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // 🔴 合并历史进度，避免覆盖原有记录
    const updatedProgress = {
      ...player.progress,  // 保留已有进度
      ...progress,         // 合并新进度
      lastUpdated: new Date().toISOString()  // 新增更新时间
    };

    await player.update({ progress: updatedProgress });  // 🔴 使用合并后的进度

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving progress:", error);
    res.status(500).json({ error: "Failed to save progress" });
  }
});
//
// // 加载游戏进度
// router.post("/game-progress", async (req, res) => {
//   const { playerId } = req.body;
//
//   try {
//     const player = await Player.findOne({ where: { allowedId: playerId } }); // ✅ 正确的
//
//     if (!player) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Player not found" });
//     }
//
//     res.json(player.progress); // 返回 progress 对象
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// 重置玩家进度
router.post("/reset-progress", async (req, res) => {
  const { playerId } = req.body;

  try {
    const player = await Player.findOne({ where: { playerId } });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    await player.update({
      progress: {
        currentDay: 1,
        dailyMealsRecorded: 0,
        totalMealsRequired: 3,
        completedDays: [],
        unlockedNPCs: ["village_head"],
        totalClues: 0,
        gameCompleted: false,
        conversations: []
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error resetting progress:", error);
    res.status(500).json({ error: "Failed to reset progress" });
  }
});

// 生成7天的食谱
router.post("/generate-final-egg", async (req, res) => {
  const { playerId, language } = req.body;

  try {
    const player = await Player.findOne({ where: { playerId } });
    if (!player || !player.progress?.gameCompleted) {
      return res
        .status(400)
        .json({ error: "Game not completed yet. Cannot generate egg." });
    }

    // 替换为更复杂的逻辑或 AI 调用
    const eggContent = `🎉 Congratulations! Here's your final dish: Golden Noodle Supreme (Language: ${language})`;

    res.json({ success: true, eggContent });
  } catch (error) {
    console.error("Error generating final egg:", error);
    res.status(500).json({ error: "Failed to generate final egg" });
  }
});

module.exports = router;
