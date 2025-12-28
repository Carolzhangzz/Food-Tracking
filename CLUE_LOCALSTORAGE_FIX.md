# 线索本 LocalStorage 修复方案

## 问题描述

用户报告了两个主要问题：
1. **对话中缺少Q4问题**：Gemini AI 跳过了"你吃了什么食物？"这个问题
2. **线索本显示错误**：打开线索本时显示 "Unknown NPC" 和 "Great Job" 而不是正确的NPC名字和线索内容

## 根本原因

从数据库诊断发现：
- 线索记录的 `npcName` 字段为 `NULL`
- 线索记录的 `clueText` 字段是旧的JSON格式：`{"stage1":"Great Job.","stage2":"Great Job."}`
- 后端保存线索时存在问题，导致数据不完整

## 解决方案

采用 **前端 localStorage 存储** 方案，完全绕过数据库的问题：

### 1. 修改 UIManager.js

#### 新增功能：
- `saveClueToLocalStorage(clue)`: 将线索保存到 localStorage
- `loadCluesFromLocalStorage()`: 从 localStorage 加载线索
- 修改 `addClue()`: 自动保存到 localStorage
- 修改 `showClueJournal()`: 从 localStorage 加载而不是API

#### 代码变更：

```javascript
// UIManager.js

// 初始化时加载线索
init() {
  console.log("🛠️ UIManager: 初始化 UI 元素...");
  this.createDateDisplay();
  this.createMealProgress();
  
  // 🔧 从 localStorage 加载线索
  this.loadCluesFromLocalStorage();
  
  this.updateClueCountBadge();
}

// 添加线索时自动保存
addClue(clueData, showNotification = true) {
  const newClue = {
    npcId: clueData.npcId,
    npcName: clueData.npcName || clueData.npcId,
    clue: clueData.clue || clueData.clueText,
    clueType: clueData.clueType || 'vague',
    day: clueData.day || 1,
    mealType: clueData.mealType || 'unknown',
    timestamp: Date.now()
  };
  
  this.clues.push(newClue);
  
  // 🔧 保存到 localStorage
  this.saveClueToLocalStorage(newClue);
  
  this.updateClueCountBadge();
  
  if (showNotification) {
    this.showNotification(`🎁 获得新线索！`);
  }
}

// 保存到 localStorage
saveClueToLocalStorage(clue) {
  const playerId = this.scene.playerData?.playerId || 'default';
  const key = `clues_${playerId}`;
  
  try {
    const existingClues = JSON.parse(localStorage.getItem(key) || '[]');
    
    const isDuplicate = existingClues.some(c => 
      c.npcId === clue.npcId && 
      c.clue === clue.clue &&
      c.clueType === clue.clueType
    );
    
    if (!isDuplicate) {
      existingClues.push(clue);
      localStorage.setItem(key, JSON.stringify(existingClues));
      console.log("💾 线索已保存到 localStorage:", clue);
    }
  } catch (error) {
    console.error("❌ 保存线索到 localStorage 失败:", error);
  }
}

// 从 localStorage 加载
loadCluesFromLocalStorage() {
  const playerId = this.scene.playerData?.playerId || 'default';
  const key = `clues_${playerId}`;
  
  try {
    const storedClues = JSON.parse(localStorage.getItem(key) || '[]');
    this.clues = storedClues;
    console.log(`📚 从 localStorage 加载了 ${this.clues.length} 条线索`);
    this.updateClueCountBadge();
  } catch (error) {
    console.error("❌ 从 localStorage 加载线索失败:", error);
    this.clues = [];
  }
}

// 打开线索本时重新加载
async showClueJournal() {
  console.log("📖 UIManager: 打开线索本面板");
  
  if (this.cluePanel) {
    this.hideCluePanel();
  }
  
  // 🔧 从 localStorage 重新加载线索
  this.loadCluesFromLocalStorage();
  
  this.showCluePanel();
}
```

### 2. 修改 DialogSceneRefactored.js

#### 变更：
- 直接从前端 `npcClues.js` 获取线索数据
- 使用 `getNPCName()` 获取正确的NPC名字
- 调用 `mainScene.uiManager.addClue()` 保存线索

#### 代码变更：

```javascript
// DialogSceneRefactored.js

async completeMealRecording() {
  // ... 前面的代码 ...
  
  if (result.success) {
    // 🔧 直接从前端数据获取线索
    const { getNPCClue, getNPCName } = await import('../../data/npcClues.js');
    
    // 🔧 确保使用正确的NPC名字
    const actualNPCName = getNPCName(this.currentNPC, lang);
    
    let clueType, clueText, clueData;
    
    if (mealType === "dinner") {
      // 晚餐：给真实线索
      clueType = "true";
      clueData = getNPCClue(this.currentNPC, "true", 0, lang);
      clueText = clueData ? clueData.text : "Good job!";
    } else {
      // 早餐/午餐：给模糊线索
      clueType = "vague";
      const clueKey = `${this.playerId}_${this.currentNPC}_vague_count`;
      const previousVagueCount = parseInt(localStorage.getItem(clueKey) || '0');
      const vagueIndex = Math.min(previousVagueCount, 1);
      
      clueData = getNPCClue(this.currentNPC, "vague", vagueIndex, lang);
      clueText = clueData ? clueData.text : "Great job!";
      
      localStorage.setItem(clueKey, (previousVagueCount + 1).toString());
    }
    
    // NPC说出线索
    if (clueText) {
      this.uiManager.addMessage("NPC", clueText);
      
      // 🔧 添加到本地线索列表
      if (this.mainScene && this.mainScene.uiManager) {
        this.mainScene.uiManager.addClue({
          npcId: this.currentNPC,
          npcName: actualNPCName,  // 使用正确的NPC名字
          clue: clueText,
          clueType: clueType,
          day: this.currentDay,
          mealType: mealType
        }, true);
      }
      
      await this.delay(1000);
    }
    
    // ... 后续代码 ...
  }
}
```

