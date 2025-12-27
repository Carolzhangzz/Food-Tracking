// src/phaser/dialog/ConvAIHandler.js
// ConvAI API 处理器

const API_URL = process.env.REACT_APP_API_URL;

export default class ConvAIHandler {
  constructor(scene) {
    this.scene = scene;
    this.sessionId = "-1";
    this.npcMap = this.initializeNPCMap();
  }

  // 初始化NPC到ConvAI Character ID的映射
  initializeNPCMap() {
    return new Map([
      ["uncle_bo", "425d25d4-73a6-11f0-8dad-42010a7be01f"],           // Day 1 - 阿桂(杂货铺)
      ["village_head", "37c1ea8e-4aec-11f0-a14e-42010a7be01f"],        // Day 2 - 村长
      ["spice_granny", "a425409e-73a6-11f0-a309-42010a7be01f"],        // Day 3 - 香料奶奶
      ["restaurant_owner", "6c4ed624-4b26-11f0-854d-42010a7be01f"],    // Day 4 - 餐厅老板
      ["little_girl", "2e287d62-4b28-11f0-b155-42010a7be01f"],         // Day 5 - 小女孩
      ["mysterious_person", "0443174e-73a7-11f0-b26c-42010a7be01f"],   // Day 6 - 神秘人
      ["final_npc", "a9394c0e-4d88-11f0-b18a-42010a7be01f"],           // Day 7 - 最终NPC
    ]);
  }

  // 调用ConvAI API
  async callAPI(userMessage, npcId) {
    const charID = this.npcMap.get(npcId);
    
    if (!charID) {
      console.error(`❌ 未找到NPC的ConvAI ID: ${npcId}`);
      return {
        success: false,
        error: "NPC not found",
        message: "Sorry, I can't talk right now.",
      };
    }

    try {
      const requestBody = {
        userText: userMessage,
        charID: charID,
        sessionID: this.sessionId,
        voiceResponse: "False",
      };

      console.log(`🎤 ConvAI请求:`, { npcId, charID, message: userMessage });

      const response = await fetch(`${API_URL}/convai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 更新session ID
      if (data.sessionID) {
        this.sessionId = data.sessionID;
      }

      console.log(`✅ ConvAI响应:`, data.text);

      return {
        success: true,
        message: data.text || "...",
        sessionId: this.sessionId,
      };
    } catch (error) {
      console.error("❌ ConvAI API调用失败:", error);
      return {
        success: false,
        error: error.message || "ConvAI API call failed",
        message: "Sorry, an error occurred. Please try again later.",
      };
    }
  }

  // 获取默认开场白（Fallback，从npcClues.js加载）
  getDefaultIntro(npcId, language = "en") {
    // 🔧 由于前端不直接导入后端数据文件，这里使用硬编码的副本
    // 应该与 server/data/npcClues.js 保持一致
    const intros = {
      uncle_bo: {
        en: "Three days ago, he left the village without a word.\n\nThe fire in his kitchen was still warm—but he was gone.\n\nYou know as well as I do… he was never the kind to vanish without a reason. He has barely left the village.\n\nYou were once his apprentice. If anyone can find out what happened to him… it's you.\n\nBut this search—it's not just about turning over kitchen drawers.\n\nNot long ago, he always brought a notebook whenever he met someone.\n\nMaybe by following his method, you can understand how he thinks.\n\nI believe those records hold the key.",
        zh: "三天前，他一声不响地离开了村子。\n他厨房里的火还是温的——但人已经不见了。\n\n你和我一样清楚……他不是那种会无缘无故消失的人。他很少离开村子。\n\n你曾经是他的徒弟。如果有人能查出发生了什么……那就是你。\n\n但这次寻找——不只是翻找厨房抽屉。\n\n不久前，他每次见人都会带着一个笔记本。\n\n也许通过他的方法，你能理解他的想法。\n\n我相信那些记录里藏着关键。",
      },
      shop_owner: {
        en: `Hey, you're back. Recently, your master kept going on about greenwood seeds.`,
        zh: "嘿，你回来了。最近你师父一直在念叨青木籽。",
      },
      spice_granny: {
        en: `That bit of broth on your lip — you tasted your master's greenwood seed soup, didn't you?`,
        zh: "你嘴角还沾着汤呢——是不是尝过你师父的青木籽汤？",
      },
      restaurant_owner: {
        en: `I'm Han. I run this place now. Those spices—you got them from her, didn't you?`,
        zh: "我是韩，现在由我来经营这家店。那些香料——你是从她那里得到的吧？",
      },
      fisherman: {
        en: `I'm the fisherman. The river has always been my place of calm.`,
        zh: "我是渔夫。河水一直是我心里的安宁之地。",
      },
      old_friend: {
        en: `It's strange seeing you here. Your master and I—we grew up like brothers.`,
        zh: "真奇怪，会在这里见到你。你师父和我——我们是一起长大的。",
      },
      secret_apprentice: {
        en: `You… you're the one he always mentioned. I'm Mira.`,
        zh: "你……你就是他常提到的那个人吧。我是梅。",
      },
    };

    // 🔧 统一 ID 映射
    const idMapping = {
      "village_head": "shop_owner",
      "spice_woman": "spice_granny",
      "npc1": "uncle_bo",
      "npc2": "shop_owner",
      "npc3": "spice_granny",
      "npc4": "restaurant_owner",
      "npc5": "fisherman",
      "npc6": "old_friend",
      "npc7": "secret_apprentice"
    };
    
    const actualId = idMapping[npcId] || npcId;
    const intro = intros[actualId];
    return intro ? intro[language] || intro.en : "Hello...";
  }

  // 重置session
  resetSession() {
    this.sessionId = "-1";
  }
}

