const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MealRecord = sequelize.define('MealRecord', {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: 'players', key: 'playerId' },
  },
  day: { type: DataTypes.INTEGER, allowNull: false },
  npcId: { type: DataTypes.STRING, allowNull: false },
  npcName: { type: DataTypes.STRING, allowNull: false },
  mealType: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'), allowNull: false },
  mealAnswers: { type: DataTypes.JSONB },
  conversationHistory: { type: DataTypes.JSONB },
  mealContent: { type: DataTypes.TEXT, allowNull: false },
  recordedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'meal_records',
  indexes: [
    { unique: true, fields: ['playerId', 'day', 'mealType'], name: 'uniq_player_day_mealType' },
    { fields: ['playerId', 'idx_day'] },
    { fields: ['playerId', 'idx_recordedAt'] },
  ],
});

module.exports = MealRecord;
