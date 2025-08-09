const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../db');

const PlayerProgress = sequelize.define('PlayerProgress', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  playerId:      { type: DataTypes.STRING, allowNull: false, field: 'player_id' },
  day:           { type: DataTypes.INTEGER, allowNull: false, field: 'day' },
  npcId:         { type: DataTypes.STRING, allowNull: false, field: 'npc_id' },
  unlockedAt:    { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW'), field: 'unlocked_at' },
  completedAt:   { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  mealsRecorded: { type: DataTypes.INTEGER, defaultValue: 0, field: 'meals_recorded' },
  hasRecordedMeal: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'has_recorded_meal' },

  createdAt:     { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:     { type: DataTypes.DATE, field: 'updated_at' },
}, {
  tableName: 'PlayerProgresses', // 或真实表名
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['playerId','day'], name: 'unique_player_day' },
    { fields: ['playerId'] },
  ]
});

module.exports = PlayerProgress;
