/**
 * 修复用户 007 的进度异常
 * 
 * 问题：用户 007 只在 Day 1 记录了 1 餐午餐，但 currentDay 被设置为 5
 * 原因：旧代码在登录时如果日历天数 > currentDay，会直接跳到日历天数，而不检查中间天数是否有记录
 * 
 * 修复：将 currentDay 重置为 2（因为 Day 1 有记录，应该可以进入 Day 2）
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Player, PlayerProgress, MealRecord } = require('../models');

async function fixUser007() {
  console.log('🔧 开始修复用户 007 的进度异常...\n');

  const playerId = '007';

  try {
    // 1. 获取用户当前状态
    const player = await Player.findOne({ where: { playerId } });
    if (!player) {
      console.error('❌ 未找到用户 007');
      return;
    }

    console.log('📊 当前状态:');
    console.log(`   - playerId: ${player.playerId}`);
    console.log(`   - firstLoginDate: ${player.firstLoginDate}`);
    console.log(`   - currentDay: ${player.currentDay}`);
    console.log('');

    // 2. 获取所有餐食记录
    const meals = await MealRecord.findAll({
      where: { playerId },
      order: [['day', 'ASC'], ['recordedAt', 'ASC']]
    });

    console.log('🍽️  餐食记录:');
    meals.forEach(m => {
      console.log(`   - Day ${m.day}: ${m.mealType} (${m.recordedAt})`);
    });
    console.log('');

    // 3. 获取所有进度记录
    const progresses = await PlayerProgress.findAll({
      where: { playerId },
      order: [['day', 'ASC']]
    });

    console.log('🔓 当前解锁的 NPC:');
    progresses.forEach(p => {
      console.log(`   - Day ${p.day}: ${p.npcId} (${p.unlockedAt})`);
    });
    console.log('');

    // 4. 分析：应该在哪一天
    const daysWithMeals = new Set(meals.map(m => m.day));
    const maxDayWithMeal = Math.max(...Array.from(daysWithMeals), 0);
    const correctDay = maxDayWithMeal + 1; // 完成了 Day X，应该在 Day X+1

    console.log('📐 分析:');
    console.log(`   - 有记录的天数: ${Array.from(daysWithMeals).join(', ')}`);
    console.log(`   - 最后有记录的天数: Day ${maxDayWithMeal}`);
    console.log(`   - 正确的 currentDay 应该是: ${correctDay}`);
    console.log('');

    // 5. 修复
    if (player.currentDay !== correctDay) {
      console.log(`🔧 执行修复: ${player.currentDay} → ${correctDay}`);
      
      await player.update({ currentDay: correctDay });
      
      // 删除不应该存在的 PlayerProgress 记录
      const progressesToDelete = progresses.filter(p => p.day > correctDay);
      if (progressesToDelete.length > 0) {
        console.log(`🗑️  删除多余的进度记录:`);
        for (const progress of progressesToDelete) {
          console.log(`   - 删除 Day ${progress.day}: ${progress.npcId}`);
          await progress.destroy();
        }
      }

      // 确保 correctDay 的进度记录存在
      const correctDayProgress = await PlayerProgress.findOne({
        where: { playerId, day: correctDay }
      });

      if (!correctDayProgress) {
        const npcMapping = {
          1: 'uncle_bo',
          2: 'shop_owner',
          3: 'spice_granny',
          4: 'restaurant_owner',
          5: 'fisherman',
          6: 'old_friend',
          7: 'secret_apprentice'
        };

        const npcId = npcMapping[correctDay];
        if (npcId) {
          console.log(`✨ 创建 Day ${correctDay} 的进度记录: ${npcId}`);
          await PlayerProgress.create({
            playerId,
            day: correctDay,
            npcId,
            unlockedAt: new Date()
          });
        }
      }

      console.log('');
      console.log('✅ 修复完成！');
    } else {
      console.log('✅ 数据正常，无需修复');
    }

  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

// 执行修复
fixUser007().then(() => {
  console.log('\n🎉 脚本执行完毕');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

