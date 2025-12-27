// server/data/npcClues.js
// NPC线索数据 - 整合用户提供的完整线索库

const npcClues = {
  // NPC 1 - Village Head（村长 / 师父的老友）
  uncle_bo: {
    id: "uncle_bo",
    name: { zh: "村长", en: "Village Head" },
    intro: {
      zh: "三天前，他一声不响地离开了村子。\n他厨房里的火还是温的——但人已经不见了。\n\n你和我一样清楚……他不是那种会无缘无故消失的人。他很少离开村子。\n\n你曾经是他的徒弟。如果有人能查出发生了什么……那就是你。\n\n但这次寻找——不只是翻找厨房抽屉。\n\n不久前，他每次见人都会带着一个笔记本。\n\n也许通过他的方法，你能理解他的想法。\n\n我相信那些记录里藏着关键。",
      en: "Three days ago, he left the village without a word.\n\nThe fire in his kitchen was still warm—but he was gone.\n\nYou know as well as I do… he was never the kind to vanish without a reason. He has barely left the village.\n\nYou were once his apprentice. If anyone can find out what happened to him… it's you.\n\nBut this search—it's not just about turning over kitchen drawers.\n\nNot long ago, he always brought a notebook whenever he met someone.\n\nMaybe by following his method, you can understand how he thinks.\n\nI believe those records hold the key."
    },
    vague: [
      {
        zh: "你师父以前有个总爱去的地方……嗯，是哪里来着？哎，老了老了。哦，时候到了，我得去备下一餐的材料了。过几个小时再来吧，也许我会想起点什么。",
        en: "Your master used to have a place he visited all the time... Hmm, where was it again? Ah, my memory's not what it used to be. Oh! It's time for me to prep for my next meal. Come back in a few hours. Maybe something will come back to me."
      },
      {
        zh: "我记起来他常去看一位女人……唔，她是谁来着？再给我一点时间——等你吃完今天的最后一餐，我们再聊。",
        en: "I remember he always visited a woman... Hmm, who was she again? Give me a bit more time — let's talk again after you've finished your last meal of the day."
      }
    ],
    trueClue: {
      zh: "干得好！一点一点地，你会开始理解他当时在想什么、在隐藏什么。别着急，一顿一顿来。他经常去**阿桂的杂货铺**买食材，他和华主厨认识很久了。也许你能从她那里得到一些线索。",
      en: "Good job! Little by little, you'll start to understand what he was thinking back then, and what he was hiding. No need to rush — just take it one meal at a time. He often stopped by **Grace's shop** for ingredients. He and Chef Hua go way back. Maybe you'll get some insights from her."
    },
    nextNPC: "shop_owner"
  },

  // NPC 2 - Shop Owner（杂货铺老板 / 阿桂）
  shop_owner: {
    id: "shop_owner",
    name: { zh: "杂货铺老板", en: "Shop Owner Grace" },
    vague: [
      {
        zh: "听你这么细细地讲真不错。我很想念和华主厨聊美食、聊那些让菜特别的小食材。等你下一餐后再来吧，也许那时我会想得更清楚。",
        en: "It’s nice hearing you share in such detail. I miss talking to Chef Hua about food, and all the little ingredients that make a dish special. Come back after your next meal — maybe then things will make more sense."
      },
      {
        zh: "我一直在努力回想他说过的绿木籽……就在嘴边。等你吃完今天最后一顿饭，我们再聊，也许味道会回来。",
        en: "I keep trying to remember what he said about the greenwood seeds. It’s right on the tip of my tongue. Let’s talk again after you’ve wrapped up your eating for the day."
      }
    ],
    trueClue: {
      zh: "我想起来了——那天他做了一道**绿木籽汤**，味道绝了。我后来一直试着复刻，却从没成功。冰箱里还有一点，去尝尝吧。但别只是吃，想想你怎么吃、为什么吃。这是你师父的方式。那味道……我敢肯定来自**香料婆婆**的店。",
      en: "Ah, I remember now — he made a soup with greenwood seeds that day. It tasted incredible. I tried to recreate it, but never got it right. There’s still some in my fridge. Go try it — but don’t just eat. Think about how you’re eating, and why. That’s how your master worked. There’s a flavor in there… I swear it came from Spice Granny’s shop."
    },
    nextNPC: "spice_granny"
  },

  // NPC 3 - Spice Woman（香料婆婆）
  spice_granny: {
    id: "spice_granny",
    name: { zh: "香料婆婆", en: "Spice Granny" },
    vague: [
      {
        zh: "我这儿客人来来往往，有人只买基础香料，有人像华主厨一样追求大胆的味道。等你下一餐后再来吧，我也会继续回忆他。",
        en: "I get all kinds of customers. Some just buy the basics, others chase bold flavors like Chef Hua. Come back after your next meal — I’ll try to recall more about him."
      },
      {
        zh: "华主厨从不满足，总在尝试新东西。香料能告诉你的有限，也许还有别的线索值得追。过几个小时再来吧。",
        en: "Chef Hua was never satisfied — always trying something new. You can only learn so much from spices. There might be other threads worth following. Come back in a few hours."
      }
    ],
    trueClue: {
      zh: "对了，差点忘了。**韩**前几天也来过，笑得很客气，但心思不纯。他不是来找味道的，而是在打听你师父的“**灵魂香料**”。你应该去问问**餐馆老板**。",
      en: "Oh right — Han came by a few days ago. All smiles, but full of tricks. He wasn't here for flavor. Between the lines, he was asking about your master’s soul spice. You should ask the Restaurant Owner."
    },
    nextNPC: "restaurant_owner"
  },

  // NPC 4 - Restaurant Owner（餐馆老板）
  restaurant_owner: {
    id: "restaurant_owner",
    name: { zh: "餐馆老板", en: "Restaurant Owner" },
    vague: [
      {
        zh: "要准备饭点了。这样吧，等你下一餐后我们再聊。",
        en: "Time to prep — next meal rush is coming. Come back after your next meal and we’ll talk."
      },
      {
        zh: "我和你师父的矛盾一点点积累，直到有一天，他走了，从不回头。我留下来经营这家店，活下来了。等你今天都吃完，我们再把话说完。",
        en: "Conflict built up between us until one day he left and never looked back. I stayed, ran this place, survived. Finish your meals for today, then we’ll finish this conversation."
      }
    ],
    trueClue: {
      zh: "他的**鱼粥**，从不让我碰。他总去**清水河**取一种食材，只找那个沉默的渔夫。每次做鱼粥，都会先找他。你若能让他说话，记得回来告诉我。",
      en: "His fish porridge — he never let me touch it. He always went to Clearwater River for one ingredient, always to the same silent fisherman. If you get him to talk, come back and tell me."
    },
    nextNPC: "fisherman"
  },

  // NPC 5 - Fisherman（渔夫）
  fisherman: {
    id: "fisherman",
    name: { zh: "渔夫", en: "Fisherman" },
    vague: [
      {
        zh: "你长大了。你师父和我在这河边聊过不少故事。等会儿再来，我们再聊。",
        en: "You’ve grown. Your master and I shared many stories by this river. Come back later and we’ll talk more."
      },
      {
        zh: "他默默为村子做饭，帮助需要的人。但他离开的原因……我说不出口。等你都忙完了，再回来坐坐。",
        en: "He quietly helped the village, cooking for those in need. But why he left… I can’t say. Come back when you’re done for the day."
      }
    ],
    trueClue: {
      zh: "你还记得**罗文**吗？你们小时候为鱼粥吵过。他住在林子那边，是你师父最早的徒弟。去找他问问吧。",
      en: "Do you remember Rowan? You argued over fish congee as kids. He still lives past the grove. Rowan — your master’s first apprentice. Go ask him."
    },
    nextNPC: "old_friend"
  },

  // NPC 6 - Old Friend（老朋友 / Rowan）
  old_friend: {
    id: "old_friend",
    name: { zh: "旧友Rowan", en: "Old Friend Rowan" },
    vague: [
      {
        zh: "等你忙完这点“小任务”，改天我给你做顿饭。记得下顿饭后再来。",
        en: "Finish your little mission first. Come back after your next meal — someday I’ll cook for you."
      },
      {
        zh: "只记录了一部分，那只是半个故事。等你完成最后一餐再来。",
        en: "If you only log part of the day, you’re telling half the story. Finish your last meal first."
      }
    ],
    trueClue: {
      zh: "你要找的东西不在我这。去年，华主厨收了个年轻徒弟，叫**米拉**。她住在村子尽头的木亭里。",
      en: "What you’re looking for isn’t with me. Last year, Master Hua took on a young apprentice — Mira. She lives in a wooden pavilion at the edge of the village."
    },
    nextNPC: "secret_apprentice"
  },

  // NPC 7 - Secret Apprentice（秘密徒弟 · Mira）
  secret_apprentice: {
    id: "secret_apprentice",
    name: { zh: "秘密学徒Mira", en: "Secret Apprentice Mira" },
    vague: [
      {
        zh: "你已经走到这里了。相信我，最好的总是在最后。",
        en: "You’ve come so far. Trust me — the best always comes at the end."
      },
      {
        zh: "师父总说，最后一顿饭最能说明一天的感觉。去完成它，再回来找我。",
        en: "Master always said the last meal tells the most about a day. Finish it, then come back to me."
      }
    ],
    trueClue: {
      zh: "一周前，师父来过，留下了一个**箱子**。他说你会回来找他。去吧，打开它。",
      en: "A week ago, Master came by and left a box. He said you’d come back looking for him. Go on — open it."
    },
    nextNPC: null
  }
};

