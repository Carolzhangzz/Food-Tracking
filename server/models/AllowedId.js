// server/models/AllowedId.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // 保持 camelCase，与你库里现有列一致（playerId、used、createdAt、updatedAt）
  playerId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },

  // ✅ 关键：一定是 DataTypes.BOOLEAN（全大写），不是 Boolean / 'BOOLEAN'
  used: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'allowed_ids', // 你已经用这个表名了
  timestamps: true,         // 会生成 createdAt / updatedAt（camelCase）
  // underscored: false,    // 默认 false，保持 camelCase 列名，和你现有表一致
});

module.exports = AllowedId;
