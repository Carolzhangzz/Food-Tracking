// models/ConversationHistory.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ConversationHistory = sequelize.define('ConversationHistory', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' },
  playerId:  { type: DataTypes.STRING, allowNull: false, field: 'player_id' },
  npcId:     { type: DataTypes.STRING, allowNull: false, field: 'npc_id' },
  day:       { type: DataTypes.INTEGER, allowNull: false, field: 'day' },
  sessionId: { type: DataTypes.STRING, field: 'session_id' },
  speaker:   { type: DataTypes.ENUM('player','npc'), allowNull: false, field: 'speaker' },
  content:   { type: DataTypes.TEXT, allowNull: false, field: 'content' },
  mealType:  { type: DataTypes.ENUM('breakfast','lunch','dinner'), field: 'meal_type' },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'timestamp' },

  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  tableName: 'conversation_history',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['playerId'], name: 'idx_convhist_player_id' },
    { fields: ['npcId','day'], name: 'idx_convhist_npc_day' },
    { fields: ['timestamp'], name: 'idx_convhist_timestamp' },
    { fields: ['playerId','day','mealType'], name: 'idx_convhist_player_day_meal' },
  ],
});

module.exports = ConversationHistory;
