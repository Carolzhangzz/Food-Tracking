# 对话体验和线索本修复

## 修复时间: 2025-12-28

## 问题描述

### 问题1：线索本只显示当前线索，不显示历史线索
用户反馈：记录完餐食后，线索本只显示刚获得的线索，之前的线索消失了。

### 问题2：对话体验生硬，缺少角色回应
用户反馈：
- NPC问完问题后，玩家回答了，NPC没有任何反馈就直接问下一个问题
- 感觉像在填表格，不像在对话
- Gemini跳过了Q4（"What did you have for breakfast?"），直接问Q5

## 根本原因

### 原因1：MainScene 覆盖了 localStorage 数据
`MainScene.js` 在初始化时调用了 `loadCluesFromAPI()`，这会覆盖从 localStorage 加载的历史线索。由于数据库中的旧记录可能不完整，导致线索丢失。

### 原因2：Gemini系统提示词不够明确
- 没有明确要求Gemini先回应玩家的答案
- 问题模板不够具体，导致Gemini可能跳过某些问题
- 缺少对当前问题的明确定义

## 解决方案

### 修复1：完全使用 localStorage，不再调用 API

**修改文件**: `Food-Tracking/src/phaser/MainScene.js`

```javascript
// 修改前：
this.uiManager.init();
if (this.uiManager && typeof this.uiManager.loadCluesFromAPI === 'function') {
  this.uiManager.loadCluesFromAPI().catch(err => {
    console.error("❌ 初始加载线索失败:", err);
  });
}

// 修改后：
this.uiManager.init(); // 这会从 localStorage 加载线索
console.log("📋 线索已从 localStorage 加载");
```

**效果**: 
- ✅ `init()` 时从 localStorage 加载所有历史线索
- ✅ 不会被API响应覆盖
- ✅ 每次上线都能看到之前收集的所有线索

### 修复2：增强Gemini系统提示词

**修改文件**: `Food-Tracking/server/routes/geminiRoutes.js`

#### 变更1：要求先回应再提问

```javascript
const basePrompt = `You are playing the role of an NPC in an interactive game. 
YOUR PRIMARY GOAL: 
1. FIRST, give a very brief (3-5 words) acknowledgment of the player's last answer if they just answered a question.
2. THEN, ask the player the CURRENT question specified below in your unique character voice.

STRICT RULES:
1. DO NOT skip ahead. ONLY ask the current question (${currentQ}).
2. DO NOT ask about Q5 or Q6 topics if current question is Q4.
3. Keep your total response CONCISE (max 25 words total, including acknowledgment + question).
4. Your acknowledgment should be warm and natural, showing you're listening.
5. Example format: "I see. [brief acknowledgment]... [ask current question]"
`;
```

#### 变更2：添加显式问题模板

```javascript
const questionTemplates = {
  Q4: `Ask: "What did you have for ${mealType}?" or a character-appropriate variation of this question.`,
  Q5: `Ask: "What portion size did you eat? How did you decide on that amount? How did you feel physically during or after eating?" or a character-appropriate variation.`,
  Q6: `Ask: "Why did you choose this particular food/meal?" or a character-appropriate variation.`,
  Q_TIME_FOLLOWUP: `Ask: "Why did you eat at this time rather than earlier or later?" or a character-appropriate variation.`
};

const currentTemplate = questionTemplates[currentQ] || `Ask about ${currentQ}.`;

return basePrompt + personality + `
CURRENT QUESTION TO ASK:
${currentTemplate}

REMEMBER: 
- You are CURRENTLY asking: ${currentQ}
- DO NOT skip to Q5 or Q6 if you haven't asked Q4 yet!
- Each question must be asked individually in sequence.
- Do NOT assume the player has already answered this question.`;
```

**效果**:
- ✅ NPC会先对玩家的回答做简短反馈（3-5个词）
- ✅ 对话感觉更自然，不再像填表格
- ✅ Gemini明确知道每个问题应该问什么
- ✅ 不会跳过Q4

### 修复3：改进时间检查逻辑

**修改文件**: `Food-Tracking/src/phaser/dialog/MealRecordingHandler.js`

```javascript
checkUnusualMealTime(answer, mealType) {
  const timeText = typeof answer === 'object' ? answer.text || answer.value : answer;
  
  console.log(`⏰ 检查时间: mealType=${mealType}, timeText="${timeText}"`);
  
  // 多种匹配方式：完全匹配、包含匹配、关键词匹配
  let index = -1;
  
  // 方法1：完全匹配
  index = options.findIndex(opt => opt === timeText);
  
  // 方法2：包含匹配（忽略大小写）
  if (index === -1) {
    index = options.findIndex(opt => 
      timeText.toLowerCase().includes(opt.toLowerCase()) || 
      opt.toLowerCase().includes(timeText.toLowerCase())
    );
  }
  
  // 方法3：关键词提取
  if (index === -1) {
    const lowerTime = timeText.toLowerCase();
    if (lowerTime.includes('before 7') || lowerTime.includes('early')) index = 0;
    else if (lowerTime.includes('7') && lowerTime.includes('11')) index = 1;
    // ... 更多匹配逻辑
  }
  
  // 判断是否异常
  if (mealType === "breakfast") {
    isUnusual = (index !== 0 && index !== 1); // Early morning or Morning
  } else if (mealType === "lunch") {
    isUnusual = (index !== 2); // Midday
  } else if (mealType === "dinner") {
    isUnusual = (index < 4); // Evening or Night
  }
  
  console.log(`⏰ 最终结果: ${isUnusual ? '需要' : '不需要'}follow-up问题`);
  return isUnusual;
}
```

