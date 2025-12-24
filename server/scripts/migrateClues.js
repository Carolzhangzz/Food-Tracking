// server/scripts/migrateClues.js
// 为Clues表添加新字段

const sequelize = require('../db');

async function migrateClues() {
  try {
    console.log('🔄 开始迁移Clues表...');
    
    // 添加新字段（如果不存在）
    const queries = [
      `ALTER TABLE "Clues" ADD COLUMN IF NOT EXISTS "npcName" VARCHAR(255)`,
      `ALTER TABLE "Clues" ADD COLUMN IF NOT EXISTS "mealType" VARCHAR(50)`,
      `ALTER TABLE "Clues" ADD COLUMN IF NOT EXISTS "clueType" VARCHAR(50) DEFAULT 'true'`,
      `ALTER TABLE "Clues" ADD COLUMN IF NOT EXISTS "keywords" TEXT`,
      `ALTER TABLE "Clues" ADD COLUMN IF NOT EXISTS "shortVersion" TEXT`,
      `ALTER TABLE "Clues" ADD COLUMN IF NOT EXISTS "nextNPC" VARCHAR(255)`,
    ];
    
    for (const query of queries) {
      try {
        await sequelize.query(query);
        console.log(`✅ ${query.substring(0, 60)}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⏭️ 字段已存在，跳过`);
        } else {
          console.error(`❌ 执行失败: ${err.message}`);
        }
      }
    }
    
    // 移除唯一约束（如果存在），因为现在一个NPC可以给多个线索
    try {
      await sequelize.query(`
        ALTER TABLE "Clues" DROP CONSTRAINT IF EXISTS "unique_player_npc_day_clue"
      `);
      console.log('✅ 移除了旧的唯一约束');
    } catch (err) {
      console.log('⏭️ 约束不存在或已移除');
    }
    
    console.log('✅ Clues表迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrateClues();

