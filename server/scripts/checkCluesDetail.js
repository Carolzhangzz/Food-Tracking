require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Clue } = require('../models');

async function checkClues() {
  try {
    const clues = await Clue.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('\n📋 最近的5条线索记录（完整信息）：\n');
    clues.forEach((clue, index) => {
      console.log(`${index + 1}. ================`);
      console.log(`   ID: ${clue.id}`);
      console.log(`   Player ID: ${clue.playerId}`);
      console.log(`   NPC ID: ${clue.npcId}`);
      console.log(`   NPC Name: ${clue.npcName || '❌ NULL'}`);
      console.log(`   Clue Type: ${clue.clueType || '❌ NULL'}`);
      console.log(`   Clue Text 类型: ${typeof clue.clueText}`);
      console.log(`   Clue Text (前100字符): ${String(clue.clueText).substring(0, 100)}...`);
      console.log(`   Day: ${clue.day}`);
      console.log(`   Meal Type: ${clue.mealType || '❌ NULL'}`);
      console.log(`   Created At: ${clue.createdAt}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkClues();
