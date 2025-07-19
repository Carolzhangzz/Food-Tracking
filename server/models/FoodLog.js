const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const FoodLog = sequelize.define('FoodLog', {
  playerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mealType: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = FoodLog;
