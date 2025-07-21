const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const FoodLog = sequelize.define("FoodLog", {
  player_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  npc_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  meal_type: {
    type: DataTypes.ENUM("breakfast", "lunch", "dinner"),
    allowNull: false,
  },
  journal_raw_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  journal_summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = FoodLog;
