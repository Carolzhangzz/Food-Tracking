# 🎯 最终测试指南

## ✅ 准备工作已完成

- ✅ 玩家 002 的所有数据已清空
- ✅ 线索表已清空
- ✅ 代码已修复（添加了 `day` 和 `actualAnswers` 变量）

---

## 📝 测试步骤（请严格按照顺序执行）

### 1️⃣ **重启后端服务器** ⚠️ 非常重要！

在后端终端中：
```bash
# 停止当前服务器
按 Ctrl + C

# 重新启动（确保新代码生效）
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking
node server/app.js
```

应该看到：
```
🚀 Server running on port 5000
✅ Database connected successfully
```

---

### 2️⃣ **强制刷新浏览器**

```
Cmd + Shift + R
```

---

### 3️⃣ **登录游戏**

- 打开 `http://localhost:3000`
- 输入玩家ID: `002`
- 选择语言（English）
- 选择性别

---

### 4️⃣ **与 Uncle Bo 对话，记录 breakfast（早餐）**

1. 点击地图上的 Uncle Bo（村长）
2. 看到开场白后，输入任意文字或直接说 "record breakfast"
3. 选择 **breakfast**
4. 完成所有问题（Q1-Q6）：
   - Q1: 选择任意选项（如 "Home-cooked meals"）
   - Q2: 选择任意时间（如 "Morning (7–11AM)"）
   - Q3: 选择任意时长（如 "10–30 minutes"）
   - Q4-Q6: 输入任意文字（如 "rice", "good", "healthy"）

---

### 5️⃣ **在后端终端查找关键日志** 🔍

对话完成后，立即在后端终端查找这些日志：

```
👤 记录餐食 - NPC ID: uncle_bo, 最终名字: Village Head, 餐食: breakfast, Day: 1
🎯 [线索判定] NPC: uncle_bo, 餐食: breakfast, 已有vague数: 0
ℹ️ [breakfast] 给予模糊线索 (阶段 1, string): Your master used to have a place he visited all the time...
📝 正在保存线索: npcName=Village Head, clueType=vague, text=Your master used to have a place...
✅ 线索保存成功！
```

**如果看到这些日志** ✅：
- 说明后端保存成功！
- 继续第 6 步

**如果没有看到这些日志** ❌：
- 说明后端没有运行新代码
- 请确保已经重启后端服务器（第 1 步）
- 然后重新测试

---

### 6️⃣ **检查前端控制台**

打开浏览器开发者工具（F12），在 Console 中查找：

```
🗝️ NPC 正在说出线索...
🌫️ [ClueManager] 显示模糊线索: Your master used to have a place...
📥 UIManager: 正在从后端加载线索数据 (PlayerID: 002)...
✅ UIManager: 成功加载了 1 条线索
```

---

### 7️⃣ **打开线索本检查** 📖

1. 点击地图右侧的 📖 图标
2. 应该看到：
   - **NPC名字**: "Village Head"（不是 "Unknown NPC"）
   - **线索内容**: "Your master used to have a place he visited all the time... Hmm, where was it again? Ah, my memory's not what it used to be. Oh! It's time for me to prep for my next meal. Come back in a few hours. Maybe something will come back to me."

---

### 8️⃣ **验证数据库**

在终端运行：
```bash
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking
node server/scripts/fullDiagnosis.js
```

应该看到：
```
3️⃣ 最近的线索记录:

   线索 1:
   - NPC ID: uncle_bo
   - NPC Name: Village Head ✅
   - Clue Type: vague ✅
   - Meal Type: breakfast ✅
   - Day: 1 ✅
   - Clue Text: Your master used to have a place he visited... ✅
```

---

## 🐛 常见问题

### Q1: 对话历史 404 错误
```
Failed to load resource: the server responded with a status of 404 (Not Found)
api/conversation-history?playerId=002&npcId=uncle_bo&limit=1
```

**解答**: 这是正常的！因为玩家第一次与 NPC 对话时，没有历史记录。这不影响游戏功能。

---

### Q2: 线索本仍然显示 "Unknown NPC"

**可能原因**:
1. ❌ 后端没有重启（新代码未生效）
2. ❌ 浏览器缓存未清除
3. ❌ 测试的是旧数据

**解决方案**:
1. 确保执行了第 1 步（重启后端）
2. 确保执行了第 2 步（强制刷新浏览器）
3. 运行重置脚本：
   ```bash
   node server/scripts/resetPlayer002.js
   ```
4. 重新从第 1 步开始

---

### Q3: 线索内容是 "Great Job"

**可能原因**:
- 数据库中有旧数据

**解决方案**:
1. 清空线索：
   ```bash
   node server/scripts/truncateClues.js
   ```
2. 重置玩家数据：
   ```bash
   node server/scripts/resetPlayer002.js
   ```
3. 重新从第 1 步开始

---

## 📊 预期的完整流程

1. **早餐** (breakfast) → Vague Clue 1
2. **午餐** (lunch) → Vague Clue 2
3. **晚餐** (dinner) → True Clue

每个线索都应该：
- ✅ 显示正确的 NPC 名字
- ✅ 显示完整的线索文本（不是 "Great Job"）
- ✅ 保存到数据库中
- ✅ 在线索本中正确显示

---

## 🆘 如果还是不行

请提供以下信息：

1. **后端终端的完整输出**（从 "👤 记录餐食" 开始）
2. **前端控制台的错误信息**
3. **数据库诊断结果**（运行 `node server/scripts/fullDiagnosis.js`）

---

## 🎉 成功标志

如果看到以下所有内容，说明系统正常工作：

- ✅ 后端日志显示 "✅ 线索保存成功！"
- ✅ 前端控制台显示 "🌫️ [ClueManager] 显示模糊线索"
- ✅ 线索本显示 "Village Head" 和完整线索文本
- ✅ 数据库中有正确的线索记录