### 3. 修改 Gemini 提示词

#### 变更：
- 强化系统提示词，明确要求按顺序问每个问题
- 特别强调不能跳过Q4

#### 代码变更：

```javascript
// geminiRoutes.js

const basePrompt = `You are playing the role of an NPC in an interactive game. 
YOUR PRIMARY GOAL: Ask the player the CURRENT question specified below in your unique character voice.

CURRENT TASK:
- You MUST ask about: ${currentQ}
- Progress: ${progress} of 6 questions
- IMPORTANT: Do NOT skip any question. Each question MUST be asked in order.

STRICT RULES:
1. DO NOT skip ahead. ONLY ask the current question (${currentQ}).
2. DO NOT ask about Q5 or Q6 topics if current question is Q4.
3. Keep your response CONCISE (max 20 words).
4. Do not expose inner thoughts.
5. Share a tiny bit of your own meal or a master's memory if it fits your character.
6. If the current question is Q1, Q2, or Q3, remember that the player will see BUTTONS to answer, so your question should lead naturally to those choices.

CHARACTER VOICE:
`;

// ... 在提示词末尾 ...

return basePrompt + personality + `\n\nJOURNALING CONTEXT:\n- Meal type: ${mealType}\n- Question definitions:\n  Q1: How did you obtain this meal?\n  Q2: What time did you eat?\n  Q3: How long did you eat?\n  Q4: What specific food items did you eat? (MUST BE ASKED!)\n  Q5: Portion size and physical feelings\n  Q6: Why did you choose this meal?\n\nREMEMBER: \n- You are CURRENTLY asking: ${currentQ}\n- DO NOT skip to Q5 or Q6 if you haven't asked Q4 yet!\n- Each question must be asked individually in sequence.`;
```

## 优势

✅ **可靠性**：不依赖后端数据库，完全前端控制
✅ **持久性**：使用 localStorage，关闭浏览器后数据仍然保存
✅ **实时性**：对话完成后立即显示正确的线索
✅ **准确性**：直接从 `npcClues.js` 获取线索文本，确保内容正确
✅ **易维护**：所有线索数据都在前端，易于调试和修改

## localStorage 数据结构

```javascript
// Key: clues_<playerId>
// Value: JSON array of clue objects

[
  {
    "npcId": "uncle_bo",
    "npcName": "Village Head",
    "clue": "Good job! Little by little, you'll start to understand...",
    "clueType": "true",
    "day": 1,
    "mealType": "dinner",
    "timestamp": 1735352400000
  },
  {
    "npcId": "shop_owner",
    "npcName": "Shop Owner Grace",
    "clue": "It's nice hearing you share in such detail...",
    "clueType": "vague",
    "day": 2,
    "mealType": "breakfast",
    "timestamp": 1735438800000
  }
]
```

## 测试步骤

1. **刷新浏览器**，清除旧数据（可选：打开浏览器开发者工具 -> Application -> Local Storage -> 清除 `clues_*` 键）
2. **登录游戏**
3. **与 Village Head 对话，记录晚餐**
4. **验证对话流程**：
   - Q1: How is your meal obtained? (按钮)
   - Q2: What time did you have this meal? (按钮)
   - Q3: How long did you eat? (按钮)
   - (可能) Q_TIME_FOLLOWUP: Why did you eat at this time? (输入框)
   - **Q4: What did you have for dinner?** (输入框) ← 必须出现！
   - Q5: What portion size... (输入框)
   - Q6: Why did you choose this meal? (输入框)
5. **对话结束后**，NPC会说出真实线索（晚餐）
6. **打开线索本**，验证显示：
   - ✅ 正确的 NPC 名字（"Village Head"）
   - ✅ 正确的线索内容（不是"Unknown NPC"或"Great Job"）
   - ✅ 线索类型标识（true = 金色，vague = 白色）
7. **关闭浏览器，重新打开**，验证线索仍然存在

## 备注

- 后端数据库保存仍然进行，但前端不再依赖它
- 如果需要清除某个玩家的线索，可以在浏览器开发者工具中删除对应的 localStorage 键
- 未来如果需要同步到数据库，可以在 `saveClueToLocalStorage` 中添加额外的API调用

## 修改文件清单

1. ✅ `src/phaser/UIManager.js` - 添加 localStorage 支持
2. ✅ `src/phaser/dialog/DialogSceneRefactored.js` - 使用前端数据获取线索
3. ✅ `server/routes/geminiRoutes.js` - 强化Q4提示词
4. ✅ `src/data/npcClues.js` - 修复中文引号语法错误
5. ✅ `server/data/npcClues.js` - 修复中文引号语法错误

---

**修复完成时间**: 2025-12-28
**修复作者**: AI Assistant
**版本**: v2.0 (LocalStorage Solution)

