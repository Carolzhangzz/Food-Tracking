require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MealRecord, Clue } = require('../models');

async function resetPlayer() {
  try {
    console.log('\n🔄 重置玩家 002 的数据...\n');
    
    // 1. 删除餐食记录
    const mealCount = await MealRecord.destroy({
      where: { playerId: '002' }
    });
    console.log(`✅ 删除了 ${mealCount} 条餐食记录`);
    
    // 2. 删除线索记录
    const clueCount = await Clue.destroy({
      where: { playerId: '002' }
    });
    console.log(`✅ 删除了 ${clueCount} 条线索记录`);
    
    console.log('\n✅ 玩家 002 已重置，可以重新开始对话！\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 重置失败:', error);
    process.exit(1);
  }
}

resetPlayer();
