// models/Clue.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../db');

const Clue = sequelize.define('Clue', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' },
  playerId:   { type: DataTypes.STRING, allowNull: false, field: 'player_id' },
  npcId:      { type: DataTypes.STRING, allowNull: false, field: 'npc_id' },
  day:        { type: DataTypes.INTEGER, allowNull: false, field: 'day' },
  clueText:   { type: DataTypes.TEXT, allowNull: false, field: 'clue_text' },
  receivedAt: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW'), field: 'received_at' },
}, {
  tableName: 'Clues',   // 跟你日志里的表名一致
  timestamps: false,    // 先关掉，防止 SELECT "createdAt"/"updatedAt"
  underscored: true,
  indexes: [
    { unique: true, fields: ['playerId','npcId','day'], name: 'unique_player_npc_day_clue' },
    { fields: ['playerId'] },
    { fields: ['day'] },
  ],
});

module.exports = Clue;
