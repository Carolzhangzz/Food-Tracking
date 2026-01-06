# 问题序列重构说明

## 🔄 最新更新（v245）

**所有 NPC 统一为 8 个问题**
- ❌ 移除 Type A 和 Type B 的区分
- ✅ 所有 7 个 NPC 使用相同的问题序列
- ⭕ Q1-Q3: 按钮选择题
- ✍️ Q4-Q8: 自由问答

---

## 📋 更新内容

### 问题：原问题序列遗漏问题

**原因**：之前将多个问题合并成一个复杂问题，导致：
1. 玩家回答不完整
2. Gemini AI 可能跳过部分内容
3. 对话不够自然
4. Type A 和 Type B 差异导致复杂度

**解决方案**：
1. 将问题拆分得更细致，每次只问一个简单的问题
2. 统一所有 NPC 为相同的 8 个问题
3. 前 3 个问题为按钮选择（易于回答）
4. 后 5 个问题为自由问答（深入了解）

---

## 📝 新问题序列

### 所有 NPCs（统一 8 个问题）
适用于：**所有 7 个 NPC**

| 问题ID | 类型 | 问题内容 | 对应图片中的 |
|--------|------|----------|--------------|
| Q1 | ⭕ 选择题 | How is your meal obtained? | Q2 |
| Q2 | ⭕ 选择题 | What time did you have this meal? | Q3 (part 1) |
| Q_TIME_FOLLOWUP | 输入题 | Why did you eat at this time? (conditional) | Q3 (part 2) |
| Q3 | ⭕ 选择题 | How long did you eat? | Q4 |
| Q4 | ✍️ 输入题 | What did you have (for [MEAL])? | Q5 |
| Q5 | ✍️ 输入题 | What portion size did you eat? | Q6 |
| Q6 | ✍️ 输入题 | How did you decide on that amount? | Q7 |
| Q7 | ✍️ 输入题 | How did your body feel, as you ate... and after? | Q8 |
| Q8 | ✍️ 输入题 | Why did you choose this particular food/meal? | Q9 |

**问题类型说明：**
- **Q1-Q3**: 按钮选择题（⭕）
- **Q4-Q8**: 自由问答（✍️）
- **Q_TIME_FOLLOWUP**: 条件性追问（仅当 Q2 选择不寻常时间时触发）

---

## 🎯 Gemini Prompt 优化

### 关键更新：

1. **强制每次只问一个问题**
   ```
   CRITICAL RULES:
   1. Ask ONLY ONE question at a time
   2. Each response should be 1-2 sentences maximum (15 words per sentence)
   ```

2. **响应结构模板**
   ```
   RESPONSE STRUCTURE (when asking a question):
   - First: Give a SHORT character-driven remark about player's previous answer (1 sentence, ~10-15 words)
   - Second: Ask the required question naturally in your voice (1 sentence, ~10-20 words)
   ```

3. **防止跳过问题**
   ```
   4. DO NOT skip this question - it is mandatory
   5. DO NOT ask follow-up questions unless the player's answer is incomplete
   6. After player answers, wait for the system to give you the next question
   7. ONLY say "Thanks for sharing your meal with me." when currentQuestionId is null
   ```

---

## 📖 对话示例（参考图片2）

**Uncle Bo 的午餐对话风格：**

```
1. Uncle Bo: "What did you have for lunch, my child? I just finished steamed rice, 
              a small clay pot of braised tofu, and some greens from the garden."
   
2. Player: "I had a sandwich and some chips."

3. Uncle Bo: "Wow! What portion size did you have? Chef Hua always praised your 
              sense for portions."

4. Player: "About one full sandwich and a handful of chips."

5. Uncle Bo: "Oh? How did you decide that amount? Your master used to weigh every 
              portion by feeling alone."

6. Player: "I just ate until I felt satisfied."

7. Uncle Bo: "Interesting! How did your body feel, as you ate... and after? Your 
              master always said the body speaks softly, if we care to listen."

8. Player: "I felt good while eating, a bit full afterwards."

9. Uncle Bo: "What made you choose this meal, my child? Chef Hua always believed 
              our cravings have stories to tell."
```

---

## 🔧 技术实现

### 1. MealRecordingHandler.js
- **移除** Type A 和 Type B 的区分
- **统一** 所有 NPC 使用相同的 8 个问题序列
- Q1-Q3: 选择题（按钮）
- Q4-Q8: 自由问答（输入框）
- 将原来的 Q5 拆分为 Q5、Q6、Q7（份量 → 如何决定 → 身体感觉）
- 原来的 Q6 变为 Q8（为什么选择）

### 2. geminiRoutes.js
- 更新 `CRITICAL RULES` 部分
- 更新 `RESPONSE STRUCTURE` 部分
- 强化对问题遗漏的防范
- 保持 NPC 性格化对话风格

### 3. DialogSceneRefactored.js
- 固定 `maxQuestions = 8`（所有 NPC 统一）
- 保持强制序列检查
- 确保所有 8 个问题都被问完

---

## ✅ 预期效果

1. **不再遗漏问题**：每个问题都被明确定义和检查
2. **对话更自然**：问题简单、每次只问一个
3. **保持 NPC 性格**：Gemini 根据 NPC 人格动态生成对话
4. **控制对话长度**：每句话不超过 15-20 个单词
5. **玩家体验更好**：问题简单明了，容易回答

---

## 🚀 部署信息

- **提交**: `cc42d7b`
- **Heroku 版本**: `v245`
- **部署时间**: 2026-01-05
- **更新**: 统一所有 NPC 为 8 个问题（前 3 个按钮，后 5 个自由问答）

---

## 📊 对比表

| 维度 | 之前 | 现在 |
|------|------|------|
| 问题数量 | Type A: 6个, Type B: 3个 | **统一 8 个** |
| NPC差异 | 不同NPC问题不同 | **所有NPC问题相同** |
| 问题细致度 | Q5 包含3个子问题 | **每个问题独立** |
| 选择题数量 | Type A: 3个, Type B: 0个 | **统一前3个为选择题** |
| 自由问答数量 | Type A: 3个, Type B: 3个 | **统一后5个为自由问答** |
| 遗漏问题风险 | 较高 | **很低** |
| 对话自然度 | 中等 | **高** |
| 玩家回答难度 | 较难（复杂问题） | **简单（单一问题）** |

---

## 🎮 测试建议

1. 与不同 NPC 进行完整对话
2. 检查是否所有 8 个问题（Type A）或 5 个问题（Type B）都被问到
3. 观察 Gemini 生成的对话是否保持 NPC 性格
4. 确认每句话长度合理（不超过 20 个单词）