**效果**:
- ✅ 更准确地匹配时间选项
- ✅ 详细的调试日志帮助排查问题
- ✅ 正确触发Q_TIME_FOLLOWUP

## 预期对话流程（示例：早餐 + 异常时间）

```
[INTRO - ConvAI]
NPC: "Three days ago, he left the village without a word..."
Player: [选择 Breakfast]

[Q1 - 按钮]
NPC: "How is your meal obtained?"
Player: [点击 "Home-cooked meals"]

[Q2 - 按钮]
NPC: "What time did you have this meal?"
Player: [点击 "Afternoon (2:00–5:00 PM)"] ← 异常时间

[Q3 - 按钮]  
NPC: "How long did you eat?"
Player: [点击 "10–30 minutes"]

[Q_TIME_FOLLOWUP - Gemini + 输入框]
NPC: "I see... [brief acknowledgment]. Why did you eat at this unusual time?"
Player: [输入 "I woke up late"]

[Q4 - Gemini + 输入框] ← 必须出现！
NPC: "Ah, I understand. So tell me, what did you have for breakfast?"
Player: [输入 "Oatmeal and fruits"]

[Q5 - Gemini + 输入框]
NPC: "Good choice. What portion did you eat? How did you feel?"
Player: [输入 "Medium portion, felt satisfied"]

[Q6 - Gemini + 输入框]
NPC: "I see. And why did you choose this meal?"
Player: [输入 "Healthy and convenient"]

[结束 + 线索]
NPC: [说出模糊线索 1]
NPC: "Thanks for sharing your meal with me!"
[对话结束，返回地图]
```

## 测试步骤

### 1. 清理数据
```bash
# 后端数据库
node server/scripts/resetPlayer002.js

# 前端 localStorage（在浏览器控制台）
Object.keys(localStorage).forEach(key => {
  if (key.includes('002')) {
    localStorage.removeItem(key);
  }
});
```

### 2. 测试早餐（异常时间）
1. 登录游戏（playerId: 002）
2. 与Village Head对话
3. 选择 breakfast
4. Q1: Home-cooked meals
5. Q2: **Afternoon (2:00–5:00 PM)** ← 异常时间
6. **验证**: 出现 Q_TIME_FOLLOWUP
7. 输入回答: "I woke up late"
8. Q3: 10–30 minutes
9. **验证**: 出现 Q4 "What did you have for breakfast?"
10. 输入回答: "Oatmeal"
11. **验证**: NPC先简短回应（如 "Good choice."），然后问 Q5
12. Q5: 输入回答
13. **验证**: NPC先简短回应，然后问 Q6
14. Q6: 输入回答
15. **验证**: NPC说出模糊线索（不是"Great Job"）
16. 打开线索本
17. **验证**: 显示 "Village Head: [完整的模糊线索文本]"

### 3. 测试午餐（正常时间）
1. 与Village Head对话
2. 选择 lunch
3. Q1: 任意
4. Q2: **Midday (11:00 AM–2:00 PM)** ← 正常时间
5. **验证**: 不出现 Q_TIME_FOLLOWUP，直接进入Q3
6. Q3: 任意
7. **验证**: 直接进入Q4（跳过Q_TIME_FOLLOWUP）
8. Q4-Q6: 完成
9. **验证**: NPC说出模糊线索2
10. 打开线索本
11. **验证**: 显示两条线索（早餐和午餐）

### 4. 测试晚餐（获得真实线索）
1. 与Village Head对话
2. 选择 dinner
3. 完成Q1-Q6
4. **验证**: NPC说出真实线索（金色高亮）
5. 打开线索本
6. **验证**: 显示三条线索，最后一条是真实线索

### 5. 测试持久化
1. **关闭浏览器**
2. **重新打开游戏**
3. 打开线索本
4. **验证**: 所有三条线索仍然存在

## 检查点

- [x] Gemini 系统提示词增强（要求先回应再提问）
- [x] 添加显式问题模板，确保Q4不被跳过
- [x] MainScene 不再调用 API，完全使用 localStorage
- [x] 时间检查逻辑改进，增加详细日志
- [x] 早餐时间判断修正（Before 7AM 和 7-11AM 都是正常）

## 预期改进

### 对话体验
- ✅ NPC会对玩家的每个回答做简短反馈
- ✅ 对话感觉更自然，像真实的交流
- ✅ Q4必定出现，不会被跳过
- ✅ 问题按正确顺序进行：Q1→Q2→Q3→(Q_TIME_FOLLOWUP)→Q4→Q5→Q6

### 线索本
- ✅ 显示所有历史线索，不会丢失
- ✅ 每次上线都能看到之前收集的线索
- ✅ 线索正确显示NPC名字和完整文本
- ✅ 关闭浏览器后线索仍然保存

## 示例对话改进

### 修改前（生硬）：
```
NPC: "What time did you have this meal?"
Player: "Afternoon (2:00–5:00 PM)"
NPC: "What did you have for breakfast?"  ← 直接跳到Q4，没有回应
```

### 修改后（自然）：
```
NPC: "What time did you have this meal?"
Player: "Afternoon (2:00–5:00 PM)"
NPC: "Afternoon? That's unusual for breakfast. Why did you eat at this time?"  ← 先回应，再问follow-up
Player: "I woke up late"
NPC: "I see, I understand. So tell me, child, what did you have?"  ← 先回应，再问Q4
```

---

**版本**: v3.0 (Enhanced Dialogue + Persistent Clues)
**状态**: ✅ 已修复，等待测试

