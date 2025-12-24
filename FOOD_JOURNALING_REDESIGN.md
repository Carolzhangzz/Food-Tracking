# 🍽️ Food Journaling 流程重构

## 📋 **修改概要**

### ✅ **修复了什么？**

1. ✅ **修复cluebook路径**
   - 从 `/assets/elements/cluebook.png` → `/assets/element/cluebook.png`
   - 文件位置：`MainScene.js` line 138

2. ✅ **重构food journaling流程**
   - **前3个问题（Q1-Q3）**: 按钮选择
   - **后3个问题（Q4-Q6）**: 自由文本输入
   - **条件性问题（Q_TIME_FOLLOWUP）**: 如果时间不合常理，则插入自由输入问题

3. ✅ **整合Uncle Bo详细prompt到Gemini**
   - 角色设定：村长Uncle Bo，华师傅的老朋友
   - 对话风格：温和、慢节奏、反思性
   - 每句话最多15个单词
   - 自然分享自己的餐食

---

## 📝 **新的问题流程**

### **阶段1：固定按钮选择（Q1-Q3）**

```
Q1: "How is your meal obtained?" 
    - 按钮选项：
      • Home-cooked meals
      • Eat out at restaurants
      • Takeout or delivery
      • Ready-to-eat meals

Q2: "What time did you have this meal?"
    - 按钮选项：
      • Early morning (before 7AM)
      • Morning (7–11AM)
      • Midday (11AM–2PM)
      • Afternoon (2–5PM)
      • Evening (5–9PM)
      • Night (after 9PM)

Q3: "How long did you eat?"
    - 按钮选项：
      • Less than 10 minutes
      • 10–30 minutes
      • 30–60 minutes
      • More than 60 minutes
```

### **阶段2：时间合理性检查（条件性）**

如果Q2的时间不合常理（例如，早餐选"Evening"），则插入：

```
Q_TIME_FOLLOWUP: "Why did you eat at this time rather than earlier or later?"
    - 自由文本输入
```

**不合常理的时间判断标准：**

- **Breakfast**: 
  - ❌ 不合理: Before 7AM, Midday, Afternoon, Evening, Night
  - ✅ 合理: Morning (7-11AM)
  
- **Lunch**:
  - ❌ 不合理: Before 7AM, Morning, Afternoon, Evening, Night
  - ✅ 合理: Midday (11AM-2PM)
  
- **Dinner**:
  - ❌ 不合理: Before 7AM, Morning, Midday, Afternoon
  - ✅ 合理: Evening (5-9PM), Night

### **阶段3：自由文本输入（Q4-Q6）**

```
Q4: "What did you have (for [MEAL])?"
    - 自由文本输入
    - [MEAL] 会被替换为 "breakfast" / "lunch" / "dinner"

Q5: "What portion size did you eat? How did you decide on that amount? 
     How did you feel physically during or after eating?"
    - 自由文本输入

Q6: "Why did you choose this particular food/meal? 
     For example, simply convenient, you have a craving, healthy options?"
    - 自由文本输入
```

---

## 🤖 **Gemini AI Prompt 详细设定**

### **Uncle Bo角色背景**

```
You are the village head of Gourmet Village, and your name is Uncle Bo. 
You are a long-time friend of the missing chef, Chef Hua, but you have 
no knowledge of his disappearance. You simply feel that something is 
very wrong—especially since the fire in his kitchen was still warm when 
he vanished. 

You remember that Chef Hua had a peculiar habit of documenting every 
detail of his meals, so you suggest the player follow his taking notes 
method as a way to start unraveling the mystery. You are a patient elder
—not a keeper of clues, but the player's first meaningful guide in 
their journey.
```

### **对话风格指导**

✅ **Do:**
- Speak like a calm, reflective elder
- Gentle, slow-paced, full of warmth
- Short, grounded sentences (≤15 words)
- Leave space for the player to reflect
- Share YOUR OWN meal naturally throughout conversation
- Use natural ingredients and healthy preparation methods
- Never explicitly mention "healthy"

❌ **Don't:**
- Rush the conversation
- Try to impress or dominate
- Keep asking "why" questions repeatedly
- Expose inner thoughts (in parentheses)

### **示例对话片段**

```
Uncle Bo: "What did you have for breakfast, my child? Chef Hua once 
          made me a small bowl of congee—soft yam pieces, a sprinkle 
          of sesame on top."

Player: "I had pancakes with maple syrup."

Uncle Bo: "That sounds nice. How much did you have? I took a medium 
          bowl—too much makes the day feel heavy."

Player: "Two pancakes, medium size."

Uncle Bo: "Why did you choose this meal, my child? You've always had 
          your reasons—wise ones, I'm sure."
```

### **自然插入的评论（Examples）**

在对话中自然穿插：

- *"Ah, breakfast—your master always said that was the meal that showed your mood. At midday, your timing, your fire, and your heart all had to be steady."*

- *"He used to say: 'Whoever can take a meal seriously, can take life seriously.'"*

- *"I can't recall the full story, but he did mention someone—said, 'That one's quiet on the outside, but full of flavor where it counts.'"*

