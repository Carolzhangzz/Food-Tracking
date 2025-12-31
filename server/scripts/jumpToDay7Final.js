require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Player, PlayerProgress, MealRecord, sequelize } = require('../models');

async function jump() {
  const playerId = '002';
  try {
    console.log(`🚀 正在为新玩家 ${playerId} 准备结局测试环境...`);

    // 1. 创建玩家
    const player = await Player.create({
      playerId,
      firstLoginDate: new Date(),
      currentDay: 7,
      gameCompleted: false,
      language: 'en'
    });

    // 2. 注入 1-6 天的模拟数据
    const foods = [
      ['Noodles', 'Sandwich', 'Pizza'],
      ['Eggs', 'Rice', 'Soup'],
      ['Porridge', 'Dumplings', 'Salad'],
      ['Pancakes', 'Burger', 'Steak'],
      ['Fruit', 'Pasta', 'Stew'],
      ['Bread', 'Chicken', 'Hotpot']
    ];

    for (let d = 1; d <= 6; d++) {
      const dayFoods = foods[d-1];
      const types = ['breakfast', 'lunch', 'dinner'];
      for (let i = 0; i < 3; i++) {
        await MealRecord.create({
          playerId, day: d, npcId: 'npc'+d, npcName: 'Gourmet',
          mealType: types[i], mealContent: dayFoods[i], mealAnswers: { Q4: dayFoods[i] }
        });
      }
      await PlayerProgress.create({
        playerId, day: d, npcId: 'npc'+d, mealsRecorded: 3, hasRecordedMeal: true
      });
    }

    // 3. 为第 7 天准备
    await PlayerProgress.create({
      playerId, day: 7, npcId: 'secret_apprentice', mealsRecorded: 2, hasRecordedMeal: true
    });
    // 补齐第 7 天前两餐
    await MealRecord.create({ playerId, day: 7, npcId: 'secret_apprentice', npcName: 'Mira', mealType: 'breakfast', mealContent: 'Tea', mealAnswers: { Q4: 'Tea' } });
    await MealRecord.create({ playerId, day: 7, npcId: 'secret_apprentice', npcName: 'Mira', mealType: 'lunch', mealContent: 'Rice', mealAnswers: { Q4: 'Rice' } });

    console.log('\n✅ 环境准备完成！');
    console.log('💡 请使用玩家 ID 002 登录，记录晚餐即可见证结局。');
    process.exit(0);
  } catch (e) {
    console.error('❌ 失败:', e);
    process.exit(1);
  }
}

jump();
