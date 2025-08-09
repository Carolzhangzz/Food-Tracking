const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Clue = sequelize.define('Clue', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  playerId:   { type: DataTypes.STRING, allowNull: false },
  npcId:      { type: DataTypes.STRING, allowNull: false },
  day:        { type: DataTypes.INTEGER, allowNull: false },
  clueText:   { type: DataTypes.TEXT, allowNull: false },
  receivedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'Clues',
  timestamps: true,  // 如果不需要 createdAt/updatedAt 就改 false
  indexes: [
    { unique: true, name: 'unique_player_npc_day_clue', fields: ['playerId','npcId','day'] },
    { name: 'idx_clues_player_id', fields: ['playerId'] },
    { name: 'idx_clues_day', fields: ['day'] },
  ],
});

module.exports = Clue;
