require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Clue, Player } = require('../models');

async function checkClues() {
  try {
    const clues = await Clue.findAll({
      order: [['receivedAt', 'DESC']],
      limit: 10
    });
    
    console.log('\n📋 最近的10条线索记录：\n');
    clues.forEach((clue, index) => {
      console.log(`${index + 1}. NPC ID: ${clue.npcId}`);
      console.log(`   NPC Name: ${clue.npcName || '❌ NULL'}`);
      console.log(`   Clue Type: ${clue.clueType || '❌ NULL'}`);
      console.log(`   Clue Text: ${(clue.clueText || '❌ NULL').substring(0, 50)}...`);
      console.log(`   Day: ${clue.day}, Meal: ${clue.mealType}`);
      console.log('');
    });
    
    const total = await Clue.count();
    console.log(`\n总共有 ${total} 条线索记录`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkClues();
