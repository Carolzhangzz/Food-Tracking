// models/Player.js - 修正后的玩家模型
const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Player = sequelize.define("Player", {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,   
    unique: true,
    primaryKey: true,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firstLoginDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  currentDay: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
  },
  gameCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en',
  },
  progress: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
});

module.exports = Player;