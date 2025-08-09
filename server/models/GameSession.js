// models/GameSession.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GameSession = sequelize.define('GameSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id',
  },
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'playerId',
  },
  sessionStart: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sessionStart',
  },
  sessionEnd: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sessionEnd',
  },
  dayAtStart: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'dayAtStart',
  },
  dayAtEnd: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'dayAtEnd',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'createdAt',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updatedAt',
  },
}, {
  tableName: 'GameSessions',  // 精确大小写匹配
  timestamps: true,           // 启用 Sequelize 自动维护 createdAt / updatedAt
});

module.exports = GameSession;
