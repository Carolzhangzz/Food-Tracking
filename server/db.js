// server/db.js
const { Sequelize } = require('sequelize');

// ⚠️ 这里换成你自己的数据库名、用户、密码
const sequelize = new Sequelize('gptrpg', 'postgres', 'abc123', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,  // 可以关掉控制台的SQL打印
});

module.exports = sequelize;
