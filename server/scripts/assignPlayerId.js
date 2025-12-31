// server/scripts/assignPlayerId.js
// 用于分配玩家 ID 的管理脚本

const { Player, AllowedId, sequelize } = require('../models');

/**
 * 批量创建玩家 ID
 * @param {number} count - 要创建的 ID 数量
 * @param {number} startFrom - 起始编号（默认 1）
 */
async function createPlayerIds(count = 50, startFrom = 1) {
  try {
    await sequelize.sync();
    
    const ids = [];
    for (let i = startFrom; i < startFrom + count; i++) {
      const playerId = String(i).padStart(3, '0');
      ids.push({ playerId, used: false });
    }
    
    await AllowedId.bulkCreate(ids, { 
      ignoreDuplicates: true 
    });
    
    console.log(`✅ 成功创建 ${count} 个玩家 ID（${String(startFrom).padStart(3, '0')} - ${String(startFrom + count - 1).padStart(3, '0')}）`);
  } catch (error) {
    console.error('❌ 创建 ID 失败:', error);
  }
}

/**
 * 分配玩家 ID
 * @param {string} playerEmail - 玩家邮箱
 * @param {string} playerName - 玩家姓名
 */
async function assignPlayerId(playerEmail, playerName) {
  try {
    await sequelize.sync();
    
    // 查找未使用的 ID
    const availableId = await AllowedId.findOne({
      where: { used: false },
      order: [['playerId', 'ASC']]
    });
    
    if (!availableId) {
      console.log('❌ 没有可用的 ID 了！请先创建更多 ID。');
      return null;
    }
    
    // 标记为已使用
    await availableId.update({
      used: true,
      assignedTo: `${playerName} <${playerEmail}>`
    });
    
    console.log('');
    console.log('✅ ID 分配成功！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🆔 玩家 ID: ${availableId.playerId}`);
    console.log(`👤 姓名: ${playerName}`);
    console.log(`📧 邮箱: ${playerEmail}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📧 请将以下信息发送给玩家：');
    console.log('');
    console.log(`亲爱的 ${playerName}，`);
    console.log('');
    console.log('欢迎来到《美食村之旅》！');
    console.log('');
    console.log(`🆔 你的玩家 ID：${availableId.playerId}`);
    console.log(`🎮 游戏链接：[你的游戏URL]`);
    console.log('');
    console.log('祝游戏愉快！🍜✨');
    console.log('');
    
    return availableId.playerId;
  } catch (error) {
    console.error('❌ 分配 ID 失败:', error);
    return null;
  }
}

/**
 * 查看可用 ID
 */
async function listAvailableIds() {
  try {
    await sequelize.sync();
    
    const available = await AllowedId.findAll({
      where: { used: false },
      order: [['playerId', 'ASC']]
    });
    
    const used = await AllowedId.count({ where: { used: true } });
    const total = await AllowedId.count();
    
    console.log('');
    console.log('📊 玩家 ID 统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`总数: ${total}`);
    console.log(`已使用: ${used}`);
    console.log(`剩余: ${available.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    if (available.length > 0) {
      console.log('🆓 可用的 ID（前 20 个）:');
      available.slice(0, 20).forEach(id => {
        console.log(`  - ${id.playerId}`);
      });
      if (available.length > 20) {
        console.log(`  ... 还有 ${available.length - 20} 个`);
      }
    } else {
      console.log('❌ 没有可用的 ID 了！');
    }
    console.log('');
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

/**
 * 查看已分配的 ID
 */
async function listAssignedIds() {
  try {
    await sequelize.sync();
    
    const assigned = await AllowedId.findAll({
      where: { used: true },
      order: [['playerId', 'ASC']]
    });
    
    console.log('');
    console.log(`📋 已分配的玩家 ID（共 ${assigned.length} 个）`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    assigned.forEach(id => {
      console.log(`${id.playerId} → ${id.assignedTo || '未记录'}`);
    });
    
    console.log('');
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

// 命令行使用
const command = process.argv[2];

(async () => {
  try {
    switch (command) {
      case 'create':
        const count = parseInt(process.argv[3]) || 50;
        const startFrom = parseInt(process.argv[4]) || 1;
        await createPlayerIds(count, startFrom);
        break;
        
      case 'assign':
        const name = process.argv[3];
        const email = process.argv[4];
        if (!name || !email) {
          console.log('用法: node assignPlayerId.js assign "玩家姓名" "email@example.com"');
          process.exit(1);
        }
        await assignPlayerId(email, name);
        break;
        
      case 'list':
        await listAvailableIds();
        break;
        
      case 'assigned':
        await listAssignedIds();
        break;
        
      default:
        console.log('');
        console.log('🎮 玩家 ID 管理工具');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('用法:');
        console.log('  node assignPlayerId.js create [数量] [起始编号]');
        console.log('    示例: node assignPlayerId.js create 50 1');
        console.log('    创建 50 个 ID，从 001 开始');
        console.log('');
        console.log('  node assignPlayerId.js assign "姓名" "邮箱"');
        console.log('    示例: node assignPlayerId.js assign "张三" "zhang@email.com"');
        console.log('    分配一个 ID 给玩家');
        console.log('');
        console.log('  node assignPlayerId.js list');
        console.log('    查看所有可用的 ID');
        console.log('');
        console.log('  node assignPlayerId.js assigned');
        console.log('    查看所有已分配的 ID');
        console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
})();

module.exports = {
  createPlayerIds,
  assignPlayerId,
  listAvailableIds,
  listAssignedIds
};

