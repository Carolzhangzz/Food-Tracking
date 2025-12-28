# 对话问题诊断

## 当前问题
从截图看，Q4被跳过了，直接从Q3跳到Q5。而且语气没有角色特色，像是固定模板。

## 需要检查的日志

请在浏览器控制台（F12 -> Console）查找以下日志：

### 1. 时间检查日志
```
⏰ 检查时间: mealType=breakfast, timeText="..."
⏰ 匹配到的索引: 0
⏰ 早餐时间检查: index=0, isUnusual=false
```

### 2. 问题序列日志
```
❓ 准备提问: Q1, 类型: choice
❓ 准备提问: Q2, 类型: choice
❓ 准备提问: Q3, 类型: choice
❓ 准备提问: Q4, 类型: input  ← 检查这个是否出现
```

### 3. Gemini API调用日志
```
🤖 Gemini AI 请求 (Turn 1): {npcId: "uncle_bo", mealType: "breakfast", questionId: "Q4"}
✅ Gemini AI 响应: "..."
```

### 4. 下一个问题日志
```
➡️ 下一个问题: Q4
➡️ 下一个问题: Q5
```

## 期望的正确流程

### 场景1：正常时间（Early morning）
```
Q1 (按钮) → Q2 (按钮) → Q3 (按钮) → Q4 (Gemini输入) → Q5 (Gemini输入) → Q6 (Gemini输入)
```

### 场景2：异常时间（Afternoon）
```
Q1 (按钮) → Q2 (按钮) → Q3 (按钮) → Q_TIME_FOLLOWUP (Gemini输入) → Q4 (Gemini输入) → Q5 (Gemini输入) → Q6 (Gemini输入)
```

## 如何获取完整日志

1. 打开浏览器开发者工具（F12）
2. 切换到 `Console` 标签
3. 在右上角找到 `Filter` 输入框
4. 输入 `❓` 或 `🤖` 来过滤相关日志
5. 右键点击日志 -> "Save as..." 保存为文本文件

或者直接在控制台运行：
```javascript
console.save = function(data, filename){
    const blob = new Blob([data], {type: 'text/plain'});
    const e = document.createEvent('MouseEvents');
    const a = document.createElement('a');
    a.download = filename;
    a.href = window.URL.createObjectURL(blob);
    a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');
    e.initEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
}

// 复制所有日志
console.save(console.memory ? 'Logs saved' : 'Logs', 'console-logs.txt');
```

## 可能的原因

### 1. Gemini返回了错误的响应
Gemini可能在Q3之后直接返回了Q5的问题文本，导致前端误认为当前是Q5。

### 2. questionControl 参数错误
传递给Gemini的 `questionControl.currentQuestionId` 可能不正确。

### 3. Gemini API根本没被调用
如果没有看到 `🤖 Gemini AI 请求` 日志，说明代码逻辑有问题，Gemini没被调用。

### 4. 问题序列逻辑错误
`getNextQuestionId` 函数可能返回了错误的下一个问题ID。

## 调试步骤

1. **清空所有数据，重新开始**
2. **在对话前，打开控制台**
3. **完成Q1-Q3**
4. **在Q3之后，立即检查控制台**：
   - 是否有 `➡️ 下一个问题: Q4`？
   - 是否有 `❓ 准备提问: Q4`？
   - 是否有 `🤖 Gemini AI 请求`？
5. **如果Q4被跳过，截图所有日志**

## 临时解决方案

如果问题持续，可以考虑：
1. 暂时禁用Gemini，使用固定问题模板测试基本流程
2. 在每个问题前添加明确的断点日志
3. 直接在 `DialogSceneRefactored.js` 中硬编码Q4-Q6的问题文本

