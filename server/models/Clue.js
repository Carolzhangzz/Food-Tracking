const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Clue = sequelize.define('Clue', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  playerId:   { type: DataTypes.STRING, allowNull: false },
  npcId:      { type: DataTypes.STRING, allowNull: false },
  npcName:    { type: DataTypes.STRING, allowNull: true }, // 🔧 NPC名称
  day:        { type: DataTypes.INTEGER, allowNull: false },
  mealType:   { type: DataTypes.STRING, allowNull: true }, // 🔧 breakfast/lunch/dinner
  clueType:   { type: DataTypes.STRING, allowNull: true, defaultValue: 'true' }, // 🔧 vague/true
  clueText:   { type: DataTypes.TEXT, allowNull: false },
  keywords:   { type: DataTypes.TEXT, allowNull: true }, // 🔧 JSON数组的关键词
  shortVersion: { type: DataTypes.TEXT, allowNull: true }, // 🔧 简短版本
  nextNPC:    { type: DataTypes.STRING, allowNull: true }, // 🔧 指向下一个NPC
  receivedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'Clues',
  timestamps: true,
  indexes: [
    { name: 'idx_clues_player_id', fields: ['playerId'] },
    { name: 'idx_clues_day', fields: ['day'] },
    { name: 'idx_clues_player_npc', fields: ['playerId', 'npcId'] },
  ],
});

module.exports = Clue;
