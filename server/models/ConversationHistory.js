// models/AllowedId.js - 保留用于登录验证
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  player_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = AllowedId;