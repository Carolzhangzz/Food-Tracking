# 线索本面板修复

## 🐛 问题描述

用户报告线索本有时候会出现"两层"，并且关不掉的情况。

## 🔍 问题原因

1. **重复创建面板**：`showCluePanel()` 方法在每次调用时都会创建新的 Phaser 游戏对象（背景、文本等），但没有检查是否已经存在一个打开的面板。
2. **事件监听器累积**：每次创建面板时，关闭按钮都会添加新的事件监听器，导致多次点击可能触发多次关闭/打开操作。
3. **销毁不完整**：`hideCluePanel()` 方法没有足够的错误处理，如果某个元素销毁失败，会导致后续操作异常。

## ✅ 修复内容

### 1. `showClueJournal()` 方法
- ✅ 添加了重复打开检测：如果面板已存在，先关闭旧面板
- ✅ 每次打开前都重新加载最新的线索数据（`await this.loadCluesFromAPI()`）

```javascript
async showClueJournal() {
  // 如果已经打开，先关闭，防止重复创建
  if (this.cluePanel) {
    this.hideCluePanel();
  }
  
  // 加载最新的线索数据
  await this.loadCluesFromAPI();
  
  // 显示面板
  this.showCluePanel();
}
```

### 2. `showCluePanel()` 方法
- ✅ 添加了双重检查：方法开始时检查是否已存在面板
- ✅ 背景设置为可交互（`bg.setInteractive()`），防止点击穿透
- ✅ 关闭按钮在绑定新事件前，先移除所有旧事件（`closeBtn.removeAllListeners()`）
- ✅ 添加了详细的日志，方便调试

```javascript
showCluePanel() {
  // 防止重复创建：如果已经存在面板，先销毁
  if (this.cluePanel) {
    this.hideCluePanel();
  }
  
  // ... 创建面板元素 ...
  
  bg.setInteractive(); // 防止点击穿透
  
  closeBtn.removeAllListeners(); // 移除旧事件
  closeBtn.on("pointerdown", () => {
    this.hideCluePanel();
  });
}
```

### 3. `hideCluePanel()` 方法
- ✅ 添加了存在性检查和日志
- ✅ 使用 `try-catch` 包裹所有销毁操作，防止单个元素销毁失败导致整个流程中断
- ✅ 添加了详细的日志输出

```javascript
hideCluePanel() {
  if (!this.cluePanel) {
    return;
  }
  
  try {
    // 安全销毁所有元素
    if (this.cluePanel.bg && this.cluePanel.bg.destroy) {
      this.cluePanel.bg.destroy();
    }
    // ... 其他元素的销毁 ...
  } catch (error) {
    console.error("销毁线索面板元素时出错:", error);
  }
  
  this.cluePanel = null;
}
```

## 🧪 测试步骤

1. 打开游戏，进入地图
2. 点击右侧的 📖 线索本按钮
3. 观察控制台日志：
   ```
   📖 UIManager: 打开线索本面板
   📥 UIManager: 正在从后端加载线索数据...
   ✅ UIManager: 线索面板创建完成
   ```
4. **快速多次点击** 线索本按钮
   - ✅ 应该看到日志显示"线索本已打开，先关闭旧面板"
   - ✅ 只会有一个面板显示
5. 点击面板右上角的 "✕" 关闭按钮
   - ✅ 应该看到日志"关闭线索面板"
   - ✅ 面板正确关闭
6. 再次打开线索本，应该显示最新的线索数据

## 📝 额外改进

- 背景点击关闭功能已准备好代码，但暂时禁用（避免误触）
- 所有 Phaser 游戏对象都设置了正确的 `depth` 层级（200-201）
- 添加了移动端和桌面端的响应式尺寸处理

## 🎯 预期结果

- ✅ 不会再出现"两层"面板的情况
- ✅ 关闭按钮可以正常关闭面板
- ✅ 快速点击不会导致多个面板堆叠
- ✅ 每次打开都显示最新的线索数据

