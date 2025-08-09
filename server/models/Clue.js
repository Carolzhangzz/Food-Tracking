// models/Clue.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../db');

const Clue = sequelize.define('Clue', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id' },
  playerId:    { type: DataTypes.STRING, allowNull: false, field: 'player_id', references: { model: 'Players', key: 'playerId' } },
  npcId:       { type: DataTypes.STRING, allowNull: false, field: 'npc_id' },
  day:         { type: DataTypes.INTEGER, allowNull: false, field: 'day' },
  clueText:    { type: DataTypes.TEXT, allowNull: false, field: 'clue_text' },
  receivedAt:  { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW'), field: 'received_at' },

  createdAt:   { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:   { type: DataTypes.DATE, field: 'updated_at' },
}, {
  tableName: 'Clues',          // 按 Heroku 日志里出现的表名
  timestamps: true,            // 日志里 SELECT 了 createdAt/updatedAt -> 说明表有这两列（或至少模型在查），给映射
  underscored: true,
  indexes: [
    { unique: true, fields: ['playerId','npcId','day'], name: 'unique_player_npc_day_clue' },
    { fields: ['playerId'] },
    { fields: ['day'] },
  ],
});

module.exports = Clue;
