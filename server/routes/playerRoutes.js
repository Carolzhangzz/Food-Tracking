// routes/playerRoutes.js
const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const AllowedId = require('../models/AllowedId');

// 登录接口
// 客户端 POST /api/login 带 playerId
// 后端查数据库：有就返回成功，没就404

router.post('/login', async (req, res) => {
  const { playerId } = req.body;

  try {
    const record = await AllowedId.findOne({ where: { player_id: playerId } });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Player ID not found in database',
      });
    }

    // 可选：标记这个ID已被使用
    await record.update({ used: true });

    res.json({
      success: true,
      message: 'Login successful',
      playerId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
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
