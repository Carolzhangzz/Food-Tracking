// models/Player.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Player = sequelize.define("Player", {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
    field: "playerId",            // ⭐ 真实列名
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "nickname",
  },
  firstLoginDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: "firstLoginDate",
  },
  currentDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: "currentDay",
  },
  gameCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: "gameCompleted",
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: "en",
    field: "language",
  },
  progress: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: "progress",
  },
  // 这两个让 Sequelize 用现有的时间戳列
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: "createdAt",
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: "updatedAt",
  },
}, {
  tableName: "Players",   // ⭐ 表名大小写与实际一致
  underscored: false,     // ⭐ 禁用 snake_case 映射
  timestamps: true,
});

module.exports = Player;
