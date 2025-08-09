// models/AllowedId.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  playerId: {  // ✅ 代码里统一用 camelCase
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'player_id',  // ✅ 数据库里的实际列名
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'used', // 这里可写可不写，列名一致时可省略
  },
}, {
  tableName: 'allowed_ids', // 确认数据库表名
  timestamps: false,        // 如果表里没有 created_at/updated_at
  underscored: true,        // 自动生成的字段会用 snake_case
});

module.exports = AllowedId;
