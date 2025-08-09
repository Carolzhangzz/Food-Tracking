// models/AllowedId.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  // ⚠️ 这里的 field 要和数据库里【真实列名】一致
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'playerId',   // ← 如果 \d 显示是 playerId，就用它
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'used',       // 通常就是 used
  },
}, {
  tableName: 'allowed_ids', // 表名已经存在，无需改
  timestamps: false,
  underscored: false,       // 不强制 snake_case（避免再自动映射）
});

module.exports = AllowedId;
