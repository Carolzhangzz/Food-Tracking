// models/AllowedId.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  playerId: {                // ✅ 用 camelCase，和其它地方一致
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  used: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'allowed_ids',
  timestamps: true,
});

module.exports = AllowedId;
