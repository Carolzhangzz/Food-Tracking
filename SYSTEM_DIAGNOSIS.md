# 🔍 系统诊断报告 (2025-12-24)

## 📋 当前问题总结

### 1️⃣ **线索本按钮问题** ✅ 已修复
- **问题**: 线索本按钮不显示
- **原因**: 
  - 位置设置在右上角，可能被其他元素遮挡
  - 没有使用`cluebook.png`图片
- **修复**:
  - 移动到左下角（音乐按钮下方）
  - 使用`cluebook.png`图片
  - 添加线索数量badge
  - 增加depth到10000确保可见

### 2️⃣ **对话流程问题** ⚠️ 需要修复
- **当前流程**:
  ```
  ConvAI开场白 → 立即选择餐食 → 6个预定义选项问题
  ```

- **期望流程**:
  ```
  ConvAI开场白 → 自由回复对话 → 选择餐食 → Gemini AI提问（部分选项+部分自由输入） → 完成记录 → vague/线索
  ```

- **问题**:
  1. 开场白后没有自由回复环节
  2. Food journaling问题是预定义选项，应该使用Gemini AI
  3. "why"等问题需要自由输入，但目前都是选项

### 3️⃣ **API使用问题** ⚠️ 需要修复
- **当前**:
  - ConvAI: 用于开场白 ✅
  - Groq: 在`MealRecordingHandler`中提到，但实际未使用
  - Gemini: 只用于最终报告生成

- **应该**:
  - ConvAI: NPC开场白 ✅
  - Gemini AI: Food journaling问答（动态提问）
  - Gemini AI: 最终报告生成 ✅

### 4️⃣ **对话保存问题** ⚠️ 需要检查
- **问题**: 用户反馈"每次对话都无法成功保存"
- **需要检查**:
  - `/api/record-meal` 接口是否正常
  - `/api/save-conversation` 接口是否被调用
  - 数据库连接是否正常

### 5️⃣ **Vague/线索逻辑** ⚠️ 需要完善
- **当前**: 基本逻辑存在，但可能不完整
- **需要**: 确保只有晚餐给线索，其他餐给vague回复

---

## 🏗️ 系统架构分析

### 当前对话系统结构

```
DialogSceneRefactored (主场景)
├── DialogStateManager (状态管理)
├── ConvAIHandler (ConvAI API)
├── MealRecordingHandler (预定义问题)
├── ClueManager (线索管理)
└── DialogUIManager (UI管理)
```

### 需要的修改

```
DialogSceneRefactored (主场景)
├── DialogStateManager (状态管理)
├── ConvAIHandler (ConvAI API) ✅
├── GeminiHandler (NEW! Gemini AI for food journaling)
├── MealRecordingHandler (简化为餐食元数据)
├── ClueManager (线索管理) ✅
└── DialogUIManager (UI管理) ✅
```

---

## 🔄 修复后的对话流程

### Phase 1: ConvAI开场白
```javascript
// ConvAI API调用
const intro = await convaiHandler.callAPI("hello", npcId);
uiManager.addMessage("NPC", intro);

// ✅ 显示输入框（自由回复）
uiManager.showInputBox((userReply) => {
  // 玩家自由回复
  uiManager.addMessage("Player", userReply);
  
  // 可以继续ConvAI对话或进入下一阶段
  showMealSelection();
});
```

### Phase 2: 餐食选择
```javascript
// 询问要记录哪一餐
uiManager.addMessage("NPC", "Which meal do you want to record?");
uiManager.showButtons([
  { text: "Breakfast", value: "breakfast" },
  { text: "Lunch", value: "lunch" },
  { text: "Dinner", value: "dinner" },
], (selectedMeal) => {
  startGeminiFoodJournaling(selectedMeal);
});
```

### Phase 3: Gemini AI Food Journaling
```javascript
async function startGeminiFoodJournaling(mealType) {
  const questions = [
    { type: "what", allowFreeInput: false },      // 选项
    { type: "how_much", allowFreeInput: false },  // 选项
    { type: "taste", allowFreeInput: false },     // 选项
    { type: "with_whom", allowFreeInput: false }, // 选项
    { type: "where", allowFreeInput: false },     // 选项
    { type: "why", allowFreeInput: true },        // 🔥 自由输入！
    { type: "feeling", allowFreeInput: false },   // 选项
  ];
  
  for (const q of questions) {
    const response = await geminiHandler.askFoodQuestion(
      q.type,
      lastAnswer,
      { mealType, previousAnswers }
    );
    
    uiManager.addMessage("NPC", response.response);
    
    if (q.allowFreeInput) {
      // 自由输入
      const answer = await uiManager.waitForInput();
      uiManager.addMessage("Player", answer);
    } else {
      // 选项按钮
      const answer = await uiManager.waitForButtonClick(options);
      uiManager.addMessage("Player", answer);
    }
    
    lastAnswer = answer;
  }
  
  completeMealRecording();
}
```

