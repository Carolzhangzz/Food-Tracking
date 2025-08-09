// 原来是 player_id: {...}
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  playerId: {                   // ✅ 用驼峰
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'playerId',          // ✅ 显式映射到表里的列名（可省，但更稳）
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'allowed_ids',     // ✅ 指定真实表名
  underscored: false,           // ✅ 不自动转蛇形
  freezeTableName: true,
});

module.exports = AllowedId;
