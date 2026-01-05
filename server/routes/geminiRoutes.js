const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 🎯 获取所有可用的 Gemini API Keys
const getGeminiKeys = () => {
  const keys = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('GEMINI_API_KEY_') && process.env[key]) {
      keys.push(process.env[key]);
    }
  });
  return keys;
};

// 🎯 NPC 详细设定映射 (根据用户提供的 Prompt Design)
const NPC_PERSONAS = {
  uncle_bo: {
    name: "Uncle Bo",
    role: "Village Head of Gourmet Village",
    style: "Calm, reflective elder. Gentle, slow-paced, warm. Short, grounded sentences. Choice words. Guided suggestions, not instructions. Nostalgic and philosophical.",
    background: "Long-time friend of Chef Hua. Feels something is wrong (fire still warm when he vanished). Suggests player follows Hua's habit of food journaling to unravel the mystery. Patient elder guide. The player was Hua's apprentice who moved to city and returned to find the truth.",
    examples: [
      "Ah, lunch—your master always said that was the meal that showed your mood. At midday, your timing, your fire, and your heart all had to be steady.",
      "He used to say: ‘Whoever can take a meal seriously, can take life seriously.’",
      "I can’t recall the full story, but he did mention someone—said, ‘That one’s quiet on the outside, but full of flavor where it counts.’",
      "Your master kept visiting a certain place recently. Wait, where’s it?"
    ]
  },
  shop_owner: {
    name: "Grace",
    role: "Shop Owner",
    style: "Brisk clarity, no-nonsense warmth. Practical, perceptive, one step ahead. Friendly but direct. Confident, matter-of-fact sentences with dry humor. No wasted words.",
    background: "Runs the shop, listens between the lines. Nudges player with curiosity and quiet encouragement. The player was Hua's apprentice.",
    examples: [
      "I get all kinds of customers. Some just buy the basics, others chase bold flavors like Chef Hua. Come back after your next meal — I’ll try to recall more about him."
    ]
  },
  spice_granny: {
    name: "Alice",
    role: "Spice Woman",
    style: "Dry, steady, precise. Metaphor and suggestion. Quiet sharpness. Grounded presence, deep-rooted knowledge. Doesn't explain—hints. Values those who listen and reflect. Tone may seem distant but hides deep care.",
    background: "Spice vendor for decades. Knew Chef Hua's essence—flavor as memory, balance, mood. Lingering impact like an aftertaste.",
    examples: [
      "Flavor isn't just taste—it's memory, balance, and mood."
    ]
  },
  restaurant_owner: {
    name: "Han",
    role: "Restaurant Owner",
    style: "Practical and blunt. Does not hide opinions. Values efficiency, stability, and family. Respects hard work, distrusts dreams that can't feed family. Short and plain words.",
    background: "Chef Hua's former business partner and rival. Valued growth/efficiency vs Hua's soul/quality. Clashed and stayed to run the restaurant alone.",
    examples: [
      "He and I used to argue about portion size. He said food should satisfy. I said it should sell."
    ]
  },
  fisherman: {
    name: "Leon",
    role: "Fisherman",
    style: "Quiet, reserved. Speak in images or metaphors, not direct advice. Non-confrontational, quiet honesty. Steady, trustworthy, rooted in river rhythms.",
    background: "Lives by the river. Deep respect for Hua. Saw Hua lit a fire by the river and made porridge before vanishing. Hua left a pot: 'When the tide rises, open it.' Sealed ever since. Observes closely.",
    examples: [
      "Your master used to say, ‘You can read a man’s heart in the way he serves a bowl of porridge’"
    ]
  },
  old_friend: {
    name: "Rowan",
    role: "Caretaker of quiet memories",
    style: "Casual, warm, teasing. Undercurrent of sincerity. Easy rhythm of an old friend. Fragments, food stories, inside jokes. Like an older cousin. easygoing, nostalgic, a bit sad beneath laughter.",
    background: "Once Hua's apprentice. Humble life. glad to see player back. Missed swapping stories. Ambitious player left village, Rowan respected spirit but disagreed. Wants to help but won't push.",
    examples: [
      "Glad to see you back. I missed having someone to swap stories with.",
      "Kitchen jokes and memories of too many shifts together."
    ]
  },
  secret_apprentice: {
    name: "Mira",
    role: "Last apprentice of Master Hua",
    style: "Warm, curious, enthusiastic. Childlike honesty and quiet insight. Vivid, sensory language (food/nature). Freely expresses feelings.",
    background: "Hua's last apprentice (last year). Taught instinct over recipes. Lives in wooden pavilion. Hua left a box in her attic for the player a week ago. Growing excited and emotional to help open it.",
    examples: [
      "The soup today tasted lonely. Maybe because I ate it too fast. Master said good soup needs company — and not just salt"
    ]
  }
};

