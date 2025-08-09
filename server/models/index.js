'use strict';

const fs = require('fs');
const path = require('path');
const basename = path.basename(__filename);

// 统一实例
const sequelize = require('../db');

const db = {};

// 自动加载同目录下的所有模型（排除自己）
fs.readdirSync(__dirname)
  .filter((file) =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    file.indexOf('.test.js') === -1
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file));
    db[model.name] = model;
  });

// 执行关联
Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;

module.exports = db;
