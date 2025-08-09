// models/GameSession.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GameSession = sequelize.define('GameSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  playerId:   { type: DataTypes.STRING, allowNull: false },
  sessionStart: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  sessionEnd:   { type: DataTypes.DATE, allowNull: true },

  dayAtStart: { type: DataTypes.INTEGER, allowNull: false },
  dayAtEnd:   { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'GameSessions',
  timestamps: true,
  indexes: [
    { fields: ['playerId'] },
    { fields: ['sessionStart'] },
  ],
});

module.exports = GameSession;
