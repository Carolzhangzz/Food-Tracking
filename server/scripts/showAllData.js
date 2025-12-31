require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Clue, MealRecord, Player, PlayerProgress, ConversationHistory } = require('../models');

async function showAllData() {
  try {
    console.log('\n📊 数据库全表概览\n');
    
    // 1. Players
    const players = await Player.findAll();
    console.log(`\n👤 Players (${players.length}):`);
    players.forEach(p => console.log(`   - ID: ${p.playerId}, Lang: ${p.language}, Day: ${p.currentDay}`));
    
    // 2. MealRecords (最近5条)
    const meals = await MealRecord.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
    console.log(`\n🍽️  MealRecords (最近5条):`);
    meals.forEach(m => console.log(`   - Player: ${m.playerId}, NPC: ${m.npcId}, Name: ${m.npcName}, Meal: ${m.mealType}, Day: ${m.day}`));
    
    // 3. Clues (最近5条)
    const clues = await Clue.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
    console.log(`\n🗝️  Clues (最近5条):`);
    clues.forEach(c => {
      console.log(`   - Player: ${c.playerId}, NPC: ${c.npcId}, Name: ${c.npcName}, Type: ${c.clueType}, Meal: ${c.mealType}`);
      console.log(`     Text: ${String(c.clueText).substring(0, 50)}...`);
    });
    
    // 4. PlayerProgress
    const progress = await PlayerProgress.findAll({ limit: 5, order: [['updatedAt', 'DESC']] });
    console.log(`\n📈 PlayerProgress (最近5条):`);
    progress.forEach(p => console.log(`   - Player: ${p.playerId}, Day: ${p.day}, NPC: ${p.npcId}, Meals: ${p.mealsRecorded}`));

    console.log('\n' + '='.repeat(40) + '\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ 获取数据失败:', error);
    process.exit(1);
  }
}

showAllData();

