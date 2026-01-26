// enable-final-report-032.js - 为 032 玩家启用 Final Report
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Player } = require('../models');

async function enableFinalReport() {
  try {
    const playerId = '032';
    
    console.log(`\n🔍 查找玩家 ${playerId}...`);
    const player = await Player.findOne({ where: { playerId } });
    
    if (!player) {
      console.log(`❌ 未找到玩家 ${playerId}`);
      process.exit(1);
    }
    
    console.log(`📊 当前状态:`);
    console.log(`   - currentDay: ${player.currentDay}`);
    console.log(`   - gameCompleted: ${player.gameCompleted}`);
    console.log(`   - showReportTrigger: ${player.showReportTrigger || 0}`);
    
    // 设置 gameCompleted 为 true，showReportTrigger 为 1
    await player.update({
      gameCompleted: true,
      showReportTrigger: 1
    });
    
    console.log(`\n✅ 已为玩家 ${playerId} 启用 Final Report！`);
    console.log(`📊 更新后状态:`);
    console.log(`   - gameCompleted: true`);
    console.log(`   - showReportTrigger: 1`);
    console.log(`\n玩家现在可以点击 🏆 按钮查看最终报告了！`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

enableFinalReport();
