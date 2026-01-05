// server/scripts/resetUser004.js
const { Player, PlayerProgress, MealRecord, Clue } = require('../models');
const { sequelize } = require('../models');

async function reset() {
  const playerId = '004';
  console.log(`🧹 正在重置用户 ${playerId} 到 Day 2...`);

  try {
    // 1. 更新 Player 表的 currentDay
    await Player.update({ currentDay: 2 }, { where: { playerId } });
    console.log('✅ Player 表已更新为 Day 2');

    // 2. 删除 Day 2 之后的进度
    const progressDeleted = await PlayerProgress.destroy({
      where: { 
        playerId,
        day: { [require('sequelize').Op.gt]: 2 }
      }
    });
    console.log(`✅ 已删除 ${progressDeleted} 条 Day 2 之后的进度记录`);

    // 3. 删除 Day 2 之后的餐食记录
    const mealsDeleted = await MealRecord.destroy({
      where: {
        playerId,
        day: { [require('sequelize').Op.gt]: 2 }
      }
    });
    console.log(`✅ 已删除 ${mealsDeleted} 条 Day 2 之后的餐食记录`);

    // 4. 删除 Day 2 之后的线索
    const cluesDeleted = await Clue.destroy({
      where: {
        playerId,
        day: { [require('sequelize').Op.gt]: 2 }
      }
    });
    console.log(`✅ 已删除 ${cluesDeleted} 条 Day 2 之后的线索记录`);

    console.log(`🎉 用户 ${playerId} 已成功重置到 Day 2！`);
  } catch (error) {
    console.error('❌ 重置失败:', error);
  } finally {
    await sequelize.close();
  }
}

reset();

