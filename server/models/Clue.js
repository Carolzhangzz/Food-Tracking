// models/Clue.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../db');

const Clue = sequelize.define('Clue', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'player_id',              // ★ 映射
    references: { model: 'Players', key: 'playerId' }
  },

  npcId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'npc_id',                 // ★ 映射
  },

  day: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'day',                    // 可省略，但写上更直观
  },

  clueText: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'clue_text',              // ★ 映射
  },

  receivedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn('NOW'),
    field: 'received_at',            // ★ 映射
  },

  // 如果表里有这两个列（created_at / updated_at），把 timestamps 打开并映射
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  tableName: 'Clues',                // 和库里的表名保持一致（区分大小写）
  timestamps: true,                  // 若表里没有这两个列就改成 false
  underscored: true,                 // 让自动生成的外键/时间戳用下划线风格
  indexes: [
    { unique: true, fields: ['playerId', 'npcId', 'day'], name: 'unique_player_npc_day_clue' },
    { fields: ['playerId'] },
    { fields: ['day'] }
  ]
});

module.exports = Clue;