// 获取NPC线索
function getNPCClue(npcId, clueType, vagueIndex = 0, language = "zh") {
  const npc = npcClues[npcId];
  if (!npc) {
    console.error(`NPC not found in clues config: ${npcId}`);
    return null;
  }

  if (clueType === "vague") {
    const index = Math.min(vagueIndex, npc.vague.length - 1);
    const text = npc.vague[index][language] || npc.vague[index].en;
    return {
      type: "vague",
      text: text,
      npcName: npc.name[language] || npc.name.en,
      npcId: npcId
    };
  } else if (clueType === "true") {
    const text = npc.trueClue[language] || npc.trueClue.en;
    return {
      type: "true",
      text: text,
      npcName: npc.name[language] || npc.name.en,
      npcId: npcId,
      nextNPC: npc.nextNPC
    };
  }

  return null;
}

// 获取NPC名字
function getNPCName(npcId, language = "zh") {
  const npc = npcClues[npcId];
  if (!npc) return npcId;
  return npc.name[language] || npc.name.en;
}

// 提取线索关键词（用于线索本显示）
function extractClueKeywords(clueText, language = "zh") {
  // 提取**之间的内容作为关键词
  const keywords = [];
  const regex = /\*\*(.*?)\*\*/g;
  let match;
  while ((match = regex.exec(clueText)) !== null) {
    keywords.push(match[1]);
  }
  
  // 移除**标记，返回清理后的文本
  const cleanText = clueText.replace(/\*\*/g, '');
  
  return {
    cleanText,
    keywords,
    shortVersion: keywords.length > 0 
      ? (language === "zh" ? `关键词: ${keywords.join(", ")}` : `Keywords: ${keywords.join(", ")}`)
      : cleanText.substring(0, 100) + "..."
  };
}

module.exports = {
  npcClues,
  getNPCClue,
  getNPCName,
  extractClueKeywords
};
