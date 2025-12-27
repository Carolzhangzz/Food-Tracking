require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// 测试从 npcClues.js 获取线索
const { getNPCClue, getNPCName } = require('../data/npcClues');

console.log('\n🧪 测试线索获取功能\n');

// 测试 Uncle Bo 的线索
console.log('1️⃣ 测试 Uncle Bo (uncle_bo)');
console.log('   英文名字:', getNPCName('uncle_bo', 'en'));
console.log('   中文名字:', getNPCName('uncle_bo', 'zh'));

console.log('\n   Vague Clue 1 (EN):');
const vague1 = getNPCClue('uncle_bo', 'vague', 0, 'en');
console.log('   ', vague1);

console.log('\n   Vague Clue 2 (EN):');
const vague2 = getNPCClue('uncle_bo', 'vague', 1, 'en');
console.log('   ', vague2);

console.log('\n   True Clue (EN):');
const trueClue = getNPCClue('uncle_bo', 'true', 0, 'en');
console.log('   ', trueClue);

process.exit(0);
