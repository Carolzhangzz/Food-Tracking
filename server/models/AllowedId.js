const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  playerId: { type: DataTypes.STRING, allowNull: false, unique: true },
  used:     { type: DataTypes.Boolean, defaultValue: false },
}, {
  tableName: 'allowed_ids',   // 表名小写带下划线
  timestamps: true,           // 会自动生成 createdAt / updatedAt（camelCase）
});

module.exports = AllowedId;
