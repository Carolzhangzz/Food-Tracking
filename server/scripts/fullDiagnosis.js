require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Clue, MealRecord, Player } = require('../models');

async function diagnose() {
  try {
    console.log('\n🔍 完整诊断报告\n');
    console.log('=' .repeat(60));
    
    // 1. 检查玩家
    const player = await Player.findOne({ where: { playerId: '002' } });
    console.log('\n1️⃣ 玩家信息:');
    if (player) {
      console.log(`   Player ID: ${player.playerId}`);
      console.log(`   Language: ${player.language}`);
      console.log(`   Current Day: ${player.currentDay}`);
    } else {
      console.log('   ❌ 玩家不存在');
    }
    
    // 2. 检查餐食记录
    const meals = await MealRecord.findAll({
      where: { playerId: '002' },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    console.log('\n2️⃣ 最近的餐食记录:');
    if (meals.length === 0) {
      console.log('   ❌ 没有餐食记录');
    } else {
      meals.forEach((meal, index) => {
        console.log(`\n   记录 ${index + 1}:`);
        console.log(`   - NPC ID: ${meal.npcId}`);
        console.log(`   - NPC Name: ${meal.npcName || '❌ NULL'}`);
        console.log(`   - Meal Type: ${meal.mealType || '❌ NULL'}`);
        console.log(`   - Day: ${meal.day || '❌ NULL'}`);
        console.log(`   - Created: ${meal.createdAt}`);
      });
    }
    
    // 3. 检查线索记录
    const clues = await Clue.findAll({
      where: { playerId: '002' },
      order: [['createdAt', 'DESC']],
      limit: 3
    });
    console.log('\n3️⃣ 最近的线索记录:');
    if (clues.length === 0) {
      console.log('   ❌ 没有线索记录');
    } else {
      clues.forEach((clue, index) => {
        console.log(`\n   线索 ${index + 1}:`);
        console.log(`   - NPC ID: ${clue.npcId}`);
        console.log(`   - NPC Name: ${clue.npcName || '❌ NULL'}`);
        console.log(`   - Clue Type: ${clue.clueType || '❌ NULL'}`);
        console.log(`   - Meal Type: ${clue.mealType || '❌ NULL'}`);
        console.log(`   - Day: ${clue.day || '❌ NULL'}`);
        console.log(`   - Clue Text 类型: ${typeof clue.clueText}`);
        console.log(`   - Clue Text (前80字符): ${String(clue.clueText).substring(0, 80)}...`);
        console.log(`   - Created: ${clue.createdAt}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ 诊断完成\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 诊断失败:', error);
    process.exit(1);
  }
}

diagnose();
