// models/AllowedId.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  playerId: {                 // 代码里用 camelCase
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'player_id',       // 表里是 snake_case
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'used',
  },
}, {
  tableName: 'allowed_ids',   // 按你的真实表名来
  timestamps: false,
  underscored: true,
});

module.exports = AllowedId;
