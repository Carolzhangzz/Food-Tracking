require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Player, MealRecord, Clue, PlayerProgress, ConversationHistory } = require('../models');

async function resetPlayerToDay1() {
  const playerId = process.argv[2];
  
  if (!playerId) {
    console.error('❌ 请提供玩家ID！');
    console.log('\n使用方法：');
    console.log('  node resetPlayerToDay1.js <playerId>');
    console.log('\n示例：');
    console.log('  node resetPlayerToDay1.js 026\n');
    process.exit(1);
  }

  try {
    console.log(`\n🔄 开始重置玩家 ${playerId} 到 Day 1...\n`);
    
    // 1. 检查玩家是否存在
    const player = await Player.findOne({ where: { playerId } });
    if (!player) {
      console.error(`❌ 找不到玩家 ${playerId}！`);
      process.exit(1);
    }
    
    console.log(`📊 当前状态：Day ${player.currentDay}, 首次登录: ${player.firstLoginDate}`);
    
    // 2. 删除餐食记录
    const mealCount = await MealRecord.destroy({
      where: { playerId }
    });
    console.log(`✅ 删除了 ${mealCount} 条餐食记录`);
    
    // 3. 删除线索记录
    const clueCount = await Clue.destroy({
      where: { playerId }
    });
    console.log(`✅ 删除了 ${clueCount} 条线索记录`);
    
    // 4. 删除对话历史
    const convCount = await ConversationHistory.destroy({
      where: { playerId }
    });
    console.log(`✅ 删除了 ${convCount} 条对话历史记录`);
    
    // 5. 删除 Day 2-7 的进度记录（保留 Day 1）
    const progressCount = await PlayerProgress.destroy({
      where: { 
        playerId,
        day: { [require('sequelize').Op.gt]: 1 }
      }
    });
    console.log(`✅ 删除了 ${progressCount} 条进度记录 (Day 2-7)`);
    
    // 6. 重置 Day 1 的进度（未观看intro）
    await PlayerProgress.update(
      { introWatched: false },
      { where: { playerId, day: 1 } }
    );
    console.log(`✅ 重置了 Day 1 的 intro 状态`);
    
    // 7. 更新玩家表：重置到 Day 1，保持首次登录时间不变
    await player.update({
      currentDay: 1,
      gameCompleted: false
    });
    console.log(`✅ 玩家天数已重置为 Day 1`);
    
    console.log('\n✅ 玩家 ' + playerId + ' 已完全重置到 Day 1！\n');
    console.log('📝 注意事项：');
    console.log('   1. 玩家需要清除浏览器缓存或使用无痕模式重新登录');
    console.log('   2. 首次登录时间保持不变，天数计算仍基于原始登录时间');
    console.log('   3. 如需完全重置（包括首次登录时间），请直接删除玩家记录后重新登录\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 重置失败:', error);
    process.exit(1);
  }
}

resetPlayerToDay1();
