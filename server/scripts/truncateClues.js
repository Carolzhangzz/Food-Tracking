require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Clue } = require('../models');

async function truncateClues() {
  try {
    await sequelize.query('TRUNCATE TABLE "Clues" RESTART IDENTITY CASCADE;');
    
    const count = await Clue.count();
    console.log(`✅ Clues 表已清空，当前记录数: ${count}`);
    console.log('💡 现在可以重新测试对话和线索保存功能。');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 清除失败:', error);
    process.exit(1);
  }
}

truncateClues();
