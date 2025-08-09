const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AllowedId = sequelize.define('AllowedId', {
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'player_id',
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'used',
  },
}, {
  tableName: 'allowed_ids',   // 按你的实际表名
  timestamps: false,
  underscored: true,
});

module.exports = AllowedId;
