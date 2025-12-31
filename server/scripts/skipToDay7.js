require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MealRecord, Player, PlayerProgress, sequelize } = require('../models');

async function skip() {
  const playerId = '002';
  try {
    console.log(`🚀 正在为玩家 ${playerId} 准备全周数据...`);

    // 1. 更新玩家主表进度
    await Player.update({ currentDay: 7, gameCompleted: false }, { where: { playerId } });

    // 2. 清理相关的所有记录（由于外键关系，我们分步删除）
    await MealRecord.destroy({ where: { playerId } });
    await PlayerProgress.destroy({ where: { playerId } });

    // 3. 注入 1-6 天的数据
    const foods = [
      ['Rice congee', 'Stir-fry Noodles', 'Tofu soup'],
      ['Pancakes', 'Grilled Fish', 'Green Salad'],
      ['Oatmeal', 'Chicken Rice', 'Tomato Soup'],
      ['Dim Sum', 'Beef Brisket', 'Steam Fish'],
      ['Fruit Bowl', 'Roast Duck', 'Vegetable Wonton'],
      ['Eggs', 'Pasta', 'Mushroom Soup']
    ];

    for (let d = 1; d <= 6; d++) {
      const dayFoods = foods[d-1];
      const types = ['breakfast', 'lunch', 'dinner'];
      
      for (let i = 0; i < 3; i++) {
        await MealRecord.create({
          playerId,
          day: d,
          npcId: 'npc' + d,
          npcName: 'Gourmet Master',
          mealType: types[i],
          mealContent: dayFoods[i],
          mealAnswers: { Q4: dayFoods[i], Q5: "Good", Q6: "Healthy choice" }
        });
      }
      
      await PlayerProgress.create({
        playerId, day: d, npcId: 'npc'+d, mealsRecorded: 3, hasRecordedMeal: true, unlockedAt: new Date()
      });
    }

    // 4. 为第 7 天准备
    await MealRecord.create({
      playerId, day: 7, npcId: 'secret_apprentice', npcName: 'Mira',
      mealType: 'breakfast', mealContent: 'Herbal Tea', mealAnswers: { Q4: 'Herbal Tea' }
    });
    await MealRecord.create({
      playerId, day: 7, npcId: 'secret_apprentice', npcName: 'Mira',
      mealType: 'lunch', mealContent: 'Bamboo Rice', mealAnswers: { Q4: 'Bamboo Rice' }
    });

    await PlayerProgress.create({
      playerId, day: 7, npcId: 'secret_apprentice', mealsRecorded: 2, hasRecordedMeal: true, unlockedAt: new Date()
    });

    console.log('\n✅ 数据准备就绪！');
    console.log('📍 玩家 002 已处于第 7 天，完成了早餐和午餐。');
    console.log('💡 现在请去记录最后一份晚餐 (dinner)，见证结局。');
    process.exit(0);
  } catch (e) {
    console.error('❌ 准备失败:', e);
    process.exit(1);
  }
}

skip();
