// server/db.js - PostgreSQL 配置
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Heroku 可能需要关闭严格 SSL 验证
        }
      }
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres'
      }
    );

module.exports = sequelize;

//
// let sequelize;
//
// if (process.env.DATABASE_URL) {
//   // 生产环境或使用完整的 DATABASE_URL
//   sequelize = new Sequelize(process.env.DATABASE_URL, {
//     dialect: 'postgres',
//     dialectOptions: {
//       ssl: process.env.NODE_ENV === 'production' ? {
//         require: true,
//         rejectUnauthorized: false
//       } : false
//     },
//     logging: process.env.NODE_ENV === 'development' ? console.log : false,
//   });
// } else {
//   // 开发环境，使用分离的配置
//   sequelize = new Sequelize({
//     database: process.env.DB_NAME || 'rpg_game_db',
//     username: process.env.DB_USER || 'postgres',
//     password: process.env.DB_PASS || 'password',
//     host: process.env.DB_HOST || 'localhost',
//     port: process.env.DB_PORT || 5432,
//     dialect: 'postgres',
//     logging: process.env.NODE_ENV === 'development' ? console.log : false,
//     pool: {
//       max: 5,
//       min: 0,
//       acquire: 30000,
//       idle: 10000,
//     },
//   });
// }
//
// module.exports = sequelize;