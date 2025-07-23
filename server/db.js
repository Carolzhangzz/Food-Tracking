// server/db.js


// for localhost postgres -- Coral
// const { Sequelize } = require('sequelize');
//
// //这里换成你自己的数据库名、用户、密码
// const sequelize = new Sequelize('gptrpg', 'postgres', 'abc123', {
//   host: 'localhost',
//   dialect: 'postgres',
//   logging: false,  // 可以关掉控制台的SQL打印
// });
//
// module.exports = sequelize;


// for online postgres -- Lan
const { Sequelize } = require('sequelize');

// 使用 Heroku 提供的 DATABASE_URL 环境变量
const sequelize = new Sequelize('postgres://u3bj18hdqgqut2:ped5dfbc4c9b428a75c7becd00eb96d0dd78ac9bff90ed1eeb703b907f53a2962@c7itisjfjj8ril.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d37ihch0oqld7v', {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,  // 对于 Heroku PostgreSQL 需要开启 SSL
      rejectUnauthorized: false,  // 禁用 SSL 认证
    },
  },
});

module.exports = sequelize;