// models/Player.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Player = sequelize.define('Player', {
  // 主键用业务 ID
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firstLoginDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  currentDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  gameCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en',
  },
  progress: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'Players',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['playerId'] },
  ],
});

module.exports = Player;
