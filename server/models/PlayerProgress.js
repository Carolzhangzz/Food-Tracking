// models/PlayerProgress.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../db');

const PlayerProgress = sequelize.define('PlayerProgress', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  playerId:        { type: DataTypes.STRING, allowNull: false, field: 'player_id' },
  day:             { type: DataTypes.INTEGER, allowNull: false, field: 'day' },
  npcId:           { type: DataTypes.STRING, allowNull: false, field: 'npc_id' },
  unlockedAt:      { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW'), field: 'unlocked_at' },
  completedAt:     { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  mealsRecorded:   { type: DataTypes.INTEGER, defaultValue: 0, field: 'meals_recorded' },
  hasRecordedMeal: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'has_recorded_meal' },

  // 🔧 新增：存储该天还剩哪些餐没吃
  availableMealTypes: { 
    type: DataTypes.TEXT, 
    allowNull: true, 
    defaultValue: '["breakfast", "lunch", "dinner"]',
    field: 'available_meal_types'
  },

  // 🎬 新增：标记NPC开场白是否已观看
  introWatched: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'intro_watched'
  },

  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  tableName: 'PlayerProgresses',
  timestamps: true,
  underscored: true,
  indexes: [
  { unique: true, name: 'unique_player_day', fields: [{ name: 'player_id' }, { name: 'day' }] },
  { name: 'player_progresses_player_id', fields: [{ name: 'player_id' }] },
]
,
});

module.exports = PlayerProgress;
