/**
 * NPC开场白配置
 * 每个NPC的开场白分为2-3段，确保玩家不会错过关键剧情
 * 首次见面时强制播放，后续可选择回顾
 */

export const NPC_INTROS = {
  uncle_bo: {
    name: { en: "Uncle Bo", zh: "宝叔" },
    segments: [
      {
        text: {
          en: "Three days ago, he left the village without a word.\n\nThe fire in his kitchen was still warm—but he was gone.",
          zh: "三天前，他不辞而别。\n\n厨房里的火还温着——但人已经走了。"
        },
        emotion: "serious"
      },
      {
        text: {
          en: "You know as well as I do… he was never the kind to vanish without a reason. He has barely left the village.\n\nYou were once his apprentice. If anyone can find out what happened to him… it's you.",
          zh: "你我都清楚……他从不会无缘无故消失。他几乎从未离开过村子。\n\n你曾是他的徒弟。如果有人能查明真相……那就是你。"
        },
        emotion: "thoughtful"
      },
      {
        text: {
          en: "But this search—it's not just about turning over kitchen drawers.\n\nNot long ago, he always brought a notebook whenever he met someone.\n\nMaybe by following his method, you can understand how he thinks.\n\nI believe those records hold the key.",
          zh: "但这次寻找——不仅仅是翻找厨房抽屉。\n\n不久前，他每次见人都带着笔记本。\n\n也许追随他的方法，你能理解他的想法。\n\n我相信那些记录藏着关键。"
        },
        emotion: "hopeful"
      }
    ]
  },

  shop_owner: {
    name: { en: "Grace", zh: "格蕾丝" },
    segments: [
      {
        text: {
          en: "Hey, you're back. Recently, your master kept going on about greenwood seeds.\n\nFunny thing is, he used to avoid them completely. The moment he brought it up, I figured—he's probably cooking up one of his strange new ideas again.",
          zh: "嘿，你回来了。最近，你师父一直念叨青木籽。\n\n奇怪的是，他以前完全避开它们。他一提起这个，我就想——他可能又在酝酿什么奇怪的新想法了。"
        },
        emotion: "curious"
      },
      {
        text: {
          en: "Anyway, just got a new batch in. But he hasn't shown up for the past few days. Folks in the village are talking.\n\nThat day, he stared at the greenwood seeds for a long while, scribbling away in his notebook. I've got no idea what he was writing.",
          zh: "总之，我刚进了新货。但他已经好几天没出现了。村里的人都在议论。\n\n那天，他盯着青木籽看了很久，在笔记本上不停地写。我不知道他在写什么。"
        },
        emotion: "worried"
      },
      {
        text: {
          en: "If you're trying to understand him… maybe try doing things his way.",
          zh: "如果你想理解他……也许试着用他的方式做事。"
        },
        emotion: "encouraging"
      }
    ]
  },

  spice_granny: {
    name: { en: "Alice", zh: "艾丽斯奶奶" },
    segments: [
      {
        text: {
          en: "That bit of broth on your lip — you tasted your master's greenwood seed soup, didn't you?\n\nSo, tell me… did you catch the flavor?",
          zh: "你嘴角的那点汤汁——你尝了你师父的青木籽汤，对吧？\n\n告诉我……你品出味道了吗？"
        },
        emotion: "knowing"
      },
      {
        text: {
          en: "Let me tell you, greenwood seeds alone won't get you that taste. You need my special spice blend to bring it to life.\n\nYour master used to say the right flavors came when he really paid attention — to people, their stories, what they ate, and why.",
          zh: "告诉你吧，光靠青木籽可做不出那个味道。你需要我的特制香料混合才能让它活过来。\n\n你师父常说，真正的味道来自于用心关注——关注人、他们的故事、他们吃什么、为什么吃。"
        },
        emotion: "wise"
      },
      {
        text: {
          en: "He had a way of noticing the little things most folks miss.\n\nThere's only so much flavor can tell you. But pay attention to what doesn't taste right.\n\nThat's usually where the story is.",
          zh: "他有种能力，能注意到大多数人忽略的细节。\n\n味道能告诉你的有限。但要留意那些味道不对的地方。\n\n那通常才是故事所在。"
        },
        emotion: "mysterious"
      }
    ]
  },

  restaurant_owner: {
    name: { en: "Han", zh: "韩老板" },
    segments: [
      {
        text: {
          en: "I'm Han. I run this place now.\n\nThose spices—you got them from her, didn't you? She's always full of stories.",
          zh: "我是韩。我现在经营这个地方。\n\n那些香料——你从她那儿得到的，对吧？她总是有讲不完的故事。"
        },
        emotion: "direct"
      },
      {
        text: {
          en: "You were Hua's apprentice. I remember.\n\nHe and I built this place together once. Big plans, but he cared more about notes and flavors than the business.\n\nWe clashed. He left. I stayed. Now it's just me, keeping the doors open for my family.",
          zh: "你是华的徒弟。我记得。\n\n他和我曾一起建立这个地方。宏大的计划，但他更在乎笔记和味道，而不是生意。\n\n我们起了冲突。他离开了。我留下了。现在只剩我，为了家人守着这扇门。"
        },
        emotion: "bitter"
      },
      {
        text: {
          en: "Last time I saw him, he slipped a scrap of paper into that thick notebook. Looked like a recipe, but he caught me watching and shut the cover.\n\nNever thought he'd hide things from me. Maybe there's something in that habit. If you're trying to understand him, try writing things down too.",
          zh: "上次见他，他把一张纸条塞进那本厚厚的笔记本。看起来像食谱，但他发现我在看，就合上了封面。\n\n没想到他会对我隐瞒。也许这个习惯里藏着什么。如果你想理解他，也试着把事情写下来吧。"
        },
        emotion: "reflective"
      }
    ]
  },

  fisherman: {
    name: { en: "Leon", zh: "里昂" },
    segments: [
      {
        text: {
          en: "Hi there!\n\nWanna fish with me while we talk? Come. Sit. Cast a line with me.\n\nI've been out here a long time now. These days I just cook what I catch — fresh broth, clean congee.\n\nHow about you?",
          zh: "你好啊！\n\n想边聊边钓鱼吗？来，坐下，跟我一起钓鱼。\n\n我在这儿待了很久了。现在我只煮我钓到的——新鲜的汤，清淡的粥。\n\n你呢？"
        },
        emotion: "peaceful"
      },
      {
        text: {
          en: "Ten years back, when you left… your master felt it, even if he said nothing.\n\nThat day, after you walked away, he sat by the river, quiet. Didn't speak, just watched the water.",
          zh: "十年前，当你离开时……你师父感受到了，即使他什么也没说。\n\n那天，在你走后，他坐在河边，安静地坐着。没说话，只是看着水面。"
        },
        emotion: "sad"
      },
      {
        text: {
          en: "Later, I saw him with a notebook, writing—slow, careful. Sometimes it's easier to put feelings on paper than in words.\n\nMaybe that's why he wrote so much after.\n\nIf you're searching for him, try it. Write what you see. What you feel. Might bring you closer.",
          zh: "后来，我看到他拿着笔记本写字——缓慢、仔细。有时候把感受写在纸上比说出来更容易。\n\n也许这就是他后来写了那么多的原因。\n\n如果你在寻找他，试试看。写下你所见。写下你所感。可能会让你们更接近。"
        },
        emotion: "gentle"
      }
    ]
  },

  old_friend: {
    name: { en: "Rowan", zh: "罗文" },
    segments: [
      {
        text: {
          en: "Hey, look who's back! How've you been lately?\n\nYour belly's barely half the size of mine!",
          zh: "嘿，看看谁回来了！最近怎么样？\n\n你的肚子还没我的一半大呢！"
        },
        emotion: "cheerful"
      },
      {
        text: {
          en: "Master Hua always worried you weren't eating on time. Want me to whip something up for you?\n\nAh you've had your own meal, I can see that.\n\nI had Eggs Royale today—turned out real nice.",
          zh: "华师父总是担心你没按时吃饭。要我给你做点什么吗？\n\n啊，你已经吃过自己的饭了，我看得出来。\n\n我今天吃了皇家炒蛋——味道真不错。"
        },
        emotion: "caring"
      },
      {
        text: {
          en: "I care about your mission, but… I care about what you eat.",
          zh: "我关心你的任务，但……我更关心你吃什么。"
        },
        emotion: "warm"
      }
    ]
  },

  secret_apprentice: {
    name: { en: "Mira", zh: "米拉" },
    segments: [
      {
        text: {
          en: "Senior brother! You're finally here! I've been waiting—I thought maybe you weren't coming.",
          zh: "师兄！你终于来了！我一直在等——我还以为你可能不来了。"
        },
        emotion: "excited"
      },
      {
        text: {
          en: "Rowan said you met all kinds of people on your journey.\n\nDid they ask you to do food journaling, too?",
          zh: "罗文说你在旅途中遇到了各种各样的人。\n\n他们也让你做食物日记了吗？"
        },
        emotion: "curious"
      },
      {
        text: {
          en: "A week ago, Master left a box here for you. He said you'd know how to open it—his way.\n\nMaybe start by writing things down, like he always did. When you're ready, the box will make sense.",
          zh: "一周前，师父在这儿给你留了个盒子。他说你会知道怎么打开——用他的方式。\n\n也许从写东西开始，就像他总是做的那样。当你准备好了，这个盒子就会有意义。"
        },
        emotion: "mysterious"
      }
    ]
  }
};

/**
 * 获取NPC的开场白段落
 * @param {string} npcId - NPC的ID
 * @param {string} lang - 语言 ('en' 或 'zh')
 * @returns {Array} 开场白段落数组
 */
export function getNPCIntroSegments(npcId, lang = 'zh') {
  const intro = NPC_INTROS[npcId] || NPC_INTROS.uncle_bo;
  return intro.segments.map(segment => ({
    text: segment.text[lang],
    emotion: segment.emotion
  }));
}

/**
 * 获取NPC名称
 * @param {string} npcId - NPC的ID
 * @param {string} lang - 语言 ('en' 或 'zh')
 * @returns {string} NPC名称
 */
export function getNPCName(npcId, lang = 'zh') {
  const intro = NPC_INTROS[npcId] || NPC_INTROS.uncle_bo;
  return intro.name[lang];
}

