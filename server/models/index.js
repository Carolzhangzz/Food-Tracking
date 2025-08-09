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
  // 处理Heroku在线数据库连接（使用环境变量DATABASE_URL）
  const herokuConfig = {
    dialect: config.dialect,          // 继承配置中的数据库类型（postgres）
    host: config.host,                // 继承主机配置（Heroku会忽略，以URL为准）
    port: config.port,                // 继承端口配置（Heroku会忽略，以URL为准）
    username: config.username,        // 继承用户名（Heroku会忽略，以URL为准）
    password: config.password,        // 继承密码（Heroku会忽略，以URL为准）
    database: config.database,        // 继承数据库名（Heroku会忽略，以URL为准）
    dialectOptions: {
      // 强制SSL连接（Heroku数据库必须）
      ssl: {
        require: true,
        rejectUnauthorized: false     // 跳过证书验证（解决Heroku连接问题）
      }
    }
  };
  // 使用Heroku提供的DATABASE_URL创建连接
  sequelize = new Sequelize(process.env[config.use_env_variable], herokuConfig);
} else {
  // 本地数据库连接配置（保持不变）
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      dialect: config.dialect,
      port: config.port,
      dialectOptions: config.dialectOptions  // 本地无需SSL，使用配置文件中的设置
    }
  );
}

// if (config.use_env_variable) {
//   sequelize = new Sequelize(process.env[config.use_env_variable], config);
// } else {
//   sequelize = new Sequelize(config.database, config.username, config.password, config);
// }
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
    // 直接导入模型实例（而非工厂函数）
    const model = require(path.join(__dirname, file));
    // 使用模型的名称作为键存入db对象
    db[model.name] = model;
  });

// 执行关联（如果模型定义了associate方法）
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;