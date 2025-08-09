// models/Player.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Player = sequelize.define("Player", {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
    field: 'playerId'
  },
  nickname: {
    type: DataTypes.STRING,
    field: 'nickname'
  },
  progress: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'progress'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'createdAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updatedAt'
  },
  firstLoginDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'firstLoginDate'
  },
  currentDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'currentDay'
  },
  gameCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'gameCompleted'
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en',
    field: 'language'
  }
}, {
  tableName: 'Players',
  timestamps: true
});

module.exports = Player;
