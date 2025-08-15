// // server/db.js - PostgreSQL 配置
// const { Sequelize } = require('sequelize');
// require('dotenv').config();

// const sequelize = process.env.DATABASE_URL
//   ? new Sequelize(process.env.DATABASE_URL, {
//       dialect: 'postgres',
//       dialectOptions: {
//         ssl: {
//           require: true,
//           rejectUnauthorized: false // Heroku 可能需要关闭严格 SSL 验证
//         }
//       }
//     })
//   : new Sequelize(
//       process.env.DB_NAME,
//       process.env.DB_USER,
//       process.env.DB_PASS,
//       {
//         host: process.env.DB_HOST,
//         port: process.env.DB_PORT,
//         dialect: 'postgres'
//       }
//     );

// module.exports = sequelize;
require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false
    }
  );
}

module.exports = sequelize;
