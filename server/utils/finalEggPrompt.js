// server/utils/finalEggPrompt.js
function generateFinalEggPrompt(mealsSummary, statsData, language = "en") {
  const lang = language === "zh" ? "zh" : "en";
  const mealsJson = JSON.stringify(mealsSummary);
  const statsJson = JSON.stringify(statsData);

  return `
You are an assistant generating a personalized game ending.

LANGUAGE: ${lang}

INPUT:
- mealsSummary: ${mealsJson}
- statsData: ${statsJson}

TASKS:
1) Write a short warm "master's letter" (2 paragraphs).
2) Produce a 7-day summary (array): for each day list npcName, mealType, and 1-4 main ingredients. 
   - Extract from mealContent if possible; if unclear, infer plausible items from the text.
3) Health analysis:
   - positives: 3-6 bullet points grounded in the player's actual foods.
   - improvements: 3-6 bullet points with concrete swaps/additions (grounded in the player's meals).
4) Personalized recipe built from frequently appearing ingredients in mealsSummary:
   - fields: title, servings, ingredients[] (name + amount), steps[] (short), tip.

IMPORTANT:
- OUTPUT MUST BE STRICT JSON.
- NO markdown code fences.
- NO extra commentary, ONLY the JSON object.

OUTPUT FORMAT:
{
  "letter": "string",
  "summary": [
    { "day": 1, "npcName": "xxx", "mealType": "breakfast|lunch|dinner", "ingredients": ["...","..."] }
  ],
  "health": {
    "positives": ["...","..."],
    "improvements": ["...","..."]
  },
  "recipe": {
    "title": "string",
    "servings": 1,
    "ingredients": [ { "name": "xxx", "amount": "1 cup" } ],
    "steps": ["...", "..."],
    "tip": "string"
  }
}
`;
}

module.exports = { generateFinalEggPrompt };
