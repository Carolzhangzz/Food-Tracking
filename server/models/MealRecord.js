// models/MealRecord.js - 修正后的餐食记录模型
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
    type: DataTypes.JSONB, // 存储固定问题的答案
    allowNull: true,
  },
  conversationHistory: {
    type: DataTypes.JSONB, // 存储对话历史
    allowNull: true,
  },
  mealContent: {
    type: DataTypes.TEXT, // 主要的餐食描述内容
    allowNull: false,
  },
  recordedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    {
      fields: ['playerId', 'day']
    },
    {
      fields: ['playerId', 'recordedAt']
    }
  ]
});

module.exports = MealRecord;