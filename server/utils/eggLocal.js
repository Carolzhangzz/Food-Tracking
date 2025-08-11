// server/utils/eggLocal.js

const ZH_SPLIT = /[，、；。,.;\n]/;
const STOPWORDS_ZH = new Set(["我","的","了","和","还有","一些","今天","做","吃","很","比较","有点","一个","一道","米饭","面","面条","汤","菜","好吃","感觉","可能","一起","简单"]);
const STOPWORDS_EN = new Set(["and","with","some","a","an","the","today","cook","ate","eat","very","little","bit","of","dish","soup","noodle","rice","good","tasty","feel","maybe","together","simple"]);

function extractIngredientsFromText(text, lang="en") {
  if (!text) return [];
  const isZh = lang === "zh";
  const raw = isZh ? text.split(ZH_SPLIT) : text.split(/[,\n;.\-]/);
  const stops = isZh ? STOPWORDS_ZH : STOPWORDS_EN;
  const tokens = raw
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !stops.has(s))
    .filter(s => s.length >= (isZh?1:2) && s.length <= 12);
  // 去重，保留前几个
  const uniq = Array.from(new Set(tokens));
  return uniq.slice(0, 4);
}

function mergeMealSummary(mealsSummary, language="en") {
  return mealsSummary.map(m => ({
    day: m.day,
    npcName: m.npcName,
    mealType: m.mealType,
    ingredients: extractIngredientsFromText((m.content || ""), language)
  }));
}

function topIngredients(summary, topK=8) {
  const freq = new Map();
  summary.forEach(s => (s.ingredients || []).forEach(i => {
    freq.set(i, (freq.get(i)||0)+1);
  }));
  return Array.from(freq.entries())
    .sort((a,b)=>b[1]-a[1])
    .slice(0, topK)
    .map(([name])=>name);
}

function buildHealth(summary, language="en") {
  const list = summary.flatMap(s => s.ingredients || []);
  const set = new Set(list.map(s=>s.toLowerCase()));
  const pos = [];
  const imp = [];

  // 简单规则
  if (["青菜","蔬菜","spinach","bok choy","cabbage","greens","broccoli","tomato","番茄"].some(v => set.has(v))) {
    pos.push(language==="zh" ? "经常出现蔬菜，膳食纤维与维生素摄入不错" : "Vegetables appear often, good fiber and vitamins");
  }
  if (["鱼","fish","鲤","三文鱼","mackerel","sardine"].some(v => set.has(v))) {
    pos.push(language==="zh" ? "包含鱼类，优质蛋白与 ω-3 脂肪酸" : "Includes fish, quality protein and omega‑3");
  }
  if (["豆","豆腐","tofu","soy","lentil","bean","黄豆","黑豆"].some(v => set.has(v))) {
    pos.push(language==="zh" ? "有大豆/豆制品，植物蛋白加分" : "Soy/beans provide plant protein");
  }
  if (pos.length === 0) pos.push(language==="zh" ? "规律进食、记录完整，这是很好的开始" : "Consistent logging and regular meals—great start!");

  // 改进建议
  if (!["蔬菜","greens","vegetable","青菜","小白菜","菠菜","西兰花"].some(v => list.join(",").includes(v))) {
    imp.push(language==="zh" ? "每天至少加一份绿叶菜（烫/炒/清蒸均可）" : "Add at least one portion of leafy greens daily");
  }
  imp.push(language==="zh" ? "尽量少油少盐；甜饮用无糖或减糖替代" : "Go easier on oils & salt; choose low/no‑sugar drinks");
  imp.push(language==="zh" ? "主食可尝试部分替换为全谷物（糙米/燕麦/杂粮）" : "Swap part of staple for whole grains (brown rice/oats)");

  return { positives: pos, improvements: imp };
}

function buildRecipe(summary, language="en") {
  const tops = topIngredients(summary, 6);
  const title = language==="zh" ? "常备食材一锅汤" : "One‑Pot Comfort Soup";
  const ings = tops.map(n => ({ name: n, amount: "" }));
  if (ings.length === 0) ings.push({ name: language==="zh" ? "时蔬" : "seasonal greens", amount: "" });

  const steps = language==="zh"
    ? [
        "准备一口锅，加少量油，爆香葱姜（可选）",
        "加入蔬菜和主食材（豆腐/鱼片/鸡蛋等）",
        "加水或清汤，煮至食材熟透",
        "加盐调味，关火后淋少许香油或胡椒"
      ]
    : [
        "Heat a pot with a little oil, optionally sauté ginger/scallion",
        "Add vegetables and main protein (tofu/fish/egg)",
        "Pour in water or light stock; simmer until tender",
        "Season with salt; finish with a drizzle of sesame oil/pepper"
      ];

  const tip = language==="zh"
    ? "根据你这一周最常用的食材自由替换，优先选择当季蔬菜。"
    : "Swap in your week’s favorite ingredients; prefer seasonal veggies.";

  return { title, servings: 1, ingredients: ings, steps, tip };
}

function buildLocalEgg(mealsSummary, language="en") {
  const summary = mergeMealSummary(mealsSummary, language);
  return {
    letter: language==="zh"
      ? "谢谢你完成了七天的旅程。你记录的每一餐，都是与你自己对话的方式。\n继续保持对食物与身体的关注，你已经走在很棒的路上。"
      : "Thank you for completing the seven‑day journey. Every meal you logged was a conversation with yourself.\nKeep this mindful attention to food and body—you’re on a great path.",
    summary,
    health: buildHealth(summary, language),
    recipe: buildRecipe(summary, language),
  };
}

module.exports = { buildLocalEgg };
