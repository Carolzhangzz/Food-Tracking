// server/models/Player.js
// id：主键
// allowedId：关联你登录时用的ID
// nickname：以后可以给玩家起名字
// progress：存游戏进度，用JSON

const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Player = sequelize.define('Player', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  allowedId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  progress: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
});

module.exports = Player;
