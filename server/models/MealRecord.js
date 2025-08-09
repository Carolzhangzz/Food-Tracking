// models/MealRecord.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MealRecord = sequelize.define('MealRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id',
  },
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'playerId',
  },
  day: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'day',
  },
  npcId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'npcId',
  },
  npcName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'npcName',
  },
  mealType: {
    // PG 里是 enum_MealRecords_mealType，Sequelize 这边声明为 ENUM 即可复用现有类型
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
    allowNull: false,
    field: 'mealType',
  },
  mealAnswers: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'mealAnswers',
  },
  conversationHistory: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'conversationHistory',
  },
  mealContent: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'mealContent',
  },
  recordedAt: {
    type: DataTypes.DATE,
    allowNull: true,       // 表里是可空
    field: 'recordedAt',
    // 如果希望插入时自动填当前时间，打开这一行
    // defaultValue: DataTypes.NOW,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'createdAt',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updatedAt',
  },
}, {
  tableName: 'MealRecords',     // 精确匹配大小写
  timestamps: true,             // 对应 createdAt/updatedAt
  // freezeTableName: true,     // 非必需（已指定 tableName）
  indexes: [
    { fields: ['playerId', 'day'], name: 'meal_records_player_id_day' },
    { fields: ['playerId', 'recordedAt'], name: 'meal_records_player_id_recorded_at' },
  ],
});

module.exports = MealRecord;
