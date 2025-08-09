const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GameSession = sequelize.define('GameSession', {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: 'players', key: 'playerId' },
  },
  sessionStart: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  sessionEnd: { type: DataTypes.DATE },
  dayAtStart: { type: DataTypes.INTEGER, allowNull: false },
  dayAtEnd: { type: DataTypes.INTEGER },
}, {
  tableName: 'game_sessions',
  indexes: [
    { fields: ['playerId'] },
    { fields: ['sessionStart'] },
  ],
});

module.exports = GameSession;
