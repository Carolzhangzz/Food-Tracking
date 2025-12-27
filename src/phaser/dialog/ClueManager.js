// src/phaser/dialog/ClueManager.js
// 线索管理器 - 处理线索的获取、显示和保存

const API_URL = process.env.REACT_APP_API_URL;

export default class ClueManager {
  constructor(scene) {
    this.scene = scene;
    this.clues = [];
  }

  // 从后端获取NPC的线索
  async getClueForNPC(npcId, language = "en") {
    console.log(`🔍 获取NPC线索: ${npcId}`);

    try {
      const response = await fetch(
        `${API_URL}/game/clue/${npcId}?language=${language}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.clue) {
        console.log(`✅ 获取到线索:`, data.clue);
        return {
          success: true,
          clue: data.clue,
          npcId: npcId,
        };
      } else {
        throw new Error("No clue available");
      }
    } catch (error) {
      console.error(`❌ 获取线索失败:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 保存线索到数据库
  async saveClueToDatabase(playerId, npcId, clueText, day) {
    console.log(`💾 保存线索到数据库:`, { playerId, npcId, day });

    try {
      const response = await fetch(`${API_URL}/save-clue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: playerId,
          npcId: npcId,
          clueText: clueText,
          day: day,
          receivedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`✅ 线索保存成功`);
        return { success: true };
      } else {
        throw new Error(result.error || "保存失败");
      }
    } catch (error) {
      console.error(`❌ 保存线索失败:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 添加线索到本地列表
  addClue(clueData) {
    const { npcId, clue, npcName } = clueData;
    
    // 检查是否已存在
    const exists = this.clues.find(c => c.npcId === npcId);
    if (!exists) {
      this.clues.push({
        npcId: npcId,
        npcName: npcName || npcId,
        clue: clue,
        timestamp: Date.now(),
      });
      console.log(`✅ 线索已添加到本地列表: ${npcId}`);
    }
  }

  // 通知主场景UI更新线索
  notifyUIManager(clueData) {
    if (this.scene.mainScene?.uiManager) {
      this.scene.mainScene.uiManager.addClue(clueData, true);
      console.log(`📢 已通知UIManager更新线索显示`);
    }
  }

  // 获取所有线索
  getAllClues() {
    return this.clues;
  }

  // 清空线索
  clearClues() {
    this.clues = [];
  }

  // 从后端加载所有线索
  async loadCluesFromAPI(playerId) {
    console.log(`📥 从API加载线索: ${playerId}`);

    try {
      const response = await fetch(`${API_URL}/clues/${playerId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.clues)) {
        this.clues = data.clues.map(c => ({
          npcId: c.npcId,
          npcName: c.npcName || c.npcId,
          clue: c.clueText || c.clue,
          timestamp: new Date(c.receivedAt).getTime(),
        }));
        console.log(`✅ 加载了 ${this.clues.length} 条线索`);
        return { success: true, clues: this.clues };
      } else {
        console.log(`⚠️ 没有找到线索`);
        return { success: true, clues: [] };
      }
    } catch (error) {
      console.error(`❌ 加载线索失败:`, error);
      return {
        success: false,
        error: error.message,
        clues: [],
      };
    }
  }

  // 🔧 显示模糊线索（早餐/午餐）
  showVagueClue(clueText) {
    console.log("🌫️ [ClueManager] 显示模糊线索:", clueText.substring(0, 50) + "...");
    
    // 通知 UIManager 刷新线索本
    if (this.scene.mainScene && this.scene.mainScene.uiManager) {
      this.scene.mainScene.uiManager.loadCluesFromAPI();
    }
    
    return { success: true, type: "vague" };
  }

  // 🔧 显示真实线索（晚餐）
  showTrueClue(clueText, clueData) {
    console.log("🗝️ [ClueManager] 显示真实线索:", clueText.substring(0, 50) + "...");
    
    // 通知 UIManager 刷新线索本
    if (this.scene.mainScene && this.scene.mainScene.uiManager) {
      this.scene.mainScene.uiManager.loadCluesFromAPI();
    }
    
    return { success: true, type: "true", data: clueData };
  }
}

