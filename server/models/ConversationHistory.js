// server/models/ConversationHistory.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ConversationHistory = sequelize.define('ConversationHistory', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  playerId:  { type: DataTypes.STRING, allowNull: false },
  npcId:     { type: DataTypes.STRING, allowNull: false },
  day:       { type: DataTypes.INTEGER, allowNull: false },
  sessionId: { type: DataTypes.STRING },
  speaker:   { type: DataTypes.ENUM('player', 'npc'), allowNull: false },
  content:   { type: DataTypes.TEXT, allowNull: false },
  mealType:  { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner') },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'ConversationHistories', // ✅ 与其它表命名风格一致
  timestamps: true,
  indexes: [
    { fields: ['playerId'], name: 'idx_convhist_player_id' },
    { fields: ['npcId', 'day'], name: 'idx_convhist_npc_day' },
    { fields: ['timestamp'], name: 'idx_convhist_timestamp' },
    { fields: ['playerId', 'day', 'mealType'], name: 'idx_convhist_player_day_meal' },
  ],
});

module.exports = ConversationHistory;
