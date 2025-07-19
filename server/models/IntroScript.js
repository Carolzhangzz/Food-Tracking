const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const IntroScript = sequelize.define('IntroScript', {
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: false   
});

module.exports = IntroScript;
