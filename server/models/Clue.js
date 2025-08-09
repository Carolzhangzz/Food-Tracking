const {DataTypes} = require('sequelize');
const sequelize = require('../db');

const Clue = sequelize.define('Clue', {
    playerId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {model: 'players', key: 'playerId'},
    },
    npcId: {type: DataTypes.STRING, allowNull: false},
    day: {type: DataTypes.INTEGER, allowNull: false},
    clueText: {type: DataTypes.TEXT, allowNull: false},
    receivedAt: {type: DataTypes.DATE, defaultValue: DataTypes.NOW},
}, {
    tableName: 'clues',
    indexes: [
        {unique: true, fields: ['playerId', 'npcId', 'day'], name: 'uniq_clues_player_npc_day'},
        {fields: ['playerId'], name: 'idx_clues_player_id'},
        {fields: ['day'], name: 'idx_clues_day'}
    ],
});

module.exports = Clue;