- *"Your master kept visiting a certain place recently. Wait, where's it?"*

---

## 🔧 **代码修改清单**

### **1. MainScene.js**
```javascript
// Line 138
this.load.image("cluebook", "/assets/element/cluebook.png"); // 修正路径
```

### **2. MealRecordingHandler.js** (完全重写)

**新增功能:**
- `initializeQuestions()`: 定义Q1-Q6 + Q_TIME_FOLLOWUP
- `checkUnusualMealTime()`: 检查时间合理性
- `getNextQuestionId()`: 按序列返回下一个问题ID
- `saveAnswer()`: 保存答案并触发时间检查
- `reset()`: 重置状态

**问题定义结构:**
```javascript
Q1: { id, type: "choice", text: {en, zh}, options: {en, zh} }
Q4: { id, type: "input", text: {en, zh} }
```

### **3. DialogSceneRefactored.js**

**修改部分:**
- `onMealSelected()`: 重置MealHandler，初始化`currentQuestionId = "Q1"`
- `askNextQuestion()`: 根据问题类型显示按钮或输入框
- `onQuestionAnswered()`: 保存答案，获取下一个问题ID

**新的对话流程:**
```
onMealSelected("breakfast")
  → currentQuestionId = "Q1"
  → askNextQuestion()
     → 显示按钮（Q1-Q3）或输入框（Q4-Q6）
  → onQuestionAnswered(questionId, answer)
     → saveAnswer() [检查时间合理性]
     → currentQuestionId = getNextQuestionId()
     → askNextQuestion()
  → 循环直到 currentQuestionId = null
  → completeMealRecording()
```

### **4. geminiRoutes.js**

**修改部分:**
- `generateImprovedSystemPrompt()`: 新增`mealType`参数，整合Uncle Bo设定
- `getMealExample()`: 新增helper函数，根据餐食类型返回对应示例

**Prompt结构:**
```
[Base Prompt]
  - Game interactive style
  - 15-word max per sentence
  - Natural conversation
  - Share own meal

[NPC Personality: Uncle Bo]
  - Background story
  - Speaking style
  - Example remarks
  - Sample questions for Q4-Q6

[Instructions]
  - After Q6, say "Thanks for sharing"
  - Don't repeat "why" questions
  - Use natural ingredients
```

---

## 📦 **测试步骤**

### **Step 1: 启动服务器**

```bash
# Terminal 1: Backend
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking/server
npm start

# Terminal 2: Frontend
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking
npm start

# Browser
http://localhost:3000
Cmd + Shift + R (清除缓存)
```

### **Step 2: 测试流程**

1. ✅ **登录** → 选择语言 → 选择性别
2. ✅ **进入地图** → 点击NPC
3. ✅ **ConvAI开场白** → 选择"记录餐食"
4. ✅ **选择餐食类型**（breakfast/lunch/dinner）
5. ✅ **Q1-Q3**: 点击按钮选择
6. ✅ **时间检查**: 如果Q2不合理，自动插入Q_TIME_FOLLOWUP
7. ✅ **Q4-Q6**: 输入自由文本
8. ✅ **完成**: 显示"Thanks for sharing..."
9. ✅ **晚餐线索** / **早午餐vague回复**
10. ✅ **返回地图**

### **Step 3: 检查数据库**

```bash
heroku pg:psql -a foodtracking-t1

# 查看餐食记录
SELECT * FROM "MealRecords" WHERE "playerId" = '001' ORDER BY "createdAt" DESC LIMIT 5;

# 查看对话历史
SELECT * FROM "ConversationHistories" WHERE "playerId" = '001' ORDER BY "timestamp" DESC LIMIT 5;

# 查看线索
SELECT * FROM "Clues" WHERE "playerId" = '001' ORDER BY "day" DESC;
```

---

## ✅ **完成状态**

| 任务 | 状态 |
|------|------|
| 修复cluebook路径 | ✅ 完成 |
| 重构food journaling流程（Q1-Q3按钮+Q4-Q6自由） | ✅ 完成 |
| 整合Uncle Bo详细prompt到Gemini | ✅ 完成 |
| 时间合理性检查（条件性Q_TIME_FOLLOWUP） | ✅ 完成 |
| 编译测试 | ✅ 通过 |

---

## 📚 **相关文档**

- `SYSTEM_DIAGNOSIS.md` - 系统诊断报告
- `QUICK_FIX_SUMMARY.md` - 快速修复总结
- `README.md` - 项目部署和运行指南
- `UI_FINAL_VERSION.md` - UI最终版本文档

---

## 🎯 **下一步**

1. 🧪 **测试新流程** - 验证Q1-Q6顺序和时间检查
2. 🤖 **优化Gemini响应** - 确保Uncle Bo风格一致
3. 💾 **验证数据保存** - 检查MealRecords, ConversationHistories, Clues
4. 🎁 **完善线索逻辑** - 确保晚餐给线索，早午餐给vague

---

**创建时间**: 2025-12-24  
**最后更新**: 2025-12-24  
**版本**: 1.0

