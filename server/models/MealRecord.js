const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const MealRecord = sequelize.define("MealRecord", {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Players',
      key: 'playerId'
    }
  },
  day: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  npcId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  npcName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mealType: {
    type: DataTypes.ENUM("breakfast", "lunch", "dinner"),
    allowNull: false,
  },
  mealAnswers: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  conversationHistory: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  mealContent: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  recordedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['playerId', 'day', 'mealType'], // 🔹 保证一天的某一餐只会记录一次
      name: 'unique_player_day_mealType'
    },
    { fields: ['playerId', 'day'] },
    { fields: ['playerId', 'recordedAt'] }
  ]
});

module.exports = MealRecord;
