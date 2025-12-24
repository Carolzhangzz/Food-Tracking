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

  // 获取默认开场白（Fallback）
  getDefaultIntro(npcId, language = "en") {
    const intros = {
      uncle_bo: {
        en: `Hey, you're back. Recently, your master kept going on about greenwood seeds.`,
        zh: "嘿，你回来了。最近你师父一直在念叨青木籽。",
      },
      village_head: {
        en: `Three days ago, he left the village without a word. The fire in his kitchen was still warm—but he was gone.`,
        zh: "三天前，他离开村子时一句话也没说。厨房里的火还温着——可他已经不见了。",
      },
      spice_granny: {
        en: `That bit of broth on your lip — you tasted your master's greenwood seed soup, didn't you?`,
        zh: "你嘴角还沾着汤呢——是不是尝过你师父的青木籽汤？",
      },
      restaurant_owner: {
        en: `I'm Han. I run this place now. Those spices—you got them from her, didn't you?`,
        zh: "我是韩，现在由我来经营这家店。那些香料——你是从她那里得到的吧？",
      },
      little_girl: {
        en: `I'm Wei. The river has always been my place of calm.`,
        zh: "我是魏。河水一直是我心里的安宁之地。",
      },
      mysterious_person: {
        en: `It's strange seeing you here. Your master and I—we grew up like brothers.`,
        zh: "真奇怪，会在这里见到你。你师父和我——我们是一起长大的。",
      },
      final_npc: {
        en: `You… you're the one he always mentioned. I'm Mei.`,
        zh: "你……你就是他常提到的那个人吧。我是梅。",
      },
    };

    const intro = intros[npcId];
    return intro ? intro[language] || intro.en : "Hello...";
  }

  // 重置session
  resetSession() {
    this.sessionId = "-1";
  }
}

