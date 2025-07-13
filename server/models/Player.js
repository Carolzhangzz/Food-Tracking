// models/Player.js
const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  language: { type: String, default: 'en' },
  musicEnabled: { type: Boolean, default: true },
  unlockedNpc: { type: Number, default: 1 },
  npcStates: { type: Object, default: {} },
  lastLoginDate: { type: Date, default: Date.now },
  currentPosition: { x: Number, y: Number },
  gameDay: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Player', PlayerSchema);
