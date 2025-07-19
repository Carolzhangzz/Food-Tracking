const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Player = sequelize.define("Player", {
  allowedId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  progress: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,   
    unique: true,
  }
});

module.exports = Player;
