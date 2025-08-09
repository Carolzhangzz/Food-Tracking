const { DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../db");

const Player = sequelize.define("Player", {
  // 若库里就是 player_id，则加 field；否则去掉 field 保持现状
  playerId: { type: DataTypes.STRING, allowNull: false, unique: true, primaryKey: true, field: 'player_id' },
  nickname: { type: DataTypes.STRING, allowNull: true, field: 'nickname' },
  firstLoginDate: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'first_login_date' },
  currentDay: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: false, field: 'current_day' },
  gameCompleted: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'game_completed' },
  language: { type: DataTypes.STRING, defaultValue: 'en', field: 'language' },
  progress: { type: DataTypes.JSONB, defaultValue: {}, field: 'progress' },

  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  tableName: 'Players',
  timestamps: true,
  underscored: true,
});

module.exports = Player;
