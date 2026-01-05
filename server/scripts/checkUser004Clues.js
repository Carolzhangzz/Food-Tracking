// 检查用户004的线索记录
const { Clue, MealRecord, Player } = require('../models');

async function checkUser004() {
  try {
    console.log('\n=== 检查用户 004 的数据 ===\n');
    
    // 1. 检查玩家信息
    const player = await Player.findOne({ where: { playerId: '004' } });
    if (player) {
      console.log('📊 玩家信息:');
      console.log(`  - ID: ${player.playerId}`);
      console.log(`  - 当前天数: ${player.currentDay}`);
      console.log(`  - 首次登录: ${player.firstLoginDate}`);
      console.log('');
    } else {
      console.log('❌ 未找到用户 004\n');
      process.exit(0);
    }
    
    // 2. 检查餐食记录
    const meals = await MealRecord.findAll({
      where: { playerId: '004' },
      order: [['day', 'ASC'], ['recordedAt', 'ASC']]
    });
    
    console.log(`🍽️ 餐食记录数量: ${meals.length}`);
    meals.forEach((meal, index) => {
      console.log(`  ${index + 1}. Day ${meal.day} - ${meal.mealType} - NPC: ${meal.npcName || meal.npcId} - ${meal.recordedAt}`);
    });
    console.log('');
    
    // 3. 检查线索记录
    const clues = await Clue.findAll({
      where: { playerId: '004' },
      order: [['day', 'ASC'], ['receivedAt', 'ASC']]
    });
    
    console.log(`📚 线索记录数量: ${clues.length}`);
    clues.forEach((clue, index) => {
      console.log(`  ${index + 1}. Day ${clue.day} - ${clue.mealType || 'N/A'} - NPC: ${clue.npcName || clue.npcId}`);
      console.log(`     类型: ${clue.clueType || '旧格式'}`);
      console.log(`     内容: ${clue.clueText.substring(0, 60)}...`);
      console.log(`     时间: ${clue.receivedAt}`);
      console.log('');
    });
    
    // 4. 对比分析
    console.log('📊 数据对比:');
    console.log(`  - 餐食记录: ${meals.length} 条`);
    console.log(`  - 线索记录: ${clues.length} 条`);
    
    if (meals.length > clues.length) {
      console.log(`  ⚠️ 警告: 有 ${meals.length - clues.length} 条餐食记录没有对应的线索！`);
    } else if (meals.length === clues.length) {
      console.log(`  ✅ 餐食和线索数量匹配`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

checkUser004();

