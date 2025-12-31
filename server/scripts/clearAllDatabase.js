require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../models');

async function clear() {
  try {
    console.log('🧹 正在清空数据库所有内容...');
    
    // 使用 TRUNCATE 命令彻底清空所有表，并重置自增 ID
    await sequelize.query(`
      TRUNCATE TABLE 
        "Clues", 
        "ConversationHistories", 
        "GameSessions", 
        "MealRecords", 
        "PlayerProgresses", 
        "Players"
      RESTART IDENTITY CASCADE;
    `);

    console.log('✅ 数据库已完全清空！');
    process.exit(0);
  } catch (e) {
    console.error('❌ 清空失败:', e);
    process.exit(1);
  }
}

clear();
