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

async function initDatabase() {
  try {
    console.log('🔄 开始初始化数据库...');

    // 测试连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 同步模型（创建表）
    console.log('🏗️  同步数据库模型...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ 数据库表创建/更新完成');

    // 检查是否已有测试数据
    const existingPlayer = await Player.findOne({
      where: { playerId: 'test-player-001' }
    });

    if (!existingPlayer) {
      console.log('🌱 创建测试数据...');

      // 创建测试玩家
      const testPlayer = await Player.create({
        playerId: 'test-player-001',
        nickname: 'Test Player',
        firstLoginDate: new Date(),
        currentDay: 1,
        gameCompleted: false,
        language: 'en',
        progress: {}
      });

      // 为测试玩家创建第一天的进度
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
      console.log('📊 测试玩家ID:', testPlayer.playerId);
    } else {
      console.log('ℹ️  测试数据已存在，跳过创建');
    }

    // 显示所有表
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    console.log('📋 数据库中的表:', tables);

    console.log('🎉 数据库初始化完成！');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await sequelize.close();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
}

// 运行初始化
console.log('🚀 启动数据库初始化...');
initDatabase();


// # 检查文件是否创建成功
// ls -la scripts/
// # 应该看到 initDatabase.js

// # 检查文件内容
// head -5 scripts/initDatabase.js
// # 应该看到文件开头几行

// # 运行初始化
// node scripts/initDatabase.js