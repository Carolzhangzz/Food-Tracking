const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Clue = sequelize.define('Clue', {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Players',
      key: 'playerId'
    }
  },
  npcId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  day: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  clueText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  receivedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['playerId', 'npcId', 'day'], // 🔹 保证一个玩家每天一个 NPC 只能有一条线索
      name: 'unique_player_npc_day_clue'
    },
    { fields: ['playerId'] },
    { fields: ['day'] }
  ]
});

module.exports = Clue;
