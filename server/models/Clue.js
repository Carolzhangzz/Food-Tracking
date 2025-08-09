// server/models/Clue.js
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
  tableName: 'Clues',      // ✅ 和其他表风格一致（首字母大写复数）
  timestamps: true,        // 如果不想要 createdAt/updatedAt 就改成 false
  indexes: [
    // ✅ 索引里的字段名必须用“模型属性名”（camelCase），不要写底层列名
    { unique: true, name: 'unique_player_npc_day_clue', fields: ['playerId', 'npcId', 'day'] },
    { name: 'idx_clues_player_id', fields: ['playerId'] },
    { name: 'idx_clues_day', fields: ['day'] },
  ],
});

module.exports = Clue;
