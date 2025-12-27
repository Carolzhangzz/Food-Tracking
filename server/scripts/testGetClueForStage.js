require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// 直接引入 gameRoutes.js 中的函数（需要修改exports）
// 这里我们重新实现一个简化版本来测试

const { getNPCClue } = require('../data/npcClues');

function getClueForNPCStage(npcId, language = "en", stage = 1) {
  const playerLanguage = language === "zh" ? "zh" : "en";
  
  const idMapping = {
    "village_head": "uncle_bo",
    "spice_woman": "spice_granny",
    "npc1": "uncle_bo",
    "npc2": "shop_owner",
    "npc3": "spice_granny",
    "npc4": "restaurant_owner",
    "npc5": "fisherman",
    "npc6": "old_friend",
    "npc7": "secret_apprentice"
  };
  const actualId = idMapping[npcId] || npcId;

  if (stage === 3) {
    const clue = getNPCClue(actualId, "true", 0, playerLanguage);
    console.log('🔍 getNPCClue 返回的对象:', clue);
    console.log('🔍 clue.text 类型:', typeof clue?.text);
    return clue ? clue.text : (playerLanguage === "zh" ? "做的好。" : "Great Job.");
  } else {
    const clue = getNPCClue(actualId, "vague", stage - 1, playerLanguage);
    console.log('🔍 getNPCClue 返回的对象:', clue);
    console.log('🔍 clue.text 类型:', typeof clue?.text);
    return clue ? clue.text : (playerLanguage === "zh" ? "做的好。" : "Great Job.");
  }
}

console.log('\n🧪 测试 getClueForNPCStage 函数\n');

console.log('===== Stage 3 (晚餐 - True Clue) =====');
const result3 = getClueForNPCStage('uncle_bo', 'en', 3);
console.log('\n📤 最终返回值类型:', typeof result3);
console.log('📤 最终返回值:', result3);

console.log('\n\n===== Stage 1 (早餐/午餐 - Vague 1) =====');
const result1 = getClueForNPCStage('uncle_bo', 'en', 1);
console.log('\n📤 最终返回值类型:', typeof result1);
console.log('📤 最终返回值:', result1);

process.exit(0);
