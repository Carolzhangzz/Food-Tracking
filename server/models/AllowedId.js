// server/models/AllowedId.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  playerId: { type: DataTypes.STRING, allowNull: false, unique: true },
  used:     { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'allowed_ids',   // ✅ 表名固定
  timestamps: true,           // ✅ 会有 createdAt / updatedAt（camelCase 列名）
  indexes: [
    { unique: true, fields: ['playerId'] }, // ✅ 用属性名
  ],
});

module.exports = AllowedId;
