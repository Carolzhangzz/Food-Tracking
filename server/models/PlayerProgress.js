const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PlayerProgress = sequelize.define('PlayerProgress', {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: 'players', key: 'playerId' },
  },
  day: { type: DataTypes.INTEGER, allowNull: false },
  npcId: { type: DataTypes.STRING, allowNull: false },
  unlockedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  completedAt: { type: DataTypes.DATE },
  mealsRecorded: { type: DataTypes.INTEGER, defaultValue: 0 },
  hasRecordedMeal: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'player_progress',
  indexes: [
    { unique: true, fields: ['playerId', 'day'], name: 'unique_player_day' },
    { fields: ['playerId'] },
  ],
});

module.exports = PlayerProgress;
