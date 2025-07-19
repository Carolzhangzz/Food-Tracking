// models/NPCProgress.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const NPCProgress = sequelize.define('NPCProgress', {
  player_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  npc_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  day_unlocked: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  meals_recorded_today: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = NPCProgress;