### Phase 4: 完成记录
```javascript
// 提交到后端
const result = await submitMealRecord(...);

if (mealType === "dinner" && result.shouldGiveClue) {
  // 给予明显线索
  const clue = await clueManager.getClueForNPC(npcId);
  uiManager.addMessage("System", "🎁 你获得了一条线索！");
  uiManager.addMessage("NPC", clue);
} else {
  // 给予vague回复
  const vague = mealHandler.getVagueResponse(vagueCount);
  uiManager.addMessage("NPC", vague);
}

// 返回地图
setTimeout(() => returnToMainScene(), 3000);
```

---

## 📊 后端API清单

### 已实现
- ✅ `/api/convai-chat` - ConvAI对话
- ✅ `/api/login` - 玩家登录
- ✅ `/api/player-status` - 玩家状态
- ✅ `/api/record-meal` - 记录餐食
- ✅ `/api/save-clue` - 保存线索
- ✅ `/api/clues/:playerId` - 获取线索
- ✅ `/api/save-conversation` - 保存对话
- ✅ `/api/generate-final-egg` - 生成最终报告（Gemini AI）

### 需要添加
- ⚠️ `/api/gemini-chat` - Gemini AI对话（用于food journaling）

---

## 🗄️ 数据库表结构

### Players 表
```sql
playerId (主键)
nickname
firstLoginDate
currentDay
gameCompleted
language
music
gender
```

### MealRecords 表
```sql
id (主键)
playerId (外键)
day
npcId
npcName
mealType (breakfast/lunch/dinner)
mealAnswers (JSON)
conversationHistory (JSON)
mealContent (TEXT)
recordedAt
```

### Clues 表
```sql
id (主键)
playerId (外键)
npcId
clueText
day
mealStage (1=breakfast, 2=lunch, 3=dinner)
receivedAt
```

### ConversationHistories 表
```sql
id (主键)
playerId (外键)
npcId
conversationType
conversationData (JSON)
timestamp
```

---

## 🔧 修复优先级

### 🔴 Priority 1: 立即修复
1. ✅ **线索本按钮显示**
   - 状态: 已修复
   - 文件: `UIManager.js`

2. ⏳ **添加Gemini API后端接口**
   - 文件: `server/routes/geminiRoutes.js`
   - 功能: `/api/gemini-chat` 用于food journaling

3. ⏳ **修改对话流程**
   - 文件: `DialogSceneRefactored.js`
   - 功能: 开场白后自由回复 → 餐食选择 → Gemini提问

### 🟡 Priority 2: 重要优化
4. ⏳ **测试对话保存功能**
   - 检查: 数据库是否正确保存
   - 检查: API调用是否成功

5. ⏳ **完善vague/线索逻辑**
   - 确保: 只有晚餐给线索
   - 确保: 线索正确保存到数据库

### 🟢 Priority 3: 增强功能
6. ⏳ **优化Gemini提问质量**
   - 根据玩家回答动态调整问题
   - 使对话更自然

---

## 📝 修复步骤

### Step 1: 添加Gemini API接口 ✅
- 创建: `GeminiHandler.js` ✅
- 创建: `/api/gemini-chat` 后端接口

### Step 2: 修改对话流程
- 修改: `DialogSceneRefactored.js`
  - `playConvAIIntro()`: 添加自由回复环节
  - `startMealRecording()`: 使用Gemini AI
  - `askNextQuestion()`: 支持自由输入和选项混合

### Step 3: 测试完整流程
- 测试: ConvAI开场白 ✅
- 测试: 自由回复功能
- 测试: 餐食选择 ✅
- 测试: Gemini提问
- 测试: 自由输入 vs 选项
- 测试: 餐食保存
- 测试: 线索获得
- 测试: 数据库记录

---

## 🧪 测试清单

### 功能测试
- [ ] 线索本按钮显示在左下角
- [ ] 点击线索本按钮显示线索面板
- [ ] 线索数量badge正确显示
- [ ] ConvAI开场白正常工作
- [ ] 开场白后可以自由回复
- [ ] 餐食选择正常工作
- [ ] Gemini AI提问正常工作
- [ ] 自由输入问题正常工作
- [ ] 选项按钮问题正常工作
- [ ] 餐食记录保存成功
- [ ] 晚餐给予线索
- [ ] 非晚餐给予vague回复
- [ ] 对话历史保存到数据库

### 数据库测试
- [ ] MealRecords表正确插入数据
- [ ] Clues表正确插入数据
- [ ] ConversationHistories表正确插入数据
- [ ] PlayerProgresses表正确更新

---

## 🚀 下一步行动

1. **完成Gemini API后端接口**
2. **修改DialogSceneRefactored对话流程**
3. **测试完整对话流程**
4. **修复发现的bug**
5. **优化用户体验**

---

**📌 注意**: 这个报告基于当前代码分析。实际修复过程中可能发现更多问题。

**Last Updated**: 2025-12-24

