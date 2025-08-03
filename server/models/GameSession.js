// models/GameSession.js - 游戏会话记录
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GameSession = sequelize.define('GameSession', {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Players',
      key: 'playerId'
    }
  },
  sessionStart: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  sessionEnd: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dayAtStart: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dayAtEnd: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  indexes: [
    {
      fields: ['playerId']
    },
    {
      fields: ['sessionStart']
    }
  ]
});

module.exports = GameSession;