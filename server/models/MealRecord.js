const { DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../db");

const MealRecord = sequelize.define("MealRecord", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  playerId:  { type: DataTypes.STRING, allowNull: false, field: 'player_id' },
  day:       { type: DataTypes.INTEGER, allowNull: false, field: 'day' },
  npcId:     { type: DataTypes.STRING, allowNull: false, field: 'npc_id' },
  npcName:   { type: DataTypes.STRING, allowNull: false, field: 'npc_name' },
  mealType:  { type: DataTypes.ENUM("breakfast","lunch","dinner"), allowNull: false, field: 'meal_type' },
  mealAnswers: { type: DataTypes.JSONB, allowNull: true, field: 'meal_answers' },
  conversationHistory: { type: DataTypes.JSONB, allowNull: true, field: 'conversation_history' },
  mealContent: { type: DataTypes.TEXT, allowNull: false, field: 'meal_content' },
  recordedAt: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW'), field: 'recorded_at' },

  createdAt:  { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:  { type: DataTypes.DATE, field: 'updated_at' },
}, {
  tableName: 'MealRecords',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['playerId','day'] },
    { fields: ['playerId','recordedAt'] },
  ]
});

module.exports = MealRecord;
