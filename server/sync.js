// server/sync.js
const sequelize = require('./db');
const AllowedId = require('./models/AllowedId');
const Player = require('./models/Player');
const IntroScript = require('./models/IntroScript');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB 连接成功');

    await IntroScript.sync({ alter: true });  // 创建或更新表
    console.log('✅ IntroScript 表同步完成');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
