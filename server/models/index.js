'use strict';

const fs = require('fs');
const path = require('path');

// 用本地自定义的单例实例，而不是读取 config.json 再 new Sequelize
const sequelize = require('../db'); 
const { Sequelize } = require('sequelize');

const basename = path.basename(__filename);
const db = {};

// 自动加载同目录下的所有模型（每个模型里必须是：const sequelize = require('../db')）
fs.readdirSync(__dirname)
  .filter(file =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    file.indexOf('.test.js') === -1
  )
  .forEach(file => {
    const model = require(path.join(__dirname, file));
    db[model.name] = model;
  });

// 模型间关联（如果模型暴露了 associate）
Object.keys(db).forEach(modelName => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
