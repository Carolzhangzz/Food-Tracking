
const express = require("express");
const router = express.Router();
const Player = require("../models/Player");
const FoodLog = require("../models/FoodLog"); 

router.post("/record-meal", async (req, res) => {
  const { playerId, npcId, mealType, journalRawText, journalSummary, timestamp } = req.body;

  try {
    const player = await Player.findOne({ where: { playerId: String(playerId) } });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const newLog = await FoodLog.create({
      player_id: player.id,
      npc_id: npcId,
      meal_type: mealType,
      journal_raw_text: journalRawText,
      journal_summary: journalSummary || null,
      timestamp,
    });

    res.json({ success: true, recordId: newLog.id });
  } catch (error) {
    console.error("Error recording meal:", error);
    res.status(500).json({ error: "Failed to record meal" });
  }
});


module.exports = router;
