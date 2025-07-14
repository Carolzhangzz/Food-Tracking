// server/models/AllowedId.js
// _id（主键，存登录ID）
// used（true/false）

const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  _id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
});

module.exports = AllowedId;
