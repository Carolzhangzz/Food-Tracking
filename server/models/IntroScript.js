const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const IntroScript = sequelize.define('IntroScript', {
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: false   // 👈 这样表里就不会再有 createdAt、updatedAt
});

module.exports = IntroScript;
