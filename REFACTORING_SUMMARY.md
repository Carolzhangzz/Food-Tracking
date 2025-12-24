# DialogScene 重构总结

## 📊 重构前后对比

### 重构前
- **DialogScene.js**: 3,215行 - 单一巨型文件，包含所有功能

### 重构后
模块化架构，共6个文件：

1. **DialogStateManager.js** (~105行)
   - 状态管理
   - 对话阶段控制
   - 餐食记录状态
   - 对话历史

2. **ConvAIHandler.js** (~128行)
   - ConvAI API调用
   - NPC到Character ID映射
   - Fallback开场白

3. **MealRecordingHandler.js** (~176行)
   - 预定义问题和选项
   - 餐食记录提交
   - Vague回复逻辑
   - 完成消息

4. **ClueManager.js** (~152行)
   - 线索获取和保存
   - 线索列表管理
   - UI通知

5. **DialogUIManager.js** (~213行)
   - 对话框UI创建
   - 按钮管理
   - 状态文本
   - 返回按钮

6. **DialogSceneRefactored.js** (~362行)
   - 场景协调器
   - 模块组装
   - 对话流程控制

**总计**: ~1,136行（减少了65%的代码量）

## 🎯 按照系统设计实现的对话流程

```
1. 点击NPC
   ↓
2. 检查解锁条件（天数 + 前一天至少1餐）
   ↓
3. ConvAI开场白
   ↓
4. 显示 "Which meal do you want to record?"
   ↓
5. 选择餐食（早餐/午餐/晚餐）
   ↓
6. Groq API 问答（预定义选项）
   - Q1: 吃了什么？
   - Q2: 吃了多少？
   - Q3: 味道如何？
   - Q4: 和谁一起吃？
   - Q5: 在哪里吃？
   - Q6: 吃完后感觉？
   ↓
7. 完成提示: "Thanks for sharing your meal with me."
   ↓
8. 判断餐食类型
   ├─ 晚餐 → 给线索（保存到数据库+线索本）
   └─ 早餐/午餐 → 给vague回复
      ├─ 第1次: "It's nice hearing you share..."
      └─ 第2次: "I keep trying to remember..."
   ↓
9. 返回地图
```

## 📦 数据库存储（已实现）

### Players 表
- playerId (主键)
- firstLoginDate (首次登录时间)
- currentDay (当前天数)
- ...

### MealRecords 表
- playerId
- npcId
- mealType (breakfast/lunch/dinner)
- day
- mealContent
- answers (JSON)
- timestamp

### Clues 表
- playerId
- npcId
- clueText
- day
- receivedAt

### ConversationHistories 表
- playerId
- npcId
- speaker
- content
- timestamp

### AllowedIds 表
- playerId (白名单)
- used
- createdAt

## ✨ 重构优势

1. **可维护性** ⬆️
   - 每个模块职责单一
   - 易于定位和修复bug
   - 代码结构清晰

2. **可测试性** ⬆️
   - 每个模块可独立测试
   - 减少依赖耦合

3. **可扩展性** ⬆️
   - 添加新功能只需修改对应模块
   - 不影响其他模块

4. **可读性** ⬆️
   - 减少65%代码量
   - 清晰的模块划分
   - 更好的代码组织

## 🔄 迁移步骤

1. **测试旧版本** - 确保当前功能正常
2. **逐步替换** - 在GameScreen中注册新场景
3. **并行运行** - 保留旧场景作为备份
4. **全面测试** - 验证所有功能
5. **删除旧代码** - 确认无问题后删除DialogScene.js

## 📝 后续优化建议

1. **添加TypeScript** - 类型安全
2. **单元测试** - 为每个模块添加测试
3. **错误处理** - 更完善的错误处理机制
4. **日志系统** - 统一的日志管理
5. **配置文件** - 将硬编码的值移到配置文件

## 🎮 使用新场景

在 `GameScreen.jsx` 中注册：

```javascript
import DialogSceneRefactored from "./phaser/dialog/DialogSceneRefactored";

const gameConfig = {
  // ...
  scene: [MainScene, DialogSceneRefactored, DialogScene], // 新旧并存
};
```

在 `NPCManager.js` 中启动：

```javascript
// 使用新场景
this.scene.scene.launch("DialogSceneRefactored", dialogData);

// 或使用旧场景（备份）
// this.scene.scene.launch("DialogScene", dialogData);
```

## ✅ 完成状态

- [x] DialogStateManager.js
- [x] ConvAIHandler.js
- [x] MealRecordingHandler.js
- [x] ClueManager.js
- [x] DialogUIManager.js
- [x] DialogSceneRefactored.js
- [ ] 集成测试
- [ ] 替换旧场景
- [ ] 删除旧代码

---

**重构日期**: 2025-12-24
**重构人**: AI Assistant
**版本**: v2.0.0

