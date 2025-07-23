// server/db.js

// for online postgres -- Lan
const { Sequelize } = require('sequelize');

// 优先读取 Heroku 提供的 DATABASE_URL 环境变量
const sequelize = new Sequelize(
  process.env.DATABASE_URL ||  // 优先使用 Heroku 环境变量
  'postgres://u3bj18hdqgqut2:ped5dfbc4c9b428a75c7becd00eb96d0dd78ac9bff90ed1eeb703b907f53a2962@c7itisjfjj8ril.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d37ihch0oqld7v',
  {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }
);

module.exports = sequelize;

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

//for localhost postgres -- Coral (package.json), deleted right now
//{
//  "name": "agent",
//  "version": "1.0.0",
//  "description": "",
//  "main": "index.js",
//  "scripts": {
//    "start": "nodemon index.js",
//    "test": "echo \"Error: no test specified\" && exit 1"
//  },
//  "type": "commonjs",
//  "author": "",
//  "license": "ISC",
//  "dependencies": {
//    "extract-json-from-string": "^1.0.1",
//    "openai": "^3.2.1",
//    "ws": "^8.13.0"
//  },
//  "devDependencies": {
//    "nodemon": "^2.0.22"
//  }
//}