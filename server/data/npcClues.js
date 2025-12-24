// server/data/npcClues.js
// NPC线索数据 - 每个NPC有2个vague线索 + 1个真实线索

const npcClues = {
  // NPC 1 - Village Head / Uncle Bo（村长）
  uncle_bo: {
    id: "uncle_bo",
    name: { zh: "村长", en: "Village Head" },
    vague: [
      {
        zh: "我记得你师父以前经常去一个地方，但我一时想不起来是哪里了...记忆力不如从前了。你先去准备下一餐吧，过几个小时再来找我，也许到时候我能想起来。",
        en: "I remember your master used to visit a place often, but I can't recall where exactly... My memory isn't what it used to be. Go prepare your next meal first, come back in a few hours, maybe I'll remember by then."
      },
      {
        zh: "我隐约记得师父经常拜访一位女士，但我还是想不起她是谁。再给我一些时间吧，等你完成今天的最后一餐再来，也许那时我的记忆会更清晰。",
        en: "I vaguely recall your master frequently visited a woman, but I still can't confirm who she is. Give me more time, come back after you finish your last meal today, perhaps my memory will be clearer then."
      }
    ],
    trueClue: {
      zh: "【真实线索】你很有耐心，不要急于求成。一顿饭一顿饭地理解师父的过往吧。我想起来了——师父常去**Grace的杂货铺**买食材，她和Chef Hua相识多年。你应该去找**杂货铺老板**问问。",
      en: "[TRUE CLUE] You've been patient. Don't rush. Understand your master's past one meal at a time. I remember now — your master often went to **Grace's grocery store** for ingredients. She's known Chef Hua for years. You should go ask the **Shop Owner**."
    },
    nextNPC: "shop_owner"
  },

  // NPC 2 - Shop Owner / Grace（杂货铺老板）
  shop_owner: {
    id: "shop_owner",
    name: { zh: "杂货铺老板", en: "Shop Owner Grace" },
    vague: [
      {
        zh: "很高兴听你详细分享吃饭的经历。我怀念过去和Chef Hua讨论美食和食材的日子...你吃完下一餐后再来找我吧，也许到那时我能想起更多。",
        en: "I'm glad to hear you share your meal in such detail. I miss the days when I used to discuss food and ingredients with Chef Hua... Come find me after your next meal, maybe I'll remember more by then."
      },
      {
        zh: "我努力在回忆师父提到过的一种叫'绿木籽'的东西，就差一点想起来了...等你完成今天的最后一餐后再来，希望味觉能唤起我的记忆。",
        en: "I'm trying hard to remember something your master mentioned — 'greenwood seeds'. It's on the tip of my tongue... Come back after you finish your last meal today, hopefully the taste will trigger my memory."
      }
    ],
    trueClue: {
      zh: "【真实线索】我想起来了！师父曾用**绿木籽**煮过一道汤，味道惊人，但我始终无法复刻。你去冰箱里尝尝剩下的汤吧。记住，不要只是吃，要思考**怎么吃、为什么吃**。我确信那种味道来自**香料婆婆**，你应该去找她。",
      en: "[TRUE CLUE] I remember now! Your master once made a soup with **greenwood seeds**, the taste was amazing, but I could never replicate it. Go taste the leftover soup in the fridge. Remember, don't just eat — think about **how to eat and why**. I'm certain that flavor came from the **Spice Granny**, you should go find her."
    },
    nextNPC: "spice_granny"
  },

  // NPC 3 - Spice Granny（香料婆婆）
  spice_granny: {
    id: "spice_granny",
    name: { zh: "香料婆婆", en: "Spice Granny" },
    vague: [
      {
        zh: "我每天接待各种各样的客人。有人只买基础香料，有人像你师父一样追求大胆独特的味道。你下一餐后再来吧，我会继续回忆关于师父的事。",
        en: "I receive all kinds of customers every day. Some just buy basic spices, others like your master pursue bold and unique flavors. Come back after your next meal, I'll continue recalling things about your master."
      },
      {
        zh: "你师父总是不满足现状，不断尝试新事物。但仅从香料中能学到的有限...也许还有其他'线索之线'值得追寻。过一段时间再来找我吧。",
        en: "Your master was never satisfied, always trying new things. But there's only so much you can learn from spices alone... Perhaps there are other 'threads of clues' worth pursuing. Come back to me in a while."
      }
    ],
    trueClue: {
      zh: "【真实线索】有个叫**Han**的人最近来过，表面客气、满脸笑容，但明显别有用心。他并非为味道而来，而是在打听师父的'**灵魂香料**'。这事不简单...你应该去问问**餐馆老板**，他可能知道更多。",
      en: "[TRUE CLUE] Someone named **Han** came by recently, polite on the surface with a smile, but clearly had ulterior motives. He wasn't here for the taste — he was asking about your master's '**soul spice**'. This isn't simple... You should ask the **Restaurant Owner**, he might know more."
    },
    nextNPC: "restaurant_owner"
  },

  // NPC 4 - Restaurant Owner（餐馆老板）
  restaurant_owner: {
    id: "restaurant_owner",
    name: { zh: "餐馆老板", en: "Restaurant Owner" },
    vague: [
      {
        zh: "我正忙着准备下一波饭点呢。如果你在下一餐后还感兴趣，可以回来继续聊。",
        en: "I'm busy preparing for the next meal rush. If you're still interested after your next meal, come back and we can talk more."
      },
      {
        zh: "我和你师父之间有过矛盾，最终导致他离开。我留在这里经营餐馆，为家庭勉强维持生活...等你完成今天所有的饮食体验后再来，我们谈谈更深的事。",
        en: "Your master and I had conflicts that eventually led him to leave. I stayed here running this restaurant, barely making ends meet for my family... Come back after you complete all your meals today, we'll talk about deeper matters."
      }
    ],
    trueClue: {
      zh: "【真实线索】师父有一道**鱼粥**从不让我碰。每次做这道菜前，他都会去**清水河**，找同一个沉默的渔夫。你应该去找**渔夫**问问，记得回来告诉我结果。",
      en: "[TRUE CLUE] Your master had a **fish congee** he never let me touch. Every time before making it, he would go to **Clearwater River** to find the same silent fisherman. You should go ask the **Fisherman**, and remember to come back and tell me what you find."
    },
    nextNPC: "fisherman"
  },

  // NPC 5 - Fisherman（渔夫）
  fisherman: {
    id: "fisherman",
    name: { zh: "渔夫", en: "Fisherman" },
    vague: [
      {
        zh: "我认出你了。我还记得和你师父在河边分享故事的日子。我要回家了，但你之后可以再来找我。",
        en: "I recognize you. I remember the days sharing stories with your master by the river. I need to go home now, but you can come find me later."
      },
      {
        zh: "你师父最近一直在默默帮助村子，为最需要的人做饭，但他从不说明离开的真正原因...你先完成自己的事情，之后再回来坐一会儿吧。",
        en: "Your master has been quietly helping the village lately, cooking for those who need it most, but he never explained why he left... Finish your own matters first, then come back and sit with me for a while."
      }
    ],
    trueClue: {
      zh: "【真实线索】你知道**Rowan**吗？他是你师父最早的徒弟之一。我还记得你们小时候为鱼粥的做法争论不休...Rowan现在住在**河对岸的林子附近**，你应该去找他。",
      en: "[TRUE CLUE] Do you know **Rowan**? He was one of your master's earliest apprentices. I remember you two arguing about fish congee recipes as children... Rowan still lives **near the woods across the river**, you should go find him."
    },
    nextNPC: "old_friend"
  },

  // NPC 6 - Old Friend / Rowan（旧友/前徒弟）
  old_friend: {
    id: "old_friend",
    name: { zh: "旧友Rowan", en: "Old Friend Rowan" },
    vague: [
      {
        zh: "哈哈，等你忙完'任务'后我们可以来一场做饭对决！记得在下一餐后回来找我。",
        en: "Haha, after you finish your 'quest' we can have a cooking showdown! Remember to come back after your next meal."
      },
      {
        zh: "如果你只记录了一部分饮食体验，那只是'半个故事'。你得完成最后一餐再来找我。",
        en: "If you've only recorded part of your meal experiences, that's only 'half the story'. You need to finish your last meal before coming back to me."
      }
    ],
    trueClue: {
      zh: "【真实线索】你寻找的答案不在我这里。但我知道师父最近收了一位年轻徒弟叫**Mira**。他教她凭**直觉**做菜，而不是遵循严格配方。Mira住在**村子尽头的木亭**里，你应该去找她。",
      en: "[TRUE CLUE] The answers you seek aren't with me. But I know your master recently took on a young apprentice named **Mira**. He taught her to cook by **intuition**, not strict recipes. Mira lives in **the wooden pavilion at the edge of the village**, you should go find her."
    },
    nextNPC: "secret_apprentice"
  },

  // NPC 7 - Secret Apprentice / Mira（秘密学徒）
  secret_apprentice: {
    id: "secret_apprentice",
    name: { zh: "秘密学徒Mira", en: "Secret Apprentice Mira" },
    vague: [
      {
        zh: "欢迎你的到来！'最好的总是在最后'，我会一直在这里等你。",
        en: "Welcome! 'The best is always saved for last.' I'll be here waiting for you."
      },
      {
        zh: "师父说过，'最后一顿饭'最能反映一天的真实感受。完成它再回来找我吧。",
        en: "Master said the 'last meal' best reflects a day's true feelings. Finish it and come back to me."
      }
    ],
    trueClue: {
      zh: "【终极线索】一周前师父来过这里，在阁楼留下了一个**箱子**。他说你曾写信希望回村时见他。但他最终选择去追寻必须完成的事情，于是留下了这个箱子。打开它吧，揭开故事的最终答案。",
      en: "[FINAL CLUE] A week ago, your master came here and left a **box** in the attic. He said you wrote letters hoping to see him when you returned to the village. But he chose to pursue something he had to complete, so he left this box. Open it and reveal the final answer to the story."
    },
    nextNPC: null // 最后一个NPC，没有下一个
  }
};

// 获取NPC线索
function getNPCClue(npcId, clueType, vagueIndex = 0, language = "zh") {
  const npc = npcClues[npcId];
  if (!npc) {
    console.error(`NPC not found: ${npcId}`);
    return null;
  }

  if (clueType === "vague") {
    const index = Math.min(vagueIndex, npc.vague.length - 1);
    return {
      type: "vague",
      text: npc.vague[index][language] || npc.vague[index].en,
      npcName: npc.name[language] || npc.name.en,
      npcId: npcId
    };
  } else if (clueType === "true") {
    return {
      type: "true",
      text: npc.trueClue[language] || npc.trueClue.en,
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

