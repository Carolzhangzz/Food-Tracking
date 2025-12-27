require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Clue } = require('../models');

async function clearClues() {
  try {
    const count = await Clue.destroy({
      where: {},
      truncate: true
    });
    
    console.log(`✅ 成功清除 ${count} 条线索记录`);
    console.log('💡 现在可以重新开始对话，线索将被正确保存。');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 清除失败:', error);
    process.exit(1);
  }
}

clearClues();
