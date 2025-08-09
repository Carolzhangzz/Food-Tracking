// models/AllowedId.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  // 属性名用 camelCase，field 指向真实列名（也是 camelCase）
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'playerId',     // ← 你的表里就是 "playerId"
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'used',         // ← 表里就是 "used"
  },
}, {
  tableName: 'allowed_ids', // 你的表名
  timestamps: true,         // 因为表里有 createdAt / updatedAt
  underscored: false,       // 列是驼峰，不用下划线
});

module.exports = AllowedId;
