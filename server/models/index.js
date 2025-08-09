'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;

if (config.use_env_variable) {
  // Heroku 在线数据库连接
  const herokuConfig = {
    dialect: config.dialect,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false
  };
  sequelize = new Sequelize(process.env[config.use_env_variable], herokuConfig);
} else {
  // 本地数据库连接
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      dialect: config.dialect,
      port: config.port,
      dialectOptions: config.dialectOptions || {},
      logging: false
    }
  );
}

// ✅ 提前放到 db 里，防止模型里 require('.') 拿不到 sequelize
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// 读取并导入模型
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file));
    db[model.name] = model;
  });

// 关联模型
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
