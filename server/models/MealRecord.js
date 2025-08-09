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
  {
    unique: true,
    fields: ['playerId', 'day', 'mealType'],
    name: 'uniq_meal_player_day_type',
  },
  {
    fields: ['playerId', 'day'],
    name: 'idx_meal_records_player_id_day',   // ✅ 索引名可以叫 idx_xxx，但字段必须是 day
  },
  {
    fields: ['playerId', 'recordedAt'],
    name: 'idx_meal_records_player_id_recordedAt',
  },
],
});

module.exports = MealRecord;