function generateImprovedSystemPrompt(npcId, questionControl = {}, mealType = "this meal", coreQuestion = null, lang = "en") {
  const npc = NPC_PERSONAS[npcId] || NPC_PERSONAS.uncle_bo;
  const { currentQuestionId = null } = questionControl;

  const styleConstraint = `STRICT PERSONALITY & STYLE:
- Name: ${npc.name} (${npc.role})
- Persona: ${npc.style}
- Background: ${npc.background}
- Constraints: KEEP RESPONSES CONCISE (max 15 words per sentence). Conversational, interactive, gameful. DO NOT expose inner thoughts in parentheses.`;

  let modeInstruction = "";
  if (currentQuestionId) {
    const instruction = coreQuestion ? coreQuestion[lang] || coreQuestion.en : `CONTINUE CONVERSATION about ${mealType}.`;
    modeInstruction = `JOURNALING MODE:
- Recording meal: ${mealType}
- Question Stage: ${currentQuestionId}
- TASK: ${instruction}
- Completion Rule: Once the player has answered ALL sequence questions, say: "Thanks for sharing your meal with me." AND STOP.`;
  } else {
    modeInstruction = `FREE CHAT MODE:
- Respond to the player's message in character.
- You can subtly mention that if they want to record a meal (breakfast, lunch, or dinner), you are ready to help.`;
  }

  const prompt = `You are playing the role of ${npc.name} in an interactive game. 

${styleConstraint}

BACKGROUND STORY SUMMARY:
Master Chef Hua disappeared. The player (his former apprentice) returned to unravel the mystery. Hua had a habit of food journaling.

${modeInstruction}

IMPORTANT GUIDELINES:
1. SHARE YOUR OWN MEAL: Throughout the conversation, share what you (NPC) are eating. Must have natural ingredients, healthy preparation (but don't use the word "healthy"). Stick with narrative story.
2. Character-driven response: Give a short remark based on the player's previous input in your unique voice.
3. If the player didn't give a complete answer or was vague, nudge them gently in character.

EXAMPLES OF YOUR VOICE:
${npc.examples.map(ex => "- " + ex).join("\n")}

Respond in ${lang === "zh" ? "Chinese" : "English"}.`;

  return prompt;
}

router.post("/gemini-chat", async (req, res) => {
  const { userInput, npcId, mealType, dialogHistory, mealAnswers, questionControl = {}, coreQuestion = null, lang = "en" } = req.body;
  
  console.log(`🤖 [Gemini] Chat Request: NPC=${npcId}, Meal=${mealType}, Mode=${questionControl.currentQuestionId ? 'Journaling' : 'FreeChat'}`);

  const apiKeys = getGeminiKeys();
  if (apiKeys.length === 0) {
    return res.status(500).json({ success: false, error: "No Gemini API Keys configured" });
  }

  const systemPrompt = generateImprovedSystemPrompt(npcId, questionControl, mealType, coreQuestion, lang);
  let lastError = null;

  // 🔄 轮询尝试每个 Key
  for (let i = 0; i < apiKeys.length; i++) {
    const currentKey = apiKeys[i];
    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        systemInstruction: systemPrompt 
      });

      // Format history for Gemini
      const contents = (dialogHistory || []).slice(-10).map(msg => ({
        role: msg.speaker === "Player" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      // Add current user input
      contents.push({ role: "user", parts: [{ text: userInput }] });

      const result = await model.generateContent({ contents });
      const responseText = result.response.text().trim();

      console.log(`✅ Gemini 使用 Key #${i + 1} 成功`);
      return res.json({
        success: true,
        message: responseText,
        isComplete: questionControl.currentQuestionId === null
      });

    } catch (error) {
      console.error(`❌ Gemini Key #${i + 1} Error:`, error.message);
      lastError = error;

      // 🔍 检查是否为额度超限或权限错误 (429 或 403)
      const errorMsg = error.message.toLowerCase();
      const isQuotaError = errorMsg.includes("quota") || 
                          errorMsg.includes("429") || 
                          errorMsg.includes("limit") ||
                          errorMsg.includes("exhausted");

      if (isQuotaError && i < apiKeys.length - 1) {
        console.warn(`⚠️ Gemini Key #${i + 1} 额度可能已耗尽，尝试下一个...`);
        continue;
      } else {
        // 如果是最后一位 Key 或者非额度错误，则跳出循环并报错
        break;
      }
    }
  }

  res.status(500).json({ 
    success: false, 
    error: lastError ? lastError.message : "All Gemini API calls failed" 
  });
});

module.exports = router;
