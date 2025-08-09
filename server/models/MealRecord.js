// models/MealRecord.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MealRecord = sequelize.define('MealRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  playerId:   { type: DataTypes.STRING, allowNull: false },
  day:        { type: DataTypes.INTEGER, allowNull: false },
  npcId:      { type: DataTypes.STRING, allowNull: false },
  npcName:    { type: DataTypes.STRING, allowNull: false },

  mealType:   { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'), allowNull: false },
  mealAnswers:         { type: DataTypes.JSONB, allowNull: true },
  conversationHistory: { type: DataTypes.JSONB, allowNull: true },

  mealContent: { type: DataTypes.TEXT, allowNull: false },
  recordedAt:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'MealRecords',
  timestamps: true,
  indexes: [
    { fields: ['playerId', 'day'], name: 'meal_records_player_id_day' },
    { fields: ['playerId', 'recordedAt'], name: 'meal_records_player_id_recorded_at' },
  ],
});

module.exports = MealRecord;
