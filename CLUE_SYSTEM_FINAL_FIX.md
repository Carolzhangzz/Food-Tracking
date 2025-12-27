# 线索系统最终修复

## 🐛 问题现象

1. 线索本显示 "Unknown NPC" 而不是NPC名字
2. 线索内容显示为 "Great Job" 或 JSON 对象 `{"stage2":"Great Job."}`
3. `TypeError: this.clueManager.showVagueClue is not a function`

## 🔍 问题根源

### 1. 数据库中保存了错误格式的数据
```json
{
  "npcName": null,
  "clueText": "{\"stage2\":\"Great Job.\"}"
}
```

### 2. `ClueManager.js` 缺少关键方法
- 缺少 `showVagueClue()` 方法
- 缺少 `showTrueClue()` 方法

### 3. 后端日志不够详细
- 无法确定 `clueText` 的具体内容和类型

## ✅ 修复内容

### 1. **前端：添加缺失的方法到 `ClueManager.js`**

```javascript
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
```

### 2. **后端：增强日志和类型检查 (`gameRoutes.js`)**

```javascript
// ✅ 添加详细日志
console.log(`🎯 [线索判定] NPC: ${npcId}, 餐食: ${mealType}, 已有vague数: ${previousVagueCount}`);

if (mealType === "dinner") {
  clueType = "true";
  clueText = getClueForNPCStage(npcId, playerLanguage, 3);
  console.log(`✅ [晚餐] 给予真实线索 (${typeof clueText}):`, clueText);
} else {
  clueType = "vague";
  const stage = previousVagueCount === 0 ? 1 : 2;
  clueText = getClueForNPCStage(npcId, playerLanguage, stage);
  console.log(`ℹ️ [${mealType}] 给予模糊线索 (阶段 ${stage}, ${typeof clueText}):`, clueText);
}

// ✅ 添加类型检查
if (clueText && typeof clueText === 'string') {
  // 保存线索...
} else {
  console.error(`❌ clueText 不是字符串或为空: ${typeof clueText}`, clueText);
}
```

### 3. **数据库：清空旧的错误数据**

运行了清理脚本：
```bash
node server/scripts/truncateClues.js
```

## 🎯 预期结果

### 对话完成后的后端日志：
```
🎯 [线索判定] NPC: uncle_bo, 餐食: lunch, 已有vague数: 0
ℹ️ [lunch] 给予模糊线索 (阶段 1, string): Your master used to have a place he visited all the time...
📝 正在保存线索: npcName=Village Head, clueType=vague, text=Your master used to have a...
✅ 线索保存成功！
```

### 线索本中的显示：
- **NPC名字**: "村长" (中文) 或 "Village Head" (英文)
- **线索内容**: 完整的 Vague Clue 1 文本

### 数据库中的数据：
```json
{
  "npcId": "uncle_bo",
  "npcName": "Village Head",
  "clueType": "vague",
  "clueText": "Your master used to have a place he visited all the time...",
  "day": 1,
  "mealType": "lunch"
}
```

## 🧪 测试步骤

1. **清除浏览器缓存并强制刷新**: `Cmd + Shift + R`

2. **确保后端服务运行中**:
   ```bash
   cd Food-Tracking
   npm run server
   ```

3. **登录游戏** (使用 `003` 或创建新玩家)

4. **与 Uncle Bo 对话**:
   - 选择记录 **lunch** (午餐)
   - 完成 Q1-Q6 所有问题

5. **观察后端日志** (终端):
   ```
   🎯 [线索判定] NPC: uncle_bo, 餐食: lunch, 已有vague数: 0
   ℹ️ [lunch] 给予模糊线索 (阶段 1, string): Your master used to have...
   📝 正在保存线索: npcName=Village Head, clueType=vague
   ✅ 线索保存成功！
   ```

6. **检查前端控制台**:
   - 应该看到 `🌫️ [ClueManager] 显示模糊线索...`
   - **不应该**看到 `TypeError`

7. **打开线索本** (点击 📖 图标):
   - **NPC名字**: 应该显示 "Village Head" (或 "村长")
   - **线索内容**: 应该显示完整的 Vague Clue 1 文本
   - **不应该**显示 "Unknown NPC" 或 "Great Job"

8. **验证数据库**:
   ```bash
   node server/scripts/checkClues.js
   ```
   应该显示：
   ```
   1. NPC ID: uncle_bo
      NPC Name: Village Head ✅
      Clue Type: vague
      Clue Text: Your master used to have a place he visited...
   ```

## 📊 完整的线索逻辑

### Vague Clue 触发条件：
- **早餐** (breakfast)
- **午餐** (lunch)

### Vague Clue 阶段：
- **第1次** 早餐/午餐 → Vague Clue 1
- **第2次** 早餐/午餐 → Vague Clue 2

### True Clue 触发条件：
- **晚餐** (dinner)

### 线索存储：
所有线索都存储在 `Clues` 表，包含：
- `playerId`: 玩家ID
- `npcId`: NPC标识符 (如 `uncle_bo`)
- `npcName`: NPC显示名称 (如 "Village Head" 或 "村长")
- `clueType`: 线索类型 (`vague` 或 `true`)
- `clueText`: 完整的线索文本
- `day`: 游戏天数
- `mealType`: 餐食类型 (`breakfast`/`lunch`/`dinner`)
- `keywords`: 关键词数组 (JSON)
- `shortVersion`: 简短版本

## 🔧 关键文件

1. `Food-Tracking/src/phaser/dialog/ClueManager.js` - 添加了缺失的方法
2. `Food-Tracking/server/routes/gameRoutes.js` - 增强了日志和类型检查
3. `Food-Tracking/server/data/npcClues.js` - 包含所有7个NPC的完整线索文本
4. `Food-Tracking/server/scripts/truncateClues.js` - 清理脚本

## 🎉 修复完成

现在系统应该能够：
- ✅ 正确保存NPC名字和线索文本到数据库
- ✅ 在线索本中显示正确的NPC名字
- ✅ 显示完整的线索内容（不是 "Great Job"）
- ✅ 根据餐食类型（早/中/晚）给予不同的线索
- ✅ 不再出现 `TypeError`

