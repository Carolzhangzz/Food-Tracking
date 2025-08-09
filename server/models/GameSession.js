const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../db');

const GameSession = sequelize.define('GameSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  playerId:    { type: DataTypes.STRING, allowNull: false, field: 'player_id' },
  sessionStart:{ type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW'), field: 'session_start' },
  sessionEnd:  { type: DataTypes.DATE, allowNull: true, field: 'session_end' },
  dayAtStart:  { type: DataTypes.INTEGER, allowNull: false, field: 'day_at_start' },
  dayAtEnd:    { type: DataTypes.INTEGER, allowNull: true, field: 'day_at_end' },

  createdAt:   { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:   { type: DataTypes.DATE, field: 'updated_at' },
}, {
  tableName: 'GameSessions', // 或者实际的表名
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['playerId'] },
    { fields: ['sessionStart'] },
  ]
});

module.exports = GameSession;
