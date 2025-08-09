// # 创建文件并写入内容
// cat > scripts/initDatabase.js << 'EOF'
// server/scripts/initDatabase.js
require('dotenv').config();
const sequelize = require('../db');

// 导入模型
const Player = require('../models/Player');
const PlayerProgress = require('../models/PlayerProgress');
const MealRecord = require('../models/MealRecord');
const GameSession = require('../models/GameSession');
const AllowedId = require('../models/AllowedId');
const Clue = require('../models/Clue');
const ConversationHistory = require('../models/ConversationHistory')


async function initDatabase() {
  try {
    console.log('🔄 开始初始化数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 空库建议：先 force: true 第一次全量建表；后续再改回 alter: true 或去掉
    console.log('🏗️ 同步数据库模型...');
    await sequelize.sync({ alter: true });  // 第一次重建用 force:true，确认结构没问题后改成 alter:true 或去掉
    console.log('✅ 数据库表创建/更新完成');

     const allow129 = await AllowedId.findOne({ where: { playerId: '129' } });
    if (!allow129) {
      await AllowedId.create({ playerId: '129', used: false });
      console.log('🌱 已插入 AllowedId: 129');
    }

    // 种一点测试数据（可选）
    const existingPlayer = await Player.findOne({ where: { playerId: 'test-player-001' } });
    if (!existingPlayer) {
      console.log('🌱 创建测试数据...');
      await Player.create({
        playerId: 'test-player-001',
        nickname: 'Test Player',
        firstLoginDate: new Date(),
        currentDay: 1,
        gameCompleted: false,
        language: 'en',
        progress: {}
      });
      await PlayerProgress.create({
        playerId: 'test-player-001',
        day: 1,
        npcId: 'village_head',
        unlockedAt: new Date(),
        completedAt: null,
        mealsRecorded: 0,
        hasRecordedMeal: false
      });
      console.log('✅ 测试数据创建完成');
    } else {
      console.log('ℹ️ 测试数据已存在，跳过创建');
    }

    const qi = sequelize.getQueryInterface();
    const tables = await qi.showAllTables();
    console.log('📋 当前数据表：', tables);

    console.log('🎉 数据库初始化完成！');
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err);
  } finally {
    await sequelize.close();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
}

console.log('🚀 启动数据库初始化...');
initDatabase();