// src/phaser/utils/clueTemplates.js
// 只放“第一句”的前缀，匹配 startsWith/包含 即可
const T = (zh, en) => [zh, en].filter(Boolean);

// npcId 要与服务端保持一致
export const clueTemplates = {
  village_head: {
    1: T(
      "你师父以前有个总爱去的地方",
      "Your master used to have a place he visited all the time"
    ),
    2: T(
      "我记起来他常去看一位女人",
      "I remember he always visited a woman"
    ),
    3: T(
      "干得好！继续这样做",
      "Good job! Keep doing this"
    ),
  },

  shop_owner: {
    1: T(
      "听你这么细细地讲真不错",
      "It’s nice hearing you share in such detail"
    ),
    2: T(
      "我一直在努力回想他当时说的关于绿木籽的话",
      "I keep trying to remember exactly what he said about the greenwood seeds"
    ),
    3: T(
      "啊，我想起来了——那天他做了一道用绿木籽的汤",
      "Ah, I remember now—he made a soup with greenwood seeds that day"
    ),
  },

  spice_woman: {
    1: T(
      "你知道…我这儿客人来来往往",
      "You know... I have a lot of customers coming and going"
    ),
    2: T(
      "我一直在想华主厨最近在做什么",
      "I've been trying to think of what Chef Hua's been doing"
    ),
    3: T(
      "不错——你已经记起了不少细节",
      "Not bad — you've recalled quite a bit of details"
    ),
  },

  restaurant_owner: {
    1: T(
      "啊，该准备了……下一波饭点马上到了",
      "Ah, time to prep... next meal rush is just around the corner"
    ),
    2: T(
      "我有没有跟你提过我们的矛盾",
      "Did I tell you about our conflict"
    ),
    3: T(
      "那么，现在你了解他了吗？你师父",
      "So, do you get him now? Your master"
    ),
  },

  fisherman: {
    1: T(
      "听起来你吃得比我还丰盛啊",
      "Sounds like your meals are richer than mine"
    ),
    2: T(
      "想知道你师父最近在干什么",
      "Wanna know what your master’s been up to"
    ),
    3: T(
      "让我想起——你还记得罗文吗",
      "Makes me think—do you still remember Rowan"
    ),
  },

  old_friend: {
    1: T(
      "好吧，不耽误你了。改天再聊",
      "All right, I won't keep you any longer"
    ),
    2: T(
      "不错！但如果你只记录了一部分",
      "Not bad! But if you only log part of your day"
    ),
    3: T(
      "我知道你这么多年后为什么来了",
      "I know why you're here after all these years"
    ),
  },

  secret_apprentice: {
    1: T(
      "你来到了这里，我真高兴",
      "You find yourself here, and I’m so glad you came"
    ),
    2: T(
      "喜欢！但师父总说，最后一顿饭才最能说明",
      "Love it! But Master always said the last meal tells the most"
    ),
    3: T(
      "哇！你比我预想的更用心地吃了",
      "Wow! You really ate with more thought than I expected"
    ),
  },
};
