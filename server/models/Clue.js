const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Clue = sequelize.define('Clue', {
  player_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  npc_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  clue_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Clue;
