// server/sync.js
const sequelize = require('./db');
const AllowedId = require('./models/AllowedId');
const Player = require('./models/Player');
const IntroScript = require('./models/IntroScript');
const Clue = require('./models/Clue');
const Conversation = require('./models/Conversation');
const NPCProgress = require('./models/NPCProgress');
const FoodLog = require('./models/FoodLog');

(async () => {
  try {

    await sequelize.sync({ alter: true });
    console.log('✅ 数据库模型同步完成');

    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    await IntroScript.sync({ alter: true });
    console.log('✅ IntroScript 表同步完成');

    await AllowedId.sync({ alter: true });
    console.log('✅ AllowedId 表同步完成');

    await Player.sync({ alter: true });

    console.log('✅ Player 表同步完成');

    await NPCProgress.sync({ alter: true });
    console.log('✅ NPCProgress 表同步完成');

    await FoodLog.sync({ alter: true });
    console.log('✅ FoodLog 表同步完成');

    await Clue.sync({ alter: true });
    console.log('✅ Clue 表同步完成');

    await Conversation.sync({ alter: true });
    console.log('✅ Conversation 表同步完成');  

    process.exit(0);
  } catch (err) {
    console.error('❌ 同步出错:', err);
    process.exit(1);
  }
})();
