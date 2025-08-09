const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ConversationHistory = sequelize.define('ConversationHistory', {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: 'players', key: 'playerId' },
  },
  npcId: { type: DataTypes.STRING, allowNull: false },
  day: { type: DataTypes.INTEGER, allowNull: false },
  sessionId: { type: DataTypes.STRING },
  speaker: { type: DataTypes.ENUM('player', 'npc'), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  mealType: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner') },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'conversation_history',
  indexes: [
    { fields: ['playerId'] },
    { fields: ['npcId', 'day'] },
    { fields: ['timestamp'] },
    { fields: ['playerId', 'day', 'mealType'] },
  ],
});

module.exports = ConversationHistory;
