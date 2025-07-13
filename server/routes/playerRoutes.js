// routes/playerRoutes.js
const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const AllowedId = require('../models/AllowedId');

// 登录接口
router.post('/login', async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).send('Player ID is required');

 // Step 1: Check whitelist
  const allowed = await AllowedId.findById(playerId);
  if (!allowed) {
    return res.status(403).send('This Player ID is not valid. Please check your ID.');
  }

  let player = await Player.findById(playerId);
  if (!player) {
    // 创建新玩家
    player = new Player({ _id: playerId });
    await player.save();
    // 标记ID为已用
    allowed.used = true;
    await allowed.save();
  }

  res.json(player);
});

// 获取存档
router.get('/:id', async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).send('Player not found');
  res.json(player);
});

// 更新存档
router.put('/:id', async (req, res) => {
  const updated = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// 删除存档
router.delete('/:id', async (req, res) => {
  await Player.findByIdAndDelete(req.params.id);
  res.send('Player deleted');
});

module.exports = router;
