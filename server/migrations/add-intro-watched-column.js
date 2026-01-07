/**
 * 数据库迁移：为 PlayerProgresses 表添加 intro_watched 字段
 * 执行命令: node server/migrations/add-intro-watched-column.js
 */

const sequelize = require('../db');

async function addIntroWatchedColumn() {
  try {
    console.log('🔧 开始添加 intro_watched 字段...');

    // 添加 intro_watched 列
    await sequelize.query(`
      ALTER TABLE "PlayerProgresses" 
      ADD COLUMN IF NOT EXISTS intro_watched BOOLEAN DEFAULT false;
    `);

    console.log('✅ intro_watched 字段添加成功');
    
    // 为所有现有记录设置默认值 false（已执行过的记录视为已观看）
    const [results] = await sequelize.query(`
      UPDATE "PlayerProgresses" 
      SET intro_watched = false 
      WHERE intro_watched IS NULL;
    `);

    console.log(`✅ 已更新 ${results.rowCount || 0} 条现有记录`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

addIntroWatchedColumn();

