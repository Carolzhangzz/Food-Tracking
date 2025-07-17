// server/app.js
const express = require('express');
const sequelize = require('./db');
const AllowedId = require('./models/AllowedId');
const IntroScript = require('./models/IntroScript');
const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000'
}));

// app.use(cors({
//   origin: 'http://localhost:3000', // 允许前端开发端口
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   credentials: true
// }));

// 登录id检测
app.post('/api/login', async (req, res) => {
  const { playerId } = req.body;
  try {
    const allowed = await AllowedId.findOne({ where: { _id: playerId, used: false } });
    if (!allowed) {
      return res.status(401).json({ success: false, message: '无效或已使用的ID' });
    }
    await allowed.update({ used: true });
    res.json({ success: true, message: '登录成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// // 获取开场白
// app.get('/api/intro', async (req, res) => {
//   try {
//     const script = await IntroScript.findOne();
//     if (!script) {
//       return res.status(404).json({ success: false, message: 'No intro script found.' });
//     }
//     res.json({ success: true, content: script.content });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: 'Server error.' });
//   }
// });

// 增加id
app.post('/api/admin/add-id', async (req, res) => {
  const { newId } = req.body;

  try {
    const created = await AllowedId.create({
      _id: newId,
      used: false,
    });

    res.json({ success: true, data: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// 查看所有已分配的白名单 ID： 
app.get('/api/admin/list-ids', async (req, res) => {
  try {
    const all = await AllowedId.findAll();
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// 监听
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});


