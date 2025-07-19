const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Conversation = sequelize.define('Conversation', {
  player_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  npc_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  speaker: {
    type: DataTypes.ENUM('player', 'npc'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Conversation;



