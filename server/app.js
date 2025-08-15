// server/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 1) 先创建 app
const app = express();
const PORT = process.env.PORT || 3001;

// 2) CORS（如果你需要从 localhost:3000/3001 打 Heroku 或其他域名才需要；
//    若前端也由本服务托管并用 /api，就不会跨域，可以把 allowedOrigins 删掉）
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  // 加你的其它前端域名（如部署预发/线上）再放开
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

app.options('*', cors()); // 预检

// 3) 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 4) 数据库
const { sequelize } = require('./models');

// 5) 模型（如果 models/index.js 已经自动加载模型，这些 require 可留可不留）
const Player = require('./models/Player');
const PlayerProgress = require('./models/PlayerProgress');
const MealRecord = require('./models/MealRecord');
const GameSession = require('./models/GameSession');
const AllowedId = require('./models/AllowedId');

// 6) 关联
Player.hasMany(PlayerProgress, { foreignKey: 'playerId', sourceKey: 'playerId', as: 'progresses' });
PlayerProgress.belongsTo(Player, { foreignKey: 'playerId', targetKey: 'playerId', as: 'player' });
Player.hasMany(MealRecord, { foreignKey: 'playerId', sourceKey: 'playerId', as: 'mealRecords' });
MealRecord.belongsTo(Player, { foreignKey: 'playerId', targetKey: 'playerId', as: 'player' });
Player.hasMany(GameSession, { foreignKey: 'playerId', sourceKey: 'playerId', as: 'sessions' });
GameSession.belongsTo(Player, { foreignKey: 'playerId', targetKey: 'playerId', as: 'player' });

// 7) 路由（API 先注册）
app.use('/api', require('./routes/gameRoutes'));
app.use('/api', require('./routes/geminiRoutes'));
app.use('/api', require('./routes/convaiRoutes'));

// 8) 托管静态前端（build）
const buildPath = path.join(__dirname, '../build');
app.use(express.static(buildPath));

// 9) SPA 回退（放在最后；排除 /api）
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(buildPath, 'index.html'));
});

// 10) 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
});

// 11) 启动
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    await sequelize.sync({ alter: false, force: false });
    console.log('✅ Database models synchronized successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health:   http://localhost:${PORT}/health`);
      console.log(`🎮 API:      http://localhost:${PORT}/api/player-status`);
      console.log(`🖥️ Frontend: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Unable to start server:', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🔄 Gracefully shutting down...');
  try { await sequelize.close(); console.log('✅ DB closed.'); } catch(e) { console.error(e); }
  process.exit(0);
});

start();
