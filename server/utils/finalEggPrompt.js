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
1) Write a short warm "master's letter". It is fixed. just use the same sentence as below: "Dear traveler, I knew you'd find this place. Congratulations on finding the recipe! I'm sorry l didn't meet you in the village. I've already left. Can you quess where l am now? I've made a decision -- l want to share my way of cooking with more people. Something that reflects people's taste, stays true to the roots of this village, and is also a healthier take on a classic. Best of luck. i'm proud of you. Until we meet again. -- Master Hua"
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

function generateFinalEggPromptPlayerOnly(compactMeals, language = "en") {
  const lang = language === "zh" ? "zh" : "en";
  const mealsJson = JSON.stringify(compactMeals);

  return `
You are an assistant generating a personalized game ending based ONLY on the player's own meal inputs.

LANGUAGE: ${lang}

INPUT (player_meals_only):
- meals: ${mealsJson}

TASKS:
1) Write a short warm "master's letter". It is fixed. just use the same sentence as below: "Dear traveler, I knew you'd find this place. Congratulations on finding the recipe! I'm sorry l didn't meet you in the village. I've already left. Can you quess where l am now? I've made a decision -- l want to share my way of cooking with more people. Something that reflects people's taste, stays true to the roots of this village, and is also a healthier take on a classic. Best of luck. i'm proud of you. Until we meet again. -- Master Hua"
2) Produce a 7-day summary (array): for each day list npcName (can be empty), mealType, and 1-4 main ingredients.
   - Extract from the player's meal text; if unclear, infer plausible items.
3) Health analysis:
   - positives: 3-6 bullet points grounded in the player's foods.
   - improvements: 3-6 bullet points with concrete swaps/additions (grounded in the player's foods).
4) Personalized recipe built from frequently appearing ingredients across the player's meals:
   - fields: title, servings, ingredients[] (name + amount), steps[] (short), tip.

IMPORTANT:
- OUTPUT MUST BE STRICT JSON.
- NO markdown code fences.
- NO extra commentary, ONLY the JSON object.
- YOU MUST RETURN valid JSON object only. Do not include markdown fences, comments, or trailing commas.

OUTPUT FORMAT:
{
  "letter": "string",
  "summary": [
    { "day": 1, "npcName": "", "mealType": "breakfast|lunch|dinner", "ingredients": ["...","..."] }
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

module.exports = { generateFinalEggPrompt, generateFinalEggPromptPlayerOnly };
