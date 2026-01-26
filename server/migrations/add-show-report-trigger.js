// migrations/add-show-report-trigger.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const sequelize = require('../db');

async function addShowReportTriggerColumn() {
  try {
    console.log('🔧 开始添加 showReportTrigger 列...');
    
    // 检查列是否已存在
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='Players' AND column_name='showReportTrigger';
    `);
    
    if (results.length > 0) {
      console.log('✅ showReportTrigger 列已存在，跳过迁移');
      process.exit(0);
    }
    
    // 添加新列
    await sequelize.query(`
      ALTER TABLE "Players" 
      ADD COLUMN "showReportTrigger" INTEGER NOT NULL DEFAULT 0;
    `);
    
    console.log('✅ 成功添加 showReportTrigger 列！');
    console.log('📊 所有现有玩家的 showReportTrigger 默认设置为 0');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

addShowReportTriggerColumn();
